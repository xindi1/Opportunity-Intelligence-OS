const KEY = "opportunity_intelligence_os_v3";
const THEME_KEY = "opportunity_intelligence_theme";
const $ = id => document.getElementById(id);

const fields = ["id","problem","category","description","whoFeelsIt","pain","frequency","economic","spend","ai","interest","gap","reach","solutions","complaints","buyer","champion","businessModel","nextAction","followUpAt","status","notes"];

function load(){ return JSON.parse(localStorage.getItem(KEY) || "[]"); }
function saveAll(data){ localStorage.setItem(KEY, JSON.stringify(data)); }

function setTheme(theme){
  document.body.classList.toggle("light", theme === "light");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", theme === "light" ? "#f6f8fa" : "#0d1117");
  localStorage.setItem(THEME_KEY, theme);
}
setTheme(localStorage.getItem(THEME_KEY) || "dark");

function fmtDateTime(value){
  if(!value) return "—";
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  const pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calcScore(d){
  const nums = ["pain","frequency","economic","spend","ai","interest","gap","reach"];
  const total = nums.reduce((s,k)=>s+(Number(d[k])||0),0);
  return Math.round((total / 80) * 100);
}

function formData(){
  const d = {};
  fields.forEach(f => d[f] = $(f).value);
  ["pain","frequency","economic","spend","ai","interest","gap","reach"].forEach(f => d[f] = Number(d[f]) || 0);
  const existing = load().find(x => x.id === d.id);
  d.id = d.id || crypto.randomUUID();
  d.createdAt = existing?.createdAt || new Date().toISOString();
  d.updatedAt = new Date().toISOString();
  d.score = calcScore(d);
  return d;
}

function updateFormMeta(d){
  if(!d?.createdAt) $("formMeta").textContent = "Not saved yet";
  else $("formMeta").innerHTML = `Created ${fmtDateTime(d.createdAt)}<br>Updated ${fmtDateTime(d.updatedAt)}`;
}

function populate(d){
  fields.forEach(f => { if($(f)) $(f).value = d[f] ?? ""; });
  $("formTitle").textContent = "Edit Problem";
  updateFormMeta(d);
  window.scrollTo({top:0, behavior:"smooth"});
  setTab("capture");
}

function clearForm(){
  fields.forEach(f => { if($(f)) $(f).value = ""; });
  $("status").value = "Captured";
  $("category").value = "Revenue Generation";
  $("formTitle").textContent = "New Problem";
  updateFormMeta(null);
}

function saveProblem(){
  const d = formData();
  if(!d.problem.trim()){ alert("Add a problem name."); return; }
  const data = load();
  const idx = data.findIndex(x => x.id === d.id);
  if(idx >= 0) data[idx] = {...data[idx], ...d};
  else data.push(d);
  saveAll(data);
  clearForm();
  render();
  setTab("portfolio");
}

function deleteProblem(id){
  if(confirm("Delete this problem?")){
    saveAll(load().filter(x => x.id !== id));
    render();
  }
}

function sortData(data, sort){
  if(sort === "updatedAt") return data.sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
  return data.sort((a,b)=>(Number(b[sort])||0)-(Number(a[sort])||0));
}

function render(){
  const q = ($("search")?.value || "").toLowerCase();
  const sort = $("sort")?.value || "score";
  let data = load().filter(d => JSON.stringify(d).toLowerCase().includes(q));
  data = sortData(data, sort);

  const total = data.length;
  const avg = total ? Math.round(data.reduce((s,d)=>s+d.score,0)/total) : 0;
  const top = total ? data[0].score : 0;
  $("stats").innerHTML = `
    <div class="stat"><span class="small">Problems</span><strong>${total}</strong></div>
    <div class="stat"><span class="small">Avg score</span><strong>${avg}</strong></div>
    <div class="stat"><span class="small">Top score</span><strong>${top}</strong></div>
  `;

  $("list").innerHTML = data.map(d => `
    <div class="item">
      <div class="itemTop">
        <div>
          <h3>${escapeHtml(d.problem)}</h3>
          <span class="badge">${escapeHtml(d.category || "")}</span>
          <span class="badge">${escapeHtml(d.status || "")}</span>
        </div>
        <div class="score">${d.score}</div>
      </div>
      <p>${escapeHtml(d.description || "")}</p>
      <div class="small">Buyer: ${escapeHtml(d.buyer || "—")} · Champion: ${escapeHtml(d.champion || "—")}</div>
      <div class="small">Next: ${escapeHtml(d.nextAction || "—")}</div>
      <div class="small">Follow-up: ${fmtDateTime(d.followUpAt)}</div>
      <div class="small">Updated: ${fmtDateTime(d.updatedAt)}</div>
      <button onclick='populate(${JSON.stringify(d).replaceAll("'","&#39;")})'>Edit</button>
      <button class="ghost" onclick="deleteProblem('${d.id}')">Delete</button>
    </div>
  `).join("") || `<div class="card"><p>No problems yet. Add your first one.</p></div>`;
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function setTab(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===name));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active", p.id===name));
}

document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
$("saveBtn").addEventListener("click", saveProblem);
$("clearBtn").addEventListener("click", clearForm);
$("search").addEventListener("input", render);
$("sort").addEventListener("change", render);
$("themeBtn").addEventListener("click", ()=>{
  setTheme(document.body.classList.contains("light") ? "dark" : "light");
});

$("exportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(load(), null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `opportunity_intelligence_export_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});

$("importFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  const imported = JSON.parse(text);
  if(!Array.isArray(imported)) return alert("Import file must be a JSON array.");
  saveAll(imported);
  render();
  alert("Import complete.");
});

const prompts = {
  discovery: `Research this problem as an opportunity:\n\nProblem: [PASTE PROBLEM]\n\nReturn:\n- Who experiences it most intensely\n- Pain evidence\n- Frequency\n- Economic impact\n- Existing spend\n- Current solutions\n- Common complaints\n- Initial opportunity score`,
  market: `Market scan:\n\nProblem: [PASTE PROBLEM]\n\nReturn:\n- Top customer segments\n- Top industries\n- Existing solution categories\n- Competitors\n- Gaps\n- Where AI could help\n- Best first niche`,
  buyer: `Buyer mapping:\n\nProblem: [PASTE PROBLEM]\nMarket: [PASTE MARKET]\n\nReturn:\n- Likely buyer\n- Likely champion\n- Decision-maker\n- Budget owner\n- First outreach target\n- Why each role cares`,
  solution: `Solution discovery:\n\nProblem: [PASTE PROBLEM]\nBuyer: [PASTE BUYER]\n\nReturn:\n- Service idea\n- Framework idea\n- AI agent idea\n- Software idea\n- Assessment idea\n- Fastest path to first dollar`
};
document.querySelectorAll(".promptBtn").forEach(b=>b.addEventListener("click",()=>{$("promptOutput").value=prompts[b.dataset.prompt]}));
$("copyPromptBtn").addEventListener("click", async ()=> {
  await navigator.clipboard.writeText($("promptOutput").value);
  $("copyPromptBtn").textContent = "Copied";
  setTimeout(()=>$("copyPromptBtn").textContent="Copy Prompt", 1200);
});

if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
render();
