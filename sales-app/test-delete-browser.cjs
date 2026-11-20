const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{fixture,TEAM,ADMIN}=require('./test-delete.cjs');
(async()=>{
 const f=fixture(),unsent=f.ctx.saveSalesCompany({...f.input,name:'Synthetic unsent customer'});f.db['sales_meta/lean_names'].rows.push({id:'draft_'+unsent.id,name:'Synthetic unsent customer'});const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
  const page=await browser.newPage(),calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.exposeFunction('fixtureRpc',(name,args)=>{calls.push({name,args});return JSON.parse(JSON.stringify(f.ctx[name](...args)));});
  await page.evaluate(()=>{const chain=(ok,fail)=>new Proxy({},{get(_,name){if(name==='withSuccessHandler')return f=>chain(f,fail);if(name==='withFailureHandler')return f=>chain(ok,f);return (...args)=>window.fixtureRpc(name,args).then(ok,fail);}});window.google={script:{run:chain(()=>{},()=>{})}};});
  await page.setContent(fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8'));await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();
  await page.getByRole('button',{name:'Kunden',exact:true}).click();await page.getByRole('button',{name:'Synthetic production customer',exact:true}).click();await page.getByRole('heading',{name:'Synthetic production customer',exact:true}).waitFor();
  const header=page.locator('.m-pagehead');assert.equal(await header.getByRole('button',{name:'Kunde löschen',exact:true}).count(),1,'delete button in the header');
  await page.screenshot({path:path.join(__dirname,'../output/r34-1-delete-header.png')});
  // A blocked request shows the clean-up hint and leaves the form open.
  f.db['sales_companies/101'].projects=[{id:9,name:'Synthetic project'}];
  await page.getByRole('button',{name:'Kunde löschen',exact:true}).click();await page.getByLabel('Grund für die Löschung (Pflicht)',{exact:true}).fill('Synthetic duplicate');
  await page.getByRole('button',{name:'Löschantrag stellen',exact:true}).click();await page.getByRole('status').filter({hasText:'Bitte zuerst aufräumen'}).first().waitFor();
  assert.equal(f.db['sales_deletions/101'],undefined);f.db['sales_companies/101'].projects=[];
  await page.getByRole('button',{name:'Löschantrag stellen',exact:true}).click();await page.locator('[data-deletion-status]').filter({hasText:'Wartet auf Freigabe durch einen Admin'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Kunde löschen',exact:true}).count(),0,'no second request button while a request is open');
  assert.equal(f.db['sales_deletions/101'].state,'requested');assert.equal(f.calls.filter(c=>c.method==='delete').length,0);
  const out=path.join(__dirname,'../output');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'r34-delete-request.png'),fullPage:true});
  await page.getByRole('button',{name:'Verwaltung',exact:true}).click();await page.getByRole('heading',{name:'Löschanträge für Kunden',exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.name==='listSalesCustomerDeletions').length,0,'list only on click');
  await page.getByRole('button',{name:'Löschanträge anzeigen',exact:true}).click();await page.getByText('Grund: Synthetic duplicate',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Löschung freigeben',exact:true}).click();await page.getByText('Wirklich endgültig löschen?',{exact:false}).waitFor();
  assert.equal(calls.filter(c=>c.name==='decideSalesCustomerDelete').length,0,'first click only asks again');
  await page.screenshot({path:path.join(out,'r34-delete-approve.png'),fullPage:true});
  await page.getByRole('button',{name:'Ja, endgültig löschen',exact:true}).click();await page.locator('[data-deletion-row="101"]').filter({hasText:'Freigegeben · wird beim nächsten HQ-Abgleich gelöscht'}).waitFor();
  assert.equal(f.db['sales_deletions/101'].state,'approved');assert.equal(f.calls.filter(c=>c.method==='delete').length,0,'approval never writes to HQ');
  const writesBefore=f.calls.filter(c=>c.method!=='get').length;
  await page.getByRole('button',{name:'Kunden',exact:true}).click();await page.getByRole('button',{name:'Synthetic unsent customer',exact:true}).click();await page.getByRole('heading',{name:'Synthetic unsent customer',exact:true}).waitFor();
  await page.locator('.m-pagehead').getByRole('button',{name:'Kunde löschen',exact:true}).click();await page.getByText('noch nicht an HQ übertragen',{exact:false}).waitFor();
  await page.getByLabel('Grund für die Löschung (Pflicht)',{exact:true}).fill('Synthetic wrong entry');await page.getByRole('button',{name:'Löschantrag stellen',exact:true}).click();await page.locator('[data-deletion-status]').waitFor();
  await page.getByRole('button',{name:'Verwaltung',exact:true}).click();await page.getByRole('button',{name:'Neu laden',exact:true}).click();
  const row=page.locator('[data-deletion-row="draft_'+unsent.id+'"]');await row.getByText('noch nicht in HQ',{exact:false}).waitFor();
  await row.getByRole('button',{name:'Löschung freigeben',exact:true}).click();await row.getByText('sofort in der App gelöscht',{exact:false}).waitFor();await row.getByRole('button',{name:'Ja, endgültig löschen',exact:true}).click();
  await page.locator('[data-deletion-row="draft_'+unsent.id+'"]').getByText('Gelöscht',{exact:true}).waitFor();assert.ok(f.db['sales_drafts/'+unsent.id].deletedAt);assert.equal(f.calls.filter(c=>c.method!=='get').length,writesBefore,'no HQ write at all');
  assert.deepEqual(errors,[]);console.log('PASS customer deletion request, clean-up hint and two-step admin approval (HQ and unsent customers) in a real browser');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
