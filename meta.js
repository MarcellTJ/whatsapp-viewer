// Local XLSX reader: ZIP central directory + standard SpreadsheetML. No network dependencies.
async function readAdsWorkbook(buffer){
 const data=new Uint8Array(buffer),v=new DataView(buffer),decoder=new TextDecoder();let end=data.length-22;
 while(end>=Math.max(0,data.length-65557)&&v.getUint32(end,true)!==0x06054b50)end--;
 if(end<0||v.getUint32(end,true)!==0x06054b50)throw Error('This is not a valid XLSX file.');
 const files=new Map();let pos=v.getUint32(end+16,true);
 for(let i=0;i<v.getUint16(end+10,true);i++){
  if(v.getUint32(pos,true)!==0x02014b50)throw Error('Invalid Excel archive.');
  const method=v.getUint16(pos+10,true),size=v.getUint32(pos+20,true),unpacked=v.getUint32(pos+24,true),len=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true),offset=v.getUint32(pos+42,true),name=decoder.decode(data.slice(pos+46,pos+46+len));
  files.set(name,{method,size,unpacked,offset});pos+=46+len+extra+comment;
 }
 async function xml(name){const f=files.get(name);if(!f)throw Error('Missing worksheet data: '+name);if(f.unpacked>30e6)throw Error('Worksheet is too large.');const start=f.offset+30+v.getUint16(f.offset+26,true)+v.getUint16(f.offset+28,true);let bytes=data.slice(start,start+f.size);if(f.method===8)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());else if(f.method!==0)throw Error('Unsupported Excel compression.');const doc=new DOMParser().parseFromString(decoder.decode(bytes),'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid worksheet XML.');return doc}
 const texts=el=>Array.from(el.getElementsByTagName('t'),t=>t.textContent).join('');
 const strings=files.has('xl/sharedStrings.xml')?Array.from((await xml('xl/sharedStrings.xml')).getElementsByTagName('si'),texts):[];
 const book=await xml('xl/workbook.xml'),rels=await xml('xl/_rels/workbook.xml.rels');
 for(const sheet of book.getElementsByTagName('sheet')){
  const id=sheet.getAttribute('r:id'),rel=Array.from(rels.getElementsByTagName('Relationship')).find(r=>r.getAttribute('Id')===id);if(!rel)continue;
  const target=rel.getAttribute('Target'),path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');const rows=[];
  for(const row of (await xml(path)).getElementsByTagName('row')){const values=[];for(const cell of row.getElementsByTagName('c')){let col=0;for(const c of (cell.getAttribute('r')||'A').match(/[A-Z]+/)[0])col=col*26+c.charCodeAt(0)-64;const value=cell.getElementsByTagName('v')[0]?.textContent;values[col-1]=cell.getAttribute('t')==='s'?strings[Number(value)]:cell.getAttribute('t')==='inlineStr'?texts(cell):value??''}rows.push(values)}
  const header=rows.findIndex(r=>r.includes('Nama kampanye')&&r.includes('Jumlah yang dibelanjakan (IDR)'));if(header>=0)return rows.slice(header);
 }
 throw Error('Expected columns “Nama kampanye” and “Jumlah yang dibelanjakan (IDR)” were not found. Export campaign data using the supplied format.');
}
const adsNumber=v=>v===''||v==null||!Number.isFinite(Number(v))?null:Number(v);
function parseAdsRows(rows){const heads=rows[0],objects=rows.slice(1).map(r=>Object.fromEntries(heads.map((h,i)=>[h,r[i]??''])));const convert=r=>({name:String(r['Nama kampanye']||''),delivery:String(r['Penayangan kampanye']||''),type:String(r['Indikator Hasil']||''),results:adsNumber(r.Hasil),spend:adsNumber(r['Jumlah yang dibelanjakan (IDR)']),impressions:adsNumber(r.Impresi),reach:adsNumber(r.Jangkauan),start:r['Awal pelaporan'],end:r['Akhir pelaporan'],attribution:r['Pengaturan atribusi'],budget:r['Anggaran Set Iklan'],budgetType:r['Jenis Anggaran Set Iklan'],ends:r.Berakhir,reportedCost:adsNumber(r['Biaya per Hasil'])});return {campaigns:objects.filter(r=>String(r['Nama kampanye']||'').trim()).map(convert),summary:objects.find(r=>!r['Nama kampanye']&&adsNumber(r['Jumlah yang dibelanjakan (IDR)'])!==null)?convert(objects.find(r=>!r['Nama kampanye']&&adsNumber(r['Jumlah yang dibelanjakan (IDR)'])!==null)):null}}
const adsTypeLabel=t=>({'profile_visit_view':'Profile visits','total_profile_visits':'Total profile visits','actions:onsite_conversion.messaging_conversation_started_7d':'Messaging conversations'}[t]||t||'Unspecified');
let adsData={campaigns:[],summary:null};
const adsFmt=(n,d=0)=>n==null?'—':n.toLocaleString('en-US',{maximumFractionDigits:d});
const adsMoney=n=>n==null?'—':'Rp '+adsFmt(n,0);
const adsRatio=(a,b,k=1)=>a==null||b==null||b===0?null:a/b*k;
function adsSum(rows,key){return rows.length&&rows.every(r=>r[key]!=null)?rows.reduce((n,r)=>n+r[key],0):null}
function renderAds(){
 const q=$('adsSearch').value.toLowerCase(),type=$('adsType').value,delivery=$('adsDelivery').value;
 const rows=adsData.campaigns.filter(r=>r.name.toLowerCase().includes(q)&&(!type||r.type===type)&&(!delivery||r.delivery===delivery));
 const cost=r=>adsRatio(r.spend,r.results)??r.reportedCost;
 rows.sort((a,b)=>$('adsSort').value==='name'?a.name.localeCompare(b.name):$('adsSort').value==='cost'?(cost(a)??Infinity)-(cost(b)??Infinity):$('adsSort').value==='results'?(b.results??-1)-(a.results??-1):(b.spend??-1)-(a.spend??-1));
 const spend=adsSum(rows,'spend'),impressions=adsSum(rows,'impressions'),reach=!q&&!type&&!delivery?adsData.summary?.reach:null;
 $('adsStats').innerHTML=[['Amount spent',adsMoney(spend),'Across filtered campaigns'],['Impressions',adsFmt(impressions),'Total ad displays'],['Overall reach',adsFmt(reach),reach==null?'Available from unfiltered export total':'People reached · export total'],['CPM',adsMoney(adsRatio(spend,impressions,1000)),'Cost per 1,000 impressions']].map(([label,value,note])=>'<article><label>'+label+'</label><strong>'+value+'</strong><p>'+note+'</p></article>').join('');
 $('adsCount').textContent=rows.length;$('adsRows').replaceChildren();
 for(const r of rows){const tr=document.createElement('tr');for(const value of [r.name,r.delivery,adsTypeLabel(r.type),adsFmt(r.results),adsMoney(r.spend),adsMoney(cost(r)),adsFmt(r.impressions),adsFmt(r.reach),adsFmt(adsRatio(r.impressions,r.reach),2),adsMoney(adsRatio(r.spend,r.impressions,1000)),r.attribution,r.budget===''?'—':typeof r.budget==='string'&&!Number.isFinite(Number(r.budget))?r.budget:adsMoney(adsNumber(r.budget))+(r.budgetType&&r.budgetType!=='0'?' · '+r.budgetType:''),r.ends||'—']){const td=document.createElement('td');td.textContent=value;tr.append(td)}$('adsRows').append(tr)}
 $('adsEmpty').hidden=rows.length>0;$('adsEmpty').textContent=adsData.campaigns.length?'No campaigns match the filters.':'No campaign data loaded.';
 const top=[...rows].sort((a,b)=>(b.spend??0)-(a.spend??0)).slice(0,8),max=Math.max(1,...top.map(r=>r.spend??0));$('adsBars').innerHTML=top.map(r=>'<div class="ads-bar"><div><span>'+esc(r.name)+'</span><b>'+adsMoney(r.spend)+'</b></div><div class="ads-track"><i style="width:'+((r.spend??0)/max*100)+'%"></i></div></div>').join('')||'<p>No campaigns to compare.</p>';
 const types=[...new Set(rows.map(r=>r.type))];$('adsOutcomes').innerHTML=types.map(t=>{const group=rows.filter(r=>r.type===t),n=adsSum(group,'results'),s=adsSum(group,'spend');return '<div class="ads-outcome"><h3>'+esc(adsTypeLabel(t))+'</h3><strong>'+adsFmt(n)+'</strong><p>'+group.length+' campaigns · '+adsMoney(s)+' spent</p><p>Cost per result: <b>'+adsMoney(adsRatio(s,n))+'</b></p></div>'}).join('')||'<p>Import an export to see result types.</p>';
 const periods=[...new Set(adsData.campaigns.map(r=>r.start+' → '+r.end))];$('adsPeriod').textContent=periods.length?'Reporting period: '+periods.join(' · '):'';
}
function resetAdsFilters(){for(const [id,key,label] of [['adsType','type','All result types'],['adsDelivery','delivery','All delivery statuses']]){const el=$(id);el.replaceChildren(new Option(label,''));for(const value of [...new Set(adsData.campaigns.map(r=>r[key]))].filter(Boolean))el.add(new Option(key==='type'?adsTypeLabel(value):value,value))}$('adsSearch').value='';}
$('adsImport').onclick=()=>$('adsFile').click();
$('adsFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('adsImport').disabled=true;adsData={campaigns:[],summary:null};resetAdsFilters();renderAds();try{if(f.size>30e6)throw Error('Please use an export smaller than 30 MB.');adsData=parseAdsRows(await readAdsWorkbook(await f.arrayBuffer()));if(!adsData.campaigns.length)throw Error('No campaign rows were found.');resetAdsFilters();renderAds();$('adsStatus').textContent=f.name+' · '+adsData.campaigns.length+' campaigns imported. Data stays in this browser tab only.'}catch(err){adsData={campaigns:[],summary:null};resetAdsFilters();renderAds();$('adsStatus').textContent='Import failed: '+err.message}finally{$('adsImport').disabled=false;e.target.value=''}};
$('adsClear').onclick=()=>{adsData={campaigns:[],summary:null};resetAdsFilters();renderAds();$('adsStatus').textContent='Cleared. Import an Excel export to begin.'};
for(const id of ['adsType','adsDelivery','adsSort'])$(id).onchange=renderAds;$('adsSearch').oninput=renderAds;renderAds();
