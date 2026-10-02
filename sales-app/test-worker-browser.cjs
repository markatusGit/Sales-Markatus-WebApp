const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{chromium}=require('playwright'),{bulkFixture}=require('./test-sales-bulk.cjs');
(async()=>{
 const f=bulkFixture(),calls=[],errors=[];f.config(70);f.doc(70,700);
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
   async function open(){
     const page=await browser.newPage({viewport:{width:1440,height:1080}});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
     await page.exposeFunction('fixtureRpc',async(name,args)=>{calls.push(name);return JSON.parse(JSON.stringify(f.ctx[name](...args)));});
     await page.evaluate(()=>{const chain=(ok,fail)=>new Proxy({},{get(_,n){if(n==='withSuccessHandler')return f=>chain(f,fail);if(n==='withFailureHandler')return f=>chain(ok,f);return (...args)=>window.fixtureRpc(n,args).then(ok,fail);}});window.google={script:{run:chain(()=>{},()=>{})}};});
     await page.setContent(fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8'));await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();await page.getByRole('button',{name:'Datenabgleich',exact:true}).click();return page;
   }
   let page=await open();await page.getByRole('button',{name:'HQ synchronisieren',exact:true}).click();await page.getByText('Hintergrundlauf geplant · Google startet die Fortsetzung',{exact:true}).waitFor();assert.equal(calls.filter(n=>n==='runSalesSyncStep').length,0);const id=f.db['sales_meta/sync'].id;
   await page.getByRole('button',{name:'Nach diesem Abschnitt anhalten',exact:true}).click();await page.getByText('Angehalten · Fortschritt gespeichert',{exact:true}).waitFor();assert.equal(f.triggers.length,0);await page.close();
   page=await open();await page.getByRole('button',{name:'HQ-Sync fortsetzen',exact:true}).click();await page.getByText('Hintergrundlauf geplant · Google startet die Fortsetzung',{exact:true}).waitFor();await page.close();
   // No browser remains: simulate the scheduled server execution independently of every client RPC.
   f.setEmail('');f.worker();f.setEmail('pp@markatus.de');assert.equal(f.db['sales_meta/sync'].state,'completed');assert.equal(f.db['sales_meta/sync'].id,id);assert.equal(f.triggers.length,0);
   page=await open();await page.getByText('Abgeschlossen · Zahlen geprüft',{exact:true}).waitFor();assert.ok((await page.locator('body').innerText()).includes('Änderungen seit letztem Abgleich')===false);await page.screenshot({path:path.join(os.tmpdir(),'sales-r18-background-qa.png'),fullPage:true});
   await page.getByRole('button',{name:'HQ synchronisieren',exact:true}).click();await page.getByText('Änderungsabgleich',{exact:true}).waitFor();f.worker();await page.getByText('HQ-Sync abgeschlossen.',{exact:true}).waitFor();assert.ok(calls.includes('getSalesSyncStatus'));assert.ok(!calls.includes('runSalesSyncStep'));assert.deepEqual(errors,[]);console.log('PASS background start, persistent pause, closed-browser completion, delta and read-only polling');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
