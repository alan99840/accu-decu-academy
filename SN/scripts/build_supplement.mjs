import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputDir=path.join(root,'outputs/01a11406-2bf5-7d11-ab30-f42e51d131e7');
const outputFile=path.join(outputDir,'SN_監控補充資料.xlsx');
if(await fs.stat(outputFile).then(()=>true).catch(()=>false))throw Error('補充工作簿已存在，請編輯現有檔案，避免覆蓋已填條款。');
const d=JSON.parse(await fs.readFile(path.join(root,'private/dataset.json'),'utf8'));
const w=Workbook.create();
function sheet(name,headers,rows){const s=w.worksheets.add(name);s.showGridLines=false;s.tabColor='#007d70';s.getRangeByIndexes(0,0,1,headers.length).values=[headers];if(rows.length)s.getRangeByIndexes(1,0,rows.length,headers.length).values=rows;s.getRangeByIndexes(0,0,Math.max(2,rows.length+1),headers.length).format.font={name:'Arial',size:10,color:'#172d2a'};s.getRangeByIndexes(0,0,1,headers.length).format={fill:'#007d70',font:{color:'#FFFFFF',bold:true},rowHeight:32,verticalAlignment:'center',horizontalAlignment:'center'};s.getRangeByIndexes(1,0,Math.max(1,rows.length),headers.length).format.rowHeight=24;s.getRangeByIndexes(0,0,Math.max(2,rows.length+1),headers.length).format.columnWidth=20;s.freezePanes.freezeRows(1);s.freezePanes.freezeColumns(2);return s}
const dt=v=>v?new Date(v+'T00:00:00Z'):null;
const rows=d.trades.map(t=>[t.id,t.isin,t.clientCode,dt(t.tradeDate),t.productType,t.issuer,t.status,'',t.rule.koEnabled===false?'否':t.rule.koEnabled===true?'是':'未確認',t.rule.mode,'>=',t.ko,'否','是','否',null,t.rule.source,t.issues.join('；')]);
const s=sheet('條款確認',['成交ID','ISIN','客戶代碼','成交日','產品','發行商','Excel狀態','確認商品狀態','有KO條款','KO觀察方式','觸發比較','確認KO比例','期初價及調整已核對','觀察日已核對','條款已核對','確認到期日','Termsheet來源','備註'],rows);
const n=rows.length+1;s.getRange(`D2:D${n}`).setNumberFormat('yyyy-mm-dd');s.getRange(`P2:P${n}`).setNumberFormat('yyyy-mm-dd');s.getRange(`L2:L${n}`).setNumberFormat('0.00%');s.getRange(`H2:R${n}`).format.font.color='#0000FF';s.getRange(`H2:R${n}`).format.fill='#fff9ec';s.getRange(`A1:B${n}`).format.columnWidth=23;s.getRange(`M1:N${n}`).format.columnWidth=27;s.getRange(`Q1:R${n}`).format.columnWidth=48;
s.getRange(`H2:H${n}`).dataValidation={rule:{type:'list',values:['在期','提前贖回','提前敲出','到期','到期贖回','提前到期','承接股票','未填狀態']}};
s.getRange(`I2:I${n}`).dataValidation={rule:{type:'list',values:['未確認','是','否']}};
s.getRange(`J2:J${n}`).dataValidation={rule:{type:'list',values:['未確認','離散全數','每日全數','記憶KO','每日記憶KO']}};
s.getRange(`K2:K${n}`).dataValidation={rule:{type:'list',values:['>=','>']}};
s.getRange(`M2:O${n}`).dataValidation={rule:{type:'list',values:['是','否']}};
const obs=d.trades.flatMap(t=>t.observationDates.map(date=>[t.id,t.isin,dt(date),`${t.source.sheet} 原始 Fixing Date，KO 用途待核對`]));
const o=sheet('觀察日',['成交ID','ISIN','觀察日','來源'],obs);o.getRange(`C2:C${obs.length+1}`).setNumberFormat('yyyy-mm-dd');o.getRange(`A1:B${obs.length+1}`).format.columnWidth=23;o.getRange(`D1:D${obs.length+1}`).format.columnWidth=68;
const priceRows=[];
const p=sheet('收盤價',['美股代號','美國交易日','未復權收盤價','來源','已核對'],priceRows);p.getRange(`B2:B${Math.max(2,priceRows.length+1)}`).setNumberFormat('yyyy-mm-dd');p.getRange(`C2:C${Math.max(2,priceRows.length+1)}`).setNumberFormat('0.0000');p.getRange('D1:D20').format.columnWidth=55;p.getRange('G1').values=[['收盤價使用美國交易日，不含盤前／盤後。']];p.getRange('G2').values=[['手動資料需核對未復權價格及公司行動。']];p.getRange('G1:G2').format.columnWidth=62;
w.recalculate();await fs.mkdir(path.join(root,'outputs'),{recursive:true});
const scan=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:20},summary:'錯誤檢查'});console.log(scan.ndjson);
for(const [name,range] of [['條款確認','A1:G9'],['觀察日','A1:D8'],['收盤價','A1:E8']]){const b=await w.render({sheetName:name,range,scale:1,format:'png'});await fs.writeFile(path.join(root,'outputs',name+'.png'),new Uint8Array(await b.arrayBuffer()))}
await fs.mkdir(outputDir,{recursive:true});await(await SpreadsheetFile.exportXlsx(w)).save(outputFile);
console.log(JSON.stringify({trades:rows.length,observations:obs.length,prices:priceRows.length,file:'private/SN_監控補充資料.xlsx'}));
