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
    if(draft.hqId&&job?.state==='synced')return {hqId:salesId_(draft.hqId),draftId:draft.id,key:String(salesId_(draft.hqId))};
    const hqId=draft.hqId||job?.hqId;
    // Never sent to HQ: the customer exists only in Firebase and is deleted there directly after the admin approval.
    if(!hqId&&(!job||salesDeleteUnsent_(job)))return {local:true,hqId:null,draftId:draft.id,key:'draft_'+draft.id};
    // Transfer started and an HQ ID is known: delete in HQ through the central sync like any HQ customer; its own open jobs are discarded.
    if(hqId)return {hqId:salesId_(hqId),draftId:draft.id,key:String(salesId_(hqId)),pendingDraft:true};
    // Transfer started without a confirmed HQ ID: only the app entry can be deleted; HQ must be checked by hand.
    return {local:true,uncertain:true,hqId:null,draftId:draft.id,key:'draft_'+draft.id};
  }
  const hqId=salesId_(companyId),draftId=salesDeleteOwnDraft_(hqId);
  if(draftId&&salesRead_('sales_jobs/'+salesKey_(draftId))?.state!=='synced')return salesDeleteRef_('draft_'+draftId);
  return {hqId,draftId,key:String(hqId)};
}
function salesDeleteUnsent_(job){return !!job&&['pending','ready'].includes(job.state)&&!job.writeAttempted&&!job.phaseWriteAttempted&&!job.contactAttempted;}
function salesDeleteLocalJobs_(draftId){
  return salesList_('sales_jobs').filter(j=>j.kind!=='deleteCompany'&&!['synced','canceled'].includes(j.state)&&(j.id===draftId||j.draftId===draftId||j.draftDependency===draftId||j.companyRef==='draft_'+draftId));
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
  if(ref.local){
    const draft=salesRead_('sales_drafts/'+salesKey_(ref.draftId));if(!draft?.company||draft.deletedAt)throw Error('Kunde fehlt.');
    return {stored:draft,jobs:salesDeleteLocalJobs_(ref.draftId),blockers:[]};
  }
  const imported=salesRead_('sales_companies/'+ref.hqId),draft=ref.pendingDraft?salesRead_('sales_drafts/'+salesKey_(ref.draftId)):null;
  let stored=ref.pendingDraft?draft:imported,statusPath=ref.pendingDraft?'sales_drafts/'+salesKey_(ref.draftId):'sales_companies/'+ref.hqId;
  // Customers known only from the directory (no full customer file yet) are deletable too; the status copy then lives in the directory entry.
  if(!stored?.company){const entry=salesRead_('sales_directory/'+ref.hqId);if(entry?.company){stored=entry;statusPath='sales_directory/'+ref.hqId;}}
  if(!stored?.company){const row=(salesRead_('sales_meta/lean_names')?.rows||[]).find(c=>String(c.id)===String(ref.hqId)||String(c.hqId||'')===String(ref.hqId));if(!row)throw Error('Kunde ist in Firebase nicht gespeichert. Bitte die Kundenliste neu laden.');stored={company:{id:ref.hqId,name:row.name}};statusPath=null;}
  const out=[],count=(n,one,many)=>n+' '+(n===1?one:many);
  const projects=Math.max((imported?.projects||[]).length,salesDeleteRawRows_('Projects',ref.hqId).length);if(projects)out.push(count(projects,'Projekt','Projekte'));
  const documents=salesDeleteRawRows_('Documents',ref.hqId).length;if(documents)out.push(count(documents,'Beleg','Belege'));
  const plans=salesDeleteRawRows_('PlannedRevenues',ref.hqId).length;if(plans)out.push(count(plans,'Planumsatz','Planumsätze'));
  // A customer whose own creation is still open has no other way out: its jobs are discarded instead of blocking.
  const own=ref.pendingDraft?salesDeleteLocalJobs_(ref.draftId):[],open=salesDeleteOpenJobs_(ref).filter(j=>!own.some(o=>o.id===j.id)),jobs=open.length+(imported?.pendingChanges||[]).filter(p=>!open.some(j=>j.id===p.jobId)&&!own.some(o=>o.id===p.jobId)).length;if(jobs)out.push(count(jobs,'offener Auftrag','offene Aufträge'));
  return {stored,statusPath,jobs:own,blockers:out};
}
function salesDeleteBlockedMessage_(blockers){
  return 'Löschen nicht möglich. Zu diesem Kunden gibt es noch: '+blockers.join(', ')+'. Bitte zuerst aufräumen (Projekte, Belege und Planumsätze in HQ, offene Aufträge in der Auftragsübersicht). Kunden sollten möglichst nie gelöscht werden.';
}
/** The status copy lives in the customer file, which opening a customer reads anyway (no extra read). */
function salesDeleteSave_(doc,stored,extra){
  const writes=[{path:'sales_deletions/'+(doc.key||doc.hqId),value:doc},...(extra||[])];
  const statusPath=salesDeleteStatusPath_(doc);
  if(stored?.company&&statusPath){if(['requested','approved','blocked','failed'].includes(doc.state))stored.deletion=salesDeleteView_(doc);else delete stored.deletion;writes.push({path:statusPath,value:stored});}
  salesBulkRest_('commit',{writes:writes.map(e=>({update:{name:salesBulkName_(e.path),fields:{payload:{stringValue:salesBulkPayload_(e.path,e.value)}}}}))});
}
function salesDeleteStatusPath_(doc){if(doc.statusPath!==undefined)return doc.statusPath;return doc.local||doc.pendingDraft?'sales_drafts/'+salesKey_(doc.draftId):'sales_companies/'+doc.hqId;}
function salesDeleteStatusDoc_(doc){const path=salesDeleteStatusPath_(doc);return path?salesRead_(path):null;}
/** After the approval the customer leaves the customer list at once; a later block restores the stored rows. */
function salesDeleteHide_(doc){
  const keys=new Set([doc.key,doc.hqId?String(doc.hqId):null,doc.draftId?'draft_'+doc.draftId:null].filter(Boolean)),hit=c=>keys.has(String(c.id))||keys.has(String(c.hqId||''));
  const names=salesRead_('sales_meta/lean_names'),filters=salesRead_('sales_meta/lean_filters'),hidden={names:(names?.rows||[]).filter(hit),filters:(filters?.rows||[]).filter(hit)};
  if(hidden.names.length)salesWrite_('sales_meta/lean_names',{...names,rows:names.rows.filter(c=>!hit(c))});
  if(hidden.filters.length)salesWrite_('sales_meta/lean_filters',{...filters,rows:filters.rows.filter(c=>!hit(c))});
  if(doc.hqId){const tomb=salesRead_('sales_meta/deleted_companies')||{ids:[]};if(!tomb.ids.includes(String(doc.hqId)))salesWrite_('sales_meta/deleted_companies',{ids:[...tomb.ids,String(doc.hqId)].slice(-5000)});}
  const merge=(old,rows)=>Array.from(new Map([...(old||[]),...rows].map(c=>[String(c.id),c])).values());
  doc.hidden={names:merge(doc.hidden?.names,hidden.names),filters:merge(doc.hidden?.filters,hidden.filters)};return Array.from(keys);
}
/** One-time repair of approvals made before immediate list removal was introduced. Never approves a request or calls HQ. */
function salesDeleteMigrateVisibility_(){
  for(const doc of salesList_('sales_deletions').filter(d=>d.state==='approved')){
    salesDeleteHide_(doc);salesWrite_('sales_deletions/'+(doc.key||doc.hqId),doc);
  }
}
function salesDeleteRestore_(doc){
  const h=doc.hidden;delete doc.hidden;if(!h)return;
  const add=(path,rows)=>{if(!rows?.length)return;const old=salesRead_(path);if(!old)return;const ids=new Set(old.rows.map(c=>String(c.id)));salesWrite_(path,{...old,rows:[...old.rows,...rows.filter(c=>!ids.has(String(c.id)))]});};
  add('sales_meta/lean_names',h.names);add('sales_meta/lean_filters',h.filters);
  if(doc.hqId){const tomb=salesRead_('sales_meta/deleted_companies');if(tomb?.ids?.includes(String(doc.hqId)))salesWrite_('sales_meta/deleted_companies',{ids:tomb.ids.filter(x=>x!==String(doc.hqId))});}
}
function salesDeleteView_(d){return d?salesPick_(d,['key','local','uncertain','pendingDraft','hqId','name','reason','state','message','requestedBy','requestedAt','decidedBy','decidedAt','jobId','revision','completedAt']):null;}
function requestSalesCustomerDelete(input){
  const user=salesUser_();return salesLock_(()=>{
    salesAssertPrivate_();const reason=salesText_(input?.reason,500,true),ref=salesDeleteRef_(input?.companyId),path='sales_deletions/'+ref.key,prior=salesRead_(path);
    if(prior&&['requested','approved'].includes(prior.state))return {message:prior.state==='requested'?'Für diesen Kunden liegt bereits ein Löschantrag vor. Er wartet auf die Freigabe durch einen Admin.':'Die Löschung ist bereits freigegeben.',deletion:salesDeleteView_(prior)};
    const check=salesDeleteBlockers_(ref);if(check.blockers.length)throw Error(salesDeleteBlockedMessage_(check.blockers));
    const now=salesNow_(),value={key:ref.key,...(check.statusPath!==undefined?{statusPath:check.statusPath}:{}),...(ref.local?{local:true}:{}),...(ref.uncertain?{uncertain:true}:{}),...(ref.pendingDraft?{pendingDraft:true}:{}),hqId:ref.hqId,draftId:ref.draftId,name:check.stored.company.name,reason,state:'requested',message:'Wartet auf Freigabe durch einen Admin.',requestedBy:user.email,...(user.uid?{requestedByUid:user.uid}:{}),requestedAt:now,revision:(prior?.revision||0)+1,log:[...(prior?.log||[]).slice(-20),{action:'requested',by:user.email,at:now,reason}]};
    salesDeleteSave_(value,check.stored);return {message:ref.uncertain?'Löschantrag gespeichert. Ein Admin muss ihn freigeben. Danach wird der Kunde sofort in der App gelöscht. Seine HQ-Übertragung war begonnen, aber nicht bestätigt: bitte in HQ prüfen, ob die Firma dort angelegt wurde.':ref.local?'Löschantrag gespeichert. Ein Admin muss ihn freigeben. Der Kunde ist noch nicht in HQ und wird nach der Freigabe sofort in der App gelöscht.':'Löschantrag gespeichert. Ein Admin muss ihn freigeben; erst dann wird der Kunde beim nächsten HQ-Abgleich in HQ und in der App gelöscht.',deletion:salesDeleteView_(value)};
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
    salesAssertPrivate_();const key=input?.key!==undefined?salesKey_(String(input.key)):String(salesId_(input?.hqId)),path='sales_deletions/'+key,doc=salesRead_(path),hqId=doc?.hqId||null;
    if(!doc||doc.revision!==input.revision)throw Error('Der Löschantrag wurde inzwischen geändert. Bitte die Liste neu laden.');
    if(!['requested','failed','blocked'].includes(doc.state))throw Error('Dieser Löschantrag ist bereits entschieden.');
    const now=salesNow_();doc.revision++;doc.decidedBy=user.email;doc.decidedAt=now;
    if(input.approve!==true){doc.state='rejected';doc.message='Vom Admin abgelehnt. Der Kunde bleibt erhalten.';doc.log=[...(doc.log||[]).slice(-20),{action:'rejected',by:user.email,at:now}];salesDeleteSave_(doc,salesDeleteStatusDoc_(doc));return {message:'Löschantrag abgelehnt. Der Kunde bleibt erhalten.',deletion:salesDeleteView_(doc)};}
    let ref={hqId,draftId:doc.draftId||null,key,...(doc.pendingDraft?{pendingDraft:true}:{})};
    if(doc.local){
      try{ref=salesDeleteRef_('draft_'+doc.draftId);}catch(e){ref=null;doc.message=e.message;}
      if(!ref?.local){doc.state='blocked';doc.message=ref?'Der Kunde wurde inzwischen an HQ übertragen. Bitte den Löschantrag in der Kundenakte neu stellen.':doc.message;doc.log=[...(doc.log||[]).slice(-20),{action:'blocked',by:user.email,at:now}];salesDeleteSave_(doc,null);return {message:doc.message,deletion:salesDeleteView_(doc)};}
    }
    const check=salesDeleteBlockers_(ref);
    if(check.blockers.length){doc.state='blocked';doc.message=salesDeleteBlockedMessage_(check.blockers);doc.log=[...(doc.log||[]).slice(-20),{action:'blocked',by:user.email,at:now}];salesDeleteSave_(doc,check.stored);return {message:doc.message,deletion:salesDeleteView_(doc)};}
    if(check.statusPath!==undefined)doc.statusPath=check.statusPath;
    if(ref.local){doc.uncertain=!!ref.uncertain;return salesDeleteLocal_(doc,check,user,now);}
    const id=salesKey_('delete_'+hqId+'_'+doc.revision),job={id,kind:'deleteCompany',business:1,hqId,draftId:ref.draftId,name:doc.name,state:'pending',actor:user.email,...(user.uid?{actorUid:user.uid,approvedByUid:user.uid}:{}),approvedBy:user.email,requestedBy:doc.requestedBy,createdAt:now,updatedAt:now,message:'Löschung freigegeben. Wird beim nächsten HQ-Abgleich in HQ und danach in der App ausgeführt.'};
    doc.state='approved';doc.jobId=id;doc.message=job.message;doc.log=[...(doc.log||[]).slice(-20),{action:'approved',by:user.email,at:now}];
    // The customer's own unfinished creation jobs stop now, so the sync does not continue them before the deletion.
    const own=(check.jobs||[]).map(j=>({...j,state:'canceled',updatedAt:now,message:'Wegen freigegebener Kundenlöschung verworfen.'}));
    const hiddenIds=salesDeleteHide_(doc);
    salesDeleteSave_(doc,check.stored,[{path:'sales_jobs/'+id,value:job},...own.map(j=>({path:'sales_jobs/'+j.id,value:j}))]);
    return {message:'Löschung freigegeben. Der Kunde ist ab sofort aus der Kundenliste entfernt und wird beim nächsten HQ-Abgleich in HQ gelöscht.',deletion:salesDeleteView_(doc),hiddenIds,patch:{jobs:[job,...own].map(salesJobSummary_)}};
  });
}
/** Unsent customer: nothing exists in HQ, so the approval deletes it in Firebase right away and cancels its unsent jobs. */
function salesDeleteLocal_(doc,check,user,now){
  const draft=check.stored,ref='draft_'+draft.id;
  const jobs=check.jobs.map(j=>({...j,state:'canceled',updatedAt:now,message:'Kunde vor der HQ-Übertragung gelöscht (Admin-Freigabe). Nichts an HQ gesendet.'}));
  draft.deletedAt=now;doc.state='done';doc.completedAt=now;doc.message=(doc.uncertain?'Kunde in der App gelöscht. Seine HQ-Übertragung war begonnen, aber nicht bestätigt: bitte in HQ prüfen, ob die Firma dort angelegt wurde, und sie gegebenenfalls dort löschen':'Kunde war noch nicht in HQ und wurde in der App gelöscht')+(jobs.length?' ('+jobs.length+(jobs.length===1?' offener Auftrag':' offene Aufträge')+' verworfen).':'.');
  doc.log=[...(doc.log||[]).slice(-20),{action:'approved',by:user.email,at:now},{action:'deleted',by:user.email,at:now}];
  salesDeleteSave_(doc,draft,jobs.map(j=>({path:'sales_jobs/'+j.id,value:j})));
  salesBulkRest_('commit',{writes:[{delete:salesBulkName_('sales_communication/'+ref)}]});
  const hiddenIds=salesDeleteHide_(doc);delete doc.hidden;salesWrite_('sales_deletions/'+doc.key,doc);
  return {message:doc.message,deletion:salesDeleteView_(doc),hiddenIds,patch:{jobs:jobs.map(salesJobSummary_)}};
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
      doc.state='blocked';doc.message=job.message;doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'blocked',by:'HQ-Abgleich',at:salesNow_()}];salesDeleteRestore_(doc);salesDeleteSave_(doc,salesDeleteStatusDoc_(doc));return;
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
  if(remaining>0){job.state='pending';job.message='Löschung läuft: '+SALES_DELETE_HQ_BATCH+' Einträge in HQ gelöscht, noch '+remaining+' offen. Wird beim nächsten HQ-Abgleich fortgesetzt.';doc.message=job.message;salesDeleteSave_(doc,salesDeleteStatusDoc_(doc));return;}
  if(present){salesDeleteHq_(job,'/v2/Companies/'+id);if(!salesDeleteMissing_('Companies',id))throw Error('HQ meldet die Firma nach dem Löschen weiterhin. Beim nächsten Abgleich wird erneut geprüft.');}
  salesDeleteCleanup_(job);
  job.state='synced';job.message='Kunde in HQ und in der App gelöscht (mit '+job.removed.contactIds.length+' Ansprechpartnern und '+job.removed.historyIds.length+' Historieneinträgen).';
  const now=salesNow_();delete doc.hidden;doc.state='done';doc.message=job.message;doc.completedAt=now;doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'deleted',by:'HQ-Abgleich',at:now}];salesWrite_('sales_deletions/'+id,doc);
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
  if(job.draftId){
    const draft=salesRead_('sales_drafts/'+salesKey_(job.draftId));if(draft&&!draft.deletedAt){draft.deletedAt=salesNow_();delete draft.deletion;salesWrite_('sales_drafts/'+draft.id,draft);}
    for(const j of salesDeleteLocalJobs_(job.draftId))salesWrite_('sales_jobs/'+j.id,{...j,state:'canceled',updatedAt:salesNow_(),message:'Kunde gelöscht; Auftrag verworfen.'});
  }
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
  try{const doc=salesRead_('sales_deletions/'+salesId_(job.hqId));if(doc&&doc.jobId===job.id&&doc.state==='approved'){doc.message=job.message;if(stop){doc.state='failed';doc.revision++;doc.log=[...(doc.log||[]).slice(-20),{action:'failed',by:'HQ-Abgleich',at:salesNow_()}];salesDeleteRestore_(doc);}salesDeleteSave_(doc,salesDeleteStatusDoc_(doc));}}catch(_){}
  return job;
}
