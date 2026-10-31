// SkyBet front end. Loaded as an ES module by index.html (top-level await is used to load fixtures.json).

/* =============================================================
   SkyBet single-file front end.
   DEMO_MODE=false  -> everything runs in the browser with play money.
   DEMO_MODE=false -> the app talks to YOUR server (CONFIG.apiBase). Never put the TinyPesa key in this file.
   DEPOSIT (TinyPesa STK push), through your server:
     POST /api/pay/deposit        {phone, amount in KES}  -> {id}
     GET  /api/pay/status/:id                              -> {status:'pending'|'success'|'failed'}
     TinyPesa calls your callback URL; the server credits the wallet there (see tinypesa-routes.js).
   WITHDRAW (B2C)  POST /api/mpesa/b2c     {phone, amount} -> {id, status}
   VERIFY          POST /api/mpesa/verify  {code}
   BALANCE         GET  /api/me            -> {balance, bonus}  (cents)
   ============================================================= */
const DEMO_MODE=false;
const CONFIG={apiBase:'https://skybet-o2ws.onrender.com/api',paybill:'1846126'/* set '' to hide manual paybill (TinyPesa is prompt-only) */,minDeposit:1000,minWithdraw:5000,minBet:500,maxBet:10000000,support:{wa:'254000000000',tel:'+254000000000',mail:'support@skybet.example'}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const API={demo:DEMO_MODE,
  async req(method,p,b){const r=await fetch(CONFIG.apiBase+p,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(DB.token||'')},body:b?JSON.stringify(b):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed.');return d},
  async deposit(phone,cents){if(!API.demo)return API.req('POST','/pay/deposit',{phone,amount:cents/100});await sleep(600);return{id:'demo-'+Date.now()}},
  async depositStatus(id){if(API.demo){await sleep(2200);return{status:'success'}}
    for(let i=0;i<30;i++){await sleep(3000);const s=await API.req('GET','/pay/status/'+encodeURIComponent(id));if(s.status!=='pending')return s}return{status:'pending'}},
  async withdraw(phone,cents){if(!API.demo)return API.req('POST','/mpesa/b2c',{phone,amount:cents/100});await sleep(500);return{id:'demo-w-'+Date.now(),status:'pending'}},
  async verifyCode(code){if(!API.demo)return API.req('POST','/mpesa/verify',{code});await sleep(700);return{status:'pending'}},
  async syncBalance(){const d=await API.req('GET','/me'),u=me();if(u){u.balance=d.balance;u.bonus=d.bonus||0;save()}}};

const $=(s,r=document)=>r.querySelector(s);
const money=c=>(c/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const crashFrom=h=>{const n=parseInt(h.slice(0,13),16),e=2**52;return n%33===0?1:Math.floor((100*e-n)/(e-n))/100};
const store={get(){try{return JSON.parse(localStorage.getItem('skybet3')||'{}')}catch{return{}}},set(d){try{localStorage.setItem('skybet3',JSON.stringify(d))}catch{}}};
let DB=Object.assign({users:{},session:null,support:[],rooms:{}},store.get());
const save=()=>store.set(DB),me=()=>DB.users[DB.session];
const normPhone=p=>{p=String(p).replace(/[\s-]/g,'');return p.replace(/^\+?254/,'0')},phoneOk=p=>/^0[17]\d{8}$/.test(normPhone(p)),mask=p=>'****'+p.slice(-4);
const IC={back:'M15 18l-6-6 6-6',chev:'M9 18l6-6-6-6',close:'M6 6l12 12M18 6L6 18',bell:'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4',gift:'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H8a2.500 2.500 0 110-5C11 2 12 7 12 7zm0 0h4a2.500 2.500 0 100-5C13 2 12 7 12 7z',users:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.900M16 3.100a4 4 0 010 7.800',spark:'M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 17l.8 2.200L22 20l-2.200.8L19 23l-.8-2.200L16 20l2.200-.8z',receipt:'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6',clock:'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',alert:'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v5M12 16h.01',lock:'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',headset:'M4 14v-2a8 8 0 0116 0v2M4 14h3v5H4zM17 14h3v5h-3zM20 19a4 4 0 01-4 3h-2',ban:'M12 21a9 9 0 100-18 9 9 0 000 18zM5.600 5.600l12.800 12.800',home:'M3 11l9-8 9 8v10H3zM9 21v-6h6v6',plus:'M12 5v14M5 12h14',wallet:'M3 7h16a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7V5a2 2 0 012-2h12M17 14h.01',up:'M12 19V5M5 12l7-7 7 7',user:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',chat:'M21 12a8 8 0 01-11.600 7.100L3 21l1.900-6.400A8 8 0 1121 12z',menu:'M4 7h16M4 12h16M4 17h16',shield:'M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6zM9 12l2 2 4-4',dl:'M12 4v11M7 11l5 5 5-5M5 20h14',bulb:'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.500c.700.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0012 3z',gauge:'M4 18a9 9 0 1116 0M12 18l4-6',book:'M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4zM8 4v12',minus:'M5 12h14'};
const ic=(n,s=24)=>n==='plane'?`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 16v-2l-8-5V3.500c0-.830-.670-1.500-1.500-1.500S10 2.670 10 3.500V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z"/></svg>`:`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n]}"/></svg>`;
function toast(t){document.querySelectorAll('.toast').forEach(x=>x.remove());const d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2800)}
function modal(h){const o=document.createElement('div');o.className='ov';o.innerHTML=`<div class="card">${h}<button class="btn g" data-x>Close</button></div>`;o.onclick=e=>{if(e.target===o||e.target.closest('[data-x]'))o.remove()};document.body.appendChild(o)}
const notify=(u,t,b)=>u.notifs.unshift({t,b,read:false,d:Date.now()});
const spend=(u,c)=>{if(u.balance+u.bonus<c)return false;const f=Math.min(u.balance,c);u.balance-=f;u.bonus-=c-f;return true};

/* ---------- navigation ---------- */
let view='home',P={},stack=[],btab='all',menuOpen=false;
const nav=(v,p)=>{stack.push([view,P]);view=v;P=p||{};render()};
const back=()=>{const s=stack.pop()||['home',{}];[view,P]=s;render()};
const tab=v=>{stack=[];view=v;P={};render()};
document.addEventListener('click',e=>{const t=e.target.closest('[data-go],[data-tab],[data-back]');if(!t)return;
  if(t.dataset.go)nav(t.dataset.go);else if(t.dataset.tab)tab(t.dataset.tab);else back()});
const NAV=[['home','Home','home'],['deposit','Deposit','plus'],['withdraw','Withdraw','up'],['refer','Referrals','users'],['profile','Profile','user']];
const navBar=a=>`<nav class="bn">${NAV.map(([v,l,i])=>`<button data-tab="${v}" class="${a===v?'on':''}">${ic(i,26)}${l}</button>`).join('')}</nav>`;
const fab=()=>`<button class="fab" data-go="support" aria-label="Support chat">${ic('chat',28)}</button>`;
const unread=u=>u?u.notifs.filter(n=>!n.read).length:0;
function pageShell(title,body,o={}){const u=me(),n=unread(u);
  document.body.className='';
  $('#app').innerHTML=`<div class="ph"><button class="sq" data-back aria-label="Back">${ic('back')}</button><h1>${title}</h1>${o.close?`<button class="sq" data-tab="home" aria-label="Close">${ic('close')}</button>`:u?`<button class="sq" data-go="notifs" aria-label="Notifications">${ic('bell')}${n?`<span class="badge">${n}</span>`:''}</button>`:'<span class="sp"></span>'}</div>
  <main>${body}</main>${o.nav===false?'':navBar(o.active||'profile')}${o.nav===false?'':fab()}`;window.scrollTo(0,0)}
const need=(title,why)=>{if(me())return false;pageShell(title,`<section class="card"><h2>Log in to continue</h2><p class="mute">${why}</p><button class="btn g" data-go="login">Login</button><button class="btn" data-go="register">Create account</button></section>`,{active:'home'});return true};
const rowH=(i,t,s,go,o={})=>`<button class="row ${o.cls||''}" data-go="${go}"><span class="ri">${ic(i)}</span><span class="t"><b>${t}</b><span>${s}</span></span>${o.badge?`<span class="n">${o.badge}</span>`:''}${o.on?`<span class="on">● ${o.on}</span>`:''}<span class="mute">${ic('chev',20)}</span></button>`;
const txRows=(l,empty='Nothing yet')=>`<ul class="tx">${l.map(t=>`<li><span>${esc(t.t)}${t.s?` <span class="mute">(${t.s})</span>`:''}<br><small class="mute">${new Date(t.d||Date.now()).toLocaleString()}</small></span><span class="${t.a<0?'neg':'pos'}">${money(t.a)}</span></li>`).join('')||`<li class="mute">${empty}</li>`}</ul>`;
const addTx=(u,t,a,s)=>u.tx.unshift({t,a,s,d:Date.now()});

/* ---------- Sports: fixtures, odds, live scores, bet slip ---------- */
// DATA ADAPTER. Fixtures are a real snapshot from 31 Oct 2026. Odds are DEMO odds derived from win probabilities (about 7% margin).
// Live matches are SIMULATED in this preview. For production, serve the same shape from GET /api/sports/fixtures,
// backed by a licensed odds and live-score feed (e.g. Sportradar/Betradar, API-Football, The Odds API). Validate odds and settle bets on the server.
const DATA=await fetch(DEMO_MODE?'fixtures.json':CONFIG.apiBase+'/sports/fixtures',{cache:'no-cache'}).then(r=>r.json()).catch(()=>({leagues:{},fixtures:[],results:[]}));
const LG=DATA.leagues;
const mk=(lg,t,h,a,ph,pd,pa,i)=>({id:i,lg,t:Date.parse(t),h,a,p:{h:ph,d:pd,a:pa},live:null});
const FIX=DATA.fixtures.map((x,i)=>mk(...x,i+1));
const RES=DATA.results.map(([lg,t,h,a,hs,as],i)=>({id:900+i,lg,t:Date.parse(t),h,a,hs,as}));
const LIVE=[0,6,13].filter(k=>FIX[k]).map((k,i)=>{const m={...FIX[k],id:100+i,p:{...FIX[k].p}};m.live={min:8+Math.floor(Math.random()*50),hs:0,as:0};m.t=Date.now()-m.live.min*60000;return m});
const mById=id=>LIVE.find(m=>m.id===id)||FIX.find(m=>m.id===id);
const oddOf=pc=>Math.max(1.01,Math.round(9346/Math.max(pc,.5))/100);
function probs(m){if(!m.live)return m.p;const L=m.live,d=L.hs-L.as,t=L.min/90,w=.3+t,h=m.p.h*Math.exp(.9*d*w),a=m.p.a*Math.exp(-.9*d*w),x=m.p.d*Math.exp(-.5*Math.abs(d)*w)*(d===0?1+t:1),s=h+a+x;return{h:h/s*100,d:x/s*100,a:a/s*100}}
const oddsFor=(m,k)=>{const p=probs(m);return oddOf({h:p.h,d:p.d,a:p.a,'1x':p.h+p.d,x2:p.d+p.a,'12':p.h+p.a}[k])};
const pickName=(m,k)=>({h:m.h,d:'Draw',a:m.a,'1x':m.h+' or Draw',x2:'Draw or '+m.a,'12':m.h+' or '+m.a})[k];
let stab='upcoming',slg='all',slip=[],slipStake='100',slipOpen=false,bhTab='av';const openMore=new Set();
const fmtT=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),fmtD=t=>new Date(t).toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'}),sameDay=(a,b)=>new Date(a).toDateString()===new Date(b).toDateString();
function oddsBtn(m,k,l){const sel=slip.some(s=>s.mid===m.id&&s.k===k),closed=!m.live&&m.t<Date.now();
  return `<button class="ob ${sel?'sel':''}" data-odd data-m="${m.id}" data-k="${k}" ${closed?'disabled':''} aria-pressed="${sel}" aria-label="${esc(pickName(m,k))}"><small>${l}</small>${closed?ic('lock',14):oddsFor(m,k).toFixed(2)}</button>`}
function matchCard(m){const L=m.live,more=openMore.has(m.id);
  return `<div class="mc"><div class="mh"><span>${LG[m.lg]}</span>${L?`<span class="lv">● LIVE ${L.min}'<em>DEMO</em></span>`:`<span>${fmtT(m.t)}</span>`}</div>
  <div class="tm"><span>${esc(m.h)}</span>${L?`<b>${L.hs}</b>`:''}</div><div class="tm"><span>${esc(m.a)}</span>${L?`<b>${L.as}</b>`:''}</div>
  <div class="od">${oddsBtn(m,'h','1')}${oddsBtn(m,'d','X')}${oddsBtn(m,'a','2')}</div>
  <button class="more" data-more="${m.id}">${more?'Hide markets':'+ Double chance'}</button>${more?`<div class="od">${oddsBtn(m,'1x','1X')}${oddsBtn(m,'12','12')}${oddsBtn(m,'x2','X2')}</div>`:''}</div>`}
const resCard=r=>`<div class="mc"><div class="mh"><span>${LG[r.lg]}</span><span>FT · ${fmtD(r.t)}</span></div><div class="tm"><span>${esc(r.h)}</span><b>${r.hs}</b></div><div class="tm"><span>${esc(r.a)}</span><b>${r.as}</b></div></div>`;
function sportsHTML(){
  const tabs=[['live','Live ('+LIVE.length+')'],['upcoming','Upcoming'],['today','Today'],['results','Results']],lgs=[['all','All'],['epl','Premier League'],['liga','La Liga']];
  const ok=m=>slg==='all'||m.lg===slg;let body='';
  if(stab==='results')body=RES.filter(ok).sort((a,b)=>b.t-a.t).map(resCard).join('');
  else{const src=(stab==='live'?LIVE:FIX).filter(m=>ok(m)&&(stab!=='today'||sameDay(m.t,Date.now()))).sort((a,b)=>a.t-b.t);let day='';
    body=src.map(m=>{let h='';if(stab!=='live'&&!sameDay(m.t,day||0)){day=m.t;h=`<h4 class="dh">${fmtD(m.t)}</h4>`}return h+matchCard(m)}).join('')}
  return `<div class="stt" role="tablist">${tabs.map(([k,l])=>`<button data-st="${k}" class="${stab===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="stt" style="margin:.5rem 0">${lgs.map(([k,l])=>`<button data-lg="${k}" class="chip ${slg===k?'on':''}">${l}</button>`).join('')}</div>
  <div style="display:grid;gap:.6rem">${body||'<p class="mute">No matches here right now.</p>'}</div>
  <p class="fine">Fixtures: real snapshot, 31 Oct 2026. Odds: demo odds from win probabilities. Live scores: simulated for the preview.</p>`}
const paintSports=()=>{const el=$('#sports');if(el)el.innerHTML=sportsHTML()};
function afterSlip(){paintSports();updateSlipBtn();if(slipOpen)renderSlip()}
function updateSlipBtn(){let b=$('#slipbtn');if(view!=='home'||!slip.length||slipOpen){if(b)b.remove();return}
  if(!b){b=document.createElement('button');b.id='slipbtn';b.className='slipb';b.onclick=openSlip;document.body.appendChild(b)}b.innerHTML=`Bet slip <span>${slip.length}</span>`}
function openSlip(){slipOpen=true;const o=document.createElement('div');o.className='ov sheet';o.id='slip';
  o.onclick=e=>{if(e.target===o||e.target.closest('[data-x]'))closeSlip()};document.body.appendChild(o);renderSlip();updateSlipBtn()}
function closeSlip(){const o=$('#slip');if(o)o.remove();slipOpen=false;updateSlipBtn()}
function renderSlip(){const o=$('#slip');if(!o)return;const legs=slip.map(s=>({s,m:mById(s.mid)})).filter(x=>x.m),tot=legs.reduce((a,x)=>a*oddsFor(x.m,x.s.k),1);
  o.innerHTML=`<div class="card sl"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Bet slip (${legs.length})</h3><span><button class="link" id="slc">Clear</button> <button class="sq" data-x aria-label="Close">${ic('close')}</button></span></div>
  ${legs.map(({s,m})=>`<div class="leg"><div><b>${esc(pickName(m,s.k))}</b><div class="mute">${esc(m.h)} v ${esc(m.a)}${m.live?' · LIVE':''}</div></div><span class="g">${oddsFor(m,s.k).toFixed(2)}</span><button class="sq" data-rm="${m.id}" aria-label="Remove selection">${ic('close',18)}</button></div>`).join('')||'<p class="mute">Tap any odds to add a selection.</p>'}
  ${legs.length?`<div class="two"><span class="mute">${legs.length>1?'Accumulator · total odds':'Single · odds'}</span><b style="text-align:right">${tot.toFixed(2)}</b></div>
  <label class="amt"><span>Stake (KES)</span><input id="stk" inputmode="decimal" value="${esc(slipStake)}"></label><div class="amts">${[50,100,200,500].map(v=>`<button data-sk="${v}">${v}</button>`).join('')}</div>
  <div class="two"><span class="mute">Possible win</span><b class="g" style="text-align:right" id="pw">${money(Math.floor(Math.round((parseFloat(slipStake)||0)*100)*tot))}</b></div><p class="err" id="sle" role="alert"></p><button class="btn g" id="plc">Place bet</button>`:''}</div>`;
  $('#slc').onclick=()=>{slip=[];afterSlip()};
  o.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{slip=slip.filter(s=>s.mid!=b.dataset.rm);afterSlip()});
  if($('#stk')){$('#stk').oninput=e=>{slipStake=e.target.value;$('#pw').textContent=money(Math.floor(Math.round((parseFloat(slipStake)||0)*100)*tot))};
    o.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{slipStake=b.dataset.sk;renderSlip()});$('#plc').onclick=placeSlip}}
function placeSlip(){const u=me(),err=t=>{$('#sle').textContent=t};
  if(!u){closeSlip();return nav('login')}
  if(u.excl>Date.now())return err('Your account is on a break.');
  const legs=slip.map(s=>({s,m:mById(s.mid)})).filter(x=>x.m);if(!legs.length)return;
  if(legs.some(x=>!x.m.live&&x.m.t<Date.now()))return err('A match in your slip has started. Remove it to continue.');
  const stake=Math.round((parseFloat(slipStake)||0)*100);if(!(stake>=1000&&stake<=10000000))return err('Stake between KES 10 and KES 100,000.');
  if(!spend(u,stake))return err('Not enough balance. Deposit first.');
  const odds=legs.reduce((a,x)=>a*oddsFor(x.m,x.s.k),1);
  (u.sbets||(u.sbets=[])).unshift({id:hex(3).toUpperCase(),legs:legs.map(x=>({m:x.m.h+' v '+x.m.a,pick:pickName(x.m,x.s.k),odds:oddsFor(x.m,x.s.k)})),stake,odds,stat:'pending',win:0,d:Date.now()});
  addTx(u,'sports bet',-stake);save();slip=[];closeSlip();paintSports();toast('Bet placed. Good luck!');if(view==='home')homeView()}
function settleDemo(id){const u=me(),b=(u.sbets||[]).find(x=>x.id===id);if(!b||b.stat!=='pending')return;
  const won=b.legs.every(l=>Math.random()<.93/l.odds);b.stat=won?'won':'lost';
  if(won){b.win=Math.floor(b.stake*b.odds);u.balance+=b.win;addTx(u,'sports win',b.win);notify(u,'Bet won','KES '+money(b.win)+' was added to your wallet.')}save();render()}
function simTick(){LIVE.forEach(m=>{const L=m.live,p=m.p;L.min++;if(Math.random()<.03*(.6+p.h/50))L.hs++;if(Math.random()<.03*(.6+p.a/50))L.as++;if(L.min>=90){L.min=1+Math.floor(Math.random()*5);L.hs=0;L.as=0}});
  if(view==='home'&&stab==='live')paintSports();if(slipOpen&&document.activeElement.id!=='stk')renderSlip()}
setInterval(simTick,4000);
document.addEventListener('click',e=>{
  const o=e.target.closest('[data-odd]');if(o){const mid=+o.dataset.m,k=o.dataset.k,i=slip.findIndex(s=>s.mid===mid);
    if(i>=0&&slip[i].k===k)slip.splice(i,1);else if(i>=0)slip[i].k=k;else slip.push({mid,k});return afterSlip()}
  const st=e.target.closest('[data-st]');if(st){stab=st.dataset.st;return paintSports()}
  const lg=e.target.closest('[data-lg]');if(lg){slg=lg.dataset.lg;return paintSports()}
  const mo=e.target.closest('[data-more]');if(mo){const id=+mo.dataset.more;openMore.has(id)?openMore.delete(id):openMore.add(id);return paintSports()}
  const sc=e.target.closest('[data-scroll]');if(sc){const t=document.getElementById(sc.dataset.scroll);if(t)t.scrollIntoView({behavior:'smooth'})}
  const bh=e.target.closest('[data-bh]');if(bh){bhTab=bh.dataset.bh;return render()}
  const sd=e.target.closest('[data-settle]');if(sd)settleDemo(sd.dataset.settle)});

/* ---------- home ---------- */
function homeView(){const u=me();document.body.className='';
  $('#app').innerHTML=`<div class="top"><span>Deposit via M-PESA</span><a data-go="${u?'deposit':'login'}" role="button" tabindex="0">${u?'Deposit':'Login to deposit'}</a></div>
  <header class="h"><div class="logo">${ic('plane',30)}<b>SkyBet</b></div>${u?`<span class="pill">KES ${money(u.balance+u.bonus)}</span><button class="sq" data-go="notifs" aria-label="Notifications">${ic('bell')}${unread(u)?`<span class="badge">${unread(u)}</span>`:''}</button>`:'<button class="link" data-go="login">Login</button><button class="join" data-go="register">Join Now</button>'}</header>
  <main><div class="chips"><button class="chip on" data-scroll="aviator">Crash <span class="mute">1</span></button><button class="chip" data-scroll="sports-wrap">Sports <span class="mute">${FIX.length}</span></button></div>
  <div id="aviator"><button class="tile" data-go="game" aria-label="Play Aviator">${ic('plane',54)}<span>Aviator</span></button></div>
  <section id="sports-wrap"><h3 style="margin:0 0 .6rem">Sports</h3><div id="sports"></div></section>
  <section class="card"><h3>Invite &amp; earn</h3><ul class="legs"><li>Share your referral code</li><li>Your friend makes a first deposit</li><li>You earn 5% of it</li></ul><button class="boost" data-go="refer">REFER NOW »</button></section>
  <p class="fine">Gambling involves risk. Only bet what you can afford to lose. 18+. Preview with play money.</p></main>${navBar('home')}${fab()}`;paintSports()}

/* ---------- auth ---------- */
function authView(reg){document.body.className='';let err='';
  pageShell(reg?'Create account':'Login',`<form class="card" id="af"><h2>${reg?'Join SkyBet':'Welcome back'}</h2>
  ${reg?`<label class="mute">Country
    <select name="country" required style="width:100%;margin-bottom:.6rem;padding:.5rem;border-radius:.25rem;background:var(--bg);color:var(--fg);border:1px solid var(--bd)">
      <option value="KE">Kenya (+254)</option>
      <option value="UG">Uganda (+256)</option>
      <option value="TZ">Tanzania (+255)</option>
    </select>
  </label>`:''}
  <input name="phone" inputmode="tel" placeholder="Phone number (07XX XXX XXX)" required>
  ${reg?`<label class="mute">Date of birth (18+ only)<input name="dob" type="date" required style="width:100%"></label><input name="ref" placeholder="Referral code (optional)">`:''}
  <input name="password" type="password" placeholder="Password (8+ characters)" minlength="8" required>
  ${reg?`<input name="cpassword" type="password" placeholder="Confirm Password" minlength="8" required>`:''}
  ${reg?'<label style="display:flex;gap:.6rem;align-items:center"><input type="checkbox" name="ok" required style="width:auto"> I am 18+ and accept the terms</label>':''}
  <p class="err" id="er" role="alert"></p><button class="btn g">${reg?'Create account':'Login'}</button>
  <button type="button" class="link" data-go="${reg?'login':'register'}">${reg?'Have an account? Login':'No account? Join now'}</button></form>`,{nav:false,fab:false});
  $('#af').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),er=$('#er');
    if(!phoneOk(f.phone))return er.textContent='Enter a valid phone number.';
    const ph=normPhone(f.phone);
    if(reg){
      if(f.password !== f.cpassword)return er.textContent='Passwords do not match.';
      if((Date.now()-new Date(f.dob))/3.15576e10<18)return er.textContent='You must be 18 or older to register.';
    }
    const endpoint = reg ? `${CONFIG.apiBase}/api/register` : `${CONFIG.apiBase}/api/login`;
    const payload = reg 
      ? { phone: ph, password: f.password, country: f.country, dob: f.dob, ref: f.ref }
      : { phone: ph, password: f.password };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(!res.ok) return er.textContent = data.message || data.error || 'Authentication failed.';
      if(data.user) DB.users[ph] = data.user;
      DB.session = ph;
      if(data.token) localStorage.setItem('token', data.token);
      save();
      tab('home');
    } catch(err) {
      er.textContent = 'Server connection error. Please try again.';
    }
  }
}


