const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const {communicationFixture}=require('./test-communication.cjs');
(async()=>{
 const f=communicationFixture(),base=f.db['sales_companies/101'];
 base.contacts.push({id:203,companyId:101,firstName:'Synthetic',lastName:'Recent'},{id:204,companyId:101,firstName:'Synthetic',lastName:'Other'});
 for(const c of base.contacts)f.remote.ContactPersons[c.id]={...c};
 base.histories=[{id:1,contactPersonId:203,reason:'Latest valid conversation',content:'Synthetic prior note',contactOn:'2026-10-21T10:00:00Z',contactHistoryChannel:'Note'},{id:2,contactPersonId:999,reason:'Missing person',contactOn:'2026-10-22T10:00:00Z',contactHistoryChannel:'Note'},{id:3,contactPersonId:202,documentDispatch:true,reason:'Document is not a conversation',contactOn:'2026-10-23T10:00:00Z'}];
 for(let i=0;i<60;i++)base.histories.push({id:100+i,content:'Synthetic historical note '+i,contactOn:'2026-09-01T10:00:00Z',contactHistoryChannel:'Note'});
 base.projects=Array.from({length:12},(_,i)=>({id:i,number:'SYN-'+i,name:'Synthetic project '+i,completed:true,revenueCents:0,complete:true}));
 f.db['sales_directory/102']={company:{...base.company,id:'102',name:'Synthetic second customer'},contacts:[]};
 f.db['sales_companies/102']={company:f.db['sales_directory/102'].company,contacts:[],histories:[],projects:[],detailVersion:3};
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000},timezoneId:'Europe/Berlin'}),calls=[],errors=[];let lose=null;
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.exposeFunction('fixtureRpc',(name,args)=>{calls.push({name,args});const r=f.ctx[name](...args);if(lose===name){lose=null;throw Error('Synthetic response lost');}return JSON.parse(JSON.stringify(r));});
  await page.evaluate(()=>{const chain=(ok,fail)=>new Proxy({},{get(_,name){if(name==='withSuccessHandler')return f=>chain(f,fail);if(name==='withFailureHandler')return f=>chain(ok,f);return (...args)=>window.fixtureRpc(name,args).then(ok,fail);}});window.google={script:{run:chain(()=>{},()=>{})}};});
  await page.setContent(fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8'));
  await page.getByRole('heading',{name:'Mein Tag',exact:true}).waitFor();
  await page.getByRole('button',{name:'Kunden',exact:true}).click();await page.getByRole('button',{name:'Synthetic production customer',exact:true}).click();
  const note=page.getByLabel('Gespräch / Notiz',{exact:true}),person=page.getByLabel('Ansprechpartner',{exact:true}),time=page.getByLabel('Datum / Uhrzeit',{exact:true});
  await note.waitFor();assert.equal(await person.inputValue(),'203');assert.equal(await page.getByLabel('Kontaktart',{exact:true}).count(),0);assert.equal(await page.getByLabel('Betreff',{exact:true}).count(),0);
  const contactsPanel=page.locator('[data-customer-list="contacts"]'),projectsPanel=page.locator('[data-customer-list="projects"]');
  assert.equal(await contactsPanel.getByRole('searchbox').count(),0);assert.equal(await contactsPanel.locator('.m-customer-list-rows').evaluate(el=>el.style.maxHeight),'');
  assert.equal(await page.getByRole('heading',{name:'Allgemein',exact:true}).locator('..').locator('..').getByRole('heading',{name:'Firmenadressen',exact:true}).count(),1);
  const projectSearch=projectsPanel.getByRole('searchbox'),filterCalls=calls.length;
  const listMetrics=panel=>panel.locator('.m-customer-list-rows').evaluate(el=>({height:el.clientHeight,total:el.scrollHeight,firstThree:Array.from(el.querySelectorAll('[data-customer-list-row]:not([hidden])')).slice(0,3).reduce((n,row)=>n+row.getBoundingClientRect().height,0)}));
  const initialProjects=await listMetrics(projectsPanel);assert.ok(initialProjects.total>initialProjects.height);assert.ok(Math.abs(initialProjects.height-initialProjects.firstThree)<=1);
  await projectSearch.fill('SYN-11');assert.equal(await projectsPanel.locator('[data-customer-list-row]:not([hidden])').count(),1);
  await projectSearch.fill('no matching synthetic project');assert.equal(await projectsPanel.locator('[data-list-empty]').isVisible(),true);
  await projectSearch.fill('');assert.equal(calls.length,filterCalls);
  const n=calls.length,captureBefore=await page.locator('.m-capture').boundingBox();
  await page.locator('.m-customer-details').evaluate(el=>el.scrollTop=700);await page.locator('.m-history-scroll').evaluate(el=>el.scrollTop=500);
  assert.equal(await page.locator('.m-capture').evaluate(el=>Math.round(el.getBoundingClientRect().top)),Math.round(captureBefore.y));
  assert.ok(await page.locator('.m-customer-details').evaluate(el=>el.scrollTop)>0);assert.ok(await page.locator('.m-history-scroll').evaluate(el=>el.scrollTop)>0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
  await note.fill('Synthetic draft survives modal and customer changes');await time.fill('2026-10-20T11:12');
  await person.selectOption('__new');await page.getByRole('dialog').waitFor();
  await page.getByLabel('Vorname',{exact:true}).fill('Synthetic');await page.getByRole('button',{name:'Anlegen',exact:true}).click();assert.equal(calls.length,n);
  await page.getByLabel('Nachname',{exact:true}).fill('Popup');
  await page.getByRole('button',{name:'Abbrechen',exact:true}).click();assert.equal(await note.count(),1,JSON.stringify({errors,body:await page.locator('body').innerText()}));assert.equal(await note.inputValue(),'Synthetic draft survives modal and customer changes');assert.equal(calls.length,n);
  await page.getByRole('button',{name:'Zur Kundenliste',exact:true}).click();await page.getByRole('button',{name:'Synthetic second customer',exact:true}).click();await note.waitFor();assert.equal(await person.inputValue(),'');
  await page.getByRole('button',{name:'Zur Kundenliste',exact:true}).click();await page.getByRole('button',{name:'Synthetic production customer',exact:true}).click();await note.waitFor();
  assert.equal(await note.inputValue(),'Synthetic draft survives modal and customer changes');assert.equal(await time.inputValue(),'2026-10-20T11:12');assert.equal(calls.filter(c=>c.name==='getSalesLeanCompany').length,2);
  const beforeCreate=calls.length,hqBefore=f.calls.length;await person.selectOption('__new');await page.getByRole('dialog').waitFor();
  assert.equal(await page.getByLabel('Nachname',{exact:true}).inputValue(),'Popup');await page.getByRole('button',{name:'Anlegen',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal(calls.length,beforeCreate+1);assert.equal(calls.at(-1).name,'createSalesCustomerContact');assert.equal(f.calls.length,hqBefore);
  assert.ok((await person.inputValue()).startsWith('local_comm_'));assert.equal(await page.getByRole('heading',{name:'Synthetic Popup',exact:true}).count(),1);assert.equal(await note.inputValue(),'Synthetic draft survives modal and customer changes');
  const contactSearch=contactsPanel.getByRole('searchbox'),afterCreate=calls.length;assert.equal(await contactSearch.count(),1);
  const contactMetrics=await listMetrics(contactsPanel);assert.ok(contactMetrics.total>contactMetrics.height);assert.ok(Math.abs(contactMetrics.height-contactMetrics.firstThree)<=1);
  await contactSearch.fill('pop');assert.equal(await contactsPanel.locator('[data-customer-list-row]:not([hidden])').count(),1);
  await contactSearch.press('u');assert.equal(await contactSearch.inputValue(),'popu');assert.equal(await contactsPanel.locator('[data-customer-list-row]:not([hidden])').count(),1);
  await page.getByLabel('Anzeige',{exact:true}).selectOption('communication');assert.equal(await contactSearch.inputValue(),'popu');assert.equal(await note.inputValue(),'Synthetic draft survives modal and customer changes');
  await contactSearch.fill('no matching synthetic person');assert.equal(await contactsPanel.locator('[data-list-empty]').isVisible(),true);
  await contactSearch.fill('');assert.equal(await contactsPanel.locator('[data-customer-list-row]:not([hidden])').count(),4);assert.equal(calls.length,afterCreate);
  await person.selectOption('__new');await page.getByRole('dialog').waitFor();await page.getByLabel('Vorname',{exact:true}).fill('Synthetic');await page.getByLabel('Nachname',{exact:true}).fill('Lost popup');lose='createSalesCustomerContact';
  await page.getByRole('button',{name:'Anlegen',exact:true}).click();await page.locator('.m-dialog-error').getByText('Synthetic response lost',{exact:true}).waitFor();const lostContactId=calls.at(-1).args[0].requestId,contactCount=f.db['sales_communication/101'].contacts.length;
  await page.getByRole('button',{name:'Abbrechen',exact:true}).click();await person.selectOption('__new');await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Anlegen',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal(calls.at(-1).args[0].requestId,lostContactId);assert.equal(f.db['sales_communication/101'].contacts.length,contactCount);assert.equal(await note.inputValue(),'Synthetic draft survives modal and customer changes');
  const beforeSave=calls.length;await page.getByRole('button',{name:'Speichern',exact:true}).click();await page.getByText('Synthetic draft survives modal and customer changes',{exact:true}).waitFor();
  assert.equal(calls.length,beforeSave+1);assert.equal(calls.at(-1).args[0].contactOn,'2026-10-20T09:12:00.000Z');assert.equal(await note.inputValue(),'');assert.equal(f.calls.length,hqBefore);
  assert.equal(await page.locator('.m-history-scroll').evaluate(el=>el.scrollTop),0);
  // A response can disappear after a successful commit. Retry must keep the same operation and clear only on acknowledgement.
  await note.fill('Synthetic lost response note');lose='saveSalesCommunication';await page.getByRole('button',{name:'Speichern',exact:true}).click();
  await page.getByText('Synthetic response lost',{exact:true}).waitFor();assert.equal(await note.inputValue(),'Synthetic lost response note');assert.equal(await note.isDisabled(),true);
  const savedId=calls.at(-1).args[0].requestId,count=f.db['sales_communication/101'].histories.length;
  await page.getByRole('button',{name:'Speichern',exact:true}).click();await page.getByText('Synthetic lost response note',{exact:true}).waitFor();
  assert.equal(calls.at(-1).args[0].requestId,savedId);assert.equal(f.db['sales_communication/101'].histories.length,count);assert.equal(await note.isDisabled(),false);
  await page.getByRole('button',{name:'Nicht erreicht',exact:true}).click();await page.getByRole('heading',{name:'Nicht erreicht',exact:true}).waitFor();
  assert.equal(calls.at(-1).args[0].notReached,true);assert.equal(calls.at(-1).args[0].content,'');
  // A fresh customer snapshot must use the latest team contact, without losing an unfinished note.
  base.histories.push({id:999,contactPersonId:204,contactOn:'2027-01-01T10:00:00Z',contactHistoryChannel:'Note',content:'Synthetic newest team contact'});
  await page.getByRole('button',{name:'Aus Firebase neu laden',exact:true}).click();await page.getByText('Synthetic newest team contact',{exact:true}).waitFor();assert.equal(await person.inputValue(),'204');
  // Local clock advances but a manual time remains fixed; neither creates RPCs.
  await page.clock.install({time:new Date('2026-10-22T10:00:00Z')});const idle=calls.length;await page.clock.fastForward(61000);assert.equal(calls.length,idle);
  await time.fill('2026-10-18T14:20');await page.clock.fastForward(61000);assert.equal(await time.inputValue(),'2026-10-18T14:20');assert.equal(calls.length,idle);
  const out=path.join(__dirname,'../output');fs.mkdirSync(out,{recursive:true});await page.locator('.m-customer-details').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,'r24-customer-desktop.png')});
  await contactsPanel.scrollIntoViewIfNeeded();const leftScroll=await page.locator('.m-customer-details').evaluate(el=>el.scrollTop);
  await contactsPanel.locator('.m-customer-list-rows').evaluate(el=>el.scrollTop=80);assert.ok(await contactsPanel.locator('.m-customer-list-rows').evaluate(el=>el.scrollTop)>0);
  assert.equal(await page.locator('.m-customer-details').evaluate(el=>el.scrollTop),leftScroll);
  await contactsPanel.locator('.m-customer-list-rows').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(out,'r24-customer-contacts.png')});
  await projectsPanel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'r24-customer-projects.png')});
  await page.setViewportSize({width:1500,height:768});assert.ok((await page.locator('.m-history-scroll').boundingBox()).height>=100);
  await page.setViewportSize({width:390,height:844});await page.getByRole('tab',{name:'Kommunikation',exact:true}).click();assert.equal(await note.isVisible(),true);
  await note.fill('Synthetic mobile draft');await page.getByRole('tab',{name:'Kundendaten',exact:true}).click();assert.equal(await note.isVisible(),false);
  await contactSearch.fill('recent');assert.equal(await contactsPanel.locator('[data-customer-list-row]:not([hidden])').count(),1);await page.screenshot({path:path.join(out,'r24-customer-mobile-search.png')});await contactSearch.fill('');
  await page.getByRole('tab',{name:'Kommunikation',exact:true}).click();assert.equal(await note.inputValue(),'Synthetic mobile draft');
  assert.ok((await page.locator('.m-history-scroll').boundingBox()).height>=180);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(out,'r24-customer-mobile.png')});
  await page.getByRole('button',{name:'Helle Ansicht',exact:true}).click();assert.equal(await note.inputValue(),'Synthetic mobile draft');await page.screenshot({path:path.join(out,'r24-customer-light.png')});
  // Boundary cases in the same customer, including a list shrinking while a filter is active.
  await page.setViewportSize({width:1500,height:1000});await page.getByRole('button',{name:'Kunden',exact:true}).click();await page.getByRole('button',{name:'Synthetic second customer',exact:true}).click();
  for(const size of [0,1,2,3,4,3]){
    f.db['sales_companies/102'].contacts=Array.from({length:size},(_,i)=>({id:1000+i,companyId:102,firstName:'Synthetic',lastName:'Boundary '+i}));
    f.db['sales_companies/102'].projects=Array.from({length:size},(_,i)=>({id:2000+i,number:'BOUND-'+i,name:'Synthetic boundary project '+i,completed:true,revenueCents:0,complete:true}));
    await page.getByRole('button',{name:'Aus Firebase neu laden',exact:true}).click();
    await page.waitForFunction(n=>document.querySelector('#magazin-vertrieb').getAttribute('aria-busy')==='false'&&document.querySelectorAll('[data-customer-list="contacts"] [data-customer-list-row]').length===n,size);
    for(const panel of [contactsPanel,projectsPanel]){
      assert.equal(await panel.getByRole('searchbox').count(),size>3?1:0);
      assert.equal(await panel.locator('[data-customer-list-row]:not([hidden])').count(),size);
      if(size<=3)assert.equal(await panel.locator('.m-customer-list-rows').evaluate(el=>el.style.maxHeight),'');
      else {const metrics=await listMetrics(panel);assert.ok(metrics.total>metrics.height);assert.ok(Math.abs(metrics.height-metrics.firstThree)<=1);}
    }
    if(size===4)await contactsPanel.getByRole('searchbox').fill('no matching boundary contact');
  }
  assert.deepEqual(errors,[]);assert.ok(!calls.some(c=>c.name==='getSalesV1State'));
  console.log('PASS three-card lists, live local searches, embedded addresses, fixed capture, drafts, contact creation, replay, clock and mobile tabs');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
