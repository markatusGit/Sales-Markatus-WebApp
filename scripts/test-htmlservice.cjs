// Regression for r34.1: HtmlService strips comments with its own scanner before serving Sales.html.
// A double slash inside code (here a regular expression) was cut as a comment and broke the whole page.
// This deliberately naive model (quotes/backticks only, no regex or ${} awareness) must leave every script parseable.
const fs=require('node:fs'),path=require('node:path');
const file=process.argv[2]||path.join(__dirname,'../hq-benchmark/Sales.html');
const h=fs.readFileSync(file,'utf8').replace(/\r/g,'');
let out='',i=0,inScript=false,state='code';
while(i<h.length){
  if(!inScript){const k=h.indexOf('<script>',i);if(k<0){out+=h.slice(i);break;}out+=h.slice(i,k+8);i=k+8;inScript=true;state='code';continue;}
  if(state==='code'&&h.startsWith('</script>',i)){out+='</script>';i+=9;inScript=false;continue;}
  const c=h[i];
  if(state==='code'){
    if(c==='/'&&h[i+1]==='/'){const e=h.indexOf('\n',i);i=e<0?h.length:e;continue;}
    if(c==='/'&&h[i+1]==='*'){const e=h.indexOf('*/',i+2);i=e<0?h.length:e+2;continue;}
    if(c==="'")state='single';else if(c==='"')state='double';else if(c==='`')state='template';
  }else if(c==='\\'){out+=c+h[i+1];i+=2;continue;}
  else if(state==='single'&&(c==="'"||c==='\n'))state='code';
  else if(state==='double'&&(c==='"'||c==='\n'))state='code';
  else if(state==='template'&&c==='`')state='code';
  out+=c;i++;
}
const re=/<script>([\s\S]*?)<\/script>/g;let m,n=0;
while((m=re.exec(out))){n++;try{new Function(m[1]);}catch(e){console.error('Script '+n+' nach Kommentarentfernung ungültig: '+e.message);process.exit(1);}}
console.log('PASS '+n+' Skriptblöcke bleiben nach vereinfachter HtmlService-Kommentarentfernung gültig.');
