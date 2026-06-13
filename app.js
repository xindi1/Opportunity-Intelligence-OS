const KEY = "opportunity_intelligence_os_v4";
const OLD_KEYS = ["opportunity_intelligence_os_v3","opportunity_intelligence_os_v2"];
const THEME_KEY = "opportunity_intelligence_theme";
const $ = id => document.getElementById(id);

const fields = ["id","problem","category","description","whoFeelsIt","pain","frequency","economic","spend","ai","interest","gap","reach","solutions","complaints","buyer","champion","businessModel","nextAction","followUpAt","status","notes"];

function load(){
  let current = JSON.parse(localStorage.getItem(KEY) || "[]");
  if(current.length) return current;
  for(const k of OLD_KEYS){
    const old = JSON.parse(localStorage.getItem(k) || "[]");
    if(Array.isArray(old) && old.length){
      localStorage.setItem(KEY, JSON.stringify(old));
      return old;
    }
  }
  return [];
}
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

function normalizeRecord(raw, index=0){
  const now = new Date().toISOString();
  const d = {};
  fields.forEach(f => d[f] = raw?.[f] ?? "");
  d.problem = String(raw?.problem || raw?.name || raw?.title || raw?.categoryName || `Imported Problem ${index+1}`);
  d.category = String(raw?.category || raw?.cluster || "Other");
  d.description = String(raw?.description || raw?.underlyingProblem || raw?.problemDescription || "");
  d.whoFeelsIt = String(raw?.whoFeelsIt || raw?.who_experiences_it || raw?.who || raw?.customer || "");
  d.solutions = String(raw?.solutions || raw?.currentSolutions || raw?.softwareCategory || "");
  d.complaints = String(raw?.complaints || raw?.commonComplaints || "");
  d.buyer = String(raw?.buyer || raw?.likelyBuyer || "");
  d.champion = String(raw?.champion || raw?.likelyChampion || "");
  d.businessModel = String(raw?.businessModel || raw?.business_model || "");
  d.nextAction = String(raw?.nextAction || raw?.next_action || "Research current solutions, customer complaints, buyer urgency, and niche entry points.");
  d.status = String(raw?.status || "Captured");
  d.notes = String(raw?.notes || "");
  d.followUpAt = String(raw?.followUpAt || "");
  ["pain","frequency","economic","spend","ai","interest","gap","reach"].forEach(f => {
    const v = Number(raw?.[f]);
    d[f] = Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
  });
  d.id = String(raw?.id || crypto.randomUUID());
  d.createdAt = raw?.createdAt || now;
  d.updatedAt = raw?.updatedAt || now;
  d.score = Number.isFinite(Number(raw?.score)) ? Number(raw.score) : calcScore(d);
  return d;
}

function extractArray(parsed){
  if(Array.isArray(parsed)) return parsed;
  if(parsed && typeof parsed === "object"){
    for(const key of ["records","data","items","problems","opportunities","results"]){
      if(Array.isArray(parsed[key])) return parsed[key];
    }
  }
  return null;
}

function parseImportText(text){
  if(!text || !text.trim()) throw new Error("Import text is empty.");
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^\uFEFF/, "");
  const parsed = JSON.parse(cleaned);
  const arr = extractArray(parsed);
  if(!arr) throw new Error("Import must be a JSON array, or an object with records/data/items/problems/opportunities/results array.");
  return arr;
}

function previewImport(text){
  const arr = parseImportText(text);
  const normalized = arr.map(normalizeRecord);
  const missing = normalized.filter(r => !r.problem || r.problem.startsWith("Imported Problem")).length;
  return {count: normalized.length, missing, normalized};
}

function importRecords(records){
  const existing = load();
  const seen = new Set(existing.map(r => String(r.problem).toLowerCase().trim()));
  let added = 0, skipped = 0;
  for(const r of records){
    const key = String(r.problem).toLowerCase().trim();
    if(key && seen.has(key)){ skipped++; continue; }
    existing.push(r); seen.add(key); added++;
  }
  saveAll(existing);
  render();
  return {added, skipped, total: existing.length};
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
  const avg = total ? Math.round(data.reduce((s,d)=>s+(Number(d.score)||0),0)/total) : 0;
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
  `).join("") || `<div class="card"><p>No problems yet. Add your first one or use Mass Import.</p></div>`;
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
$("themeBtn").addEventListener("click", ()=> setTheme(document.body.classList.contains("light") ? "dark" : "light"));

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
  try{
    const text = await file.text();
    $("importText").value = text;
    const preview = previewImport(text);
    $("importReport").textContent = `Valid JSON import detected.\nRecords found: ${preview.count}\nRecords with generated problem names: ${preview.missing}\nReady to import.`;
    setTab("import");
  } catch(err){
    $("importReport").textContent = `Import validation failed:\n${err.message}`;
    setTab("import");
  }
});

$("validateImportBtn").addEventListener("click", ()=>{
  try{
    const preview = previewImport($("importText").value);
    $("importReport").textContent = `Valid JSON import detected.\nRecords found: ${preview.count}\nRecords with generated problem names: ${preview.missing}\nReady to import.`;
  } catch(err){
    $("importReport").textContent = `Import validation failed:\n${err.message}`;
  }
});

$("importTextBtn").addEventListener("click", ()=>{
  try{
    const preview = previewImport($("importText").value);
    const result = importRecords(preview.normalized);
    $("importReport").textContent = `Import complete.\nAdded: ${result.added}\nSkipped duplicates: ${result.skipped}\nTotal records now: ${result.total}`;
    setTab("portfolio");
  } catch(err){
    $("importReport").textContent = `Import failed:\n${err.message}`;
  }
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
