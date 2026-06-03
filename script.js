// ==========================================================
//  script.js  —  Meta Ads Manager
// ==========================================================
//  FILE STRUCTURE:
//
//  SECTION 1 : STORAGE & DATABASE
//              - localStorage keys
//              - loadData(), getDefaults()
//              - DB, sel, editId, delId, viewId, chartId
//              - persist() → saves campaigns to localStorage
//
//  SECTION 2 : HELPER FUNCTIONS
//              - esc()    → HTML escape (XSS prevention)
//              - fmt()    → number formatter (en-IN locale)
//              - cur()    → currency formatter (₹)
//              - budStr() → budget display string
//              - badge()  → HTML for status badge pill
//              - cpr()    → cost-per-result calculator
//              - uid()    → unique ID generator
//
//  SECTION 3 : RENDER TABLE (Campaigns)
//              - renderTable() → reads DB, renders all rows
//              - Calculates footer totals
//              - Updates draft count in header button
//
//  SECTION 4 : ROW SELECTION
//              - toggleAll(cb) → select/deselect all rows
//              - rowChk(cb)    → single row check
//              - updBtns()     → enable/disable toolbar btns
//
//  SECTION 5 : TOGGLE ACTIVE
//              - toggleAct(cb) → ON/OFF switch handler
//
//  SECTION 6 : CREATE CAMPAIGN
//              - openAdd()    → opens modal in "create" mode
//              - clearForm()  → resets all form fields
//
//  SECTION 7 : EDIT CAMPAIGN
//              - openEdit(id)     → opens modal in "edit" mode
//              - editSelected()   → opens edit for selected row
//              - editFromView()   → edit from View Details modal
//
//  SECTION 8 : SAVE CAMPAIGN
//              - saveCamp() → validates + saves to DB
//              - Handles both create and update cases
//
//  SECTION 9 : DELETE CAMPAIGN
//              - openDelModal(id) → opens confirm delete popup
//              - confirmDel()     → actually deletes from DB
//              - deleteSelected() → bulk delete from toolbar
//
//  SECTION 10 : DUPLICATE CAMPAIGN
//              - dupOne(id)     → duplicates single campaign
//              - dupSelected()  → duplicates all selected
//
//  SECTION 11 : UNDO
//              - undoLast() → restores last DB snapshot
//
//  SECTION 12 : VIEW CAMPAIGN DETAILS
//              - openView(id) → opens View Details modal
//
//  SECTION 13 : CHARTS MODAL
//              - openCharts(id)  → opens charts for campaign
//              - genDays(total)  → generates 23-day fake data
//              - buildChart(type,c) → renders Chart.js line chart
//              - swChart(type,btn)  → switches chart type tab
//
//  SECTION 14 : PUBLISH / DISCARD DRAFTS
//              - publishDrafts()  → all drafts → active
//              - discardDrafts()  → removes all drafts
//
//  SECTION 15 : MODAL HELPERS
//              - closeOv(id)    → closes any overlay/modal
//              - Click outside  → closes modal
//              - Escape key     → closes modal
//
//  SECTION 16 : TOAST NOTIFICATIONS
//              - toast(msg, type) → shows slide-in message
//
//  SECTION 17 : AD SETS DATA & CRUD
//              - loadAdSets() / getDefaultAdSets()
//              - persistAS()
//              - openAddAdSet(), openEditAdSet()
//              - dupAdSet(), delAdSet()
//
//  SECTION 18 : ADS DATA & CRUD
//              - loadAds() / getDefaultAds()
//              - persistAds()
//              - openAddAd(), openEditAd()
//              - dupAd(), delAd()
//
//  SECTION 19 : TAB SWITCHER
//              - switchTab(tab)   → switches between
//                Campaigns / Ad sets / Ads panels
//              - Updates page title, tab styles,
//                panel visibility, Create button action
//
//  SECTION 20 : RENDER AD SETS TABLE
//              - renderAdSets() → renders adSetsDB into table
//
//  SECTION 21 : RENDER ADS TABLE
//              - renderAds() → renders adsDB into table
//
//  SECTION 22 : INIT
//              - Shows payment notification after 2s
//              - Calls renderTable() on page load
// ==========================================================

// ─── STORAGE ───
const SKEY = 'fbads_v6';
function loadData(){
  try{ const d=JSON.parse(localStorage.getItem(SKEY)); return Array.isArray(d)&&d.length>0?d:getDefaults(); }
  catch(e){ return getDefaults(); }
}
function getDefaults(){
  return [{id:'c001',name:'Harmeet 2024',status:'draft',active:true,obj:'Awareness',budget:null,bid:'Using ad set bid',attr:'Using ad set bud',results:null,reach:null,imp:null,cpr:null,spent:null,ends:null,notes:'',created:new Date().toISOString()}];
}
let DB = loadData();
let sel = new Set();
let editId = null, delId = null, viewId = null, chartId = null;
let lastSnapshot = null;
let chartInst = null;

