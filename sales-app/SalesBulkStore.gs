/** Server-only Firestore transport. Indexed envelopes, chunked payloads, bounded commits. */
function salesBulkCollection_(entity){
  const names={Companies:'companies',ContactPersons:'contacts',ContactHistories:'histories',Projects:'projects',Documents:'documents',PlannedRevenues:'plans'};
  if(!names[entity])throw new Error('Unbekannte HQ-Datenart.');return 'sales_raw'+names[entity];
}
function salesBulkRest_(operation,body){
  // Every job write carries its searchable activity flag, so lists of open jobs never scan finished ones.
  if(operation==='commit'&&typeof salesJobWriteFields_==='function')body={...body,writes:body.writes.map(salesJobWriteFields_)};
  if(operation==='commit'&&typeof salesAuthProtectWrites_==='function')body={...body,writes:salesAuthProtectWrites_(body.writes)};
  const c=salesContext_();return pilotCall_(pilotUrl_(c.project,'').replace(/\/$/,'')+':'+operation,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+c.token},payload:JSON.stringify(body)});
}
function salesBulkName_(path){return 'projects/'+salesContext_().project+'/databases/(default)/documents/'+salesPath_(path);}
function salesBulkDecode_(doc){
  const path=doc.name.split('/documents/')[1];return salesDecodeStored_(path,doc.fields.payload.stringValue,salesContext_());
}
function salesBulkGet_(paths){
  paths=Array.from(new Set(paths));const result={},cache=salesBulkStepCache_?.documents;
  if(cache){for(const path of paths)if(cache.has(path))result[path]=cache.get(path);paths=paths.filter(path=>!cache.has(path));}
  for(let i=0;i<paths.length;i+=100){
    const batch=paths.slice(i,i+100),reply=salesBulkRest_('batchGet',{documents:batch.map(salesBulkName_)});
    if(!Array.isArray(reply))throw new Error('Firebase-Sammelantwort fehlt.');
    const seen=new Set();for(const row of reply){const name=row.found?.name||row.missing;if(!name)continue;const path=name.split('/documents/')[1];if(!batch.includes(path)||seen.has(path))throw new Error('Firebase-Sammelantwort widersprüchlich.');seen.add(path);result[path]=row.found?salesBulkDecode_(row.found):null;}
    if(seen.size!==batch.length)throw new Error('Firebase-Sammelantwort unvollständig.');
  }if(cache)for(const [path,value] of Object.entries(result))cache.set(path,value);return result;
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
    Object.entries({...(e.index||{}),...(salesBulkRawKeys_(e.path,e.value?.row)||{})}).forEach(([k,v])=>{fields[k]={stringValue:String(v)};});
    const write={update:{name:salesBulkName_(e.path),fields}},size=Utilities.newBlob(JSON.stringify(write)).getBytes().length;
    if(writes.length>=100||bytes+size>4000000)flush();writes.push(write);bytes+=size;
  }flush();
  if(salesBulkStepCache_){salesBulkStepCache_.rows.clear();for(const e of entries)salesBulkStepCache_.documents.set(e.path,e.value);}
  if(typeof salesLeanNamesUpdate_==='function')salesLeanNamesUpdate_(entries);
  if(typeof salesLeanFiltersUpdate_==='function')salesLeanFiltersUpdate_(entries);
}
const SALES_BULK_QUERY_FIELDS=['companyBucket','projectBucket','companyKey','projectKey'];
/** Raw query result with paths and stored index fields. An array value asks for up to 30 keys per request (IN). */
function salesBulkQueryDocs_(collection,field,value){
  if(!/^sales_(raw(companies|contacts|histories|projects|documents|plans)|projectviews)$/.test(collection)||!SALES_BULK_QUERY_FIELDS.includes(field))throw new Error('Firebase-Sammelabfrage nicht freigegeben.');
  const values=Array.isArray(value)?Array.from(new Set(value.map(String))):null,out=[];
  if(values&&!values.length)return out;
  for(let i=0;i<(values?values.length:1);i+=30){
    const where=values?{fieldFilter:{field:{fieldPath:field},op:'IN',value:{arrayValue:{values:values.slice(i,i+30).map(v=>({stringValue:v}))}}}}:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:{stringValue:String(value)}}};
    let last='',page=0;
    for(;page<100;page++){
      const query={from:[{collectionId:collection}],where,orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:250};
      if(last)query.startAt={values:[{referenceValue:last}],before:false};
      const result=salesBulkRest_('runQuery',{structuredQuery:query});if(!Array.isArray(result))throw new Error('Firebase-Abfrage unvollständig.');
      const docs=result.filter(r=>r.document).map(r=>r.document);
      for(const doc of docs){if(doc.name===last)throw new Error('Firebase-Seite wiederholt sich.');const path=doc.name.split('/documents/')[1],stored=salesBulkDecode_(doc);out.push({path,value:stored,fields:doc.fields});if(salesBulkStepCache_)salesBulkStepCache_.documents.set(path,stored);}
      if(docs.length<250)break;last=docs[docs.length-1].name;
    }
    if(page>=100)throw new Error('Datenpartition überschreitet 25.000 Einträge; weitere Aufteilung erforderlich. Bisherige Kundenansicht bleibt erhalten.');
  }
  return out;
}
function salesBulkQuery_(collection,field,value){return salesBulkQueryDocs_(collection,field,value).map(d=>d.value);}
function salesBulkBucket_(id){return Number(id)>0?String(Number(id)%64):'none';}
let salesBulkStepCache_=null;
/** Firm and project keys on every raw record let a sync read only the firms and projects that changed instead of
 * the whole 1/64 group. Records stored before r41 receive them once, group by group (bulkKeys / salesBulkTag_). */