/* ---------- profile and account pages ---------- */
function profileView(){if(need('My Account','Log in to see your account.'))return;const u=me();
  pageShell('My Account',`<section class="card acc"><div class="av">${ic('user',34)}<i>${ic('shield',14)}</i></div><div><b style="font-size:1.25rem">My Account</b><div class="mute">${esc(u.phone)}</div></div>${u.verified?'<span class="ver">Verified</span>':''}</section>
  <section class="card"><div class="two"><div class="stat"><span>Balance (KES)</span><b class="g">${money(u.balance)}</b></div><div class="stat"><span>${ic('gift',14)} Bonus (KES)</span><b class="a">${money(u.bonus)}</b></div></div>
  <div class="two"><button class="btn g" data-go="deposit">Deposit</button><button class="btn a" data-go="withdraw">${ic('wallet')} Withdraw</button></div></section>
  <section class="card install"><div class="ai">${ic('plane',30)}</div><div><b>Get the app<span class="tag">BETTER DEALS</span></b><div class="mute" style="font-size:.9rem">Faster, smoother betting with app-only offers.</div></div><button class="btn g" id="ins" style="width:auto">${ic('dl',18)} Install</button></section>
  <h4 class="sec">REWARDS</h4><div class="list">${rowH('users','Refer and Earn','Invite friends &amp; earn on every first deposit they make','refer')}${rowH('spark','Promotions','Free bets &amp; cash prizes from our ongoing offers','promos',{cls:'am'})}${rowH('gift','Redeem Bonus','Enter a promo code to claim your bonus','redeem',{cls:'am'})}</div>
  <h4 class="sec">WALLET</h4><div class="list">${rowH('receipt','Transaction History','Your deposits, withdrawals &amp; bonuses','txhist')}${rowH('clock','Bet History','Track all your placed bets','bethist')}${rowH('alert','Deposit unsuccessful?','Verify your M-PESA payment','verify',{cls:'am'})}</div>
  <h4 class="sec">ACCOUNT</h4><div class="list">${rowH('bell','Notifications','Updates, offers &amp; alerts','notifs',{badge:unread(u)||''})}${rowH('lock','Change Password','Update your account security','chpass')}</div>
  <h4 class="sec">SUPPORT</h4><div class="list">${rowH('headset','Live Support','Talk to us 24/7','support',{on:'Online'})}${rowH('book','How Aviator Works','Rules, multipliers and provably fair','rules')}</div>
  <h4 class="sec">PLAY SAFE</h4><div class="list">${rowH('gauge','Deposit Limit','Set a daily deposit limit','limits',{cls:'am'})}</div>
  <h4 class="sec" style="color:var(--red)">DANGER ZONE</h4><div class="list dgl">${rowH('ban','Self-Exclusion &amp; Delete Account','Take a break or permanently remove your account','excl',{cls:'dg'})}</div>
  <button class="btn" id="lo">Log out</button>`);
  $('#ins').onclick=()=>modal('<h3>Install SkyBet</h3><p class="mute">Open your browser menu and choose <b>Add to Home screen</b>. A native app wrapper can be added later.</p>');
  $('#lo').onclick=()=>{DB.session=null;save();tab('home')}}