function persist(){ localStorage.setItem(SKEY, JSON.stringify(DB)); }

// ─── HELPERS ───
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmt(v){ return v!=null ? Number(v).toLocaleString('en-IN') : '–'; }
function cur(v){ return v!=null ? '₹'+Number(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '–'; }
function budStr(v){ return v ? '₹'+Number(v).toLocaleString('en-IN')+'/day' : 'Using ad set bud...'; }
function badge(s){
  return {draft:`<span class="badge b-draft"><span class="bd"></span>In draft</span>`,
          active:`<span class="badge b-active"><span class="bd"></span>Active</span>`,
          paused:`<span class="badge b-paused"><span class="bd"></span>Paused</span>`}[s]||'';
}
function cpr(c){ if(c.cpr) return +c.cpr; if(c.spent&&c.results&&+c.results>0) return +c.spent/+c.results; return null; }
function uid(){ return 'c_'+Date.now()+'_'+Math.floor(Math.random()*1000); }

// ─── RENDER ───
function renderTable(){
  const q = (document.getElementById('srch').value||'').toLowerCase();
  const list = q ? DB.filter(c=>c.name.toLowerCase().includes(q)||c.obj.toLowerCase().includes(q)) : DB;

  document.getElementById('empty').style.display = list.length===0 ? 'block':'none';
  document.getElementById('campCnt').textContent = list.length;
  document.getElementById('draftCnt').textContent = DB.filter(c=>c.status==='draft').length;

  let tR=0,tRe=0,tI=0,tSp=0,anyR=false,anySp=false;
  list.forEach(c=>{
    if(c.results){tR+=+c.results;anyR=true;}
    if(c.reach) tRe+=+c.reach;
    if(c.imp)   tI+=+c.imp;
    if(c.spent){tSp+=+c.spent;anySp=true;}
  });
  document.getElementById('ft_res').textContent   = anyR  ? tR.toLocaleString('en-IN'):'–';
  document.getElementById('ft_reach').textContent = tRe>0 ? tRe.toLocaleString('en-IN'):'–';
  document.getElementById('ft_imp').textContent   = tI>0  ? tI.toLocaleString('en-IN'):'–';
  document.getElementById('ft_spent').textContent = anySp ? '₹'+tSp.toLocaleString('en-IN',{minimumFractionDigits:2}):'₹0.00';
  document.getElementById('ft_cpr').textContent   = '–';
  document.getElementById('acctSub').textContent  = tRe>0 ? 'Accounts Centre acco... Total':'';

  const tb = document.getElementById('tbody');
  tb.innerHTML = '';
  list.forEach(c=>{
    const isSel = sel.has(c.id);
    const cprVal = cpr(c);
    const endsHtml = c.ends ? new Date(c.ends).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '<span style="color:#65676b;">Ongoing</span>';
    const tr = document.createElement('tr');
    if(isSel) tr.classList.add('sel');
    tr.innerHTML = `
      <td><input type="checkbox" class="rck" data-id="${c.id}" ${isSel?'checked':''} onchange="rowChk(this)"/></td>
      <td>
        <label class="tgl">
          <input type="checkbox" data-id="${c.id}" ${c.active?'checked':''} onchange="toggleAct(this)"/>
          <span class="tgl-s"></span>
        </label>
      </td>
      <td>
        <div><span class="cname" onclick="openView('${c.id}')">${esc(c.name)}</span></div>
        <div class="cactions">
          <span class="ca" onclick="openCharts('${c.id}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg> View Charts</span>
          <span class="csep">|</span>
          <span class="ca" onclick="openEdit('${c.id}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg> Edit</span>
          <span class="csep">|</span>
          <span class="ca" onclick="dupOne('${c.id}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/></svg> Duplicate</span>
          <span class="csep">|</span>
          <span class="ca" onclick="toast('📌 Pinned!','in')">📌 Pin</span>
        </div>
      </td>
      <td>${badge(c.status)}</td>
      <td style="color:#65676b">${esc(c.bid||'Using ad set bid')}</td>
      <td style="color:#65676b">${budStr(c.budget)}</td>
      <td style="color:#65676b">${esc(c.attr||'–')}</td>
      <td style="font-weight:600;color:#1c1e21">${fmt(c.results)}</td>
      <td style="color:#1c1e21">${fmt(c.reach)}</td>
      <td style="color:#1c1e21">${fmt(c.imp)}</td>
      <td style="color:#1c1e21">${cprVal!=null?'₹'+cprVal.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}):'–'}</td>
      <td style="font-weight:600;color:#1c1e21">${c.spent?'₹'+Number(c.spent).toLocaleString('en-IN',{minimumFractionDigits:2}):'–'}</td>
      <td>${endsHtml}</td>
    `;
    tb.appendChild(tr);
  });
  updBtns();
}

// ─── SELECTION ───
function toggleAll(cb){
  const q=(document.getElementById('srch').value||'').toLowerCase();
  const ids=(q?DB.filter(c=>c.name.toLowerCase().includes(q)):DB).map(c=>c.id);
  ids.forEach(id=>cb.checked?sel.add(id):sel.delete(id));
  renderTable();
}
function rowChk(cb){
  cb.checked?sel.add(cb.dataset.id):sel.delete(cb.dataset.id);
  cb.closest('tr').classList.toggle('sel',cb.checked);
  updBtns();
}
function updBtns(){
  document.getElementById('btnEdit').disabled = sel.size!==1;
  document.getElementById('btnDel').disabled  = sel.size===0;
  document.getElementById('btnDup').disabled  = sel.size===0;
}

// ─── TOGGLE ACTIVE ───
function toggleAct(cb){
  const c=DB.find(x=>x.id===cb.dataset.id);if(!c)return;
  c.active=cb.checked;persist();
  toast(c.active?'Campaign turned ON':'Campaign paused',c.active?'ok':'in');
}

// ─── OPEN ADD ───
function openAdd(){
  editId=null;
  document.getElementById('mTitle').textContent='Create Campaign';
  document.getElementById('saveBtn').textContent='💾 Create Campaign';
  clearForm();
  document.getElementById('ovCamp').classList.add('open');
}

function clearForm(){
  ['f_name','f_budget','f_results','f_reach','f_imp','f_cpr','f_spent','f_notes','f_ends']
    .forEach(id=>{ const el=document.getElementById(id); if(el){el.value='';el.classList.remove('inv');} });
  document.getElementById('f_obj').value    = 'Awareness';
  document.getElementById('f_status').value = 'draft';
  document.getElementById('f_bid').value    = 'Lowest cost';
  document.getElementById('f_attr').value   = '7-day click';
  document.getElementById('f_active').value = 'on';
}

// ─── OPEN EDIT ───
function openEdit(id){
  const c=DB.find(x=>x.id===id);if(!c)return;
  editId=id;
  document.getElementById('mTitle').textContent='Edit Campaign';
  document.getElementById('saveBtn').textContent='💾 Update Campaign';
  document.getElementById('f_name').value   = c.name;
  document.getElementById('f_obj').value    = c.obj||'Awareness';
  document.getElementById('f_status').value = c.status;
  document.getElementById('f_budget').value = c.budget||'';
  document.getElementById('f_bid').value    = c.bid||'Lowest cost';
  document.getElementById('f_attr').value   = c.attr||'7-day click';
  document.getElementById('f_active').value = c.active?'on':'off';
  document.getElementById('f_results').value= c.results||'';
  document.getElementById('f_reach').value  = c.reach||'';
  document.getElementById('f_imp').value    = c.imp||'';
  document.getElementById('f_cpr').value    = c.cpr||'';
  document.getElementById('f_spent').value  = c.spent||'';
  document.getElementById('f_ends').value   = c.ends||'';
  document.getElementById('f_notes').value  = c.notes||'';
  closeOv('ovView');
  document.getElementById('ovCamp').classList.add('open');
}
function editSelected(){ if(sel.size===1) openEdit([...sel][0]); }
function editFromView(){ if(viewId) openEdit(viewId); }

// ─── SAVE ───
function saveCamp(){
  const nameEl = document.getElementById('f_name');
  const name   = nameEl.value.trim();
  if(!name){
    nameEl.classList.add('inv');
    nameEl.focus();
    return;
  }
  const rec = {
    name,
    obj    : document.getElementById('f_obj').value,
    status : document.getElementById('f_status').value,
    budget : document.getElementById('f_budget').value  || null,
    bid    : document.getElementById('f_bid').value,
    attr   : document.getElementById('f_attr').value,
    active : document.getElementById('f_active').value==='on',
    results: document.getElementById('f_results').value || null,
    reach  : document.getElementById('f_reach').value   || null,
    imp    : document.getElementById('f_imp').value     || null,
    cpr    : document.getElementById('f_cpr').value     || null,
    spent  : document.getElementById('f_spent').value   || null,
    ends   : document.getElementById('f_ends').value    || null,
    notes  : document.getElementById('f_notes').value,
  };
  lastSnapshot = JSON.parse(JSON.stringify(DB));
  if(editId){
    const idx=DB.findIndex(x=>x.id===editId);
    DB[idx]={...DB[idx],...rec};
    toast('✅ Campaign updated!','ok');
  } else {
    DB.unshift({id:uid(), created:new Date().toISOString(), ...rec});
    toast('🎉 Campaign created!','ok');
  }
  persist();
  closeOv('ovCamp');
  renderTable();
}

// ─── DELETE ───
function openDelModal(id){
  delId=id;
  const c=DB.find(x=>x.id===id);
  document.getElementById('delName').innerHTML=`<strong>"${esc(c.name)}"</strong>`;
  document.getElementById('ovDel').classList.add('open');
}
function confirmDel(){
  const c=DB.find(x=>x.id===delId);
  lastSnapshot=JSON.parse(JSON.stringify(DB));
  DB=DB.filter(x=>x.id!==delId);
  sel.delete(delId);
  persist();closeOv('ovDel');renderTable();
  toast(`🗑️ "${c?.name}" deleted`,'er');
  delId=null;
}
function deleteSelected(){
  if(sel.size===1){ openDelModal([...sel][0]); return; }
  if(sel.size>1){
    if(!confirm(`Delete ${sel.size} selected campaigns?`)) return;
    lastSnapshot=JSON.parse(JSON.stringify(DB));
    DB=DB.filter(c=>!sel.has(c.id));
    sel.clear();persist();renderTable();
    toast(`🗑️ Campaigns deleted`,'er');
  }
}

// ─── DUPLICATE ───
function dupOne(id){
  const c=DB.find(x=>x.id===id);if(!c)return;
  const nc={...c,id:uid(),name:'Copy of '+c.name,status:'draft',created:new Date().toISOString()};
  DB.splice(DB.findIndex(x=>x.id===id)+1,0,nc);
  persist();renderTable();
  toast('📋 Duplicated!','in');
}
function dupSelected(){ [...sel].forEach(id=>dupOne(id)); sel.clear(); renderTable(); }

// ─── UNDO ───
function undoLast(){
  if(!lastSnapshot){toast('Nothing to undo','in');return;}
  DB=lastSnapshot;lastSnapshot=null;sel.clear();persist();renderTable();
  toast('↩️ Undone!','in');
}

// ─── VIEW ───
function openView(id){
  viewId=id;
  const c=DB.find(x=>x.id===id);if(!c)return;
  const cv=cpr(c);
  document.getElementById('vTitle').textContent=c.name;
  document.getElementById('vBody').innerHTML=`
    <div class="vg">
      <div class="vf"><label>Objective</label><span>${esc(c.obj)}</span></div>
      <div class="vf"><label>Status</label><span>${badge(c.status)}</span></div>
      <div class="vf"><label>Budget</label><span>${budStr(c.budget)}</span></div>
      <div class="vf"><label>Bid Strategy</label><span>${esc(c.bid)}</span></div>
      <div class="vf"><label>Attribution</label><span>${esc(c.attr)}</span></div>
      <div class="vf"><label>Toggle</label><span>${c.active?'🟢 ON':'⚫ OFF'}</span></div>
      <div class="vf"><label>Results</label><span style="font-size:22px;font-weight:800;color:#1877f2">${fmt(c.results)}</span></div>
      <div class="vf"><label>Reach</label><span style="font-size:22px;font-weight:800;color:#42b72a">${fmt(c.reach)}</span></div>
      <div class="vf"><label>Impressions</label><span style="font-size:22px;font-weight:800;color:#f0b429">${fmt(c.imp)}</span></div>
      <div class="vf"><label>Cost per Result</label><span style="font-size:22px;font-weight:800;color:#9b59b6">${cv!=null?'₹'+cv.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}):'–'}</span></div>
      <div class="vf"><label>Amount Spent</label><span style="font-size:22px;font-weight:800;color:#e74c3c">${c.spent?'₹'+Number(c.spent).toLocaleString('en-IN',{minimumFractionDigits:2}):'–'}</span></div>
      <div class="vf"><label>Ends</label><span>${c.ends?new Date(c.ends).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'Ongoing'}</span></div>
      ${c.notes?`<div class="vf" style="grid-column:1/-1"><label>Notes</label><span style="background:#f7f8fa;padding:6px 10px;border-radius:6px;display:block;">${esc(c.notes)}</span></div>`:''}
      <div class="vf" style="grid-column:1/-1"><label>Campaign ID</label><span style="font-family:monospace;font-size:12px;color:#65676b">${c.id}</span></div>
      <div class="vf" style="grid-column:1/-1"><label>Created</label><span style="font-size:12px;color:#65676b">${new Date(c.created).toLocaleString()}</span></div>
    </div>
  `;
  document.getElementById('ovView').classList.add('open');
}

// ─── CHARTS ───
function openCharts(id){
  chartId=id;
  const c=DB.find(x=>x.id===id);if(!c)return;
  const cv=cpr(c);
  document.getElementById('cTitle').textContent=c.name+' – Charts';
  document.getElementById('kpis').innerHTML=`
    <div class="kpi"><div class="kpi-l">Results</div><div class="kpi-v">${fmt(c.results)}</div><div class="kpi-s"><span class="up">↑ 12.4%</span> vs last month</div></div>
    <div class="kpi"><div class="kpi-l">Reach</div><div class="kpi-v">${fmt(c.reach)}</div><div class="kpi-s"><span class="up">↑ 8.1%</span> vs last month</div></div>
    <div class="kpi"><div class="kpi-l">Impressions</div><div class="kpi-v">${fmt(c.imp)}</div><div class="kpi-s"><span class="dn">↓ 2.3%</span> vs last month</div></div>
    <div class="kpi"><div class="kpi-l">Amount Spent</div><div class="kpi-v">${c.spent?'₹'+Number(c.spent).toFixed(2):'₹0.00'}</div><div class="kpi-s">CPR: ${cv!=null?'₹'+cv.toFixed(2):'–'}</div></div>
  `;
  document.querySelectorAll('.ctab').forEach((t,i)=>t.classList.toggle('active',i===0));
  buildChart('results',c);
  document.getElementById('ovCharts').classList.add('open');
}

function genDays(total,days=23){
  if(!total||+total===0) return Array(days).fill(0);
  const arr=[];let rem=+total;
  for(let i=0;i<days;i++){
    if(i===days-1){arr.push(Math.max(0,Math.round(rem)));break;}
    const v=Math.round((rem/(days-i))*(0.5+Math.random()*1));
    arr.push(Math.max(0,v));rem-=v;
  }
  return arr;
}

function buildChart(type,c){
  if(chartInst){chartInst.destroy();chartInst=null;}
  const labels=Array.from({length:23},(_,i)=>`Jun ${i+1}`);
  const cv=cpr(c);
  const configs={
    results    :{vals:genDays(c.results),     label:'Results',           color:'#1877f2',prefix:''},
    reach      :{vals:genDays(c.reach),        label:'Reach',             color:'#42b72a',prefix:''},
    impressions:{vals:genDays(c.imp),          label:'Impressions',       color:'#f0b429',prefix:''},
    spent      :{vals:genDays(c.spent),        label:'Amount Spent (₹)',  color:'#e74c3c',prefix:'₹'},
    cpr        :{vals:Array.from({length:23},()=>Math.max(0,(cv||0)*(0.65+Math.random()*.7)).toFixed(2)),label:'Cost per Result (₹)',color:'#9b59b6',prefix:'₹'},
  };
  const cfg=configs[type];
  const ctx=document.getElementById('mchart').getContext('2d');
  chartInst=new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[{label:cfg.label,data:cfg.vals,borderColor:cfg.color,backgroundColor:cfg.color+'18',fill:true,tension:.4,pointRadius:3,pointHoverRadius:6,borderWidth:2.5,pointBackgroundColor:cfg.color}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,callbacks:{label:ctx=>`${cfg.label}: ${cfg.prefix}${Number(ctx.parsed.y).toLocaleString('en-IN')}`}}},
      scales:{
        x:{grid:{color:'#f0f2f5'},ticks:{font:{size:11},color:'#65676b',maxTicksLimit:8}},
        y:{grid:{color:'#f0f2f5'},ticks:{font:{size:11},color:'#65676b',callback:v=>cfg.prefix+Number(v).toLocaleString('en-IN')}}
      }
    }
  });
}

