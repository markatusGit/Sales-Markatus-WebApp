const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright'),{setup}=require('./test-sales-v1.cjs');
(async()=>{
 const f=setup();for(let i=65;i<=69;i++){f.config(i);f.doc(i,i);}
 f.remote.Companies[103]={...f.remote.Companies[102],id:103,name:'Synthetic earlier client',industrialSector:'Medien',defaultAddress:{city:'Bamberg'}};f.doc(66,666,103);
 f.remote.ContactPersons[301]={id:301,companyId:102,firstName:'Ada',lastName:'Probe',eMail:'ada@example.invalid'};
 f.remote.Projects[570]={id:570,name:'Coburger #70',number:'P70',companyId:102,status:'Completed'};f.doc(70,700);
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.abort());let releaseFirstStep,gate=true;
  await page.exposeFunction('fixtureRpc',async(name,args)=>{calls.push(name);if(name==='runSalesImportStep'&&gate){gate=false;await new Promise(resolve=>{releaseFirstStep=resolve;});}return JSON.parse(JSON.stringify(f.ctx[name](...args)));});
  await page.evaluate(()=>{const chain=(ok,fail)=>new Proxy({}, {get(_,name){if(name==='withSuccessHandler')return fn=>chain(fn,fail);if(name==='withFailureHandler')return fn=>chain(ok,fn);return (...args)=>window.fixtureRpc(name,args).then(ok,fail);}});window.google={script:{run:chain(()=>{},()=>{})}};});
  await page.setContent(fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8'));
  await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();
  await page.getByRole('button',{name:'Verwaltung',exact:true}).click();
  await page.getByLabel('HQ-Projekt suchen (Name oder Projektnummer)',{exact:true}).fill('P70');
  await page.getByRole('button',{name:'Projekte in HQ suchen',exact:true}).click();
  await page.getByLabel('HQ-Sammelprojekt',{exact:true}).selectOption('570');
  await page.getByLabel('Magazinname',{exact:true}).fill('Coburger');await page.getByLabel('Ausgabennummer',{exact:true}).fill('70');
  await page.getByLabel('Als aktuelle Verkaufsausgabe verwenden',{exact:true}).check();
  await page.getByRole('button',{name:'Ausgabe zuordnen',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[name=v1Edition]')?.value==='project-570');
  await page.getByRole('button',{name:'Datenabgleich',exact:true}).click();
  const startCalls=f.calls.length;await page.getByRole('button',{name:'Daten aus HQ aktualisieren',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#magazin-vertrieb[aria-busy=true]')&&document.body.innerText.includes('Aktueller Abschnitt'));
  // Wait for the first queued RPC to reach the synthetic server, then interrupt the client loop.
  for(let i=0;!releaseFirstStep&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(releaseFirstStep);
  await page.getByRole('button',{name:'Nach diesem Abschnitt anhalten',exact:true}).click();releaseFirstStep();
  await page.getByText('Import angehalten; später fortsetzbar.',{exact:false}).waitFor();assert.equal(f.db['sales_meta/import'].state,'running');
  await page.getByRole('button',{name:'Import fortsetzen',exact:true}).click();await page.getByText('Datenimport abgeschlossen.',{exact:false}).waitFor();
  assert.equal(f.db['sales_meta/import'].state,'completed');assert.ok(f.calls.slice(startCalls).every(c=>c.method==='get'));
  await page.getByRole('button',{name:'Magazinverkauf',exact:true}).click();
  await page.getByLabel('Ausgabe',{exact:true}).selectOption('project-570');await page.getByLabel('Historie',{exact:true}).selectOption('last5');
  assert.equal(await page.locator('#customer-rows').getByRole('button',{name:'Synthetic prospect',exact:true}).count(),1);
  await page.getByLabel('Historie',{exact:true}).selectOption('lapsed');
  assert.equal(await page.locator('#customer-rows').getByRole('button',{name:'Synthetic earlier client',exact:true}).count(),1);
  assert.equal(await page.locator('#customer-rows').getByRole('button',{name:'Synthetic prospect',exact:true}).count(),0);
  await page.getByLabel('Ort',{exact:true}).selectOption('Bamberg');await page.getByLabel('Branche',{exact:true}).selectOption('Medien');
  const screenshot=path.join(os.tmpdir(),'sales-v1-magazine-qa.png');await page.screenshot({path:screenshot,fullPage:true});
  await page.getByRole('button',{name:'Ansprechpartner',exact:true}).click();await page.getByLabel('Ansprechpartner suchen',{exact:true}).fill('Ada');
  assert.equal(await page.getByRole('heading',{name:'Ada Probe',exact:true}).count(),1);
  await page.getByRole('button',{name:'Synthetic prospect',exact:true}).click();await page.getByRole('heading',{name:'Synthetic prospect',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Kommunikation erfassen',exact:true}).first().isDisabled(),true);
  assert.deepEqual(errors,[]);assert.ok(!calls.includes('runSalesJob'));
  console.log('PASS browser project selection, mapping, pause/resume, manual GET-only import, five-edition/lapsed/locality/industry filters, shared contacts and readonly real customer');console.log('Visual QA screenshot: '+screenshot);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
