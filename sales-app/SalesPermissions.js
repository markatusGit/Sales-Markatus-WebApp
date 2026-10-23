// Shared by the browser, Apps Script and the authentication service.
const SALES_PERMISSION_CATALOG = Object.freeze([
  ['home.read','Mein Tag','Bereiche'],['customers.read','Kunden','Bereiche'],
  ['magazine.read','Magazinverkauf','Bereiche'],['directory.read','Adressbuch aller Ansprechpartner','Bereiche'],
  ['finance.read','Buchungen, Rechnungen und Umsätze','Bereiche'],['projects.read','Kundenprojekte','Bereiche'],
  ['sync.read','Datenabgleich ansehen','Bereiche'],['sync.run','Datenabgleich ausführen und anhalten','Bereiche'],
  ['settings.read','Fachliche Verwaltung ansehen','Bereiche'],['settings.edit','Ausgabeziele und Termine ändern','Bereiche'],
  ['company.read','Firmendaten lesen','Firmen'],['company.create','Firma hinzufügen','Firmen'],['company.edit','Firmendaten und Adressen ändern','Firmen'],
  ['contact.read','Ansprechpartner lesen','Ansprechpartner'],['contact.create','Ansprechpartner hinzufügen','Ansprechpartner'],['contact.edit','Ansprechpartner ändern','Ansprechpartner'],
  ['communication.read','Kommunikation lesen','Kommunikation'],['communication.create','Gespräch / Nicht erreicht hinzufügen','Kommunikation']
]);
const SALES_PERMISSION_BASE = Object.freeze(['home.read','customers.read','company.read','contact.read','communication.read']);
function salesPermissions_(input,owner=false){
  if(input!==undefined&&(!input||typeof input!=='object'||Array.isArray(input)))throw Error('Ungültige Rechte.');
  const known=new Set(SALES_PERMISSION_CATALOG.map(p=>p[0]));
  for(const [key,value] of Object.entries(input||{}))if(!known.has(key)||typeof value!=='boolean')throw Error('Unbekanntes oder ungültiges Recht: '+key);
  const out=Object.fromEntries(SALES_PERMISSION_CATALOG.map(([key])=>[key,owner||SALES_PERMISSION_BASE.includes(key)||input?.[key]===true]));
  for(const [write,read] of [['sync.run','sync.read'],['settings.edit','settings.read'],['company.create','company.read'],['company.edit','company.read'],['contact.create','contact.read'],['contact.edit','contact.read'],['communication.create','communication.read']])if(out[write])out[read]=true;
  return out;
}
if(typeof module!=='undefined'&&module.exports)module.exports={SALES_PERMISSION_CATALOG,SALES_PERMISSION_BASE,salesPermissions_};
