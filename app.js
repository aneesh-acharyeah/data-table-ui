// ===== Schema & Fake Data =====
const columns = [
  { key: "id", label: "ID", type: "number", width: 70 },
  { key: "name", label: "Name", type: "text", width: 180 },
  { key: "email", label: "Email", type: "text", width: 230 },
  { key: "role", label: "Role", type: "text", width: 120 },
  { key: "status", label: "Status", type: "text", width: 110 },
  { key: "signup", label: "Signup", type: "date", width: 140 },
  { key: "lastActive", label: "Last Active", type: "date", width: 160 },
  { key: "plan", label: "Plan", type: "text", width: 110 },
  { key: "spent", label: "Spent ($)", type: "number", width: 120 },
];

function seededRand(seed){ let t = seed % 2147483647; return () => (t = t*16807 % 2147483647)/2147483647; }
const rnd = seededRand(42);
const pick = (arr)=>arr[Math.floor(rnd()*arr.length)];
const names = ["Aarav","Diya","Ishaan","Kavya","Neeraj","Rhea","Kabir","Anya","Rohan","Meera","Arjun","Nisha","Zara","Vikram","Ira","Yash","Aisha","Dev","Sana","Varun"];
const roles = ["Admin","Editor","Manager","Support","Viewer"];
const statuses = ["Active","Invited","Suspended","Pending"];
const plans = ["Free","Pro","Team","Enterprise"];
const dom = {
  head: document.getElementById("gridHead"),
  body: document.getElementById("gridBody"),
  pageSize: document.getElementById("pageSize"),
  search: document.getElementById("searchInput"),
  exportBtn: document.getElementById("exportBtn"),
  resetBtn: document.getElementById("resetBtn"),
  colToggles: document.getElementById("colToggles"),
  pageList: document.getElementById("pageList"),
  firstBtn: document.getElementById("firstBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  lastBtn: document.getElementById("lastBtn"),
  status: document.getElementById("tableStatus"),
  grid: document.getElementById("grid"),
};

function makeData(n=250){
  const now = new Date("2025-01-15T12:00:00Z");
  const rows = [];
  for(let i=1;i<=n;i++){
    const nm = pick(names)+" "+String.fromCharCode(65+Math.floor(rnd()*26))+". "+pick(names);
    const sgOffset = Math.floor(rnd()*900);
    const laOffset = Math.floor(rnd()*60);
    const signup = new Date(now); signup.setDate(signup.getDate()-sgOffset);
    const lastActive = new Date(now); lastActive.setDate(lastActive.getDate()-laOffset);
    rows.push({
      id:i,
      name:nm,
      email: nm.toLowerCase().replace(/\s+/g,'.')+"@example.com",
      role: pick(roles),
      status: pick(statuses),
      signup: signup.toISOString().slice(0,10),
      lastActive: lastActive.toISOString().slice(0,10),
      plan: pick(plans),
      spent: +(rnd()*5000).toFixed(2),
    });
  }
  return rows;
}
const DATA = makeData(300);

// ===== State =====
const state = {
  page: 1,
  pageSize: parseInt(localStorage.getItem("dt_pagesize") || "10", 10),
  sort: JSON.parse(localStorage.getItem("dt_sort") || "null"), // persist sort
  query: "",
  visible: new Set(JSON.parse(localStorage.getItem("dt_visible") || "null") || columns.map(c=>c.key)),
};

// ===== Helpers =====
const debounce = (fn,ms)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
const fmtNum = (n)=> new Intl.NumberFormat().format(n);
const escapeHtml = (s)=> String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
const cmp = (a,b,type)=>{
  if(type==="number") return (a-b)||0;
  if(type==="date") return (new Date(a)-new Date(b))||0;
  return String(a).localeCompare(String(b));
};
function getVisibleColumns(){ return columns.filter(c=>state.visible.has(c.key)); }
function applySort(rows){
  if(!state.sort) return rows;
  const col = columns.find(c=>c.key===state.sort.key);
  const dir = state.sort.dir;
  return rows.slice().sort((r1,r2)=> dir*cmp(r1[col.key], r2[col.key], col.type));
}
function applyFilter(rows){
  const q = state.query.trim().toLowerCase();
  if(!q) return rows;
  return rows.filter(r => getVisibleColumns().some(c => String(r[c.key]).toLowerCase().includes(q)));
}
function paginate(rows){
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total/state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page-1)*state.pageSize;
  return { slice: rows.slice(start, start+state.pageSize), total, pages, start, end: Math.min(start+state.pageSize, total) };
}
function highlight(text, q){
  if(!q) return escapeHtml(String(text));
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"ig");
  return escapeHtml(String(text)).replace(re, "<mark>$1</mark>");
}

