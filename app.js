const $=id=>document.getElementById(id);let records=[],loadRevision=0;
function csv(text){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=c}if(quoted)throw Error('Unclosed quote');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows}
function normalize(s){const n=s.replace(/[\s().-]/g,'');return /^\+?\d+$/.test(n)?n.replace(/^\+/,'').replace(/^00/,''):s.trim().toLowerCase()}
function parse(text){let result=[],invalid=0;for(const [index,row]of csv(text.replace(/^\uFEFF/,'')).entries()){if(index===0&&/date|tanggal/i.test(row[0]))continue;const [date,time,raw]=row.map(s=>s.trim());let d=/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(date||'');if(!d){const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||'');if(iso)d=[null,iso[3],iso[2],iso[1]]}const t=/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time||'');if(!d||!t||!raw){invalid++;continue}const [day,month,year]=d.slice(1).map(Number),[hour,min,sec]=[+t[1],+t[2],+(t[3]||0)],dt=new Date(year,month-1,day,hour,min,sec);if(dt.getFullYear()!==year||dt.getMonth()!==month-1||dt.getDate()!==day||hour>23||min>59||sec>59){invalid++;continue}const contact=raw,key=normalize(contact),at=dt.getTime();result.push({contact,at,id:key+'|'+at})}return{result,invalid}}
// A loaded CSV snapshot is the only data source. No browser storage or accumulated imports.
function snapshot(texts){const next=[];let invalid=0;for(const text of texts){const parsed=parse(text);next.push(...parsed.result);invalid+=parsed.invalid}return {records:next,invalid}}
function beginLoad(){
 const revision=++loadRevision;records=[];
 for(const id of ['details','exportDialog']){const modal=$(id);if(modal&&modal.open)modal.close()}
 $('printFrame')?.remove();render();return revision;
}
function applySnapshot(texts,revision){const next=snapshot(texts);if(revision!==loadRevision)return null;records=next.records;render();return next}
const date=at=>new Date(at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),time=at=>new Date(at).toLocaleTimeString('en-GB',{hour12:false}),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function groups(){const m=new Map;for(const r of records){const key=normalize(r.contact);if(!m.has(key))m.set(key,{contact:r.contact,items:[]});m.get(key).items.push(r)}return [...m.values()].map(g=>{g.items.sort((a,b)=>b.at-a.at);return{...g,first:g.items.at(-1).at,last:g.items[0].at}})}
function render(){const all=groups(),q=normalize($('search').value),sort=$('sort').value,filtered=all.filter(g=>normalize(g.contact).includes(q));filtered.sort((a,b)=>sort==='count'?b.items.length-a.items.length:sort==='oldest'?a.first-b.first:b.last-a.last);$('contacts').textContent=all.length.toLocaleString();$('events').textContent=records.length.toLocaleString();$('badge').textContent=all.length;const last=records.reduce((n,r)=>Math.max(n,r.at),0);$('latest').textContent=last?date(last):'—';$('latestTime').textContent=last?time(last):'No activity yet';$('rows').replaceChildren();for(const g of filtered){const tr=document.createElement('tr');tr.innerHTML='<td class="number"><span class="icon">♧</span>'+esc(g.contact)+'</td><td>'+date(g.first)+'<small>'+time(g.first)+'</small></td><td>'+date(g.last)+'<small>'+time(g.last)+'</small></td><td><span class="count">'+g.items.length+'</span></td><td><button class="link">View details ↗</button></td>';tr.querySelector('button').onclick=()=>show(g);$('rows').append(tr)}$('empty').hidden=filtered.length>0;$('empty').querySelector('h3').textContent=all.length?'No matching contacts':'Your directory starts here';$('empty').querySelector('p').textContent=all.length?'Try another number or contact name.':'Import a CSV log to see unique numbers and their complete history.';$('shown').textContent='Showing '+filtered.length+' of '+all.length+' contacts';$('clear').disabled=!records.length;if(typeof renderLeads==='function')renderLeads()}
function show(g){$('detailNumber').textContent=g.contact;$('detailCount').textContent=g.items.length;$('detailFirst').textContent=date(g.first)+' · '+time(g.first);$('detailLast').textContent=date(g.last)+' · '+time(g.last);$('history').replaceChildren();for(const r of g.items){const el=document.createElement('div');el.className='entry';el.innerHTML='<div>'+date(r.at)+'<small>'+time(r.at)+'</small></div><span>Logged interaction</span>';$('history').append(el)}$('details').showModal();$('history').scrollTop=0}
$('close').onclick=()=>$('details').close();$('details').addEventListener('click',e=>{if(e.target===$('details')){const b=$('details').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('details').close()}});$('search').oninput=render;$('sort').onchange=render;$('import').onclick=()=>$('files').click();$('files').onchange=async e=>{
 const files=[...e.target.files];e.target.value='';if(!files.length)return;
 const revision=beginLoad();$('status').textContent='Loading selected CSV files...';
 try{
  const texts=await Promise.all(files.map(file=>file.text()));
  const result=applySnapshot(texts,revision);if(!result)return;
  $('status').textContent='Showing '+result.records.length+' interactions from '+files.map(f=>f.name).join(', ')+'.'+(result.invalid?' '+result.invalid+' invalid rows skipped.':'');
 }catch(error){if(revision===loadRevision)$('status').textContent='CSV load failed: '+error.message+'. No data is displayed.'}
};
$('clear').onclick=()=>{beginLoad();$('status').textContent='View cleared. Import a CSV or sync from Drive to load current data.'};
render();

