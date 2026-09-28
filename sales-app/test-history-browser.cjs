// Synthetic DOM/UI integration tests; requires Playwright and an installed Chromium browser.
// Set NODE_PATH to the existing runtime modules and PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if needed.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  try{
    const page=await browser.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{requests.push(route.request().url());return route.abort();});
    const html=fs.readFileSync(__dirname+'/../hq-benchmark/Sales.html','utf8');
    const main=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
    new vm.Script(main);
    const shell=html.replace(/<script>[\s\S]*?<\/script>/g,'');
    await page.setContent(shell);
    // Reuse the real backend fixture, without running the separate backend test suite.
    const tests=fs.readFileSync(__dirname+'/test-sales.cjs','utf8'),scope={require,__dirname,console,Buffer,URL};
    vm.runInNewContext(tests.slice(0,tests.indexOf("test('all public RPCs"))+'globalThis.f=fixture();',scope);
    const f=scope.f;vm.runInContext(['SalesV1.gs','SalesSync.gs'].map(p=>fs.readFileSync(__dirname+'/'+p,'utf8')).join('\n'),f.ctx);const {id}=f.ctx.saveSalesTestCompany(f.input);
    f.ctx.runSalesJob(id,'company');f.ctx.runSalesJob(id,'contact');
    f.db['sales_jobs/'+id].state='contactCreated';delete f.db['sales_jobs/'+id].historyBinding;
    const state=f.ctx.getSalesState(),detail=f.ctx.getSalesCompany('draft_'+id);
    const rpcCalls=[];
    await page.exposeFunction('fixtureRpc',(name,args)=>{rpcCalls.push(name);return JSON.parse(JSON.stringify(f.ctx[name](...args)));});
    await page.evaluate(()=>{
      const chain=(ok,fail)=>new Proxy({}, {get(_,name){if(name==='withSuccessHandler')return fn=>chain(fn,fail);if(name==='withFailureHandler')return fn=>chain(ok,fn);return (...args)=>window.fixtureRpc(name,args).then(ok,fail);}});
      window.google={script:{run:chain(()=>{},()=>{})}};
    });
    const preboot=main.slice(0,main.lastIndexOf("  act(async()=>{state=await rpc('getSalesState');});"));
    await page.addScriptTag({content:preboot+`state=${JSON.stringify(state)};detail=${JSON.stringify(detail)};selected='draft_${id}';view='company';globalThis.historyTools={historyContent,historyRow,historyPreview};render();})();`});
    const button=page.getByRole('button',{name:'Kommunikation erfassen',exact:true}).first();
    assert.equal(await button.isEnabled(),true);assert.equal(await button.evaluate(b=>getComputedStyle(b).cursor),'pointer');
    await button.click();await page.getByLabel('Betreff',{exact:true}).fill('TEST Browser');
    for(const channel of ['Note','Mail','Call','Meeting','Visit']){
      const typeControl=page.locator('select[name="channel"]');assert.equal(await typeControl.count(),1,'Missing channel before '+channel+'; browser errors: '+errors.join('; '));await typeControl.selectOption(channel);
      const visible=await page.locator('form[data-form="history"]').evaluate(form=>Array.from(new FormData(form).keys()).sort());
      const expected=['channel','reason','content',...(channel==='Mail'?['recipientEmailAddress']:['contactOn']),...(['Call','Meeting','Visit'].includes(channel)?['contactPersonId']:[]),...(channel==='Call'?['status']:[])].sort();
      assert.deepEqual(visible,expected);assert.equal(await page.getByLabel('Betreff',{exact:true}).inputValue(),'TEST Browser');
    }
    assert.equal(await page.getByLabel('Kontaktart',{exact:true}).locator('option[value="Task"]').count(),0);
    await page.getByLabel('Kontaktart',{exact:true}).selectOption('Note');
    await page.getByLabel('Notiz / Text',{exact:true}).fill('Nur Firebase zuerst');
    const n=f.calls.length;await page.getByRole('button',{name:'In Firebase speichern',exact:true}).click();
    await page.getByRole('heading',{name:'TEST Browser',exact:true}).waitFor();
    assert.equal(f.calls.length,n);assert.ok(rpcCalls.includes('saveSalesHistory'));assert.ok(!rpcCalls.includes('checkSalesHistoryBinding'));assert.ok(!rpcCalls.includes('runSalesJob'));
    assert.equal(await page.locator('#magazin-vertrieb').getAttribute('aria-busy'),'false');
    console.log('PASS actual button click, five type-specific field sets and Firebase save with open creation and no historyReady proof');
    const checks=await page.evaluate(()=>{
      const {historyContent,historyRow,historyPreview}=historyTools;
      const rich='<p>Hallo <strong>Welt</strong> &amp; Team</p><p>Zweite Zeile<br>Weiter</p><ul><li>Eintrag</li></ul><span style="font-weight:700;font-style:italic;text-decoration:underline">Format</span><table><tr><td>Summe</td><td>10 EUR</td></tr></table>';
      const out=historyContent(rich),el=document.createElement('div');el.innerHTML=out.html;
      const malicious='<p onclick="alert(1)">Sicher</p><script>alert(1)</script><img src="https://invalid.example/tracker" onerror="alert(1)"><iframe src="https://invalid.example/frame"></iframe><svg onload="alert(1)"></svg><style>body{display:none}</style><a href="javascript:alert(1)">Bad</a><a href="https://example.invalid/" onclick="alert(1)">Good</a>';
      const safe=historyContent(malicious),safeEl=document.createElement('div');safeEl.innerHTML=safe.html;document.body.append(safeEl);
      const note=historyRow({reason:'<p>Notiz</p>',content:rich,contactHistoryChannel:'Note'});
      const mail=historyRow({content:rich,contactHistoryChannel:'Mail'});
      const invoice=historyRow({content:rich,contactHistoryChannel:'SentDocument',projectName:'TEST Ausgabe'});
      const task=historyPreview({content:rich,reason:'<p>Aufgabe</p>',contactHistoryChannel:'Task',responsibleUserIds:[]});
      return {paragraphs:el.querySelectorAll('p').length,bold:!!el.querySelector('strong'),list:!!el.querySelector('ul li'),table:!!el.querySelector('table td'),style:!!el.querySelector('strong em u, u em strong'),text:out.text,safe:safe.html,links:safeEl.querySelectorAll('a').length,href:safeEl.querySelector('a')?.getAttribute('href'),encoded:historyContent('&lt;p&gt;Absatz&lt;/p&gt;').html,literal:historyContent('Preis < 10 & offen').html,note,mail,invoice,task};
    });
    assert.equal(checks.paragraphs,2);for(const key of ['bold','list','table','style'])assert.equal(checks[key],true,key);
    assert.ok(checks.text.includes('Hallo Welt & Team'));assert.ok(checks.text.includes('Zweite Zeile'));
    assert.ok(!/<(?:script|img|iframe|svg|style)|onclick|javascript:/i.test(checks.safe));assert.equal(checks.links,1);assert.equal(checks.href,'https://example.invalid/');
    assert.equal(checks.encoded,'<p>Absatz</p>');assert.equal(checks.literal,'Preis &lt; 10 &amp; offen');
    for(const key of ['note','mail','invoice','task']){assert.ok(checks[key].includes('<strong>Welt</strong>'),key);assert.ok(!checks[key].includes('&lt;p&gt;'),key);}
    assert.ok(checks.mail.includes('<details>'));assert.ok(checks.invoice.includes('<details>'));
    assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
    console.log('PASS real browser formatting of notes, email, invoice and task preview; scripts/trackers removed without requests');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