// ===== Render =====
function renderHead(){
  dom.head.innerHTML = "";
  for(const c of getVisibleColumns()){
    const th = document.createElement("th");
    th.textContent = c.label;
    th.style.width = c.width + "px";
    th.dataset.key = c.key;
    th.classList.add("sortable");
    th.tabIndex = 0; // keyboard focus

    const span = document.createElement("span");
    span.className = "sort";

    const isSorted = state.sort && state.sort.key === c.key;
    if (isSorted) {
      span.textContent = state.sort.dir === 1 ? "▲" : "▼";
      th.setAttribute("aria-sort", state.sort.dir === 1 ? "ascending" : "descending");
      th.title = `Sorted ${state.sort.dir === 1 ? "asc" : "desc"} — click to toggle`;
    } else {
      span.textContent = "↕";
      th.setAttribute("aria-sort", "none");
      th.title = "Click to sort";
    }

    th.appendChild(span);
    dom.head.appendChild(th);
  }
}

function renderBody(){
  const filtered = applyFilter(DATA);
  const sorted = applySort(filtered);
  const { slice, total, pages, start, end } = paginate(sorted);

  // Empty state (no results)
  if (total === 0) {
    const cols = getVisibleColumns().length;
    dom.body.innerHTML = `<tr>
      <td colspan="${cols}" style="text-align:center;padding:24px">
        <div class="subtle">No results found. Try clearing filters or changing the search.</div>
      </td>
    </tr>`;
    dom.status.textContent = "No results";
    dom.pageList.innerHTML = "";
    dom.firstBtn.disabled = dom.prevBtn.disabled = dom.nextBtn.disabled = dom.lastBtn.disabled = true;
    return;
  }

  dom.body.innerHTML = slice.map(row=>{
    return `<tr>${getVisibleColumns().map(c=>{
      const val = row[c.key];
      let disp = val;

      if(c.type==="number") disp = fmtNum(val);
      if(c.key==="status"){
        // Render badge as HTML and DO NOT escape
        disp = `<span class="badge" data-variant="${escapeHtml(val)}">${escapeHtml(val)}</span>`;
      }
      if(c.key==="spent") disp = "$"+fmtNum(val.toFixed(2));

      // Only the status cell should bypass highlight/escaping
      const cell = c.key === "status" ? String(disp) : highlight(disp, state.query);
      return `<td>${cell}</td>`;
    }).join("")}</tr>`;
  }).join("");

  dom.status.textContent = `Showing ${start+1}–${end} of ${fmtNum(total)}`;

  // Pager
  dom.pageList.innerHTML = "";
  const maxBtns = 7;
  const pagesArr = [];
  let from = Math.max(1, state.page - Math.floor(maxBtns/2));
  let to = Math.min(pages, from + maxBtns - 1);
  from = Math.max(1, Math.min(from, Math.max(1, to - maxBtns + 1)));
  for(let p=from;p<=to;p++) pagesArr.push(p);
  for(const p of pagesArr){
    const li = document.createElement("li");
    li.className = "page"+(p===state.page?" active":"");
    li.textContent = p;
    li.tabIndex = 0;
    li.addEventListener("click",()=>{ state.page=p; renderBody(); });
    li.addEventListener("keydown",(e)=>{ if(e.key==="Enter"||e.key===" "){ state.page=p; renderBody(); } });
    dom.pageList.appendChild(li);
  }

  dom.firstBtn.disabled = state.page===1;
  dom.prevBtn.disabled = state.page===1;
  dom.nextBtn.disabled = state.page===pages;
  dom.lastBtn.disabled = state.page===pages;
}