function swChart(type,btn){
  document.querySelectorAll('.ctab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const c=DB.find(x=>x.id===chartId);
  if(c) buildChart(type,c);
}

// ─── PUBLISH / DISCARD ───
function publishDrafts(){
  const drafts=DB.filter(c=>c.status==='draft');
  if(!drafts.length){toast('No drafts to publish','in');return;}
  drafts.forEach(c=>{c.status='active';c.active=true;});
  persist();renderTable();toast(`🚀 ${drafts.length} campaign(s) published!`,'ok');
}
function discardDrafts(){
  const n=DB.filter(c=>c.status==='draft').length;
  if(!n){toast('No drafts to discard','in');return;}
  lastSnapshot=JSON.parse(JSON.stringify(DB));
  DB=DB.filter(c=>c.status!=='draft');
  sel.clear();persist();renderTable();
  toast(`${n} draft(s) discarded`,'in');
}

// ─── MODAL HELPERS ───
function closeOv(id){
  document.getElementById(id).classList.remove('open');
  if(id==='ovCharts'&&chartInst){chartInst.destroy();chartInst=null;}
}
document.querySelectorAll('.ov').forEach(o=>o.addEventListener('click',function(e){if(e.target===this)closeOv(this.id);}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.ov.open').forEach(m=>closeOv(m.id));});

// ─── TOAST ───
function toast(msg,type='in'){
  const el=document.createElement('div');
  el.className=`toast ${type}`;el.textContent=msg;
  document.getElementById('twrap').appendChild(el);
  setTimeout(()=>{el.style.animation='tout .3s ease forwards';setTimeout(()=>el.remove(),300);},3000);
}

// ─── INIT ───
setTimeout(()=>document.getElementById('notif').classList.remove('hidden'),2000);
renderTable();

// ─── AD SETS DATA ───
const AS_KEY = 'fbads_adsets_v1';
const ADS_KEY = 'fbads_ads_v1';

function loadAdSets(){
  try{ const d=JSON.parse(localStorage.getItem(AS_KEY)); return Array.isArray(d)&&d.length>0?d:getDefaultAdSets(); }
  catch(e){ return getDefaultAdSets(); }
}
function getDefaultAdSets(){
  return [
    {id:'as001',name:'Harmeet Awareness - All India',status:'draft',active:true,budget:'₹500/day',schedule:'Ongoing',results:null,reach:null,imp:null,spent:null,campaign:'Harmeet 2024',created:new Date().toISOString()},
    {id:'as002',name:'Retargeting - Website Visitors',status:'paused',active:false,budget:'₹300/day',schedule:'1 Jun - 30 Jun',results:124,reach:8400,imp:21000,spent:1240,campaign:'Harmeet 2024',created:new Date().toISOString()},
  ];
}
function loadAds(){
  try{ const d=JSON.parse(localStorage.getItem(ADS_KEY)); return Array.isArray(d)&&d.length>0?d:getDefaultAds(); }
  catch(e){ return getDefaultAds(); }
}
function getDefaultAds(){
  return [
    {id:'ad001',name:'Awareness - Video Ad',status:'draft',active:true,adset:'Harmeet Awareness - All India',format:'Video',results:null,reach:null,imp:null,clicks:null,spent:null,campaign:'Harmeet 2024',created:new Date().toISOString()},
    {id:'ad002',name:'Retargeting - Carousel',status:'paused',active:false,adset:'Retargeting - Website Visitors',format:'Carousel',results:87,reach:5200,imp:14300,clicks:342,spent:870,campaign:'Harmeet 2024',created:new Date().toISOString()},
    {id:'ad003',name:'Summer Offer - Single Image',status:'active',active:true,adset:'Harmeet Awareness - All India',format:'Single image',results:210,reach:18000,imp:52000,clicks:890,spent:2100,campaign:'Harmeet 2024',created:new Date().toISOString()},
  ];
}

let adSetsDB = loadAdSets();
let adsDB    = loadAds();

function persistAS(){ localStorage.setItem(AS_KEY, JSON.stringify(adSetsDB)); }
function persistAds(){ localStorage.setItem(ADS_KEY, JSON.stringify(adsDB)); }

// ─── TAB SWITCHER ───
let currentTab = 'campaigns';
function switchTab(tab){
  const titles={'campaigns':'Campaigns','adsets':'Ad sets','ads':'Ads'};
  const pt=document.getElementById('pageTitle');
  if(pt)pt.textContent=titles[tab]||tab;
  currentTab = tab;
  // update tab styles
  ['campaigns','adsets','ads'].forEach(t=>{
    const tabEl = document.getElementById('tab-'+t);
    const icEl  = document.getElementById('tabic-'+t);
    if(tabEl){
      tabEl.classList.toggle('active', t===tab);
    }
    if(icEl){
      if(t===tab){
        icEl.classList.remove('gr'); icEl.classList.add('bl');
        icEl.querySelectorAll('svg *').forEach(el=>el.setAttribute('fill','white'));
      } else {
        icEl.classList.remove('bl'); icEl.classList.add('gr');
        icEl.querySelectorAll('svg *').forEach(el=>el.setAttribute('fill','#65676b'));
      }
    }
  });
  // show/hide panels
  document.getElementById('tblOuter').style.display    = tab==='campaigns' ? 'block':'none';
  document.getElementById('empty').style.display       = (tab==='campaigns' && DB.length===0) ? 'block':'none';
  if(tab==='campaigns') renderTable();
  document.getElementById('panel-adsets').style.display= tab==='adsets'  ? 'block':'none';
  document.getElementById('panel-ads').style.display   = tab==='ads'     ? 'block':'none';

  if(tab==='adsets')  renderAdSets();
  if(tab==='ads')     renderAds();

  // update Create button action
  document.getElementById('btnCreate').onclick = tab==='campaigns' ? openAdd :
    tab==='adsets' ? openAddAdSet : openAddAd;
}

// ─── RENDER AD SETS ───
function renderAdSets(){
  const tb = document.getElementById('adsets-tbody');
  document.getElementById('adsets-count').textContent = adSetsDB.length;
  document.getElementById('empty-adsets').style.display = adSetsDB.length===0?'block':'none';

  let tR=0,tRe=0,tI=0,tSp=0,anyR=false,anySp=false;
  adSetsDB.forEach(a=>{
    if(a.results){tR+=+a.results;anyR=true;}
    if(a.reach)tRe+=+a.reach;
    if(a.imp)tI+=+a.imp;
    if(a.spent){tSp+=+a.spent;anySp=true;}
  });
  document.getElementById('as_res').textContent  = anyR?tR.toLocaleString('en-IN'):'–';
  document.getElementById('as_reach').textContent= tRe>0?tRe.toLocaleString('en-IN'):'–';
  document.getElementById('as_imp').textContent  = tI>0?tI.toLocaleString('en-IN'):'–';
  document.getElementById('as_spent').textContent= anySp?'₹'+tSp.toLocaleString('en-IN',{minimumFractionDigits:2}):'₹0.00';

  tb.innerHTML='';
  adSetsDB.forEach(a=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><input type="checkbox"/></td>
      <td><label class="tgl"><input type="checkbox" ${a.active?'checked':''} onchange="this.closest('tr').style.opacity=this.checked?'1':'.6'"/><span class="tgl-s"></span></label></td>
      <td>
        <div><span class="cname" onclick="toast('Ad Set: ${esc(a.name)}','in')">${esc(a.name)}</span></div>
        <div class="cactions">
          <span class="ca" onclick="openEditAdSet('${a.id}')">✏️ Edit</span>
          <span class="csep">|</span>
          <span class="ca" onclick="dupAdSet('${a.id}')">📋 Duplicate</span>
          <span class="csep">|</span>
          <span class="ca" onclick="delAdSet('${a.id}')">🗑️ Delete</span>
        </div>
      </td>
      <td>${badge(a.status)}</td>
      <td style="color:#65676b">${esc(a.budget)}</td>
      <td style="color:#65676b">${esc(a.schedule)}</td>
      <td style="font-weight:600;color:#1c1e21">${fmt(a.results)}</td>
      <td>${fmt(a.reach)}</td>
      <td>${fmt(a.imp)}</td>
      <td>${a.spent&&a.results&&+a.results>0?'₹'+(+a.spent/+a.results).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}):'–'}</td>
      <td style="font-weight:600;color:#1c1e21">${a.spent?'₹'+Number(a.spent).toLocaleString('en-IN',{minimumFractionDigits:2}):'–'}</td>
    `;
    tb.appendChild(tr);
  });
}

// ─── RENDER ADS ───
function renderAds(){
  const tb = document.getElementById('ads-tbody');
  document.getElementById('ads-count').textContent = adsDB.length;
  document.getElementById('empty-ads').style.display = adsDB.length===0?'block':'none';

  let tR=0,tRe=0,tI=0,tC=0,tSp=0,anyR=false,anySp=false;
  adsDB.forEach(a=>{
    if(a.results){tR+=+a.results;anyR=true;}
    if(a.reach)tRe+=+a.reach;
    if(a.imp)tI+=+a.imp;
    if(a.clicks)tC+=+a.clicks;
    if(a.spent){tSp+=+a.spent;anySp=true;}
  });
  document.getElementById('ad_res').textContent   = anyR?tR.toLocaleString('en-IN'):'–';
  document.getElementById('ad_reach').textContent = tRe>0?tRe.toLocaleString('en-IN'):'–';
  document.getElementById('ad_imp').textContent   = tI>0?tI.toLocaleString('en-IN'):'–';
  document.getElementById('ad_clicks').textContent= tC>0?tC.toLocaleString('en-IN'):'–';
  document.getElementById('ad_spent').textContent = anySp?'₹'+tSp.toLocaleString('en-IN',{minimumFractionDigits:2}):'₹0.00';

  const fmtColor={Video:'#9b59b6','Single image':'#1877f2',Carousel:'#f0b429','Collection':'#42b72a'};
  tb.innerHTML='';
  adsDB.forEach(a=>{
    const ctr=a.clicks&&a.imp&&+a.imp>0?((+a.clicks/+a.imp)*100).toFixed(2)+'%':'–';
    const cpr=a.spent&&a.results&&+a.results>0?'₹'+(+a.spent/+a.results).toFixed(2):'–';
    const fc=fmtColor[a.format]||'#65676b';
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><input type="checkbox"/></td>
      <td><label class="tgl"><input type="checkbox" ${a.active?'checked':''} onchange="this.closest('tr').style.opacity=this.checked?'1':'.65'"/><span class="tgl-s"></span></label></td>
      <td>
        <div><span class="cname" onclick="toast('Ad: ${esc(a.name)}','in')">${esc(a.name)}</span></div>
        <div class="cactions">
          <span class="ca" onclick="openEditAd('${a.id}')">✏️ Edit</span>
          <span class="csep">|</span>
          <span class="ca" onclick="dupAd('${a.id}')">📋 Duplicate</span>
          <span class="csep">|</span>
          <span class="ca" onclick="delAd('${a.id}')">🗑️ Delete</span>
        </div>
      </td>
      <td>${badge(a.status)}</td>
      <td style="color:#65676b;font-size:12px">${esc(a.adset)}</td>
      <td><span class="fmt-badge" style="color:${fc};background:${fc}18">${esc(a.format)}</span></td>
      <td style="font-weight:600;color:#1c1e21">${fmt(a.results)}</td>
      <td>${fmt(a.reach)}</td>
      <td>${fmt(a.imp)}</td>
      <td>${fmt(a.clicks)}</td>
      <td>${ctr}</td>
      <td>${cpr}</td>
      <td style="font-weight:600;color:#1c1e21">${a.spent?'₹'+Number(a.spent).toLocaleString('en-IN',{minimumFractionDigits:2}):'–'}</td>
    `;
    tb.appendChild(tr);
  });
}