function simple(title,body,o){pageShell(title,body,o)}
function txhistView(){if(need('Transaction History','Log in to see your transactions.'))return;simple('Transaction History',`<section class="card">${txRows(me().tx.slice(0,60),'No transactions yet')}</section>`)}
function bethistView(){if(need('Bet History','Log in to see your bets.'))return;const u=me(),sb=u.sbets||[];
  const av=`<ul class="tx">${u.bets.slice(0,60).map(b=>`<li><span>Room ${b.r} · Bet ${money(b.c)}<br><small class="mute">${b.x?b.x.toFixed(2)+'x':'Flew away'} · ${new Date(b.d).toLocaleString()}</small></span><span class="${b.win?'pos':'neg'}">${b.win?'+'+money(b.win):'-'+money(b.c)}</span></li>`).join('')||'<li class="mute">No Aviator bets yet.</li>'}</ul>`;
  const sp=`<ul class="tx">${sb.slice(0,40).map(b=>`<li class="sbi"><div class="r"><b>${b.legs.length>1?'Accumulator ('+b.legs.length+')':'Single'} · #${b.id}</b><span class="${b.stat==='won'?'pos':b.stat==='lost'?'neg':'a'}">${b.stat==='won'?'Won +'+money(b.win):b.stat==='lost'?'Lost':'Pending'}</span></div>
    ${b.legs.map(l=>`<div class="mute" style="font-size:.9rem">${esc(l.pick)} @ ${l.odds.toFixed(2)} · ${esc(l.m)}</div>`).join('')}
    <div class="r mute" style="font-size:.9rem"><span>Stake ${money(b.stake)} · Odds ${b.odds.toFixed(2)}</span><span>Return ${money(Math.floor(b.stake*b.odds))}</span></div>
    ${b.stat==='pending'?`<button class="btn" data-settle="${b.id}" style="margin-top:.4rem">Simulate result (demo)</button>`:''}</li>`).join('')||'<li class="mute">No sports bets yet. Tap odds on the home page.</li>'}</ul>`;
  simple('Bet History',`<div class="tabs3"><button data-bh="av" class="${bhTab==='av'?'on':''}">Aviator</button><button data-bh="sp" class="${bhTab==='sp'?'on':''}">Sports</button></div><section class="card">${bhTab==='av'?av:sp}</section>`)}

