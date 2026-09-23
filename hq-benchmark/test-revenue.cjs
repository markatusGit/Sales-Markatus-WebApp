const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = ['Code.gs','Revenue.gs'].map(name => fs.readFileSync(path.join(__dirname,name),'utf8')).join('\n');

function environment(companies,documents,options={}) {
  let now = Date.UTC(2026,8,23,8);
  const calls=[];
  const props={HQ_API_TOKEN:'private-token',HQ_BENCH_ALLOWED_EMAILS:'test@example.test'};
  const context=vm.createContext({
    Date:class extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}},
    Session:{getActiveUser:()=>({getEmail:()=>options.email??'test@example.test'})},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]??null})},
    Utilities:{sleep:ms=>{now+=ms;}},
    UrlFetchApp:{fetch:(url,settings)=>{
      calls.push({url,settings,at:now});now+=25;
      const collection=url.includes('/Companies?')?companies:documents;
      const params=new URL(url).searchParams;
      const skip=Number(params.get('skip')||0),top=Number(params.get('top')||0);
      const body=JSON.stringify({data:collection.slice(skip,skip+top)});
      return {getResponseCode:()=>options.status||200,getContentText:()=>body,getBlob:()=>({getBytes:()=>Buffer.from(body,'utf8')}),getAllHeaders:()=>options.countHeader?{'helloHQ-Count':collection.length}:{}};
    }}
  });
  vm.runInContext(source,context);
  return {context,calls};
}

const cfg={from:'2026-01-01',to:'2026-12-31',companyId:'id',companyName:'name',customerTypePath:'companyTypes[].name',customerTypeValue:'Kunde',documentId:'id',documentCompanyId:'companyId',documentDate:'documentDate',netAmount:'netAmount',documentType:'type',invoiceTypes:'Invoice',creditTypes:'CreditNote',documentStatus:'status',includedStatuses:'Sent,Paid',currencyPath:'currency'};
const companies=[{id:1,name:'Kunde A',companyTypes:[{name:'Kunde'}]},{id:2,name:'Kunde B',companyTypes:[{name:'Kunde'}]},{id:3,name:'Lieferant C',companyTypes:[{name:'Lieferant'}]}];
const documents=[
  {id:11,companyId:1,documentDate:'2026-02-01',netAmount:100,type:'Invoice',status:'Sent',currency:'EUR'},
  {id:12,companyId:1,documentDate:'2026-03-01',netAmount:20,type:'CreditNote',status:'Sent',currency:'EUR'},
  {id:13,companyId:2,documentDate:'2026-03-01',netAmount:50,type:'Invoice',status:'Paid',currency:'EUR'},
  {id:14,companyId:2,documentDate:'2025-03-01',netAmount:500,type:'Invoice',status:'Paid',currency:'EUR'},
  {id:15,companyId:2,documentDate:'2026-03-01',netAmount:999,type:'Invoice',status:'Draft',currency:'EUR'},
  {id:16,companyId:2,documentDate:'2026-03-01',netAmount:999,type:'Offer',status:'Sent',currency:'EUR'},
  {id:17,companyId:3,documentDate:'2026-03-01',netAmount:700,type:'Invoice',status:'Sent',currency:'EUR'},
  {id:18,companyId:2,documentDate:'2026-03-01',netAmount:-10,type:'Invoice',status:'Sent',currency:'EUR'}
];
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}

test('Summarizes only dated final invoices and subtracts credit notes',()=>{
  const e=environment(companies,documents);const r=e.context.runRevenueTest(cfg);
  assert.equal(r.totalCents,12000);assert.equal(r.counts.customerCount,2);
  assert.equal(r.counts.matchedDocuments,4);assert.equal(r.counts.skippedStatus,1);
  assert.equal(r.counts.skippedType,1);assert.equal(r.counts.outsidePeriod,1);
  assert.equal(r.counts.excludedCompanyDocuments,1);
  assert.equal(r.customers[0].name,'Kunde A');assert.equal(r.customers[0].revenueCents,8000);
  assert.equal(r.metrics.requests,2);assert.ok(r.durationMs>=2000);
  e.calls.forEach(call=>{assert.equal(call.settings.method,'get');assert.equal(call.settings.followRedirects,false);assert.ok(call.url.startsWith('https://api.hellohq.io/v2/'));});
  assert.ok(!JSON.stringify(r).includes('private-token'));
});
test('Checks a second page after exactly one full page',()=>{
  const many=Array.from({length:500},(_,i)=>({id:i+1,name:'Customer '+i,companyTypes:[{name:'Kunde'}]}));
  const e=environment(many,[]);const r=e.context.runRevenueTest(cfg);
  assert.equal(r.counts.customerCount,500);assert.equal(r.metrics.companiesPages,2);assert.equal(r.metrics.requests,3);
});
test('Uses HQ count header to finish an exactly full last page',()=>{
  const many=Array.from({length:500},(_,i)=>({id:i+1,name:'Customer '+i,companyTypes:[{name:'Kunde'}]}));
  const e=environment(many,[],{countHeader:true});const r=e.context.runRevenueTest(cfg);
  assert.equal(r.counts.customerCount,500);assert.equal(r.metrics.companiesPages,1);
});
test('Rejects missing identity and incomplete or ambiguous revenue data',()=>{
  const outsider=environment(companies,documents,{email:'other@example.test'});
  assert.throws(()=>outsider.context.runRevenueTest(cfg),/freigeschalteter/);assert.equal(outsider.calls.length,0);
  const missing=environment(companies,[{...documents[0],status:null}]);assert.throws(()=>missing.context.runRevenueTest(cfg),/Belegstatus/);
  const currency=environment(companies,[{...documents[0],currency:'USD'}]);assert.throws(()=>currency.context.runRevenueTest(cfg),/Währung/);
  const orphan=environment(companies,[{...documents[0],companyId:999}]);assert.throws(()=>orphan.context.runRevenueTest(cfg),/keinen zugeordneten Kunden/);
  const failed=environment(companies,documents,{status:429});assert.throws(()=>failed.context.runRevenueTest(cfg),/HTTP 429/);
});
test('Two live runs do not use the single-run benchmark lock',()=>{
  const a=environment(companies,documents),b=environment(companies,documents);
  assert.equal(a.context.runRevenueTest(cfg).totalCents,b.context.runRevenueTest(cfg).totalCents);
});
test('Field probe returns paths and type/status hints, no names or amounts',()=>{
  const e=environment(companies,documents);const shape=e.context.inspectRevenueFields();
  assert.ok(shape.companyFields.some(field=>field.path==='companyTypes[].name'));
  assert.ok(shape.documentFields.some(field=>field.path==='type'&&field.values.includes('CreditNote')));
  assert.ok(!JSON.stringify(shape).includes('Kunde A'));
});
console.log(`${passed} revenue tests passed. No network requests were made.`);
