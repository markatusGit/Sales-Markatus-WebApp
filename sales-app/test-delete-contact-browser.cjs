const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixture}=require('./test-delete.cjs');
(async()=>{
 const f=fixture(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
  const page=await browser.newPage(),calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.exposeFunction('fixtureRpc',(name,args)=>{calls.push({name,args});return JSON.parse(JSON.stringify(f.ctx[name](...args)));});
  await page.evaluate(()=>{const chain=(ok,fail)=>new Proxy({},{get(_,name){if(name==='withSuccessHandler')return f=>chain(f,fail);if(name==='withFailureHandler')return f=>chain(ok,f);return (...args)=>window.fixtureRpc(name,args).then(ok,fail);}});window.google={script:{run:chain(()=>{},()=>{})}};});
  await page.setContent(fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8'));await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();
  await page.getByRole('button',{name:'Kunden',exact:true}).click();await page.getByRole('button',{name:'Synthetic production customer',exact:true}).click();await page.getByRole('heading',{name:'Synthetic production customer',exact:true}).waitFor();
  const del=page.getByRole('button',{name:'Ansprechpartner löschen',exact:true});assert.equal(await del.count(),1,'one HQ contact, one delete button');
  // A blocked request keeps the form open and names the reason.
  f.db['sales_jobs/open-contact']={id:'open-contact',kind:'entityChange',business:1,entity:'contact',hqId:101,targetId:202,state:'pending'};
  await del.click();await page.getByText('Kontakthistorie, Projekte und Belege des Kunden bleiben erhalten',{exact:false}).first().waitFor();
  await page.getByLabel('Grund für die Löschung (Pflicht)',{exact:true}).fill('Synthetic left the company');
  await page.getByRole('button',{name:'Löschantrag stellen',exact:true}).click();await page.getByRole('status').filter({hasText:'1 offenen Auftrag'}).first().waitFor();
  assert.equal(f.db['sales_deletions/contact_202'],undefined);f.db['sales_jobs/open-contact'].state='synced';
  await page.getByRole('button',{name:'Löschantrag stellen',exact:true}).click();await page.locator('[data-contact-deletion="202"]').filter({hasText:'Wartet auf Freigabe durch einen Admin'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Ansprechpartner löschen',exact:true}).count(),0,'no second request while one is open');
  assert.equal(f.db['sales_deletions/contact_202'].state,'requested');assert.equal(f.calls.filter(c=>c.method==='delete').length,0);
  const out=path.join(__dirname,'../output');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'r41-contact-delete-request.png'),fullPage:true});
  await page.getByRole('button',{name:'Verwaltung',exact:true}).click();await page.getByRole('heading',{name:'Löschanträge für Kunden und Ansprechpartner',exact:true}).waitFor();
  await page.getByRole('button',{name:'Löschanträge anzeigen',exact:true}).click();
  const row=page.locator('[data-deletion-row="contact_202"]');await row.getByText('Ansprechpartner bei',{exact:false}).waitFor();
  await row.getByRole('button',{name:'Löschung freigeben',exact:true}).click();await row.getByText('Kontakthistorie, Projekte und Belege des Kunden bleiben erhalten',{exact:false}).waitFor();
  assert.equal(calls.filter(c=>c.name==='decideSalesCustomerDelete').length,0,'first click only asks again');
  await row.getByRole('button',{name:'Ja, endgültig löschen',exact:true}).click();await page.locator('[data-deletion-row="contact_202"]').getByText('Freigegeben · wird beim nächsten HQ-Abgleich gelöscht',{exact:true}).waitFor();
  assert.equal(f.db['sales_deletions/contact_202'].state,'approved');assert.equal(f.calls.filter(c=>c.method==='delete').length,0,'approval never writes to HQ');
  await page.screenshot({path:path.join(out,'r41-contact-delete-approve.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS single contact deletion: request in the customer file and two-step admin approval in a real browser');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