/* ===== Google Drive sync =====
   Reads the current log file from the signed-in user's Drive and replaces
   the displayed snapshot. Nothing is accumulated or saved locally. Edit folder/file below
   if your Drive names differ (case-sensitive). */
const GDRIVE={
  clientId:'961123631368-09d3gj7it7rsdb7r0645f5k6rf5tpatl.apps.googleusercontent.com',
  scope:'https://www.googleapis.com/auth/drive.readonly',
  folder:'Purissa_WA_Logs',
  file:'wa_logs_2026.csv'
};
let gToken=null,gTokenExp=0,gClient=null,gPending=null;

function loadGis(){
  return new Promise((resolve,reject)=>{
    if(window.google&&google.accounts&&google.accounts.oauth2)return resolve();
    const s=document.createElement('script');
    s.src='https://accounts.google.com/gsi/client';s.async=true;
    s.onload=()=>resolve();
    s.onerror=()=>reject(Error('Could not load Google sign-in'));
    document.head.append(s);
  });
}

function getToken(){
  return new Promise((resolve,reject)=>{
    if(gToken&&Date.now()<gTokenExp-60000)return resolve(gToken);
    gPending={resolve,reject};
    if(!gClient){
      gClient=google.accounts.oauth2.initTokenClient({
        client_id:GDRIVE.clientId,
        scope:GDRIVE.scope,
        callback:r=>{
          const p=gPending;gPending=null;if(!p)return;
          if(r.error)return p.reject(Error(r.error_description||r.error));
          gToken=r.access_token;gTokenExp=Date.now()+(Number(r.expires_in)||3600)*1000;
          p.resolve(gToken);
        },
        error_callback:e=>{
          const p=gPending;gPending=null;
          if(p)p.reject(Error(e&&e.type==='popup_closed'?'Sign-in was closed':'Sign-in failed'+(e&&e.type?' ('+e.type+')':'')));
        }
      });
    }
    gClient.requestAccessToken({prompt:''});
  });
}

async function gfetch(url,token){
  const r=await fetch(url,{headers:{Authorization:'Bearer '+token}});
  if(!r.ok){
    let m='';try{m=(await r.json()).error.message}catch{}
    if(r.status===401)gToken=null;
    throw Error('Drive '+r.status+(m?': '+m:''));
  }
  return r;
}

const gq=s=>s.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

async function findDriveFile(token){
  const base='https://www.googleapis.com/drive/v3/files?';
  const folders=await(await gfetch(base+new URLSearchParams({
    q:"name='"+gq(GDRIVE.folder)+"' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields:'files(id)',pageSize:'10'
  }),token)).json();
  for(const f of folders.files||[]){
    const res=await(await gfetch(base+new URLSearchParams({
      q:"'"+f.id+"' in parents and name='"+gq(GDRIVE.file)+"' and trashed=false",
      fields:'files(id,modifiedTime)',orderBy:'modifiedTime desc',pageSize:'1'
    }),token)).json();
    if(res.files&&res.files[0])return res.files[0];
  }
  return null;
}

async function driveSync(){
  const btn=$('gsync'),label=btn.textContent;
  const revision=beginLoad();
  btn.disabled=true;btn.textContent='Syncing…';$('status').textContent='Loading current CSV from Drive...';
  try{
    await loadGis();
    const token=await getToken();
    const f=await findDriveFile(token);
    if(revision!==loadRevision)return;
    if(!f){$('status').textContent='Drive sync: '+GDRIVE.folder+'/'+GDRIVE.file+' was not found in your Drive.';return}
    const text=await(await gfetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(f.id)+'?alt=media',token)).text();
    const result=applySnapshot([text],revision);if(!result)return;
    $('status').textContent='Drive sync: showing '+result.records.length+' interactions from the current CSV.'+(result.invalid?' '+result.invalid+' invalid rows skipped.':'')+(f.modifiedTime?' File last updated '+new Date(f.modifiedTime).toLocaleString('en-GB')+'.':'');
  }catch(e){
    if(revision===loadRevision)$('status').textContent='Drive sync failed: '+e.message+'. No data is displayed.';
  }finally{
    btn.disabled=false;btn.textContent=label;
  }
}
$('gsync').onclick=driveSync;