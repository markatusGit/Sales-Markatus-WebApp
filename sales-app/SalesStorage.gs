/** Immutable payload parts; publish the root pointer only after every part exists. */
function salesDecodeStored_(path,payload,c){
  const value=JSON.parse(payload);
  if(value?.storageFormat!=='sales-parts-v1')return value;
  if(!Number.isSafeInteger(value.parts)||value.parts<1||value.parts>2000||!value.generation)throw new Error('Ungültiger Firebase-Datensatz: '+path);
  const parts=[];
  for(let i=0;i<value.parts;i++){
    const raw=pilotReadDocument_(c.project,'sales_chunks/'+salesKey_(value.generation)+'-'+i,c.token);
    if(!raw)throw new Error('Firebase-Teilpaket fehlt: '+path+' · Teil '+(i+1));
    const part=JSON.parse(raw.payload);
    if(part.source!==path||part.index!==i||typeof part.text!=='string')throw new Error('Firebase-Teilpaket passt nicht: '+path);
    parts.push(part.text);
  }
  const text=parts.join('');if(text.length!==value.length)throw new Error('Firebase-Datensatz unvollständig: '+path);
  return JSON.parse(text);
}
// Root documents written for a signed-in user go through a commit that verifies the user's ACL revision,
// so a write started just before a rights change or lock-out is rejected. Worker writes keep the plain path.
function salesStoreRoot_(path,payload,c){
  if(typeof salesAuthRequest_!=='undefined'&&salesAuthRequest_?.user&&!salesAuthRequest_.worker&&typeof salesBulkRest_==='function'){
    salesBulkRest_('commit',{writes:[{update:{name:salesBulkName_(path),fields:{payload:{stringValue:payload}}}}]});return;
  }
  pilotWriteDocument_(c.project,path,{payload,...salesJobFields_(path,payload)},c.token);
}
/** App jobs carry a searchable flag "jobActive": 1 while a job is open (not synced/canceled) or is a change request
 * shown under "Meine Änderungen". Lists of open jobs then query only flagged jobs instead of every job ever saved.
 * The flag is written together with the job itself; nothing is ever deleted. */
function salesJobActive_(job){return !!job&&(!['synced','canceled'].includes(job.state)||!!job.review);}
function salesJobFields_(path,payload){
  if(!/^sales_jobs\/[^/]+$/.test(path))return {};
  let value=null;try{value=JSON.parse(payload);}catch(_){}
  // A split payload cannot be judged from its pointer: keep it listed, the reader checks the state anyway.
  return {jobActive:value?.storageFormat==='sales-parts-v1'||salesJobActive_(value)?'1':'0'};
}
function salesJobWriteFields_(write){
  const path=String(write?.update?.name||'').split('/documents/')[1]||'';
  if(write.updateMask||!write.update?.fields?.payload||!/^sales_jobs\/[^/]+$/.test(path))return write;
  return {...write,update:{...write.update,fields:{...write.update.fields,jobActive:{stringValue:salesJobFields_(path,write.update.fields.payload.stringValue).jobActive}}}};
}
const SALES_JOBS_ACTIVE_PROPERTY='SALES_JOBS_ACTIVE_INDEX';
/** Open jobs and change requests only. Once per installation, jobs saved before r41 are flagged: one full list,
 * then only the open ones get the flag (field-only write, the job content stays untouched). */
function salesJobsActiveList_(){
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty(SALES_JOBS_ACTIVE_PROPERTY)!=='1'){
    const active=salesList_('sales_jobs').filter(salesJobActive_);
    for(let i=0;i<active.length;i+=100)salesBulkRest_('commit',{writes:active.slice(i,i+100).map(j=>({update:{name:salesBulkName_('sales_jobs/'+salesKey_(j.id)),fields:{jobActive:{stringValue:'1'}}},updateMask:{fieldPaths:['jobActive']},currentDocument:{exists:true}}))});
    props.setProperty(SALES_JOBS_ACTIVE_PROPERTY,'1');return active;
  }
  const c=salesContext_(),out=[];let last='';
  for(let page=0;page<200;page++){
    const query={from:[{collectionId:'sales_jobs'}],where:{fieldFilter:{field:{fieldPath:'jobActive'},op:'EQUAL',value:{stringValue:'1'}}},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:250};
    if(last)query.startAt={values:[{referenceValue:last}],before:false};
    const result=salesBulkRest_('runQuery',{structuredQuery:query});if(!Array.isArray(result))throw new Error('Firebase-Abfrage unvollständig.');
    const docs=result.filter(r=>r.document).map(r=>r.document);
    for(const doc of docs){if(doc.name===last)throw new Error('Firebase-Seite wiederholt sich.');const path=doc.name.split('/documents/')[1];out.push(salesDecodeStored_(path,doc.fields.payload.stringValue,c));}
    if(docs.length<250)return out.filter(salesJobActive_);last=docs[docs.length-1].name;
  }
  throw new Error('Zu viele offene Aufträge für einen Abruf.');
}
function salesStorePayload_(path,value){
  path=salesPath_(path);const c=salesContext_(),payload=JSON.stringify(value);
  if(Utilities.newBlob(payload).getBytes().length<=650000){salesStoreRoot_(path,payload,c);return;}
  const generation=Utilities.getUuid(),parts=Math.ceil(payload.length/100000);
  if(parts>2000)throw new Error('Datensatz überschreitet das Gesamtlimit: '+path+'. Bisheriger Stand bleibt erhalten.');
  for(let i=0;i<parts;i++){
    const fragment=JSON.stringify({source:path,index:i,text:payload.slice(i*100000,(i+1)*100000)});
    if(Utilities.newBlob(fragment).getBytes().length>750000)throw new Error('Teilpaket überschreitet das Größenlimit: '+path);
    pilotWriteDocument_(c.project,'sales_chunks/'+generation+'-'+i,{payload:fragment},c.token);
  }
  salesStoreRoot_(path,JSON.stringify({storageFormat:'sales-parts-v1',generation,parts,length:payload.length}),c);
}