function renderColToggles(){
  dom.colToggles.innerHTML = "";
  for(const c of columns){
    const id = "col-"+c.key;
    const wrap = document.createElement("label");
    wrap.innerHTML = `<input type="checkbox" id="${id}" ${state.visible.has(c.key)?"checked":""}/> ${c.label}`;
    wrap.querySelector("input").addEventListener("change", (e)=>{
      if(e.target.checked) state.visible.add(c.key); else state.visible.delete(c.key);
      if(!state.visible.size) state.visible.add(c.key); // keep at least one
      localStorage.setItem("dt_visible", JSON.stringify(Array.from(state.visible)));
      renderHead(); renderBody();
    });
    dom.colToggles.appendChild(wrap);
  }
}

// ===== Event wiring =====
function init(){
  // Initial UI
  dom.pageSize.value = String(state.pageSize);
  renderColToggles();
  renderHead();
  renderBody();

  // sort by header click
  dom.head.addEventListener("click", (e)=>{
    const th = e.target.closest("th[data-key]");
    if(!th) return;
    const key = th.dataset.key;
    if(!state.sort || state.sort.key!==key) state.sort = { key, dir: 1 };
    else state.sort.dir = state.sort.dir===1 ? -1 : 1;
    localStorage.setItem("dt_sort", JSON.stringify(state.sort));
    state.page = 1;
    renderHead(); renderBody();
  });

  // keyboard sort (Enter/Space on header)
  dom.head.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"||e.key===" "){
      const th = e.target.closest("th[data-key]");
      if(th){ th.click(); e.preventDefault(); }
    }
  });

  // search
  const onSearch = debounce(()=>{
    state.query = dom.search.value.trim();
    state.page = 1;
    renderBody();
  }, 250);
  dom.search.addEventListener("input", onSearch);

  // page size
  dom.pageSize.addEventListener("change", ()=>{
    state.pageSize = parseInt(dom.pageSize.value,10);
    localStorage.setItem("dt_pagesize", String(state.pageSize));
    state.page = 1;
    renderBody();
  });

  // pager buttons
  dom.firstBtn.addEventListener("click", ()=>{ state.page=1; renderBody(); });
  dom.prevBtn.addEventListener("click", ()=>{ state.page=Math.max(1,state.page-1); renderBody(); });
  dom.nextBtn.addEventListener("click", ()=>{ state.page=state.page+1; renderBody(); });
  dom.lastBtn.addEventListener("click", ()=>{
    const total = applyFilter(DATA).length;
    const pages = Math.max(1, Math.ceil(total/state.pageSize));
    state.page=pages; renderBody();
  });

  // export CSV
  dom.exportBtn.addEventListener("click", ()=>{
    const vis = getVisibleColumns();
    const filteredSorted = applySort(applyFilter(DATA));
    const rows = [vis.map(c=>c.label).join(",")].concat(
      filteredSorted.map(r=>vis.map(c=>{
        let v = r[c.key];
        if(c.type==="number") v = String(v);
        // escape CSV cell
        v = String(v).replace(/"/g,'""');
        return `"${v}"`;
      }).join(","))
    );
    const blob = new Blob([rows.join("\n")], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "table_export.csv";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  });

  // reset
  dom.resetBtn.addEventListener("click", ()=>{
    state.page=1; state.query=""; dom.search.value="";
    state.pageSize = 10; dom.pageSize.value="10";
    state.sort = null; localStorage.removeItem("dt_sort");
    state.visible = new Set(columns.map(c=>c.key));
    localStorage.removeItem("dt_visible");
    localStorage.removeItem("dt_pagesize");
    renderColToggles(); renderHead(); renderBody();
  });
}
init();