function notifsView(){if(need('Notifications','Log in to see your alerts.'))return;const u=me();
  simple('Notifications',`<section class="card"><ul class="tx">${u.notifs.map(n=>`<li><span><b>${esc(n.t)}</b><br><span class="mute">${esc(n.b)}</span></span></li>`).join('')||'<li class="mute">No notifications yet.</li>'}</ul></section>`);u.notifs.forEach(n=>n.read=true);save()}
function promosView(){simple('Promotions',`<section class="card"><h3>Welcome bonus</h3><p class="mute">Use code <b class="a">WELCOME</b> to claim KES 50 bonus.</p><button class="btn g" data-go="redeem">Redeem now</button></section><section class="card"><h3>Refer and Earn</h3><p class="mute">Earn 5% of every friend's first deposit.</p><button class="btn" data-go="refer">Get my code</button></section>`)}
function redeemView(){if(need('Redeem Bonus','Log in to redeem a promo code.'))return;const u=me();
  simple('Redeem Bonus',`<section class="card"><p class="mute">Enter a promo code to claim your bonus.</p><input id="pc" placeholder="Promo code" autocapitalize="characters"><button class="btn g" id="pr">Redeem</button><p class="mute" id="nt" role="status"></p></section>`);
  $('#pr').onclick=()=>{const c=$('#pc').value.trim().toUpperCase();
    if(c==='WELCOME'&&!u.redeemed.includes(c)){u.redeemed.push(c);u.bonus+=5000;addTx(u,'bonus',5000);notify(u,'Bonus added','KES 50 welcome bonus is in your bonus balance.');save();$('#nt').textContent='KES 50 bonus added.'}
    else $('#nt').textContent=u.redeemed.includes(c)?'You already used this code.':'That code is not valid.'}}
function verifyView(){if(need('Verify Payment','Log in to verify a payment.'))return;
  simple('Verify Payment',`<section class="card"><p class="mute">Paid but not credited? Enter the M-PESA confirmation code from your SMS (like QGH7ABC123).</p><input id="vc" placeholder="M-PESA code" autocapitalize="characters"><button class="btn g" id="vb">Verify payment</button><p class="mute" id="nt" role="status"></p></section>`);
  $('#vb').onclick=async()=>{const c=$('#vc').value.trim().toUpperCase(),n=$('#nt');if(!/^[A-Z0-9]{10}$/.test(c))return n.textContent='A valid code has 10 letters and numbers.';
    $('#vb').disabled=true;n.textContent='Checking…';try{await API.verifyCode(c);n.textContent='Request received. If we find the payment it is credited to your wallet automatically.'}catch(e){n.textContent=e.message}$('#vb').disabled=false}}
