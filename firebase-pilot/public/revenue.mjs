export function summarize(rows, options) {
  const {from,to,search='',min='',max='',sort='revenue-desc'}=options;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from>to) throw new Error('Bitte einen gültigen Zeitraum wählen.');
  const minCents=min===''?null:Math.round(Number(min.replace(',','.'))*100);
  const maxCents=max===''?null:Math.round(Number(max.replace(',','.'))*100);
  if ((minCents!==null&&!Number.isFinite(minCents)) || (maxCents!==null&&!Number.isFinite(maxCents))) throw new Error('Bitte gültige Euro-Beträge eingeben.');
  const needle=search.trim().toLocaleLowerCase('de');
  return rows.map(([id,name,days])=>({
    id,name,
    revenueCents:days.reduce((sum,[day,cents])=>sum+(day>=from&&day<=to?cents:0),0)
  })).filter(row=>row.name.toLocaleLowerCase('de').includes(needle) && (minCents===null||row.revenueCents>=minCents) && (maxCents===null||row.revenueCents<=maxCents)).sort((a,b)=>{
    if (sort==='name') return a.name.localeCompare(b.name,'de');
    if (sort==='revenue-asc') return a.revenueCents-b.revenueCents || a.name.localeCompare(b.name,'de');
    return b.revenueCents-a.revenueCents || a.name.localeCompare(b.name,'de');
  });
}
