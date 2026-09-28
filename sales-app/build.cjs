const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const styles='<style>'+fs.readFileSync(path.join(__dirname,'Sales.styles.css'),'utf8')+'</style>';
const template=fs.readFileSync(path.join(__dirname,'Sales.template.html'),'utf8');
fs.writeFileSync(path.join(root,'hq-benchmark','Sales.html'),template.replace('<!--DEMO_STYLES-->',styles).replace('// V1_FUNCTIONS',['SalesV1.js','SalesProjects.js'].map(file=>fs.readFileSync(path.join(__dirname,file),'utf8')).join('\n')));
fs.writeFileSync(path.join(root,'hq-benchmark','SalesBackend.gs'),['Sales.gs','SalesStorage.gs','SalesV1.gs','SalesSync.gs'].map(file=>fs.readFileSync(path.join(__dirname,file),'utf8')).join('\n'));
console.log('Sales.html und SalesBackend.gs aus den lokalen Quellen erzeugt.');
