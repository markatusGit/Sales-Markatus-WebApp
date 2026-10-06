const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{chromium}=require('playwright'),{bulkFixture}=require('./test-sales-bulk.cjs');
(async()=>{
 const f=bulkFixture(),calls=[],errors=[];f.config(70);f.doc(70,700);
 f.remote.Projects[571]={id:571,companyId:102,number:'P71',name:'Bamberger Ausgabe #71',updatedOn:'2026-01-01'};f.doc(71,701);f.remote.Documents[701].updatedOn='2026-01-01';
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
   async function open({legacy=false,missingGateway=false}={}){
     const page=await browser.newPage({viewport:{width:1440,height:1080}});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
     await page.exposeFunction('fixtureRpc',async(name,args)=>{calls.push(name);if(name==='startSalesSync'&&args.length)assert.deepEqual(args,[{mode:'editions'}]);const value=JSON.parse(JSON.stringify(f.ctx[name](...args)));if(legacy&&name==='getSalesV1State')delete value.capabilities;return value;});
     const methods=Object.keys(f.ctx).filter(n=>typeof f.ctx[n]==='function'&&!n.endsWith('_')&&n!=='startSalesEditionRefresh'&&(!missingGateway||n!=='startSalesSync'));
     await page.evaluate(methods=>{const chain=(ok,fail)=>new Proxy({},{get(_,n){if(n==='withSuccessHandler')return f=>chain(f,fail);if(n==='withFailureHandler')return f=>chain(ok,f);if(!methods.includes(n))return undefined;return (...args)=>window.fixtureRpc(n,args).then(ok,fail);}});window.google={script:{run:chain(()=>{},()=>{})}};},methods);
     await page.setContent(fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8'));await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();await page.getByRole('button',{name:'Datenabgleich',exact:true}).click();return page;
   }
   let page=await open();await page.getByRole('button',{name:'HQ synchronisieren',exact:true}).click();await page.getByText('Hintergrundlauf geplant · Google startet die Fortsetzung',{exact:true}).waitFor();assert.equal(calls.filter(n=>n==='runSalesSyncStep').length,0);const id=f.db['sales_meta/sync'].id;
   await page.getByRole('button',{name:'Nach diesem Abschnitt anhalten',exact:true}).click();await page.getByText('Angehalten · Fortschritt gespeichert',{exact:true}).waitFor();assert.equal(f.triggers.length,0);await page.close();
   page=await open();await page.getByRole('button',{name:'HQ-Sync fortsetzen',exact:true}).click();await page.getByText('Hintergrundlauf geplant · Google startet die Fortsetzung',{exact:true}).waitFor();await page.close();
   // No browser remains: simulate the scheduled server execution independently of every client RPC.
   f.setEmail('');f.worker();f.setEmail('pp@markatus.de');assert.equal(f.db['sales_meta/sync'].state,'completed');assert.equal(f.db['sales_meta/sync'].id,id);assert.equal(f.triggers.length,0);
   page=await open();await page.getByText('Abgeschlossen',{exact:true}).waitFor();assert.ok((await page.locator('body').innerText()).includes('Änderungen seit letztem Abgleich')===false);
   await page.getByRole('button',{name:'HQ synchronisieren',exact:true}).click();await page.getByText('Änderungsabgleich',{exact:true}).waitFor();f.worker();await page.getByText('HQ-Sync abgeschlossen.',{exact:true}).waitFor();assert.ok(calls.includes('getSalesSyncStatus'));assert.ok(!calls.includes('runSalesSyncStep'));assert.deepEqual(errors,[]);console.log('PASS background start, persistent pause, closed-browser completion, delta and read-only polling');
   await page.getByRole('button',{name:'Verwaltung',exact:true}).click();await page.getByLabel('HQ-Projekt suchen (Name oder Projektnummer)',{exact:true}).fill('Bamberger');await page.getByRole('button',{name:'Projekte in HQ suchen',exact:true}).click();
   await page.locator('[data-project-row="571"] [name=projectSelect]').check();await page.getByRole('button',{name:'Auswahl speichern',exact:true}).click();await page.getByText('Auswahl in Firebase gespeichert.',{exact:false}).waitFor();const before=f.calls.length;
   for(const options of [{legacy:true},{missingGateway:true}]){
     const badPage=await open(options),starts=calls.filter(n=>n==='startSalesSync').length,saved=JSON.stringify(f.db['sales_meta/sync']);
     await badPage.getByRole('button',{name:'Ausgaben aus Firebase verknüpfen',exact:true}).click();
     await badPage.getByText(options.legacy?/Die bereitgestellte Serverversion unterstützt/:/Serverfunktion „startSalesSync“/).waitFor();
     assert.equal(calls.filter(n=>n==='startSalesSync').length,starts);assert.equal(JSON.stringify(f.db['sales_meta/sync']),saved);await badPage.close();
   }
   await page.getByRole('button',{name:'Ausgaben aus Firebase verknüpfen',exact:true}).click();await page.getByText('Ausgaben aus Firebase verknüpfen',{exact:true}).waitFor();assert.equal(f.db['sales_meta/sync'].kind,'editions');f.worker();await page.getByText('Ausgabenverknüpfung abgeschlossen.',{exact:true}).waitFor();assert.equal(f.calls.length,before);assert.equal(f.db['sales_editions/project-571'].documents.length,1);assert.deepEqual(errors,[]);
   assert.ok(!calls.includes('startSalesEditionRefresh'));await page.screenshot({path:path.join(os.tmpdir(),'sales-r19.1-edition-cache-qa.png'),fullPage:true});console.log('PASS cache-only gateway without direct export, legacy/missing-server guards, navigation and background completion without HQ');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
