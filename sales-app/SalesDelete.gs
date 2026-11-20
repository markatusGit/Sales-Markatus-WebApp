/** Customer deletion (R15). Any user requests, an admin approves, the central sync deletes in HQ and then in the app.
 * No trash bin, no restore. Projects, documents, planned revenues and open jobs block the deletion until someone cleans up.
 * Contacts and contact histories of the customer are deleted together with it. */
const SALES_DELETE_HQ_BATCH=80;
function salesDeleteOwnDraft_(hqId){
  const owners=salesRead_('sales_meta/lean_testowners');if(owners)return owners.rows[String(hqId)]||null;
  const draft=salesList_('sales_drafts').find(d=>Number(d.hqId)===Number(hqId)&&!d.deletedAt);return draft?draft.id:null;
}
function salesDeleteRef_(companyId){
  if(String(companyId).startsWith('draft_')){
    const id=salesKey_(String(companyId).slice(6)),draft=salesRead_('sales_drafts/'+id),job=salesRead_('sales_jobs/'+id);
    if(!draft?.company||draft.deletedAt)throw Error('Kunde fehlt.');
    if(!draft.hqId||job?.state!=='synced')throw Error('Dieser Kunde ist noch nicht vollständig an HQ übertragen. Bitte zuerst den HQ-Abgleich abschließen; danach kann er gelöscht werden.');
    return {hqId:salesId_(draft.hqId),draftId:draft.id};
  }
  const hqId=salesId_(companyId);return {hqId,draftId:salesDeleteOwnDraft_(hqId)};
}
function salesDeleteRawRows_(entity,hqId){
  const cache=salesRead_('sales_meta/bulk'),generation=cache?.entities?.[entity]?.generation;
  if(!generation)throw Error('Der gespeicherte HQ-Bestand ist unvollständig. Bitte zuerst den HQ-Abgleich abschließen.');
  return salesBulkQuery_(salesBulkCollection_(entity),'companyBucket',salesBulkBucket_(hqId)).filter(v=>v.generation===generation&&Number(v.row?.companyId)===Number(hqId)).map(v=>v.row);
}
function salesDeleteOpenJobs_(ref){
  const draftRef=ref.draftId?'draft_'+ref.draftId:null;
  return salesList_('sales_jobs').filter(j=>j.kind!=='deleteCompany'&&!['synced','canceled'].includes(j.state)&&(Number(j.hqId)===ref.hqId||String(j.companyRef)===String(ref.hqId)||draftRef&&(j.draftId===ref.draftId||j.draftDependency===ref.draftId||j.companyRef===draftRef)));
}
/** Firebase-only check. HQ is read again before the actual deletion in the central sync. */
function salesDeleteBlockers_(ref){
  const stored=salesRead_('sales_companies/'+ref.hqId);if(!stored?.company)throw Error('Kundendetails fehlen in Firebase. Bitte zuerst den HQ-Abgleich ausführen.');
  const out=[],count=(n,one,many)=>n+' '+(n===1?one:many);
  const projects=(stored.projects||[]).length;if(projects)out.push(count(projects,'Projekt','Projekte'));
  const documents=salesDeleteRawRows_('Documents',ref.hqId).length;if(documents)out.push(count(documents,'Beleg','Belege'));
  const plans=salesDeleteRawRows_('PlannedRevenues',ref.hqId).length;if(plans)out.push(count(plans,'Planumsatz','Planumsätze'));
  const open=salesDeleteOpenJobs_(ref),jobs=open.length+(stored.pendingChanges||[]).filter(p=>!open.some(j=>j.id===p.jobId)).length;if(jobs)out.push(count(jobs,'offener Auftrag','offene Aufträge'));
  return {stored,blockers:out};
}
function salesDeleteBlockedMessage_(blockers){
  return 'Löschen nicht möglich. Zu diesem Kunden gibt es noch: '+blockers.join(', ')+'. Bitte zuerst aufräumen (Projekte, Belege und Planumsätze in HQ, offene Aufträge in der Auftragsübersicht). Kunden sollten möglichst nie gelöscht werden.';
}
/** The status copy lives in the customer file, which opening a customer reads anyway (no extra read). */
function salesDeleteSave_(doc,stored,extra){
  const writes=[{path:'sales_deletions/'+doc.hqId,value:doc},...(extra||[])];
  if(stored?.company){if(['requested','approved','blocked','failed'].includes(doc.state))stored.deletion=salesDeleteView_(doc);else delete stored.deletion;writes.push({path:'sales_companies/'+doc.hqId,value:stored});}
  salesBulkRest_('commit',{writes:writes.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
}
function salesDeleteView_(d){return d?salesPick_(d,['hqId','name','reason','state','message','requestedBy','requestedAt','decidedBy','decidedAt','jobId','revision','completedAt']):null;}
function requestSalesCustomerDelete(input){
  const user=salesUser_();return salesLock_(()=>{
    salesAssertPrivate_();const reason=salesText_(input?.reason,500,true),ref=salesDeleteRef_(input?.companyId),path='sales_deletions/'+ref.hqId,prior=salesRead_(path);
    if(prior&&['requested','approved'].includes(prior.state))return {message:prior.state==='requested'?'Für diesen Kunden liegt bereits ein Löschantrag vor. Er wartet auf die Freigabe durch einen Admin.':'Die Löschung ist bereits freigegeben und wird beim nächsten HQ-Abgleich ausgeführt.',deletion:salesDeleteView_(prior)};
    const check=salesDeleteBlockers_(ref);if(check.blockers.length)throw Error(salesDeleteBlockedMessage_(check.blockers));
    const now=salesNow_(),value={hqId:ref.hqId,draftId:ref.draftId,name:check.stored.company.name,reason,state:'requested',message:'Wartet auf Freigabe durch einen Admin.',requestedBy:user.email,...(user.uid?{requestedByUid:user.uid}:{}),requestedAt:now,revision:(prior?.revision||0)+1,log:[...(prior?.log||[]).slice(-20),{action:'requested',by:user.email,at:now,reason}]};
    salesDeleteSave_(value,check.stored);return {message:'Löschantrag gespeichert. Ein Admin muss ihn freigeben; erst dann wird der Kunde beim nächsten HQ-Abgleich in HQ und in der App gelöscht.',deletion:salesDeleteView_(value)};
  });
}
function salesDeleteAdmin_(){const user=salesUser_(true);if(!user.admin)throw Error('AUTH_DENIED: Nur ein Admin darf Löschanträge bearbeiten.');return user;}
function listSalesCustomerDeletions(){
  salesDeleteAdmin_();const rows=salesList_('sales_deletions').sort((a,b)=>String(b.requestedAt).localeCompare(String(a.requestedAt)));
  const open=rows.filter(d=>['requested','approved','failed','blocked'].includes(d.state)),done=rows.filter(d=>!open.includes(d)).slice(0,20);
  return {deletions:[...open,...done].map(salesDeleteView_)};
}
function decideSalesCustomerDelete(input){
  const user=salesDeleteAdmin_();return salesLock_(()=>{
    salesAssertPrivate_();const hqId=salesId_(input?.hqId),path='sales_deletions/'+hqId,doc=salesRead_(path);
    if(!doc||doc.revision!==input.revision)throw Error('Der Löschantrag wurde inzwischen geändert. Bitte die Liste neu laden.');
    if(!['requested','failed','blocked'].includes(doc.state))throw Error('Dieser Löschantrag ist bereits entschieden.');
    const now=salesNow_();doc.revision++;doc.decidedBy=user.email;doc.decidedAt=now;
    if(input.approve!==true){doc.state='rejected';doc.message='Vom Admin abgelehnt. Der Kunde bleibt erhalten.';doc.log=[...(doc.log||[]).slice(-20),{action:'rejected',by:user.email,at:now}];salesDeleteSave_(doc,salesRead_('sales_companies/'+hqId));return {message:'Löschantrag abgelehnt. Der Kunde bleibt erhalten.',deletion:salesDeleteView_(doc)};}
    const ref={hqId,draftId:doc.draftId||null},check=salesDeleteBlockers_(ref);
    if(check.blockers.length){doc.state='blocked';doc.message=salesDeleteBlockedMessage_(check.blockers);doc.log=[...(doc.log||[]).slice(-20),{action:'blocked',by:user.email,at:now}];salesDeleteSave_(doc,check.stored);return {message:doc.message,deletion:salesDeleteView_(doc)};}
    const id=salesKey_('delete_'+hqId+'_'+doc.revision),job={id,kind:'deleteCompany',business:1,hqId,draftId:ref.draftId,name:doc.name,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid,approvedByUid:user.uid}:{}),approvedBy:user.email,requestedBy:doc.requestedBy,createdAt:now,updatedAt:now,message:'Löschung freigegeben. Wird beim nächsten HQ-Abgleich in HQ und danach in der App ausgeführt.'};
    doc.state='approved';doc.jobId=id;doc.message=job.message;doc.log=[...(doc.log||[]).slice(-20),{action:'approved',by:user.email,at:now}];
    salesDeleteSave_(doc,check.stored,[{path:'sales_jobs/'+id,value:job}]);
    return {message:'Löschung freigegeben. Sie wird beim nächsten HQ-Abgleich ausgeführt.',deletion:salesDeleteView_(doc),patch:{job:salesJobSummary_(job)}};
  });
}
function salesDeleteApproved_(job){
  const doc=salesRead_('sales_deletions/'+salesId_(job.hqId));
  if(!doc||doc.state!=='approved'||doc.jobId!==job.id)throw Error('Keine gültige Admin-Freigabe für diese Löschung.');
  if(typeof salesAuthEnabled_==='function'&&salesAuthEnabled_()){const cfg=salesAuthConfig_();if(!job.approvedByUid||job.approvedByUid!==cfg.ownerUid)throw Error('Die Löschung wurde nicht vom Admin freigegeben.');}
  else {const owner=String(PropertiesService.getScriptProperties().getProperty('SALES_ADMIN_EMAIL')||SALES.admin).toLowerCase();if(job.approvedBy!==owner)throw Error('Die Löschung wurde nicht vom Admin freigegeben.');}
  return doc;
}
function salesDeleteHq_(job,path){
  if(job.kind!=='deleteCompany'||job.state!=='running'||!/^\/v2\/(ContactHistories|ContactPersons|Companies)\/\d+$/.test(path))throw Error('HQ-Löschziel nicht freigegeben.');
  job.writeAttempted=true;
  const r=UrlFetchApp.fetch('https://api.hellohq.io'+path,{method:'delete',headers:{Authorization:'Bearer '+revenueToken_()},muteHttpExceptions:true,followRedirects:false}),code=r.getResponseCode();
  job.lastWrite={method:'DELETE',resource:path.replace(/\/\d+/g,'/{id}'),at:salesNow_(),status:code,fields:[]};
  if(code!==404&&(code<200||code>=300))throw Error('HQ-Löschen: HTTP '+code+'. Nichts weiter gelöscht; beim nächsten Abgleich wird erneut geprüft.');
}
function salesDeleteMissing_(entity,id){try{salesOne_(entity,id);return false;}catch(e){if(/HTTP 404/.test(e.message||''))return true;throw e;}}
function salesDeleteRun_(job,verifyOnly){
  if(verifyOnly)throw Error('Löschaufträge werden nur im zentralen HQ-Abgleich geprüft.');
  const doc=salesDeleteApproved_(job),id=salesId_(job.hqId),started=Date.now(),own=rows=>{if(rows.some(r=>Number(r.companyId)!==id))throw Error('HQ-Zuordnung stimmt nicht mit dem Kunden überein.');return rows;};
  const present=!salesDeleteMissing_('Companies',id);
  if(present){
    const blockers=[['Projects','Projekt','Projekte'],['Documents','Beleg','Belege'],['PlannedRevenues','Planumsatz','Planumsätze']].map(([entity,one,many])=>{const n=own(salesCollect_(entity,'companyId eq '+id,started)).length;return n?n+' '+(n===1?one:many):'';}).filter(Boolean);
    if(blockers.length){
      job.state='canceled';job.message='In HQ nichts gelöscht. '+salesDeleteBlockedMessage_(blockers);
      doc.state='blocked';doc.message=job.message;doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'blocked',by:'HQ-Abgleich',at:salesNow_()}];salesDeleteSave_(doc,salesRead_('sales_companies/'+id));return;
    }
  }
  // Contacts and histories go with the customer; histories first because they can reference contacts.
  const histories=own(salesCollect_('ContactHistories','companyId eq '+id,started)),contacts=own(salesCollect_('ContactPersons','companyId eq '+id,started));
  job.removed=job.removed||{contactIds:[],historyIds:[]};
  let budget=SALES_DELETE_HQ_BATCH;
  for(const [entity,rows,key] of [['ContactHistories',histories,'historyIds'],['ContactPersons',contacts,'contactIds']])for(const row of rows){
    if(budget--<=0)break;salesDeleteHq_(job,'/v2/'+entity+'/'+salesId_(row.id));if(!job.removed[key].includes(String(row.id)))job.removed[key].push(String(row.id));
  }
  const remaining=histories.length+contacts.length-SALES_DELETE_HQ_BATCH;
  if(remaining>0){job.state='pending';job.message='Löschung läuft: '+SALES_DELETE_HQ_BATCH+' Einträge in HQ gelöscht, noch '+remaining+' offen. Wird beim nächsten HQ-Abgleich fortgesetzt.';doc.message=job.message;salesDeleteSave_(doc,salesRead_('sales_companies/'+id));return;}
  if(present){salesDeleteHq_(job,'/v2/Companies/'+id);if(!salesDeleteMissing_('Companies',id))throw Error('HQ meldet die Firma nach dem Löschen weiterhin. Beim nächsten Abgleich wird erneut geprüft.');}
  salesDeleteCleanup_(job);
  job.state='synced';job.message='Kunde in HQ und in der App gelöscht (mit '+job.removed.contactIds.length+' Ansprechpartnern und '+job.removed.historyIds.length+' Historieneinträgen).';
  const now=salesNow_();doc.state='done';doc.message=job.message;doc.completedAt=now;doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'deleted',by:'HQ-Abgleich',at:now}];salesWrite_('sales_deletions/'+id,doc);
}
/** App side after HQ confirmed the deletion: dossier, directory, raw rows, compact lists and sync counters. */
function salesDeleteCleanup_(job){
  const id=salesId_(job.hqId),key=String(id),draftRef=job.draftId?'draft_'+job.draftId:null,raw={};
  for(const entity of ['ContactPersons','ContactHistories'])raw[entity]=salesDeleteRawRows_(entity,id).map(r=>String(r.id));
  const cache=salesRead_('sales_meta/bulk'),rawCompany=salesBulkGet_([salesBulkCollection_('Companies')+'/'+key])[salesBulkCollection_('Companies')+'/'+key];
  raw.Companies=rawCompany&&rawCompany.generation===cache?.entities?.Companies?.generation?[key]:[];
  const contactIds=Array.from(new Set([...job.removed.contactIds,...raw.ContactPersons])),historyIds=Array.from(new Set([...job.removed.historyIds,...raw.ContactHistories]));
  const paths=['sales_companies/'+key,'sales_directory/'+key,'sales_communication/'+key,salesBulkCollection_('Companies')+'/'+key,...contactIds.map(c=>salesBulkCollection_('ContactPersons')+'/'+c),...historyIds.map(h=>salesBulkCollection_('ContactHistories')+'/'+h)];
  if(draftRef)paths.push('sales_communication/'+draftRef);
  for(let i=0;i<paths.length;i+=100)salesBulkRest_('commit',{writes:paths.slice(i,i+100).map(p=>({delete:salesBulkName_(p)}))});
  job.removed={...job.removed,contactIds,historyIds,raw};
  if(cache){salesDeleteApplyCounts_(cache,job);salesWrite_('sales_meta/bulk',cache);}
  const names=salesRead_('sales_meta/lean_names');if(names)salesWrite_('sales_meta/lean_names',{...names,rows:names.rows.filter(c=>String(c.id)!==key&&String(c.hqId||'')!==key&&c.id!==draftRef)});
  const filters=salesRead_('sales_meta/lean_filters');if(filters)salesWrite_('sales_meta/lean_filters',{...filters,rows:filters.rows.filter(c=>String(c.id)!==key)});
  const owners=salesRead_('sales_meta/lean_testowners');if(owners?.rows?.[key]){delete owners.rows[key];salesWrite_('sales_meta/lean_testowners',owners);}
  const legacy=salesRead_('sales_meta/directory');if(legacy?.entries?.some(e=>String(e.company?.id)===key))salesWrite_('sales_meta/directory',{...legacy,entries:legacy.entries.filter(e=>String(e.company?.id)!==key)});
  const tomb=salesRead_('sales_meta/deleted_companies')||{ids:[]};if(!tomb.ids.includes(key))salesWrite_('sales_meta/deleted_companies',{ids:[...tomb.ids,key].slice(-5000)});
  if(job.draftId){const draft=salesRead_('sales_drafts/'+salesKey_(job.draftId));if(draft&&!draft.deletedAt){draft.deletedAt=salesNow_();salesWrite_('sales_drafts/'+draft.id,draft);}}
}
/** Keeps the stored HQ counts and known IDs in line with the deleted raw rows (cache or an in-memory sync run). */
function salesDeleteApplyCounts_(target,job){
  const r=job.removed;if(!r?.raw)return;const key=String(salesId_(job.hqId));
  for(const [entity,ids] of [['Companies',[key]],['ContactPersons',r.contactIds],['ContactHistories',r.historyIds]]){
    const m=target.entities?.[entity];if(!m)continue;const drop=new Set(ids.map(String));
    for(const list of ['ids','knownIds','touchedIds'])if(Array.isArray(m[list]))m[list]=m[list].filter(x=>!drop.has(String(x)));
    if(Number.isFinite(m.count))m.count=Math.max(0,m.count-(r.raw[entity]||[]).length);
  }
  if(Array.isArray(target.companyIds))target.companyIds=target.companyIds.filter(x=>String(x)!==key);
  if(Array.isArray(target.loadedCompanyIds))target.loadedCompanyIds=target.loadedCompanyIds.filter(x=>String(x)!==key);
}
function salesDeleteFailed_(job,reason){
  job.failures=(job.failures||0)+1;const stop=job.failures>=3;
  job.state=stop?'canceled':'pending';job.message=(stop?'Löschung nach drei Fehlversuchen angehalten: ':'Löschung nicht abgeschlossen, wird beim nächsten HQ-Abgleich erneut geprüft: ')+reason;
  try{const doc=salesRead_('sales_deletions/'+salesId_(job.hqId));if(doc&&doc.jobId===job.id&&doc.state==='approved'){doc.message=job.message;if(stop){doc.state='failed';doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'failed',by:'HQ-Abgleich',at:salesNow_()}];}salesDeleteSave_(doc,salesRead_('sales_companies/'+doc.hqId));}}catch(_){}
  return job;
}
