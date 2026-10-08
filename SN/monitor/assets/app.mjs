import {summaries,performance,evaluate,alerts,pct,CLOSED,accountOf,accountSummaries} from './model.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmt=n=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:0}):'—';
const compact=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':fmt(n);
let data=null,period='monthly',alertFilter='future',page=0,periodFilter=null,trendWindow='',typeFilter='',isDemo=false,envelope=null;
const colors=['#007d70','#d51f36','#bd9350','#70a59d','#536b77'];
async function decrypt(e,password){
 if(e.version!==1||e.algorithm!=='AES-256-GCM'||e.kdf!=='PBKDF2-SHA256'||e.iterations!==600000)throw Error('不支援的加密格式');
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const seed=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(e.salt),iterations:e.iterations,hash:'SHA-256'},seed,{name:'AES-GCM',length:256},false,['decrypt']);
 const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(e.iv)},key,bytes(e.ciphertext));
 const bytesClear=e.compression==='gzip'?await new Response(new Blob([clear]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():clear;
 return JSON.parse(new TextDecoder().decode(bytesClear));
}
function validate(d){
 if(d.schemaVersion!==1||!Array.isArray(d.trades)||!d.prices)throw Error('資料格式不符，請使用同步程式產生的 JSON');
 const ids=new Set();for(const t of d.trades){if(!t.id||ids.has(t.id)||!/^\d{4}-\d{2}-\d{2}$/.test(t.tradeDate)||!Array.isArray(t.underlyings)||!Array.isArray(t.observationDates))throw Error('成交ID、日期或標的資料不完整');ids.add(t.id)}
 return d;
}
function load(d,demo=false){data=validate(d);isDemo=demo;page=0;periodFilter=null;trendWindow='';typeFilter='';$('gate').hidden=true;$('main').hidden=false;$('lock').hidden=false;
 const years=[...new Set(data.trades.map(t=>t.tradeDate.slice(0,4)))].sort().reverse();
 $('year').innerHTML=years.map(y=>`<option>${esc(y)}</option>`).join('')+'<option value="">全部年度</option>';
 const currencies=[...new Set(data.trades.map(t=>t.currency))].sort();if(currencies.includes('USD'))currencies.splice(currencies.indexOf('USD'),1),currencies.unshift('USD');
 $('currency').innerHTML=currencies.map(c=>`<option>${esc(c)}</option>`).join('');
 $('type').innerHTML='<option value="">全部產品</option>'+[...new Set(data.trades.map(t=>t.productType))].sort().map(x=>`<option>${esc(x)}</option>`).join('');
 $('status').innerHTML='<option value="">全部狀態</option><option value="open">Excel 在期</option><option value="closed">已結束</option><option value="issues">資料待核對</option>';
 $('account').innerHTML='<option value="">全部帳戶（總覽）</option>'+[...new Set(data.trades.map(accountOf))].sort().map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');$('search').value='';render();}
function selection(){return summaries(data.trades.filter(t=>!$('account').value||accountOf(t)===$('account').value),$('year').value,$('currency').value)}
function render(){
 const s=selection(),ts=s.selected,open=ts.filter(t=>t.status==='在期'),overdue=open.filter(t=>t.maturityDate&&t.maturityDate<today),blocked=ts.filter(t=>!CLOSED.has(t.status)&&['blocked','potential'].includes(evaluate(t,data).code));
 const amount=(ts)=>ts.reduce((v,t)=>v+(t.amount??0),0);
 $('asof').textContent=`Excel 資料截至 ${data.sourceAsOf??'未提供'}　／　香港日期 ${today}`;
 $('notice').className='notice'+(isDemo?' demo':'');
 $('notice').textContent=isDemo?'示範資料：以下金額、條款及行情均為虛構，用於展示看板功能。':`本次匯入 ${data.trades.length} 筆。${overdue.length} 筆篩選內「在期」商品已過表列到期日；${blocked.length} 筆監控待補資料。${data.expectedPriceDate?`行情交易日：${data.expectedPriceDate}。`:'尚未取得完整美股收盤價。'}${data.priceError?'最新行情更新失敗，請查看下方行情紀錄。':''}`;
 $('kpis').innerHTML=[['成交認購總額',`<small>${esc($('currency').value)}</small>${fmt(s.total)}`,`${ts.length} 筆成交${ts.some(t=>t.amount==null)?'・含未填金額':''}`,'primary'],['成交筆數',fmt(ts.length),`${$('year').value||'全部年度'} 年度範圍`,''],['在期部位',`<small>${esc($('currency').value)}</small>${fmt(amount(open))}`,`${open.length} 筆・其中 ${overdue.length} 筆已過到期日`,''],['監控待補資料',fmt(blocked.length),'需核對條款、觀察日或行情','']].map(([label,val,note,cls])=>`<article class="kpi ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${val}</div><p class="muted">${esc(note)}</p></article>`).join('');
 let groups=s[period];
 if($('year').value&&period!=='annual'){const y=$('year').value,count=period==='monthly'?12:4;groups=Array.from({length:count},(_,i)=>{const key=period==='monthly'?`${y}-${String(i+1).padStart(2,'0')}`:`${y} Q${i+1}`;return s[period].find(g=>g.label===key)||{label:key,amount:0,count:0}})}
 const current=period==='annual'?today.slice(0,4):period==='quarterly'?`${today.slice(0,4)} Q${Math.ceil(Number(today.slice(5,7))/3)}`:today.slice(0,7);
 if(!groups.some(g=>g.label===trendWindow))trendWindow=groups.find(g=>g.label===current)?.label||groups.filter(g=>g.count).at(-1)?.label||groups.at(-1)?.label||'';
 $('trend-window').innerHTML=groups.map(g=>`<option value="${esc(g.label)}" ${g.label===trendWindow?'selected':''}>${esc(g.label)}</option>`).join('');
 const chosen=groups.find(g=>g.label===trendWindow)||{amount:0,count:0};
 $('chart-total').textContent=`${$('currency').value} ${fmt(chosen.amount)}`;
 $('chart-caption').textContent=`${trendWindow||'無成交區間'}・${chosen.count} 筆成交${chosen.missing?'・含未填金額':''}`;
 const max=Math.max(1,...groups.map(g=>g.amount));$('bars').innerHTML=groups.map(g=>`<button class="bar-wrap ${trendWindow===g.label?'active':''}" data-group="${esc(g.label)}" title="${esc(g.label)}：${g.count} 筆，${fmt(g.amount)}" aria-label="篩選 ${esc(g.label)}，${g.count} 筆成交"><strong>${g.amount?compact(g.amount):'—'}</strong><span class="bar" style="height:${Math.max(3,g.amount/max*130)}px"></span><span>${esc(period==='monthly'&&$('year').value?Number(g.label.slice(-2))+'月':g.label)}</span></button>`).join('');
 let at=0;const gradient=s.types.map((g,i)=>{const start=at;at+=g.count/Math.max(1,ts.length)*100;return `${colors[i%colors.length]} ${start}% ${at}%`});
 $('donut').style.background=gradient.length?`conic-gradient(${gradient.join(',')})`:'#e8eeeb';$('donut-total').textContent=fmt(ts.length);$('mix-count').textContent=`${s.types.length} 種結構`;
 $('categories').innerHTML=s.types.map((g,i)=>`<div class="category"><div><i style="background:${colors[i%colors.length]}"></i>${esc(g.label)}<small>${g.count} 筆・${(g.count/Math.max(1,ts.length)*100).toFixed(1)}%</small></div><div><strong>${compact(g.amount)}</strong><small>${esc($('currency').value)}</small></div></div>`).join('');
 const aa=alerts(ts,data,today).filter(a=>alertFilter==='overdue'?a.kind==='到期狀態待更新':alertFilter==='ko'?['KO 條件符合','KO 價格待核對'].includes(a.kind):a.date>=today&&!['KO 條件符合','KO 價格待核對'].includes(a.kind));
 $('alerts').innerHTML=aa.length?aa.map(a=>`<button class="alert ${a.tone}" data-trade="${esc(a.t.id)}"><div class="top"><span>${esc(a.kind)}</span><span>${esc(a.date)}</span></div><strong>${esc(a.t.isin)}</strong><p>${esc(a.t.productType)}・${esc(a.t.issuer)}・${esc(a.t.currency)} ${compact(a.t.amount)}</p><p>${esc(a.detail)}</p></button>`).join(''):`<div class="empty">${alertFilter==='ko'?'目前沒有已確認條款下的 KO 預警；待補資料不表示沒有 KO。':'此篩選範圍沒有符合的事件。'}</div>`;
 $('price-meta').textContent=`行情來源：${data.priceSource??'尚未提供'}。最近檢查：${data.priceCheckedAt??'尚未執行'}。已完成交易日：${data.expectedPriceDate??'尚未提供'}。${data.priceError?'更新錯誤：'+data.priceError:''}`;renderAccounts();renderTrades();
}
function renderAccounts(){
 const scope=summaries(data.trades,$('year').value,$('currency').value).selected,rows=accountSummaries(scope,data,today),code=$('account').value;
 if(!code){$('accounts').innerHTML=`<div class="account-empty"><div class="account-empty-icon">↗</div><div><strong>${rows.length} 個帳戶，${scope.length} 筆成交</strong><p>從上方下拉選單選擇帳戶，查看成交、存續部位、產品分布與逐筆資料。</p></div><span>${esc($('year').value||'全部年度')}・${esc($('currency').value)}</span></div>`;return}
 const a=rows.find(r=>r.code===code),history=data.trades.filter(t=>accountOf(t)===code),ts=scope.filter(t=>accountOf(t)===code).sort((a,b)=>b.tradeDate.localeCompare(a.tradeDate)),open=ts.filter(t=>t.status==='在期'),closed=ts.filter(t=>CLOSED.has(t.status));
 const sum=xs=>xs.reduce((n,t)=>n+(t.amount??0),0),blocked=ts.filter(t=>!CLOSED.has(t.status)&&['blocked','potential'].includes(evaluate(t,data).code)).length;
 const group=key=>Object.entries(ts.reduce((m,t)=>{const k=key(t);m[k]??={count:0,amount:0};m[k].count++;m[k].amount+=t.amount??0;return m},{})).sort((a,b)=>b[1].amount-a[1].amount);
 const dist=xs=>xs.map(([name,g])=>`<div class="account-dist"><div><strong>${esc(name)}</strong><span>${g.count} 筆・${pct(g.count/Math.max(1,ts.length))}</span></div><div class="account-meter"><span style="width:${g.count/Math.max(1,ts.length)*100}%"></span></div><small>${esc($('currency').value)} ${fmt(g.amount)}</small></div>`).join('')||'<p class="muted">本範圍尚無成交。</p>';
 const dates=history.map(t=>t.tradeDate).sort(),currencies=[...new Set(history.map(t=>t.currency))].sort();
 const ae=alerts(ts,data,today),flags=ae.filter(x=>x.tone==='red'||x.kind==='到期狀態待更新');
 $('accounts').innerHTML=`<div class="account-profile"><div><small>客戶代碼</small><h3>${esc(code)}</h3><p>歷史 ${history.length} 筆・${esc(currencies.join('／'))}　<span>${esc(dates[0]||'—')} 至 ${esc(dates.at(-1)||'—')}</span></p></div><span class="account-scope">${esc($('year').value||'全部年度')}・${esc($('currency').value)}</span></div>
 <div class="account-metrics">${[['本範圍成交',ts.length,fmt(sum(ts))],['Excel 標記在期',open.length,fmt(sum(open))],['已結束成交',closed.length,fmt(sum(closed))],['監控待補資料',blocked,'條款／行情待核對']].map(([label,count,note])=>`<div><small>${label}</small><strong>${count}<span> 筆</span></strong><p>${esc(note)}${label==='監控待補資料'?'':' '+esc($('currency').value)}</p></div>`).join('')}</div>
 ${a?.missing?`<p class="warn">${a.missing} 筆認購金額未填，金額統計暫不包含。</p>`:''}
 <div class="account-breakdowns"><div><h4>產品結構</h4>${dist(group(t=>t.productType))}</div><div><h4>發行商分布</h4>${dist(group(t=>t.issuer))}</div><div><h4>帳戶監控</h4><div class="account-monitor"><strong>${a?.ko||0}<small>筆 KO 價格預警</small></strong><strong>${a?.overdue||0}<small>筆到期狀態待更新</small></strong></div><p class="muted">最近事項：${a?.next?esc(a.next.date)+'・'+esc(a.next.kind):'未來 30 日無表列事項'}</p>${flags.slice(0,3).map(x=>`<button class="account-event" data-trade="${esc(x.t.id)}"><span>${esc(x.kind)}</span><small>${esc(x.t.isin)}・${esc(x.date)}</small></button>`).join('')}</div></div>
 <div class="account-register-head"><h4>帳戶成交詳情</h4><span>${ts.length} 筆・依成交日排序</span></div><div class="account-register">${ts.map(t=>{const ev=evaluate(t,data);return `<details class="account-trade"><summary><span class="account-trade-date">${esc(t.tradeDate)}</span><span><strong>${esc(t.isin)}</strong><small>${esc(t.productType)}・${esc(t.issuer)}・${esc(t.status)}</small></span><span class="account-trade-amount">${esc(t.currency)} ${fmt(t.amount)}</span></summary><div class="account-trade-body"><div class="account-trade-terms"><span>年化票息 <strong>${pct(t.coupon)}</strong></span><span>KO <strong>${t.rule.koEnabled===false?'無 KO':pct(t.ko)}</strong></span><span>到期日 <strong>${esc(t.maturityDate||'未填')}</strong></span></div><p><small>連結標的</small> ${t.underlyings.map(u=>esc(u.raw)).join('／')}</p><p><small>下個 Fixing</small> ${esc(t.observationDates.find(d=>d>=today)||'已無未來表列觀察日')}</p><span class="pill ${ev.code}">${esc(ev.label)}</span><button class="account-full-detail" data-trade="${esc(t.id)}">完整成交簡介 ↗</button></div></details>`}).join('')||'<p class="muted">此帳戶在選定年度及幣別沒有成交，請調整上方篩選。</p>'}</div>`;
}
function filtered(){const term=$('search').value.trim().toLowerCase();return selection().selected.filter(t=>{
 const ev=evaluate(t,data),status=$('status').value;
 const periodKey=period==='annual'?t.tradeDate.slice(0,4):period==='quarterly'?`${t.tradeDate.slice(0,4)} Q${Math.ceil(Number(t.tradeDate.slice(5,7))/3)}`:t.tradeDate.slice(0,7);
 return (!periodFilter||periodKey===periodFilter)&&(!$('type').value||t.productType===$('type').value)&&(!term||[t.isin,t.issuer,t.clientCode,...t.underlyings.map(u=>u.raw)].join(' ').toLowerCase().includes(term))&&(!status||(status==='open'&&t.status==='在期')||(status==='closed'&&CLOSED.has(t.status))||(status==='issues'&&(t.issues.length||['blocked','potential'].includes(ev.code)||(t.status==='在期'&&t.maturityDate<today))));
 }).sort((a,b)=>b.tradeDate.localeCompare(a.tradeDate)||a.id.localeCompare(b.id))}
function renderTrades(){const ts=filtered();page=Math.min(page,Math.max(0,Math.ceil(ts.length/12)-1));$('trade-count').textContent=`${ts.length} 筆${periodFilter?'・'+periodFilter:''}`;
 $('trades').innerHTML=ts.slice(page*12,page*12+12).map(t=>{const e=evaluate(t,data),next=t.observationDates.find(d=>d>=today);return `<tr><td><strong>${esc(t.isin)}</strong><small>${esc(t.tradeDate)}・${esc(t.productType)}・${esc(t.issuer)}</small></td><td>${t.underlyings.map(u=>esc(u.raw)).join('<br>')}</td><td><strong>${esc(t.currency)} ${fmt(t.amount)}</strong><small>客戶 ${esc(t.clientCode||'未填')}</small></td><td>${pct(t.coupon)}<small>KO ${t.rule.koEnabled===false?'無 KO':pct(t.ko)}</small></td><td>${esc(next??'—')}<small>到期 ${esc(t.maturityDate??'未填')}</small></td><td><span class="pill ${t.status==='在期'&&t.maturityDate<today?'amber':''}">${esc(t.status)}</span><small>${esc(e.label)}</small></td><td><button class="detail-btn" data-trade="${esc(t.id)}">詳情</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">沒有符合條件的成交。</td></tr>';
 $('page-info').textContent=ts.length?`${page*12+1}–${Math.min(ts.length,(page+1)*12)}／${ts.length} 筆`:'0 筆';$('prev').disabled=page===0;$('next').disabled=(page+1)*12>=ts.length;
}
function detail(id){const t=data.trades.find(t=>t.id===id);if(!t)return;const e=evaluate(t,data),ps=performance(t,data);
 const fields=[['ISIN',t.isin],['PIMS／Blotter',`${t.source?.pimsCode||'—'}／${t.source?.blotterId||'—'}`],['產品／發行商',`${t.productType}／${t.issuer}`],['客戶代碼',t.clientCode||'未填'],['成交日',t.tradeDate],['認購金額',`${t.currency} ${fmt(t.amount)}`],['發行／最終估值',`${t.issueDate||'—'}／${t.finalValuationDate||'—'}`],['表列到期日',t.maturityDate||'未填'],['年化票息',pct(t.coupon)],['KO 比例',t.rule.koEnabled===false?'無 KO':pct(t.ko)],['KI／執行比例',`${pct(t.ki)}／${pct(t.strike)}`],['商品狀態',t.status],['KO 觀察方式',t.rule.mode],['條款核對',t.rule.verified?'已核對':'待提供 Termsheet']];
 $('detail-body').innerHTML=`<div class="pill ${e.code}">${esc(e.label)}</div><p>${esc(e.reason)}</p><div class="detail-grid">${fields.map(([a,b])=>`<div><small>${a}</small><strong>${esc(b)}</strong></div>`).join('')}</div><div class="details-subtitle">連結標的與最近收盤</div><div class="table-scroll"><table><thead><tr><th>標的</th><th>期初價</th><th>未復權收盤</th><th>期初價比例</th></tr></thead><tbody>${ps.map(u=>`<tr><td>${esc(u.raw)}</td><td>${u.initial??'—'}</td><td>${u.price??'—'}<small>${esc(u.date??'尚無行情日期')}</small></td><td>${pct(u.ratio)}</td></tr>`).join('')}</tbody></table></div><p class="muted">收盤比例只反映價格變化，尚未核對條款時不作 KO 判斷。</p><div class="details-subtitle">表列 Fixing Date ${t.rule.scheduleVerified?'（已核對）':'（KO 用途待核對）'}</div><div class="detail-dates">${t.observationDates.map(d=>`<span>${esc(d)}</span>`).join('')||'<span>未提供</span>'}</div>${t.issues.length?`<p class="warn">${t.issues.map(esc).join('；')}</p>`:''}<p class="muted">資料位置：${esc(t.source.sheet)} 第 ${t.source.row} 列。成交ID：${esc(t.id)}。${esc(t.rule.note)}${t.rule.source?'條款來源：'+esc(t.rule.source):''}</p>`;$('detail').showModal();}
async function initialize(){try{const r=await fetch('data.enc.json',{cache:'no-store'});if(r.ok){envelope=await r.json();$('gate-status').textContent='成交資料已加密；密碼只用於本機解鎖，不傳送至伺服器。'}else{$('unlock').hidden=true;$('gate-status').textContent='尚未設定共享成交資料。可匯入本機資料或查看虛構示範。'}}catch{$('unlock').hidden=true;$('gate-status').textContent='無法載入加密資料，請檢查連線或匯入本機資料。'}}
async function demo(){const d=await(await fetch('demo.json')).json();load(d,true)}
$('unlock').addEventListener('submit',async ev=>{ev.preventDefault();$('gate-status').textContent='正在解鎖…';try{load(await decrypt(envelope,$('password').value));$('password').value='';}catch{$('gate-status').textContent='解鎖失敗，請核對密碼與資料檔。'}});
$('demo').onclick=()=>demo().catch(()=>{$('gate-status').textContent='示範資料載入失敗'});
$('lock').onclick=()=>{data=null;$('main').hidden=true;$('gate').hidden=false;$('lock').hidden=true;for(const id of ['kpis','bars','categories','alerts','accounts','trades','detail-body','year','currency','account','type','status','trend-window'])$(id).innerHTML='';for(const id of ['notice','price-meta','asof','chart-total','chart-caption','mix-count','donut-total','trade-count','page-info'])$(id).textContent='';$('search').value='';$('password').value='';$('detail').close();};
$('update').onclick=()=>$('update-dialog').showModal();$('close-update').onclick=()=>$('update-dialog').close();$('close-detail').onclick=()=>$('detail').close();
$('import').onclick=$('import-gate').onclick=()=>$('file').click();
$('file').onchange=async()=>{const f=$('file').files[0];if(!f)return;try{if(f.size>25e6)throw Error('資料檔超過 25MB');let d=JSON.parse(await f.text());if(d.ciphertext){envelope=d;$('gate').hidden=false;$('main').hidden=true;$('unlock').hidden=false;$('gate-status').textContent='本機加密資料已載入，請輸入密碼。';}else load(d,false);$('update-dialog').close();}catch(e){$('import-status').textContent=e.message;$('gate-status').textContent=e.message;}finally{$('file').value=''}};
for(const id of ['year','currency','account'])$(id).onchange=()=>{page=0;periodFilter=null;trendWindow='';render()};
for(const id of ['search','type','status'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;renderTrades()});
$('period').onclick=ev=>{const p=ev.target.dataset.period;if(!p)return;period=p;periodFilter=null;trendWindow='';page=0;$('period').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.period===p));render()};
$('alert-filter').onclick=ev=>{const p=ev.target.dataset.alert;if(!p)return;alertFilter=p;$('alert-filter').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.alert===p));render()};
$('trend-window').onchange=()=>{trendWindow=$('trend-window').value;periodFilter=trendWindow;page=0;render()};
$('bars').onclick=ev=>{const b=ev.target.closest('[data-group]');if(!b)return;trendWindow=b.dataset.group;periodFilter=trendWindow;page=0;render()};
for(const id of ['alerts','trades','accounts'])$(id).onclick=ev=>{const b=ev.target.closest('[data-trade]');if(b)detail(b.dataset.trade)};
$('prev').onclick=()=>{page--;renderTrades()};$('next').onclick=()=>{page++;renderTrades()};$('reset').onclick=()=>{periodFilter=null;$('account').value='';$('search').value='';$('type').value='';$('status').value='';page=0;render()};
$('csv').onclick=()=>{const q=v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@-]/,"'$&")+'"',rows=[['成交日','ISIN','產品','發行商','幣別','認購金額','客戶代碼','到期日','Excel狀態','監控結果'],...filtered().map(t=>[t.tradeDate,t.isin,t.productType,t.issuer,t.currency,t.amount,t.clientCode,t.maturityDate,t.status,evaluate(t,data).label])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='SN_成交紀錄.csv';a.click();URL.revokeObjectURL(url)};
initialize();
