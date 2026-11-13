// Classification always uses first messaged across the entire loaded snapshot.
function leadDay(at){const d=new Date(at);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function calculateLeadDays(source){
 const first=new Map(),active=new Map();
 for(const r of source){
  const key=normalize(r.contact),day=leadDay(r.at);
  if(!first.has(key)||day<first.get(key))first.set(key,day);
  if(!active.has(day))active.set(day,new Set());
  active.get(day).add(key);
 }
 return [...active].sort(([a],[b])=>a.localeCompare(b)).map(([day,contacts])=>{
  let newLeads=0;for(const key of contacts)if(first.get(key)===day)newLeads++;
  return {day,newLeads,returning:contacts.size-newLeads,total:contacts.size};
 });
}
function leadMonthRows(days,month){return days.filter(d=>d.day.slice(0,7)===month)}
function renderLeads(){
 const days=calculateLeadDays(records),months=[...new Set(days.map(d=>d.day.slice(0,7)))].sort().reverse();
 const selected=$('leadMonth').value;
 $('leadMonth').replaceChildren();
 for(const month of months){const option=document.createElement('option');option.value=month;const [year,m]=month.split('-').map(Number);option.textContent=new Date(year,m-1,1).toLocaleDateString('en-GB',{month:'long',year:'numeric'});$('leadMonth').append(option)}
 if(months.includes(selected))$('leadMonth').value=selected;
 $('leadMonth').disabled=!months.length;
 const rows=leadMonthRows(days,$('leadMonth').value);
 $('leadRows').replaceChildren();
 for(const day of rows){const tr=document.createElement('tr');const [year,month,d]=day.day.split('-').map(Number);const label=new Date(year,month-1,d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});for(const value of [label,day.newLeads,day.returning,day.total]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}$('leadRows').append(tr)}
 $('leadNewTotal').textContent=rows.reduce((n,d)=>n+d.newLeads,0);
 $('leadReturningTotal').textContent=rows.reduce((n,d)=>n+d.returning,0);
 $('leadTotal').textContent=rows.reduce((n,d)=>n+d.total,0);
 $('leadEmpty').hidden=rows.length>0;
}
function switchWorkspaceTab(view){
 for(const [key,label] of [['activity','Contact activity'],['leads','Lead Monitoring'],['ads','Meta Ads']]){
  const active=view===key;$(key==='activity'?'activityPanel':key+'Panel').hidden=!active;
  const tab=$(key==='activity'?'activityTab':key+'Tab');tab.setAttribute('aria-selected',String(active));tab.classList.toggle('active',active);tab.tabIndex=active?0:-1;
  if(active)$('currentViewLabel').textContent=label;
 }
 if(view==='leads')renderLeads();
}
const workspaceViews=['activity','leads','ads'];
for(const [i,view] of workspaceViews.entries()){
 const tab=$(view+'Tab');tab.onclick=()=>switchWorkspaceTab(view);
 tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;switchWorkspaceTab(workspaceViews[next]);$(workspaceViews[next]+'Tab').focus()}};
}
$('leadMonth').onchange=renderLeads;
renderLeads();