// ─── AD SET CRUD ───
function openAddAdSet(){
  const name=prompt('Ad Set Name:');
  if(!name)return;
  const budget=prompt('Daily Budget (₹):')||'₹500/day';
  adSetsDB.unshift({id:'as_'+Date.now(),name,status:'draft',active:true,budget:'₹'+budget+'/day',schedule:'Ongoing',results:null,reach:null,imp:null,spent:null,campaign:'',created:new Date().toISOString()});
  persistAS();renderAdSets();toast('🎯 Ad Set created!','ok');
}
function openEditAdSet(id){
  const a=adSetsDB.find(x=>x.id===id);if(!a)return;
  const name=prompt('Edit Ad Set Name:',a.name);
  if(!name)return;
  a.name=name;
  const budget=prompt('Budget:',a.budget.replace('₹','').replace('/day',''));
  if(budget)a.budget='₹'+budget+'/day';
  persistAS();renderAdSets();toast('✅ Ad Set updated!','ok');
}
function dupAdSet(id){
  const a=adSetsDB.find(x=>x.id===id);if(!a)return;
  adSetsDB.splice(adSetsDB.findIndex(x=>x.id===id)+1,0,{...a,id:'as_'+Date.now(),name:'Copy of '+a.name,status:'draft',created:new Date().toISOString()});
  persistAS();renderAdSets();toast('📋 Ad Set duplicated!','in');
}
function delAdSet(id){
  if(!confirm('Delete this Ad Set?'))return;
  adSetsDB=adSetsDB.filter(x=>x.id!==id);
  persistAS();renderAdSets();toast('🗑️ Ad Set deleted','er');
}