function chpassView(){if(need('Change Password','Log in to change your password.'))return;const u=me();
  simple('Change Password',`<form class="card" id="cf"><input name="o" type="password" placeholder="Current password" required><input name="n" type="password" placeholder="New password (8+ characters)" minlength="8" required><p class="mute" id="nt" role="status"></p><button class="btn g">Update password</button></form>`);
  $('#cf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(f.o!==u.password)return $('#nt').textContent='Current password is wrong.';u.password=f.n;save();$('#nt').textContent='Password updated.'}}
function limitsView(){if(need('Deposit Limit','Log in to set a limit.'))return;const u=me();
  simple('Deposit Limit',`<section class="card"><p class="mute">Daily deposit limit (KES). Use 0 for no limit. ${u.limit?`Current: <b>${money(u.limit)}</b>.`:''}</p><input id="lm" inputmode="numeric" placeholder="e.g. 2000"><button class="btn g" id="sl">Save limit</button><p class="mute" id="nt" role="status"></p></section>`);
  $('#sl').onclick=()=>{u.limit=Math.max(0,Math.round(parseFloat($('#lm').value||0)*100));save();$('#nt').textContent=u.limit?'Daily limit saved.':'Limit removed.'}}
function exclView(){if(need('Self-Exclusion','Log in to manage your account.'))return;const u=me();
  simple('Self-Exclusion',`<section class="card"><h3>Take a break</h3><p class="mute">You will not be able to bet or deposit during the break.${u.excl>Date.now()?` Active until ${new Date(u.excl).toLocaleString()}.`:''}</p><div class="two">${[['24 hours',1],['7 days',7],['30 days',30],['6 months',180]].map(([l,d])=>`<button class="btn" data-ex="${d}">${l}</button>`).join('')}</div></section>
  <section class="card" style="border-color:#5a2a37"><h3 class="neg">Delete account</h3><p class="mute">This removes your account and balance for good. Withdraw your money first.</p><input id="dl" placeholder="Type DELETE to confirm"><button class="btn" id="dd" style="color:var(--red)">Delete my account</button><p class="err" id="nt"></p></section>`);
  document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{u.excl=Date.now()+b.dataset.ex*864e5;save();toast('Break started.');render()});
  $('#dd').onclick=()=>{if($('#dl').value!=='DELETE')return $('#nt').textContent='Type DELETE to confirm.';if(u.balance>0)return $('#nt').textContent='Withdraw your balance first.';delete DB.users[u.phone];DB.session=null;save();tab('home')}}
function rulesView(){simple('How Aviator Works',`<section class="card"><p>Place a bet before take-off. The plane climbs and the multiplier grows. Cash out before it flies away to win your bet times the multiplier. If it flies away first, the bet is lost.</p><p class="mute">Each round's result is fixed before take-off. We publish its hash first and reveal the seed after, so anyone can check that SHA-256 of the seed matches the hash.</p><p class="mute">Play responsibly. Set a deposit limit or take a break from your Profile.</p></section>`)}

/* ---------- wallet ---------- */
const todayDeposits=u=>u.tx.filter(t=>t.t==='deposit'&&Date.now()-t.d<864e5).reduce((s,t)=>s+t.a,0);
function amountForm(kind){const u=me(),dep=kind==='deposit';
  return `<section class="card" style="gap:1rem"><div style="display:flex;justify-content:space-between;align-items:center"><b>${dep?'Deposit from':'Withdraw to'} <span class="g">M-PESA</span></b><span class="mute">(${mask(u.phone)})</span></div>
  <div class="sec" style="margin:0">SELECT AMOUNT (KES)</div><div class="amts">${[100,250,500,1000].map(v=>`<button data-a="${v}">${v.toLocaleString()}</button>`).join('')}</div>
  <label class="amt"><span>Amount (KES)</span><input id="am" inputmode="numeric" placeholder="0" aria-label="Amount"><small>min. KES ${(dep?CONFIG.minDeposit:CONFIG.minWithdraw)/100}</small></label>
  <button class="btn g" id="go" style="padding:1.1rem;font-size:1.2rem">${dep?'Deposit Now':'Withdraw Now'}</button><p class="mute" id="nt" role="status" style="margin:0"></p></section>`}
function bindAmts(){document.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>$('#am').value=b.dataset.a)}
function depositView(){if(need('Deposit','Log in to deposit with M-PESA.'))return;const u=me();
  pageShell('Deposit <span class="mute">·</span> <span class="g" style="font-size:.9rem">M-PESA</span>',`<div class="hint">${ic('bulb')}<b>Enter an amount, then authorize with your M-PESA PIN to complete the deposit.</b></div>${amountForm('deposit')}
  ${CONFIG.paybill?`<h3 style="margin:.4rem 0 0">Didn't get the prompt? Pay manually</h3><section class="manual"><h4>LIPA NA M-PESA · PAY BILL</h4><div class="two"><div class="copy"><div><small>BUSINESS NUMBER</small><b>${CONFIG.paybill}</b></div></div><div class="copy"><div><small>ACCOUNT NUMBER</small><b>${esc(u.phone)}</b></div></div></div></section>
  <ol class="steps"><li>Open M-PESA, then select Lipa na M-PESA and choose Pay Bill.</li><li>Enter the business number above.</li><li>Enter your account number (your phone number).</li><li>Enter the amount and your M-PESA PIN. Your wallet is credited automatically.</li></ol>`:''}
  <button class="btn" data-go="verify">Paid but not credited? Verify payment</button>`,{close:true,nav:false,fab:false});
  bindAmts();$('#go').onclick=async()=>{const a=Math.round(parseFloat($('#am').value)*100),n=$('#nt'),b=$('#go');
    if(u.excl>Date.now())return n.textContent='Your account is on a break.';
    if(!(a>=CONFIG.minDeposit))return n.textContent='Minimum deposit is KES '+CONFIG.minDeposit/100+'.';
    if(a%100)return n.textContent='Enter a whole amount, like 250.';
    if(u.limit&&todayDeposits(u)+a>u.limit)return n.textContent='This is over your daily deposit limit of KES '+money(u.limit)+'.';
    b.disabled=true;n.textContent='Sending the M-PESA prompt to '+mask(u.phone)+'…';let t0=Date.now(),tm=0;
    try{const{id}=await API.deposit(u.phone,a);tm=setInterval(()=>{n.textContent='Check your phone and enter your M-PESA PIN. Waiting… '+Math.round((Date.now()-t0)/1000)+'s'},1000);n.textContent='Check your phone and enter your M-PESA PIN.';
      const s=await API.depositStatus(id);clearInterval(tm);
      if(s.status==='success'){const v=me();
        if(API.demo){v.balance+=a;addTx(v,'deposit',a);
          if(v.first&&v.refBy&&DB.users[v.refBy]){const r=DB.users[v.refBy],bn=Math.floor(a*.05);r.balance+=bn;r.earned+=bn;addTx(r,'referral',bn);notify(r,'Referral bonus','You earned KES '+money(bn)+' from a friend\u2019s first deposit.')}
          v.first=false;notify(v,'Deposit received','KES '+money(a)+' was added to your wallet.');save()}
        else await API.syncBalance();
        toast('Deposit of KES '+money(a)+' received.');if(view==='deposit'){back()}}
      else if(s.status==='failed')n.textContent='Payment was cancelled or failed. You were not charged. Try again.';
      else n.textContent='Still waiting for confirmation. If you paid, your balance updates shortly. Check Transaction History.'}
    catch(e){clearInterval(tm);n.textContent=e.message}b.disabled=false}}
function withdrawView(){if(need('Withdraw','Log in to withdraw to M-PESA.'))return;const u=me();
  pageShell('Withdraw <span class="mute">·</span> <span class="g" style="font-size:.9rem">M-PESA</span>',`<div class="hint">${ic('bulb')}<b>Available: KES ${money(u.balance)}. Withdrawals are sent to your registered M-PESA number after review.</b></div>${amountForm('withdraw')}<section class="card"><h3>Recent withdrawals</h3>${txRows(u.tx.filter(t=>t.t==='withdrawal').slice(0,6),'No withdrawals yet')}</section>`,{close:true,nav:false,fab:false});
  bindAmts();$('#go').onclick=async()=>{const a=Math.round(parseFloat($('#am').value)*100),n=$('#nt'),b=$('#go');
    if(!(a>=CONFIG.minWithdraw))return n.textContent='Minimum withdrawal is KES '+CONFIG.minWithdraw/100+'.';
    if(a>u.balance)return n.textContent='Not enough cash balance. Bonus cannot be withdrawn.';
    b.disabled=true;try{await API.withdraw(u.phone,a);if(API.demo){u.balance-=a;addTx(u,'withdrawal',-a,'pending');notify(u,'Withdrawal requested','KES '+money(a)+' will be sent to '+mask(u.phone)+'.');save()}toast('Withdrawal requested.');render()}catch(e){n.textContent=e.message;b.disabled=false}}}
