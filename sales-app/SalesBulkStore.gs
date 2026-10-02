/** Server-only Firestore transport. Indexed envelopes, chunked payloads, bounded commits. */
function salesBulkCollection_(entity){
  const names={Companies:'companies',ContactPersons:'contacts',ContactHistories:'histories',Projects:'projects',Documents:'documents',PlannedRevenues:'plans'};
  if(!names[entity])throw new Error('Unbekannte HQ-Datenart.');return 'sales_raw'+names[entity];
}
function salesBulkRest_(operation,body){
  const c=salesContext_();return pilotCall_(pilotUrl_(c.project,'').replace(/\/$/,'')+':'+operation,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+c.token},payload:JSON.stringify(body)});
}
function salesBulkName_(path){return 'projects/'+salesContext_().project+'/databases/(default)/documents/'+salesPath_(path);}
function salesBulkDecode_(doc){
  const path=doc.name.split('/documents/')[1];return salesDecodeStored_(path,doc.fields.payload.stringValue,salesContext_());
}
function salesBulkGet_(paths){
  const result={};for(let i=0;i<paths.length;i+=100){
    const batch=paths.slice(i,i+100),reply=salesBulkRest_('batchGet',{documents:batch.map(salesBulkName_)});
    if(!Array.isArray(reply))throw new Error('Firebase-Sammelantwort fehlt.');
    const seen=new Set();for(const row of reply){const name=row.found?.name||row.missing;if(!name)continue;const path=name.split('/documents/')[1];if(!batch.includes(path)||seen.has(path))throw new Error('Firebase-Sammelantwort widersprüchlich.');seen.add(path);result[path]=row.found?salesBulkDecode_(row.found):null;}
    if(seen.size!==batch.length)throw new Error('Firebase-Sammelantwort unvollständig.');
  }return result;
}
function salesBulkPayload_(path,value){
  const payload=JSON.stringify(value);if(Utilities.newBlob(payload).getBytes().length<=650000)return payload;
  const generation=Utilities.getUuid(),parts=Math.ceil(payload.length/100000);if(parts>2000)throw new Error('Datenpaket zu groß; bisherige Ansicht bleibt erhalten.');
  for(let i=0;i<parts;i++)salesWrite_('sales_chunks/'+generation+'-'+i,{source:path,index:i,text:payload.slice(i*100000,(i+1)*100000)});
  return JSON.stringify({storageFormat:'sales-parts-v1',generation,parts,length:payload.length});
}
function salesBulkPut_(entries){
  let writes=[],bytes=0;const flush=()=>{if(writes.length){salesBulkRest_('commit',{writes});writes=[];bytes=0;}};
  for(const e of entries){
    const fields={payload:{stringValue:salesBulkPayload_(e.path,e.value)}};
    Object.entries(e.index||{}).forEach(([k,v])=>{fields[k]={stringValue:String(v)};});
    const write={update:{name:salesBulkName_(e.path),fields}},size=Utilities.newBlob(JSON.stringify(write)).getBytes().length;
    if(writes.length>=100||bytes+size>4000000)flush();writes.push(write);bytes+=size;
  }flush();
}
function salesBulkQuery_(collection,field,value){
  if(!/^sales_(raw(companies|contacts|histories|projects|documents|plans)|projectviews)$/.test(collection)||!['companyBucket','projectBucket'].includes(field))throw new Error('Firebase-Sammelabfrage nicht freigegeben.');
  const out=[];let last='';
  for(let page=0;page<100;page++){
    const query={from:[{collectionId:collection}],where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:{stringValue:String(value)}}},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:250};
    if(last)query.startAt={values:[{referenceValue:last}],before:false};
    const result=salesBulkRest_('runQuery',{structuredQuery:query});if(!Array.isArray(result))throw new Error('Firebase-Abfrage unvollständig.');
    const docs=result.filter(r=>r.document).map(r=>r.document);for(const doc of docs){if(doc.name===last)throw new Error('Firebase-Seite wiederholt sich.');out.push(salesBulkDecode_(doc));}if(docs.length<250)return out;last=docs[docs.length-1].name;
  }throw new Error('Datenpartition überschreitet 25.000 Einträge; weitere Aufteilung erforderlich. Bisherige Kundenansicht bleibt erhalten.');
}
function salesBulkBucket_(id){return Number(id)>0?String(Number(id)%64):'none';}
function salesBulkRows_(run,entity,field,bucket){
  const generation=run.entities[entity].generation;
  return salesBulkQuery_(salesBulkCollection_(entity),field,bucket).filter(v=>v.generation===generation).map(v=>v.row);
}
