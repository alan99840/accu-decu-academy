import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,monitor} from './paths.mjs';
const {evaluate,alerts}=await import(path.join(monitor,'assets/model.mjs'));
const data=JSON.parse(await fs.readFile(path.join(root,'private/dataset.json'),'utf8'));
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const statuses=data.trades.map(t=>({id:t.id,isin:t.isin,...evaluate(t,data)}));
const report={checkedAt:new Date().toISOString(),expectedPriceDate:data.expectedPriceDate,
 counts:statuses.reduce((m,e)=>(m[e.code]=(m[e.code]||0)+1,m),{}),
 alerts:alerts(data.trades,data,today),statuses};
const old=JSON.parse(await fs.readFile(path.join(root,'private/last_check.json'),'utf8').catch(()=>'{"alerts":[]}'));
const key=a=>`${a.t.id}|${a.kind}|${a.date}`;
const before=new Set(old.alerts.map(key));
const newlyActionable=report.alerts.filter(a=>!before.has(key(a))&&(a.tone==='red'||a.kind==='到期狀態待更新'||(a.date>=today&&a.date<=new Date(Date.parse(today)+7*86400000).toISOString().slice(0,10))));
if(!process.argv.includes('--preview'))await fs.writeFile(path.join(root,'private/last_check.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({counts:report.counts,expectedPriceDate:data.expectedPriceDate,newlyActionable:newlyActionable.map(a=>({isin:a.t.isin,kind:a.kind,date:a.date,detail:a.detail}))},null,2));
