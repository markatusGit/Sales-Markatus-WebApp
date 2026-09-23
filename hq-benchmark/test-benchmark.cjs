const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8');

function environment(overrides = {}) {
  let now = Date.UTC(2026,8,22,10), callCount = 0, released = false;
  const calls = [];
  const properties = {
    HQ_API_TOKEN: 'test-secret-only-on-server',
    HQ_BENCH_ALLOWED_EMAILS: 'tester@example.test',
    HQ_BENCH_CASES: JSON.stringify([{id:'companies',label:'Test companies',path:'/v2/Companies?top=20'}]),
    ...overrides.properties
  };
  const props = {getProperty:k=>properties[k]??null,setProperty:(k,v)=>{properties[k]=v;},deleteProperty:k=>{delete properties[k];}};
  function request(url, options) {
    callCount++;
    calls.push({url,options,at:now});
    if (overrides.transportError) throw new Error('secret test exception must not escape');
    now += 40;
    const status = overrides.statuses?.[callCount-1] ?? 200;
    return {getResponseCode:()=>status,getBlob:()=>({getBytes:()=>[1,2,3,4]}),getContentText:()=>JSON.stringify({data:[{name:'PRIVATE_CUSTOMER_CONTENT'}]})};
  }
  class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const context = vm.createContext({
    Date:Clock, console,
    Session:{getActiveUser:()=>({getEmail:()=>overrides.email ?? 'tester@example.test'})},
    PropertiesService:{getScriptProperties:()=>props},
    LockService:{getScriptLock:()=>({tryLock:()=>!overrides.locked,releaseLock:()=>{released=true;}})},
    Utilities:{sleep:ms=>{now+=ms;if(overrides.stopOnSleep&&properties.HQ_BENCH_ACTIVE_RUN){const run=JSON.parse(properties.HQ_BENCH_ACTIVE_RUN);run.stop=true;properties.HQ_BENCH_ACTIVE_RUN=JSON.stringify(run);}}},
    UrlFetchApp:{fetch:request,fetchAll:requests=>requests.map(r=>request(r.url,r))},
    HtmlService:{createHtmlOutputFromFile:()=>({setTitle:()=>({ok:true})})}
  });
  vm.runInContext(code,context);
  return {context,calls,properties,released:()=>released};
}
const input = {caseId:'companies',count:3,parallel:1,rpm:30,runId:'run_testing_01'};
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}

test('Reject missing and unlisted identities before any request',()=>{
  for(const email of ['', 'outsider@example.test']){const e=environment({email});assert.throws(()=>e.context.runBenchmark(input),/freigeschalteter/);assert.equal(e.calls.length,0);}
});
test('Reject missing token and unsupported or excessive input',()=>{
  const missing=environment({properties:{HQ_API_TOKEN:''}});assert.throws(()=>missing.context.runBenchmark(input),/TOKEN/);
  for(const change of [{count:61},{count:0},{parallel:2},{parallel:10,count:1},{rpm:120}]){const e=environment();assert.throws(()=>e.context.runBenchmark({...input,...change}));assert.equal(e.calls.length,0);}
});
test('Do not allow arbitrary origins or credentials in paths',()=>{
  for(const p of ['https://other.example/v2/Companies','//other.example','/v2/Companies?token=secret','/v2/Companies#fragment']){const e=environment({properties:{HQ_BENCH_CASES:JSON.stringify([{id:'companies',path:p}])}});assert.throws(()=>e.context.runBenchmark(input));assert.equal(e.calls.length,0);}
});
test('Use only GET, approved host, no redirects, and no private content in output',()=>{
  const e=environment();const result=e.context.runBenchmark(input);assert.equal(e.calls.length,3);
  e.calls.forEach(c=>{assert.equal(c.options.method,'get');assert.equal(c.options.followRedirects,false);assert.equal(c.options.validateHttpsCertificates,true);assert.ok(c.url.startsWith('https://api.hellohq.io/v2/'));});
  const serialized=JSON.stringify(result);assert.ok(!serialized.includes('PRIVATE_CUSTOMER_CONTENT'));assert.ok(!serialized.includes('test-secret'));assert.equal(result.summary.measurements,3);assert.equal(result.summary.medianMs,40);assert.equal(result.summary.completed,true);assert.ok(e.released());assert.equal(e.properties.HQ_BENCH_ACTIVE_RUN,undefined);
});
test('Rate limiter spaces offered requests',()=>{
  const e=environment();e.context.runBenchmark(input);assert.ok(e.calls[1].at-e.calls[0].at>=2000);assert.ok(e.calls[2].at-e.calls[1].at>=2000);
});
test('Stop immediately after HTTP 429, 401 and redirect',()=>{
  for(const status of [429,401,302]){const e=environment({statuses:[status]});const r=e.context.runBenchmark({...input,count:20});assert.equal(e.calls.length,1);assert.ok(r.stopReason);assert.equal(r.summary.completed,false);assert.ok(e.released());}
});
test('Server errors stop at three consecutive failures',()=>{
  const e=environment({statuses:[503,503,503]});const r=e.context.runBenchmark({...input,count:20});assert.equal(e.calls.length,3);assert.equal(r.summary.knownHttpErrors,3);assert.ok(r.stopReason);
});
test('Parallel timing represents the full batch and excludes smaller remainder from quantiles',()=>{
  const e=environment();const r=e.context.runBenchmark({...input,count:5,parallel:3});assert.equal(r.batches.length,2);assert.equal(r.batches[0].requests,3);assert.equal(r.batches[0].elapsedMs,120);assert.equal(r.batches[1].requests,2);assert.equal(r.summary.measurements,1);assert.equal(r.summary.medianMs,120);assert.match(r.summary.metric,/Batch/);
});
test('Transport failure returns unknown outcomes and sanitized message',()=>{
  const e=environment({transportError:true});const r=e.context.runBenchmark(input);assert.equal(e.calls.length,1);assert.equal(r.summary.unknownRequests,1);assert.ok(!JSON.stringify(r).includes('secret test exception'));assert.ok(e.released());
});
test('Stop request is checked between batches',()=>{
  const e=environment({stopOnSleep:true});const r=e.context.runBenchmark(input);assert.equal(e.calls.length,1);assert.match(r.stopReason,/Nutzer/);
});
test('Do not start overlapping runs',()=>{
  const e=environment({locked:true});assert.throws(()=>e.context.runBenchmark(input),/bereits/);assert.equal(e.calls.length,0);
});
console.log(`${passed} tests passed. No network requests were made.`);
