// Store only the appearance preference. CSV data remains in memory only.
function setTheme(dark){
 document.documentElement.dataset.theme=dark?'dark':'light';
 $('themeToggle').textContent=dark?'Light mode':'Dark mode';
 $('themeToggle').setAttribute('aria-label','Switch to '+(dark?'light':'dark')+' mode');
 $('themeToggle').setAttribute('aria-pressed',String(dark));
}
setTheme(document.documentElement.dataset.theme==='dark');
$('themeToggle').onclick=()=>{
 const dark=document.documentElement.dataset.theme!=='dark';setTheme(dark);
 try{localStorage.setItem('ledger-theme',dark?'dark':'light')}catch{}
};