// ─── ADS CRUD ───
function openAddAd(){
  const name=prompt('Ad Name:');
  if(!name)return;
  const formats=['Video','Single image','Carousel','Collection'];
  const fmtIdx=prompt('Format (0=Video, 1=Single image, 2=Carousel, 3=Collection):')||'1';
  const format=formats[+fmtIdx]||'Single image';
  const adsetName=adSetsDB.length>0?adSetsDB[0].name:'';
  adsDB.unshift({id:'ad_'+Date.now(),name,status:'draft',active:true,adset:adsetName,format,results:null,reach:null,imp:null,clicks:null,spent:null,campaign:'',created:new Date().toISOString()});
  persistAds();renderAds();toast('🖼️ Ad created!','ok');
}
function openEditAd(id){
  const a=adsDB.find(x=>x.id===id);if(!a)return;
  const name=prompt('Edit Ad Name:',a.name);
  if(!name)return;
  a.name=name;
  persistAds();renderAds();toast('✅ Ad updated!','ok');
}
function dupAd(id){
  const a=adsDB.find(x=>x.id===id);if(!a)return;
  adsDB.splice(adsDB.findIndex(x=>x.id===id)+1,0,{...a,id:'ad_'+Date.now(),name:'Copy of '+a.name,status:'draft',created:new Date().toISOString()});
  persistAds();renderAds();toast('📋 Ad duplicated!','in');
}
function delAd(id){
  if(!confirm('Delete this Ad?'))return;
  adsDB=adsDB.filter(x=>x.id!==id);
  persistAds();renderAds();toast('🗑️ Ad deleted','er');
}