function referView(){if(need('Refer and Earn','Log in to get your referral code.'))return;const u=me();
  pageShell('Refer and Earn',`<section class="card"><p class="mute">Your referral code</p><div class="tile" style="width:auto;height:72px;font-size:1.9rem;letter-spacing:.15em;font-style:normal;cursor:default">${u.code}</div><button class="btn g" id="sh">Share code</button><p class="mute" id="nt" role="status"></p></section>
  <section class="card"><h3>How it works</h3><ul class="legs"><li>Friends sign up with your code</li><li>They make a first deposit</li><li>You earn 5% of that deposit</li></ul></section>
  <section class="card"><h3>Your results</h3><p>${u.friends.length} friends joined · KES ${money(u.earned)} earned</p><ul class="tx">${u.friends.map(f=>`<li>${mask(f)}</li>`).join('')}</ul></section>`,{active:'refer'});
  $('#sh').onclick=async()=>{const t='Join me on SkyBet with my code '+u.code;try{if(navigator.share)await navigator.share({text:t});else{await navigator.clipboard.writeText(t);$('#nt').textContent='Copied to clipboard.'}}catch{$('#nt').textContent='Could not share. Copy the code manually.'}}}
function supportView(){const s=CONFIG.support;
  pageShell('Live Support',`<section class="card"><h3>Talk to us <span class="on g" style="font-size:.9rem">● Online</span></h3><p class="mute">24/7. Replace these placeholder contacts with yours.</p><div class="two"><a class="btn" href="https://wa.me/${s.wa}" target="_blank" rel="noopener" style="text-decoration:none;color:var(--ink)">WhatsApp</a><a class="btn" href="tel:${s.tel}" style="text-decoration:none;color:var(--ink)">Call</a></div><a class="btn" href="mailto:${s.mail}" style="text-decoration:none;color:var(--ink)">Email</a></section>
  <section class="card"><h3>Send a message</h3><textarea id="sm" rows="4" placeholder="How can we help?"></textarea><button class="btn g" id="ss">Send message</button><p class="mute" id="nt" role="status"></p></section>
  <section class="card"><h3>Common questions</h3><details><summary>How do I deposit?</summary><p class="mute">Open Deposit, enter an amount and approve the M-PESA prompt on your phone.</p></details><details><summary>How long do withdrawals take?</summary><p class="mute">Requests are reviewed, then sent to your M-PESA number.</p></details><details><summary>Is Aviator fair?</summary><p class="mute">Yes. Every round shows a hash before take-off and reveals the seed after.</p></details></section>`,{active:'home',fab:false});
  $('#ss').onclick=()=>{const t=$('#sm').value.trim();if(!t)return $('#nt').textContent='Write a message first.';DB.support.unshift({u:DB.session||'guest',t,d:Date.now()});save();$('#sm').value='';$('#nt').textContent='Message sent. Thank you.'}}

/* ---------- Aviator engine: 3 rooms, 2 bet panels each ---------- */
const mkPanel=()=>({amt:'5.00',auto:'2.00',mode:'bet',autoOn:false,bet:null,next:null});
const rooms=[1,2,3].map(id=>({id,phase:'betting',mult:1,crash:2,t0:0,left:6,hist:[],prev:[],top:[],pts:[],bots:[],seed:'',hash:'',timer:0,p:[mkPanel(),mkPanel()]}));
let R=rooms[0],lastList=0;
rooms.forEach(r=>{const m=(DB.rooms||{})[r.id];if(m){r.hist=m.hist||[];r.prev=m.prev||[];r.top=m.top||[]}});
const openSet=(u,r,i,c)=>{(u.open||(u.open={}))[r.id+'-'+i]=c;save()},openDel=(u,r,i)=>{if(u.open&&u.open[r.id+'-'+i]!=null){delete u.open[r.id+'-'+i];save()}};
(function refundOpen(){let n=0;Object.values(DB.users).forEach(u=>{const o=Object.values(u.open||{});if(!o.length)return;o.forEach(c=>{u.balance+=c;addTx(u,'refund',c)});u.open={};notify(u,'Round interrupted','Your Aviator stake was refunded because the page was closed mid-round.');n++});if(n)save()})();
const col=x=>x>=10?'c3':x>=2?'c2':'c1';
const hue=s=>[...s].reduce((a,c)=>a+c.charCodeAt(0)*7,0)%360;
function genBots(){const out=[],pick=()=>String(Math.floor(Math.random()*10));
  for(let i=0;i<24;i++)out.push({name:pick()+'***'+pick(),bet:Math.round(Math.exp(Math.random()*7.5+2.3))*100,at:Math.min(80,Math.max(1.05,0.97/(1-Math.random()))),done:false,x:0,win:0});return out}
const multAt=(r,now)=>Math.floor(Math.exp(0.00013*(now-r.t0))*100)/100;
const curMult=r=>r.phase==='flying'?Math.min(multAt(r,performance.now()),r.crash):r.mult;
let rafId=0,lastListHtml='',stripKey='',cvW=0,cvH=0,cvD=1;
async function newRound(r){const seed=hex(16),hash=await sha(seed),crash=crashFrom(await sha(seed+'skybet'));
  Object.assign(r,{seed,hash,crash,phase:'betting',mult:1,pts:[],left:6,bots:genBots()});
  r.p.forEach((p,i)=>{p.bet=null;if(p.next){p.bet={c:p.next.c,done:false};p.next=null}else if(p.mode==='auto'&&p.autoOn&&!place(r,i,true))p.autoOn=false});
  refresh(r);clearInterval(r.timer);r.timer=setInterval(()=>{r.left--;if(r.left<=0){clearInterval(r.timer);fly(r)}},1000)}
function fly(r){r.phase='flying';r.t0=performance.now();refresh(r);
  r.timer=setInterval(()=>{const now=performance.now();r.mult=multAt(r,now);r.pts.push([now-r.t0,r.mult]);
    if(r.mult>=r.crash)return crash(r);
    r.p.forEach((p,i)=>{const a=parseFloat(p.auto);if(p.mode==='auto'&&p.autoOn&&p.bet&&!p.bet.done&&a>1&&r.mult>=a)cashOut(r,i,a)});
    r.bots.forEach(b=>{if(!b.done&&b.at<r.crash&&r.mult>=b.at){b.done=true;b.x=b.at;b.win=Math.floor(b.bet*b.at);r.top.push({name:b.name,bet:b.bet,x:b.x,win:b.win});r.top.sort((a,c)=>c.win-a.win);r.top=r.top.slice(0,10)}})},40)}
function crash(r){clearInterval(r.timer);r.mult=r.crash;r.phase='crashed';if(r.pts.length)r.pts[r.pts.length-1][1]=r.crash;
  r.hist.unshift(r.crash);r.hist=r.hist.slice(0,100);r.prev.unshift({x:r.crash,seed:r.seed,hash:r.hash,t:Date.now()});r.prev=r.prev.slice(0,60);DB.rooms=DB.rooms||{};DB.rooms[r.id]={hist:r.hist,prev:r.prev,top:r.top};save();
  const u=me();r.p.forEach((p,i)=>{if(p.bet&&!p.bet.done){p.bet.done=true;if(u){u.bets.unshift({r:r.id,c:p.bet.c,x:0,win:0,d:Date.now()});openDel(u,r,i)}}});if(u){if(u.bets.length>500)u.bets.length=500;save()}
  refresh(r);setTimeout(()=>newRound(r),3500)}
function refresh(r){if(r===R&&view==='game')showPhase()}
function place(r,i,silent){const u=me(),p=r.p[i];
  if(!u){if(!silent)nav('login');return false}
  const fail=t=>{if(!silent)toast(t);return false},c=Math.round((parseFloat(p.amt)||0)*100);
  if(u.excl>Date.now())return fail('Your account is on a break.');
  if(!(c>=CONFIG.minBet&&c<=CONFIG.maxBet))return fail('Bet between KES '+CONFIG.minBet/100+' and KES '+CONFIG.maxBet/100+'.');
  if(!spend(u,c))return fail('Not enough balance. Deposit first.');
  addTx(u,'bet',-c);openSet(u,r,i,c);if(r.phase==='betting')p.bet={c,done:false};else p.next={c};return true}
