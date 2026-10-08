export const CLOSED = new Set(['提前贖回','提前到期','到期贖回','提前敲出','到期','承接股票']);
export const pct=n=>Number.isFinite(n)?`${(n*100).toFixed(2)}%`:'—';
export const days=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
export function summaries(trades,year,currency){
  const selected=trades.filter(t=>(!year||t.tradeDate.startsWith(String(year)))&&(!currency||t.currency===currency));
  const group=key=>Object.values(selected.reduce((m,t)=>{const k=key(t);m[k]??={label:k,count:0,amount:0,missing:0};m[k].count++;if(Number.isFinite(t.amount))m[k].amount+=t.amount;else m[k].missing++;return m;},{})).sort((a,b)=>a.label.localeCompare(b.label));
  return {selected,total:selected.reduce((v,t)=>v+(t.amount??0),0),monthly:group(t=>t.tradeDate.slice(0,7)),quarterly:group(t=>`${t.tradeDate.slice(0,4)} Q${Math.ceil(Number(t.tradeDate.slice(5,7))/3)}`),annual:group(t=>t.tradeDate.slice(0,4)),types:group(t=>t.productType)};
}
export const accountOf=t=>String(t.clientCode||'未填客戶代碼');
export function accountSummaries(trades,data,today){
 const grouped=new Map();
 for(const t of trades){const code=accountOf(t);if(!grouped.has(code))grouped.set(code,[]);grouped.get(code).push(t)}
 return [...grouped].map(([code,ts])=>{
  const open=ts.filter(t=>t.status==='在期'),overdue=open.filter(t=>t.maturityDate&&t.maturityDate<today);
  const events=alerts(ts,data,today),upcoming=events.filter(a=>a.date>=today),ko=events.filter(a=>['KO 條件符合','KO 價格待核對'].includes(a.kind));
  const mix=summaries(ts,'','').types;
  return {code,count:ts.length,amount:ts.reduce((n,t)=>n+(t.amount??0),0),missing:ts.filter(t=>t.amount==null).length,
   openCount:open.length,openAmount:open.reduce((n,t)=>n+(t.amount??0),0),overdue:overdue.length,ko:ko.length,
   next:upcoming[0]||null,mix};
 }).sort((a,b)=>b.amount-a.amount||a.code.localeCompare(b.code));
}
export function performance(t,data,date=data.expectedPriceDate){
  return t.underlyings.map(u=>({...u,price:date&&data.prices?.[u.symbol]?.[date]?.close,
    ratio:date&&u.initial>0&&data.prices?.[u.symbol]?.[date]?.close>0?data.prices[u.symbol][date].close/u.initial:null,date}));
}
const hit=(ratio,level,cmp)=>cmp==='>'?ratio>level:ratio>=level;
export function priceScreen(t,data){
 if(!t.rule?.scheduleVerified||t.rule.koEnabled!==true||!(t.ko>0)||t.underlyings.some(u=>!u.symbol||!(u.initial>0)))return null;
 if(t.rule.mode!=='離散全數')return null;
 for(const d of t.observationDates.filter(d=>d<=data.expectedPriceDate&&d>=t.tradeDate&&d<=t.maturityDate)){
   const ps=performance(t,data,d);
   if(ps.length&&ps.every(u=>Number.isFinite(u.ratio)&&u.ratio>=t.ko))return {code:'potential',label:'表列 KO 價格達標・條款待核對',reason:`${d} 全部標的收盤比率達表列 KO；需核對達到／超過、價格調整及發行商結果`,date:d,events:[]};
 }
 return null;
}
export function evaluate(t,data){
  const rule=t.rule??{};
  if(CLOSED.has(t.status))return {code:'closed',label:'Excel 已標記結束',reason:t.status,events:[]};
  const fail=(reason,code='blocked')=>({code,label:code==='review'?'狀態待更新':'待補資料',reason,events:[]});
  if(rule.koEnabled===false&&rule.source)return {code:'no-ko',label:'無 KO 條款',reason:rule.source,events:[]};
  if(!rule.verified||!rule.source)return priceScreen(t,data)||fail('尚未核對 Termsheet 與 KO 條款');
  if(rule.koEnabled!==true||!Number.isFinite(t.ko)||t.ko<=0)return fail('缺少有效 KO 比例或 KO 條款確認');
  if(!rule.levelVerified)return fail('期初價及公司行動調整尚未核對');
  if(!rule.scheduleVerified)return fail('KO 觀察日期尚未核對');
  if(!['離散全數','每日全數','記憶KO','每日記憶KO'].includes(rule.mode))return fail('不支援或未確認的觀察方式');
  if(!['>=','>'].includes(rule.comparison))return fail('未確認觸發比較方式');
  if(!t.maturityDate)return fail('缺少到期日');
  if(!t.observationDates?.length)return fail('缺少 KO 觀察日／每日觀察開始日');
  if(t.underlyings.some(u=>!u.symbol||!(u.initial>0)))return fail('標的代號或期初價缺漏；非美股需另設行情');
  const end=data.expectedPriceDate;
  if(!end)return fail('尚未取得已完成交易日的收盤價');
  let dates=t.observationDates.filter(d=>d<=end&&d<=t.maturityDate&&d>=t.tradeDate);
  if(rule.mode==='每日全數'||rule.mode==='每日記憶KO'){
    if(!Array.isArray(data.tradingDays))return fail('每日觀察缺少美國交易日曆');
    dates=data.tradingDays.filter(d=>d>=t.observationDates[0]&&d<=t.maturityDate&&d<=end);
  }
  if(!dates.length)return {code:'waiting',label:'尚未到觀察日',reason:`首個觀察日 ${t.observationDates[0]}`,events:[]};
  const memory=new Set(),events=[];
  for(const d of dates){
    const ps=performance(t,data,d);
    if(ps.some(u=>!(u.price>0)||!Number.isFinite(u.ratio)))return {...fail(`缺少 ${d} 全部標的的收盤價`),events};
    const hits=ps.map(u=>hit(u.ratio,t.ko,rule.comparison));
    const memoryMode=['記憶KO','每日記憶KO'].includes(rule.mode);
    if(memoryMode)hits.forEach((v,i)=>{if(v)memory.add(i)});
    const triggered=memoryMode?memory.size===ps.length:hits.every(Boolean);
    events.push({date:d,ratios:ps.map(u=>u.ratio),triggered});
    if(triggered)return {code:'candidate',label:'KO 條件符合・待發行商確認',reason:`${d} ${memoryMode?'各標的已按條款記憶達標':'全部標的達到 KO 門檻'}`,date:d,events};
  }
  if(t.maturityDate<=end)return {code:'review',label:'已過表列到期日',reason:'請更新到期／贖回／承接狀態',events};
  if(data.priceError)return {...fail('最新行情更新有缺漏：'+data.priceError),events};
  return {code:'clear',label:'已檢查・未見 KO 條件',reason:`已核對 ${dates.length} 個觀察日，最新 ${dates.at(-1)}`,events};
}
export function alerts(trades,data,today){
 return trades.filter(t=>!CLOSED.has(t.status)).flatMap(t=>{
  const a=[],e=evaluate(t,data);
  if(e.code==='candidate'||e.code==='potential')a.push({t,date:e.date,kind:e.code==='candidate'?'KO 條件符合':'KO 價格待核對',tone:'red',detail:e.reason});
  if(t.maturityDate&&t.maturityDate<today)a.push({t,date:t.maturityDate,kind:'到期狀態待更新',tone:'amber',detail:`Excel 狀態：${t.status}`});
  if(t.maturityDate){const left=days(today,t.maturityDate);if(left>=0&&left<=30)a.push({t,date:t.maturityDate,kind:left===0?'今日到期':'30 日內到期',tone:'green',detail:left===0?'今日到期':`${left} 日後到期`});}
  const next=t.observationDates.find(d=>d>=today);
  if(next){const left=days(today,next);if(left<=30)a.push({t,date:next,kind:t.rule?.koEnabled===false?'Fixing Date（無 KO）':t.rule?.scheduleVerified?'KO 觀察日':'Fixing Date 待核對',tone:'blue',detail:`${left===0?'今日觀察':`${left} 日後`}・${t.rule?.mode||'條款未確認'}${[0,6].includes(new Date(next+'T00:00:00Z').getUTCDay())?'・表列日為週末，日期調整待核對':''}`});}
  return a;
 }).sort((a,b)=>a.date.localeCompare(b.date));
}
