const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{bulkFixture}=require('./test-sales-bulk.cjs');
(async()=>{
 const f=bulkFixture();f.config(70);f.doc(70,1001);f.finishBulk();
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
  const page=await browser.newPage(),calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.exposeFunction('fixtureRpc',(name,args)=>{calls.push({name,args});return JSON.parse(JSON.stringify(f.ctx[name](...args)));});
  await page.evaluate(()=>{window.auditTimers=[];const real=window.setInterval;window.setInterval=(fn,ms)=>{window.auditTimers.push({fn,ms});return real(fn,ms);};const chain=(ok,fail)=>new Proxy({},{get(_,name){if(name==='withSuccessHandler')return f=>chain(f,fail);if(name==='withFailureHandler')return f=>chain(ok,f);return (...args)=>window.fixtureRpc(name,args).then(ok,fail);}});window.google={script:{run:chain(()=>{},()=>{})}};});
  await page.setContent(fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8'));await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();
  assert.deepEqual(calls.map(c=>c.name),['getSalesLeanState']);assert.deepEqual(await page.evaluate(()=>auditTimers.map(t=>t.ms)),[5000]);
  for(let i=0;i<24;i++)await page.evaluate(()=>Promise.all(auditTimers.map(t=>t.fn())));
  assert.equal(calls.length,1,'No idle data polling or version checks on Home');
  await page.getByRole('button',{name:'Kunden',exact:true}).click();await page.getByLabel('Nach Namen suchen',{exact:true}).waitFor();
  const beforeSearch=calls.length;await page.getByLabel('Nach Namen suchen',{exact:true}).fill('Synthetic');assert.equal(calls.length,beforeSearch);
  await page.getByRole('button',{name:'Synthetic prospect',exact:true}).click();await page.getByRole('heading',{name:'Synthetic prospect',exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.name==='getSalesLeanCompany').length,1);
  await page.getByRole('button',{name:'Zur Kundenliste',exact:true}).click();await page.getByLabel('Nach Namen suchen',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Synthetic prospect',exact:true}).click();await page.getByRole('heading',{name:'Synthetic prospect',exact:true}).waitFor();assert.equal(calls.filter(c=>c.name==='getSalesLeanCompany').length,1);
  const stored=f.ctx.salesRead_('sales_companies/102');stored.company.name='Synthetic explicit refresh';f.ctx.salesWrite_('sales_companies/102',stored);
  for(let i=0;i<24;i++)await page.evaluate(()=>Promise.all(auditTimers.map(t=>t.fn())));
  assert.equal(await page.getByRole('heading',{name:'Synthetic prospect',exact:true}).count(),1);
  await page.getByRole('button',{name:'Aus Firebase neu laden',exact:true}).click();await page.getByRole('heading',{name:'Synthetic explicit refresh',exact:true}).waitFor();assert.equal(calls.filter(c=>c.name==='getSalesLeanCompany').length,2);
  await page.getByRole('button',{name:'Verwaltung',exact:true}).click();await page.getByRole('heading',{name:'Verwaltung',exact:true}).waitFor();
  await page.getByLabel('Zielumsatz netto (€)',{exact:true}).fill('321');await page.getByRole('button',{name:'Für alle in Firebase speichern',exact:true}).click();
  await page.getByText('Ziel und Termine dieser Ausgabe für alle Nutzer gespeichert.',{exact:false}).waitFor();
  assert.ok(calls.some(c=>c.name==='saveSalesLeanEditionSettings'));assert.ok(!calls.some(c=>c.name==='getSalesV1State'));
  await page.getByRole('button',{name:'Mein Tag',exact:true}).click();await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();assert.ok((await page.locator('main').innerText()).includes('321,00'));
  assert.deepEqual(errors,[]);console.log('PASS idle has zero data calls; names search stays local; reopen uses cache; explicit refresh and settings patch stay scoped');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
