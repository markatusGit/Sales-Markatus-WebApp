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
function salesStorePayload_(path,value){
  path=salesPath_(path);const c=salesContext_(),payload=JSON.stringify(value);
  if(Utilities.newBlob(payload).getBytes().length<=650000){pilotWriteDocument_(c.project,path,{payload},c.token);return;}
  const generation=Utilities.getUuid(),parts=Math.ceil(payload.length/100000);
  if(parts>2000)throw new Error('Datensatz überschreitet das Gesamtlimit: '+path+'. Bisheriger Stand bleibt erhalten.');
  for(let i=0;i<parts;i++){
    const fragment=JSON.stringify({source:path,index:i,text:payload.slice(i*100000,(i+1)*100000)});
    if(Utilities.newBlob(fragment).getBytes().length>750000)throw new Error('Teilpaket überschreitet das Größenlimit: '+path);
    pilotWriteDocument_(c.project,'sales_chunks/'+generation+'-'+i,{payload:fragment},c.token);
  }
  pilotWriteDocument_(c.project,path,{payload:JSON.stringify({storageFormat:'sales-parts-v1',generation,parts,length:payload.length})},c.token);
}