const SALES_RAW_ENTITY={sales_rawcompanies:'Companies',sales_rawcontacts:'ContactPersons',sales_rawhistories:'ContactHistories',sales_rawprojects:'Projects',sales_rawdocuments:'Documents',sales_rawplans:'PlannedRevenues'};
function salesBulkKey_(id){return Number(id)>0?String(Number(id)):'none';}
function salesBulkRawKeys_(path,row){
  const entity=SALES_RAW_ENTITY[String(path).split('/')[0]];if(!entity||!row)return null;
  return {companyKey:salesBulkKey_(entity==='Companies'?row.id:row.companyId),projectKey:salesBulkKey_(entity==='Projects'?row.id:row.projectId)};
}
const SALES_KEY_GROUPS=[...Array.from({length:64},(_,i)=>String(i)),'none'];
// A key query is complete once every record of that group carries keys. Firm groups are tracked in "done",
// project groups in "pdone" (r42.2); before that, project-key queries had to wait for the whole collection.
function salesBulkKeyed_(tags,entity,field,bucket){
  const t=tags?.collections?.[salesBulkCollection_(entity)];if(!t)return false;
  return !!t.complete||((field==='companyBucket'?t.done:t.pdone)||[]).includes(String(bucket));
}
/** Rows of one group. With keys and a fully keyed group, only the records of those firms/projects are read. */
function salesBulkRows_(run,entity,field,bucket,keys){
  const generation=run.entities[entity].generation,keyed=Array.isArray(keys)&&salesBulkKeyed_(run.keyTags,entity,field,bucket);
  const keyField=field==='companyBucket'?'companyKey':'projectKey',wanted=keyed?Array.from(new Set(keys.map(salesBulkKey_))).sort():null;
  const key=[generation,entity,keyed?keyField:field,keyed?wanted.join(','):bucket].join(':'),cache=salesBulkStepCache_?.rows;if(cache?.has(key))return cache.get(key);
  let docs;
  if(keyed)docs=salesBulkQueryDocs_(salesBulkCollection_(entity),keyField,wanted);
  else {docs=salesBulkQueryDocs_(salesBulkCollection_(entity),field,bucket);salesBulkTag_(run,entity,docs,field,String(bucket));}
  const rows=docs.map(d=>d.value).filter(v=>v.generation===generation).map(v=>v.row);
  if(cache)cache.set(key,rows);return rows;
}
/** Adds missing keys to records that were read anyway. Only the two key fields are written (no payload), within the
 * run's remaining budget. A firm or project group counts as done only when every current record of it carries keys. */
function salesBulkTag_(run,entity,docs,field,group){
  const tags=run.keyTags;if(!tags?.collections||run.full||!run.entities?.[entity])return;
  const collection=salesBulkCollection_(entity),generation=run.entities[entity].generation,t=tags.collections[collection]||(tags.collections[collection]={done:[],complete:false});
  const list=field==='companyBucket'?'done':'pdone',groups=t[list]||(t[list]=[]);
  if(t.complete||groups.includes(group))return;
  const missing=docs.filter(d=>{if(d.value?.generation!==generation||!d.value.row)return false;const k=salesBulkRawKeys_(d.path,d.value.row);return d.fields?.companyKey?.stringValue!==k.companyKey||d.fields?.projectKey?.stringValue!==k.projectKey;});
  const allowed=missing.slice(0,Math.max(0,tags.budget||0));
  for(let i=0;i<allowed.length;i+=100){
    const writes=allowed.slice(i,i+100).map(d=>{const k=salesBulkRawKeys_(d.path,d.value.row);return {update:{name:salesBulkName_(d.path),fields:{companyKey:{stringValue:k.companyKey},projectKey:{stringValue:k.projectKey}}},updateMask:{fieldPaths:['companyKey','projectKey']},currentDocument:{exists:true}};});
    salesBulkRest_('commit',{writes});
  }
  tags.budget=(tags.budget||0)-allowed.length;tags.written=(tags.written||0)+allowed.length;tags.runWritten=(tags.runWritten||0)+allowed.length;
  // Every record has exactly one firm group and one project group: either list complete means every record is keyed.
  if(allowed.length===missing.length){groups.push(group);if(SALES_KEY_GROUPS.every(g=>groups.includes(g)))t.complete=true;}
}