function cancel(r,i){const u=me(),p=r.p[i],c=(p.bet&&!p.bet.done?p.bet.c:p.next?p.next.c:0);if(!c||!u)return;u.balance+=c;addTx(u,'refund',c);openDel(u,r,i);if(p.next)p.next=null;else p.bet=null}
function cashOut(r,i,at){const u=me(),p=r.p[i];if(r.phase!=='flying'||!u||!p.bet||p.bet.done)return;
  const m=at||multAt(r,performance.now());if(m>=r.crash)return toast('Too late. The plane flew away.');   // never pay at or past the crash point
  const win=Math.floor(p.bet.c*m);p.bet.done=true;p.bet.x=m;p.bet.win=win;u.balance+=win;addTx(u,'win',win);u.bets.unshift({r:r.id,c:p.bet.c,x:m,win,d:Date.now()});openDel(u,r,i);
  toast('You cashed out '+m.toFixed(2)+'x · +KES '+money(win));if(r===R&&view==='game'){syncButtons();paintBal();paintList()}}
function bigState(r,i){const p=r.p[i],amt=money(Math.round((parseFloat(p.amt)||0)*100))+' KES';
  if(p.mode==='auto')return p.autoOn?['red','Stop','','auto play on']:['','Auto play',amt,''];
  if(p.bet&&!p.bet.done&&r.phase==='flying')return['org','Cash out',money(Math.floor(p.bet.c*curMult(r)))+' KES',''];
  if((p.bet&&!p.bet.done&&r.phase==='betting')||p.next)return['red','Cancel','',p.next?'next round':''];
  return['','Bet',amt,'']}
function setBtn(i){const b=$('#bb'+i);if(!b)return;const[cl,m,s,z]=bigState(R,i),k=cl+'|'+m+'|'+s+'|'+z;if(b.dataset.k===k)return;b.dataset.k=k;b.className='bb '+cl;b.children[0].textContent=m;b.children[1].textContent=s;b.children[2].textContent=z}
const syncButtons=()=>{setBtn(0);setBtn(1)};
function panelHTML(r,i){const p=r.p[i];
  return `<div class="bp" id="pn${i}" data-i="${i}"><div class="seg"><button data-m="bet" class="${p.mode==='bet'?'on':''}">Bet</button><button data-m="auto" class="${p.mode==='auto'?'on':''}">Auto</button></div>
  <div class="bpb"><div class="bl"><div class="stp"><button data-s="-5" aria-label="Decrease bet">${ic('minus',18)}</button><input class="amt2" inputmode="decimal" value="${esc(p.amt)}" aria-label="Bet amount"><button data-s="5" aria-label="Increase bet">${ic('plus',18)}</button></div>
  <div class="qc">${[100,200,500,10000].map(v=>`<button data-c="${v}">${v.toLocaleString()}</button>`).join('')}</div></div><button class="bb" id="bb${i}" data-b><span class="bm"></span><b class="bs"></b><small class="bz"></small></button></div>
  ${p.mode==='auto'?`<div class="ac">Auto cash out <input class="au" inputmode="decimal" value="${esc(p.auto)}" aria-label="Auto cash out multiplier"> x</div>`:''}</div>`}
function paintPanels(){const el=$('#panels');if(el){el.innerHTML=panelHTML(R,0)+panelHTML(R,1);syncButtons()}}
function paintPanel(i){const el=$('#pn'+i);if(el){el.outerHTML=panelHTML(R,i);setBtn(i)}}
function paintBal(){const u=me(),b=$('#gbal');if(b)b.textContent=(u?money(u.balance+u.bonus):'0.00')+' KES'}
function listHTML(r){const u=me();
  if(btab==='prev'){const h=r.hist,n=h.length,avg=n?h.reduce((a,b)=>a+b,0)/n:0,mx=n?Math.max(...h):0,low=h.filter(x=>x<2).length,i10=h.findIndex(x=>x>=10),since=i10<0?n:i10;
    return `<div class="sum"><div><b>${n}</b><br><span class="mute">Rounds saved</span></div><div style="text-align:right"><b>${mx.toFixed(2)}x</b><br><span class="mute">Highest</span></div></div>
    <div class="sum"><div><b>${avg.toFixed(2)}x</b><br><span class="mute">Average</span></div><div style="text-align:center"><b>${n?Math.round(low/n*100):0}%</b><br><span class="mute">Under 2x</span></div><div style="text-align:right"><b>${since}</b><br><span class="mute">Since last 10x+</span></div></div>
    <div class="bl2">${r.prev.map((p,i)=>`<div class="br" style="grid-template-columns:70px 1fr auto"><b class="${col(p.x)}">${p.x.toFixed(2)}x</b><span class="mute">${p.t?fmtT(p.t)+' · ':''}${p.seed.slice(0,8)}…</span><button class="link" data-vf="${i}" style="font-size:.85rem;color:var(--green)">Verify</button></div>`).join('')||'<span class="mute">No rounds yet</span>'}</div>`}
  if(btab==='my'){return !u?'<div class="bl2"><span class="mute">Log in to see your bets.</span></div>':`<div class="bl2">${u.bets.slice(0,40).map(b=>`<div class="br" style="grid-template-columns:1fr 1fr 70px 1fr"><span class="mute">${fmtT(b.d)}</span><span>${money(b.c)}</span><b class="${col(b.x||1)}">${b.x?b.x.toFixed(2)+'x':'-'}</b><span class="${b.win?'pos':'neg'}">${b.win?'+'+money(b.win):'-'+money(b.c)}</span></div>`).join('')||'<span class="mute">No bets yet.</span>'}</div>`}
  if(btab==='top')return `<div class="bl2"><div class="br h"><span></span><span>Player</span><span>Bet KES</span><span>X</span><span>Win KES</span></div>${r.top.map(b=>`<div class="br win"><span class="dot" style="background:hsl(${hue(b.name)} 55% 45%)">${b.name[0]}</span><span>${b.name}</span><span>${money(b.bet)}</span><span class="${col(b.x)}">${b.x.toFixed(2)}x</span><span>${money(b.win)}</span></div>`).join('')||'<span class="mute">Top wins show up during flights.</span>'}</div>`;
  const mine=r.p.map(p=>p.bet||p.next).filter(Boolean).map(b=>({name:'You',bet:b.c,x:b.x||0,win:b.win||0,done:!!b.win,me:1})),all=[...mine,...[...r.bots].sort((a,b)=>b.bet-a.bet)];
  const tw=all.reduce((s,b)=>s+(b.win||0),0);
  return `<div class="sum"><span class="mute">${all.length}/${all.length} Bets</span><span style="text-align:right"><b>${money(tw)}</b><br><span class="mute">Total win KES</span></span></div><div class="bl2"><div class="br h"><span></span><span>Player</span><span>Bet KES</span><span>X</span><span>Win KES</span></div>${all.map(b=>`<div class="br ${b.done?'win':''}"><span class="dot" style="background:hsl(${hue(b.name)} 55% 45%)">${b.name[0]}</span><span>${b.name}</span><span>${money(b.bet)}</span><span class="${col(b.x||1)}">${b.x?b.x.toFixed(2)+'x':''}</span><span>${b.win?money(b.win):''}</span></div>`).join('')}</div><p class="fine" style="margin:0">Sample players for the preview. The live site shows real players from the server.</p>`}

function paintList(force){const el=$('#blist');if(!el)return;const h=listHTML(R);if(force||h!==lastListHtml){lastListHtml=h;el.innerHTML=h}document.querySelectorAll('#tabs3 button').forEach(b=>b.classList.toggle('on',b.dataset.t===btab))}
function paintStrip(){const r=R,k=r.id+':'+r.hist.length+':'+(r.prev[0]&&r.prev[0].t);if(k===stripKey)return;stripKey=k;$('#strip').innerHTML=r.hist.slice(0,40).map(h=>`<span class="${col(h)}">${h.toFixed(2)}x</span>`).join('')||'<span class="mute">No rounds yet</span>'}
function showPhase(){const r=R;if(!$('#stage'))return;
  $('#gw').hidden=r.phase!=='betting';$('#gr').hidden=r.phase==='betting';$('#gfl').hidden=r.phase!=='crashed';
  const g=$('#gx');g.className='big'+(r.phase==='crashed'?' red':'');g.textContent=curMult(r).toFixed(2)+'x';
  if(r.phase==='betting'){const bar=$('#gbar');bar.style.animation='none';void bar.offsetWidth;bar.style.animation='shrink 6s linear '+(-(6-r.left))+'s forwards'}
  paintStrip();syncButtons();paintList();paintBal();drawCurve()}
