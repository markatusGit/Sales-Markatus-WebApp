const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{productionFixture}=require('./test-business.cjs');
(async()=>{
 const f=productionFixture();f.ctx.saveSalesHistory({companyId:101,channel:'Note',reason:'Synthetic pending history',content:'Preserve while editing',contactOn:'2026-10-18T09:00:00Z'});
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
  const page=await browser.newPage(),calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.exposeFunction('fixtureRpc',(name,args)=>{calls.push({name,args});return JSON.parse(JSON.stringify(f.ctx[name](...args)));});
  await page.evaluate(()=>{const chain=(ok,fail)=>new Proxy({},{get(_,name){if(name==='withSuccessHandler')return f=>chain(f,fail);if(name==='withFailureHandler')return f=>chain(ok,f);return (...args)=>window.fixtureRpc(name,args).then(ok,fail);}});window.google={script:{run:chain(()=>{},()=>{})}};});
  await page.setContent(fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8'));await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();
  await page.getByRole('button',{name:'Kunden',exact:true}).click();await page.getByRole('button',{name:'Synthetic production customer',exact:true}).click();await page.getByRole('heading',{name:'Synthetic production customer',exact:true}).waitFor();
  const before=calls.length;await page.getByRole('button',{name:'Firmendaten bearbeiten',exact:true}).click();await page.getByRole('heading',{name:'Stammdaten bearbeiten',exact:true}).waitFor();assert.deepEqual(calls.slice(before).map(c=>c.name),['getSalesEditor']);
  const qaDirectory=require('node:path').join(__dirname,'../output');fs.mkdirSync(qaDirectory,{recursive:true});await page.screenshot({path:require('node:path').join(qaDirectory,'r22-editor.png'),fullPage:true});
  await page.getByLabel('Firmenname',{exact:true}).fill('Synthetic browser customer');await page.getByLabel('Umsatzsteuer-ID',{exact:true}).fill('synthetic-vat');
  const n=f.calls.filter(c=>c.method!=='get').length;await page.getByRole('button',{name:'Änderungen in Firebase speichern',exact:true}).click();await page.getByRole('heading',{name:'Synthetic browser customer',exact:true}).waitFor();
  assert.equal(f.calls.filter(c=>c.method!=='get').length,n);const saved=calls.find(c=>c.name==='saveSalesEntityChange');assert.deepEqual(Object.keys(saved.args[0].change).sort(),['name','vatId']);assert.ok(!('id' in saved.args[0].change));
  assert.equal(await page.getByRole('heading',{name:'Synthetic pending history',exact:true}).count(),1);
  const first=Object.values(f.db).find(j=>j.kind==='entityChange');f.ctx.salesSyncWrite_({id:first.id});
  await page.getByRole('button',{name:'Aus Firebase neu laden',exact:true}).click();await page.getByText('Diese Ansicht frisch aus Firebase geladen.',{exact:false}).count();
  await page.getByRole('button',{name:'Ansprechpartner bearbeiten',exact:true}).click();await page.getByLabel('Mobiltelefon',{exact:true}).fill('synthetic-mobile');
  await page.getByRole('button',{name:'Änderungen in Firebase speichern',exact:true}).click();await page.getByRole('heading',{name:'Synthetic browser customer',exact:true}).waitFor();
  const contact=Object.values(f.db).find(j=>j.kind==='entityChange'&&j.entity==='contact');assert.deepEqual(Object.keys(contact.change),['phoneMobile']);f.ctx.salesSyncWrite_({id:contact.id});
  await page.getByRole('button',{name:'Adresse bearbeiten',exact:true}).click();await page.getByLabel('Ort',{exact:true}).fill('Synthetic browser city');await page.getByRole('button',{name:'Änderungen in Firebase speichern',exact:true}).click();await page.getByRole('heading',{name:'Synthetic browser customer',exact:true}).waitFor();
  const address=Object.values(f.db).find(j=>j.kind==='entityChange'&&j.entity==='address');assert.deepEqual(Object.keys(address.change),['city']);f.ctx.salesSyncWrite_({id:address.id});
  await page.getByRole('button',{name:'Firmenart bearbeiten',exact:true}).click();await page.locator('input[name="type.2"]').uncheck();await page.locator('input[name="type.3"]').check();await page.getByLabel('Nummer · Kunde',{exact:true}).fill('synthetic-number');
  await page.getByRole('button',{name:'Änderungen in Firebase speichern',exact:true}).click();await page.getByRole('heading',{name:'Synthetic browser customer',exact:true}).waitFor();const types=Object.values(f.db).find(j=>j.entity==='types');assert.equal(types.change.companyTypes[0].companyTypeId,3);assert.equal(types.change.companyTypes[0].number,'synthetic-number');
  await page.getByLabel('Gespräch / Notiz',{exact:true}).fill('Synthetic customer note');
  const lastWrite=f.calls.filter(c=>c.method!=='get').length;await page.getByRole('button',{name:'Speichern',exact:true}).click();await page.getByText('Synthetic customer note',{exact:true}).waitFor();assert.equal(f.calls.filter(c=>c.method!=='get').length,lastWrite);
  assert.deepEqual(errors,[]);assert.ok(!calls.some(c=>c.name==='getSalesV1State'));console.log('PASS ordinary customer: targeted editor, changed fields only, pending display, contact/address edits and Firebase-only activity');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