function sizeCanvas(){const cv=$('#cv');if(!cv)return;const b=cv.getBoundingClientRect();cvD=devicePixelRatio||1;cvW=b.width;cvH=b.height;cv.width=Math.round(cvW*cvD);cv.height=Math.round(cvH*cvD);drawCurve()}
function drawCurve(now){const cv=$('#cv');if(!cv||!cvW)return;const r=R,x=cv.getContext('2d');x.setTransform(cvD,0,0,cvD,0,0);x.clearRect(0,0,cvW,cvH);
  if(r.phase==='betting'||!r.pts.length)return;
  const live=r.phase==='flying',pts=r.pts,n=now||performance.now();let lt=pts[pts.length-1][0],lm=pts[pts.length-1][1];
  if(live){lt=n-r.t0;lm=Math.min(multAt(r,n),r.crash)}
  const T=Math.max(lt,6000),M=Math.max(lm,2),X=t=>18+(t/T)*(cvW-70),Y=m=>cvH-20-((m-1)/(M-1))*(cvH-90),ex=X(lt),ey=Y(lm);
  x.beginPath();x.moveTo(X(pts[0][0]),cvH-20);for(const q of pts)x.lineTo(X(q[0]),Y(q[1]));x.lineTo(ex,ey);x.lineTo(ex,cvH-20);x.closePath();x.fillStyle='rgba(229,5,57,.28)';x.fill();
  x.beginPath();pts.forEach((q,i)=>i?x.lineTo(X(q[0]),Y(q[1])):x.moveTo(X(q[0]),Y(q[1])));x.lineTo(ex,ey);x.lineWidth=4;x.lineJoin='round';x.strokeStyle='#e50539';x.stroke();
  if(live){x.font='28px sans-serif';x.fillText('✈️',ex-6,ey+4)}}
function loop(now){if(view!=='game'){rafId=0;return}
  const r=R;if(r.phase==='flying'){const g=$('#gx'),t=Math.min(multAt(r,now),r.crash).toFixed(2)+'x';if(g&&g.textContent!==t)g.textContent=t;drawCurve(now);syncButtons()}
  if(now-lastList>1000){lastList=now;paintList()}
  rafId=requestAnimationFrame(loop)}
addEventListener('resize',()=>{if(view==='game')sizeCanvas()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&view==='game'){showPhase();sizeCanvas()}});
function gameView(){document.body.className='gm';const r=R;lastListHtml='';stripKey='';cancelAnimationFrame(rafId);
  $('#app').innerHTML=`<div class="gtop"><button data-back>${ic('back')} Back</button><span>Aviator</span><button class="dep" data-go="deposit">${ic('wallet',20)} Deposit</button></div>
  <div class="rooms">${rooms.map(x=>`<button data-room="${x.id}" class="${x===r?'on':''}">Room ${x.id}</button>`).join('')}</div>
  <div class="gsub"><div class="gav">${ic('plane',22)}</div><span class="gbal" id="gbal"></span><button class="gi" data-go="support" aria-label="Support">${ic('chat',20)}</button><button class="gi" id="gm" aria-label="Menu">${ic('menu',20)}</button></div>
  <div class="gwrap"><div class="strip" id="strip"></div><div class="stage" id="stage"><canvas id="cv"></canvas><div class="gmsg"><div id="gw" class="gb"><div class="wait">WAITING FOR NEXT ROUND</div><div class="bar"><i id="gbar"></i></div></div><div id="gr" class="gb" hidden><div class="fl" id="gfl" hidden>FLEW AWAY!</div><div class="big" id="gx">1.00x</div></div></div></div><div id="panels" style="display:grid;gap:.6rem"></div>
  <div class="tabs3" id="tabs3"><button data-t="all">All Bets</button><button data-t="prev">Previous</button><button data-t="top">Top</button><button data-t="my">My Bets</button></div><div id="blist"></div>
  <div class="pf" id="pf">${ic('shield',16)} Provably Fair Game</div></div>`;
  document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>{R=rooms[b.dataset.room-1];render()});
  $('#tabs3').onclick=e=>{const t=e.target.closest('[data-t]');if(t){btab=t.dataset.t;paintList(true)}};
  $('#gm').onclick=()=>modal(`<h3>Menu</h3><button class="btn" data-x data-go="rules">How to play</button><button class="btn" data-x data-go="bethist">My bets</button><button class="btn" data-x data-go="support">Support</button>`);
  $('#pf').onclick=()=>{const last=R.prev[0];modal(`<h3>Provably fair</h3><p class="mute">Current round hash (published before take-off):</p><code>${R.hash||'…'}</code>${last?`<p class="mute">Last round seed (revealed):</p><code>${last.seed}</code><p class="mute">SHA-256 of the seed equals the hash that round showed, so the result could not change after bets were placed.</p>`:''}`)};
  const pn=$('#panels');
  pn.onclick=e=>{const el=e.target.closest('[data-i]');if(!el)return;const i=+el.dataset.i,p=R.p[i],m=e.target.closest('[data-m]'),s=e.target.closest('[data-s]'),c=e.target.closest('[data-c]'),bb=e.target.closest('[data-b]');
    if(m){p.mode=m.dataset.m;return paintPanel(i)}
    if(s||c){p.amt=s?Math.max(5,(parseFloat(p.amt)||0)+ +s.dataset.s).toFixed(2):(+c.dataset.c).toFixed(2);el.querySelector('.amt2').value=p.amt;return setBtn(i)}
    if(bb){if(p.mode==='auto'){p.autoOn=!p.autoOn;if(p.autoOn&&R.phase==='betting'&&!p.bet&&!place(R,i))p.autoOn=false;else if(!p.autoOn&&p.bet&&!p.bet.done&&R.phase==='betting')cancel(R,i)}
      else if(p.bet&&!p.bet.done&&R.phase==='flying')cashOut(R,i);
      else if((p.bet&&!p.bet.done&&R.phase==='betting')||p.next)cancel(R,i);else place(R,i);
      syncButtons();paintBal();paintList()}};
  pn.oninput=e=>{const el=e.target.closest('[data-i]');if(!el)return;const i=+el.dataset.i,p=R.p[i];if(e.target.classList.contains('amt2')){p.amt=e.target.value;setBtn(i)}else if(e.target.classList.contains('au'))p.auto=e.target.value};
  pn.onchange=e=>{const el=e.target.closest('[data-i]');if(!el||!e.target.classList.contains('amt2'))return;const i=+el.dataset.i,p=R.p[i],v=parseFloat(e.target.value);p.amt=v>0?v.toFixed(2):'5.00';e.target.value=p.amt;setBtn(i)};
  paintPanels();sizeCanvas();showPhase();rafId=requestAnimationFrame(loop)}

document.addEventListener('click',async e=>{const v=e.target.closest('[data-vf]');if(!v)return;const p=R.prev[+v.dataset.vf];if(!p)return;
  const h=await sha(p.seed),c=crashFrom(await sha(p.seed+'skybet')),ok=h===p.hash&&Math.abs(c-p.x)<.001;
  modal(`<h3>Round check ${ok?'<span class="g">passed</span>':'<span class="neg">failed</span>'}</h3><p class="mute">Seed (revealed after the round)</p><code>${p.seed}</code><p class="mute">SHA-256 of the seed. It must equal the hash shown before take-off:</p><code>${h}</code><p>Result recomputed from the seed: <b>${c.toFixed(2)}x</b>. The round showed ${p.x.toFixed(2)}x.</p>`)});
function render(){const u=me();if(DB.session&&!u)DB.session=null;
  ({home:homeView,login:()=>authView(false),register:()=>authView(true),profile:profileView,deposit:depositView,withdraw:withdrawView,refer:referView,support:supportView,txhist:txhistView,bethist:bethistView,notifs:notifsView,promos:promosView,redeem:redeemView,verify:verifyView,chpass:chpassView,limits:limitsView,excl:exclView,rules:rulesView,game:gameView})[view]();updateSlipBtn()}
render();rooms.forEach((r,i)=>setTimeout(()=>newRound(r),i*1500));
