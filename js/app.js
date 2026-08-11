/* =========================================================
   CONFIG — edit these once with real brand details
   ========================================================= */
const WA_NUMBER = "2340000000000"; // ← replace with the brand's WhatsApp number
const CURRENCY = "₦";

/* =========================================================
   PLACEHOLDER CATALOGUE
   Every product below is representative only. Replace names,
   prices, fabric types, colours and images with the brand's
   real products taken from their Instagram. Nothing here is a
   factual claim about the business.
   ========================================================= */
const COLORS = {
  Burgundy:"#7a2438", Emerald:"#1f5a44", Champagne:"#d8c199", Onyx:"#26261f",
  Ivory:"#efe7d5", Royal:"#2a3f7a", Blush:"#d9a6a0", Gold:"#c2a04e",
  Wine:"#5a2035", Sage:"#8a9472", Terracotta:"#b05f3c", Silver:"#c4c6c1",
  Teal:"#256b6b", Coral:"#d0674f", Plum:"#5c3350", Midnight:"#1c2540"
};
const c = n => COLORS[n] || "#7a6a4e";

let PRODUCTS = [];
let FABRIC_TYPES=[], PATTERNS=[], COLLECTIONS=[], OCCASIONS=[], ALLCOLORS=[];
function computeFacets(){
  FABRIC_TYPES=[...new Set(PRODUCTS.map(p=>p.type))].filter(Boolean);
  PATTERNS=[...new Set(PRODUCTS.map(p=>p.pattern))].filter(Boolean);
  COLLECTIONS=[...new Set(PRODUCTS.map(p=>p.collection))].filter(Boolean);
  OCCASIONS=[...new Set(PRODUCTS.flatMap(p=>p.occasion))].filter(Boolean);
  ALLCOLORS=[...new Set(PRODUCTS.flatMap(p=>p.colors))].filter(Boolean);
}

const fmt = n => CURRENCY + n.toLocaleString("en-NG");
const swatchHTML = (fabric,color,extra="") =>
  `<div class="swatch swatch--${fabric}" style="--c:${c(color)}"></div><div class="swatch-sheen"></div>${extra}`;

/* =========================================================
   STATE
   ========================================================= */
let cart = [];      // {id, qty, color}
let wish = [];      // [id]
let activeFilters = {type:[],color:[],pattern:[],collection:[],occasion:[]};
let quickMode = null;
let baseFilter = null;

/* =========================================================
   RENDER: category discovery
   ========================================================= */
let CATEGORIES = [];
const CAT_FALLBACK_FAB = ["embroidery","sequin","velvet","silk","brocade","ankara","lace","chiffon"];
const CAT_FALLBACK_COL = ["Champagne","Plum","Royal","Emerald","Gold","Terracotta","Wine","Blush"];
function catMediaHTML(cat,i){
  if(cat && cat.image_url) return `<img class="pmedia" src="${escapeHtml(cat.image_url)}" alt="${escapeHtml(cat.name)}" loading="lazy" />`;
  return swatchHTML(CAT_FALLBACK_FAB[i%CAT_FALLBACK_FAB.length], CAT_FALLBACK_COL[i%CAT_FALLBACK_COL.length]);
}
function catCardHTML(x,i){
  return `
    <a class="cat" href="shop.html?collection=${encodeURIComponent(x.name)}">
      ${catMediaHTML(x,i)}
      <div class="cat-veil"></div>
      <span class="cat-num">${String(i+1).padStart(2,"0")}</span>
      <div class="cat-label"><div class="n">${escapeHtml(x.name)}</div><div class="c">${escapeHtml(x.description||"Shop the edit")}</div></div>
    </a>`;
}
let SETTINGS = {};
async function loadSettings(){
  if(!window.sb){ SETTINGS={}; return; }
  const { data, error } = await window.sb.from("site_settings").select("key,value");
  if(error){ console.error("[Olive] loadSettings:", error.message); SETTINGS={}; return; }
  SETTINGS = {}; (data||[]).forEach(r=>SETTINGS[r.key]=r.value);
}
function applyHero(){
  const fabric=document.querySelector(".hero-fabric"); if(!fabric) return;
  const url=(SETTINGS && SETTINGS.hero_image_url) || (window.OEF_CONFIG && window.OEF_CONFIG.HERO_IMAGE) || "";
  if(url){ fabric.style.backgroundImage=`url("${url}")`; fabric.classList.add("has-photo"); }
}
async function loadCategories(){
  if(!window.sb){ CATEGORIES=[]; return; }
  const { data, error } = await window.sb.from("categories").select("*").order("sort_order",{ascending:true});
  if(error){ console.error("[Olive] loadCategories:", error.message); CATEGORIES=[]; return; }
  CATEGORIES = data || [];
}
function renderCats(){
  const el=document.getElementById("catGrid"); if(!el) return;
  el.innerHTML = CATEGORIES.map((x,i)=>catCardHTML(x,i)).join("");
}

/* =========================================================
   RENDER: exclusive edit (asymmetric)
   ========================================================= */
function renderEdit(){
  const el=document.getElementById("editGrid"); if(!el) return;
  if(!PRODUCTS.length){ el.innerHTML=""; return; }
  const order=[...PRODUCTS].sort((a,b)=>((b.best?1:0)-(a.best?1:0))||((b.sold||0)-(a.sold||0)));
  const pick=[0,1,2,3].map(i=>order[i%order.length]);
  el.innerHTML = `
    <div class="edit-col">
      <div class="edit-card wide" onclick="openProduct('${pick[0].id}')">
        ${mediaHTML(pick[0])}
        <div class="edit-info"><div class="name">${pick[0].name}</div>
          <div class="meta"><span class="price">${fmt(effPrice(pick[0]))}</span><span class="dot"></span><span>${pick[0].colors.length} colours</span><span class="dot"></span><span>Available</span></div>
          <span class="edit-view">View Fabric <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
        </div>
      </div>
      <div class="edit-card wide" onclick="openProduct('${pick[1].id}')">
        ${mediaHTML(pick[1])}
        <div class="edit-info"><div class="name">${pick[1].name}</div>
          <div class="meta"><span class="price">${fmt(effPrice(pick[1]))}</span><span class="dot"></span><span>${pick[1].colors.length} colours</span></div>
          <span class="edit-view">View Fabric <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
        </div>
      </div>
    </div>
    <div class="edit-col">
      <div class="edit-card tall" onclick="openProduct('${pick[2].id}')">
        ${mediaHTML(pick[2])}
        <div class="edit-info"><div class="name">${pick[2].name}</div>
          <div class="meta"><span class="price">${fmt(effPrice(pick[2]))}</span><span class="dot"></span><span>Bridal edit</span></div>
          <span class="edit-view">View Fabric <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
        </div>
      </div>
      <div class="edit-card wide" onclick="openProduct('${pick[3].id}')">
        ${mediaHTML(pick[3])}
        <div class="edit-info"><div class="name">${pick[3].name}</div>
          <div class="meta"><span class="price">${fmt(effPrice(pick[3]))}</span></div>
          <span class="edit-view">View Fabric <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
        </div>
      </div>
    </div>`;
}

/* =========================================================
   RENDER: product card
   ========================================================= */
function stockLabel(s){
  if(s==="out") return `<div class="stock out">Sold out</div>`;
  if(s==="low") return `<div class="stock low">Low stock — order soon</div>`;
  return `<div class="stock">In stock</div>`;
}
function cardHTML(p){
  const tags = [];
  if(p.new) tags.push(`<span class="tag new">New</span>`);
  if(p.best) tags.push(`<span class="tag best">Best Seller</span>`);
  if(p.stock==="low") tags.push(`<span class="tag low">Low Stock</span>`);
  if(p.stock==="out") tags.push(`<span class="tag out">Out of Stock</span>`);
  const dots = p.colors.map(cl=>`<span class="swatch-dot" style="background:${c(cl)}" title="${cl}"></span>`).join("");
  const wished = wish.includes(p.id) ? "on" : "";
  const addBtn = p.stock==="out"
    ? `<div class="qbtn" style="opacity:.5;cursor:not-allowed">Sold Out</div>`
    : `<div class="qbtn add" onclick="event.stopPropagation();addToCart('${p.id}')">Add to Bag</div>`;
  return `<article class="card" onclick="openProduct('${p.id}')">
    <div class="card-media">
      ${mediaHTML(p)}
      <div class="card-tags">${tags.join("")}</div>
      <button class="card-wish ${wished}" onclick="event.stopPropagation();toggleWish('${p.id}',this)" aria-label="Save">
        <svg viewBox="0 0 24 24"><path d="M12 21C-4 11 5-2 12 6 19-2 28 11 12 21z"/></svg></button>
      <div class="card-quick">
        <div class="qbtn" onclick="event.stopPropagation();quickView('${p.id}')">Quick View</div>
        ${addBtn}
      </div>
    </div>
    <div class="card-body">
      <div class="card-name">${p.name}</div>
      <div class="card-type">${p.type} · ${p.pattern}</div>
      <div class="card-foot">
        <div class="card-price">${priceHTML(p)} <small>${p.unit}</small></div>
        <div class="card-colors">${dots}</div>
      </div>
      ${stockLabel(p.stock)}
    </div>
  </article>`;
}
function renderHomeGrid(){
  const el=document.getElementById("homeGrid"); if(!el) return;
  const best=PRODUCTS.filter(p=>p.best);
  const rest=PRODUCTS.filter(p=>!p.best);
  el.innerHTML=[...best,...rest].slice(0,8).map(cardHTML).join("");
}
function renderBest(){
  document.getElementById("bestCarousel").innerHTML =
    PRODUCTS.filter(p=>p.best).map(cardHTML).join("") + PRODUCTS.filter(p=>p.sold>250&&!p.best).map(cardHTML).join("");
}

/* =========================================================
   RENDER: style inspiration
   ========================================================= */
const INSP = [
  {n:"Bridal",c:"White & champagne",fabric:"embroidery",col:"Champagne"},
  {n:"Traditional",c:"Aso-ebi ready",fabric:"brocade",col:"Wine"},
  {n:"Party",c:"Shine after dark",fabric:"sequin",col:"Plum"},
  {n:"Corporate",c:"Sharp & fluid",fabric:"silk",col:"Midnight"},
  {n:"Casual",c:"Everyday ease",fabric:"ankara",col:"Teal"},
  {n:"Luxury Occasion",c:"Make an entrance",fabric:"velvet",col:"Royal"}
];
function renderInsp(){
  document.getElementById("inspGrid").innerHTML = INSP.map(x=>`
    <a class="insp" href="shop.html?occasion=${encodeURIComponent(x.n.split(' ')[0])}">
      ${swatchHTML(x.fabric,x.col)}
      <div class="insp-veil"></div>
      <div class="insp-label"><div class="n">${x.n}</div><div class="c">${x.c}</div></div>
    </a>`).join("");
}

/* =========================================================
   RENDER: reviews + instagram
   ========================================================= */
const REVIEWS = [
  {t:"The lace I ordered was even more beautiful in person. My tailor was impressed and my aso-ebi looked stunning.",n:"Adaeze O.",r:5},
  {t:"Fast delivery to Abuja and the colour was exactly as shown. This is now my go-to for occasion fabrics.",n:"Fatima B.",r:5},
  {t:"They actually helped me pick the right fabric over WhatsApp. Proper personal service — rare these days.",n:"Chioma N.",r:5}
];
function renderReviews(){
  document.getElementById("revGrid").innerHTML = REVIEWS.map(v=>`
    <div class="rev">
      <div class="rev-stars">${"★".repeat(v.r)}${"☆".repeat(5-v.r)}</div>
      <div class="rev-text">"${v.t}"</div>
      <div class="rev-by">
        <div class="rev-av">${v.n[0]}</div>
        <div><div class="rev-name">${v.n}</div>
          <div class="rev-verified"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> Verified purchase</div>
        </div>
      </div>
    </div>`).join("");
}
function renderIG(){
  const el=document.getElementById("igGrid"); if(!el||!PRODUCTS.length) return;
  const set = Array.from({length:Math.min(12,PRODUCTS.length)},(_,i)=>PRODUCTS[i]);
  el.innerHTML = set.map(p=>`
    <div class="ig" onclick="openProduct('${p.id}')">
      ${mediaHTML(p)}
      <div class="ig-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></div>
    </div>`).join("");
}

/* =========================================================
   FILTERS
   ========================================================= */
function renderFilterGroups(){
  const group = (title,items,key,withDot=false)=>`
    <div class="fgroup"><h4>${title}</h4>
      ${items.map(it=>{
        const ct = key==='color'
          ? PRODUCTS.filter(p=>p.colors.includes(it)).length
          : key==='occasion'
            ? PRODUCTS.filter(p=>p.occasion.includes(it)).length
            : PRODUCTS.filter(p=>p[key]===it).length;
        return `<label class="fopt">
          <input type="checkbox" value="${it}" onchange="onFilter('${key}','${it}',this.checked)">
          ${withDot?`<span class="swatch-dot" style="background:${c(it)}"></span>`:""}
          ${it}<span class="ct">${ct}</span></label>`;
      }).join("")}
    </div>`;
  document.getElementById("filterGroups").innerHTML =
    group("Fabric Type",FABRIC_TYPES,"type") +
    group("Colour",ALLCOLORS,"color",true) +
    group("Pattern",PATTERNS,"pattern") +
    group("Collection",COLLECTIONS,"collection") +
    group("Occasion",OCCASIONS,"occasion");
}
function onFilter(key,val,on){
  if(on) activeFilters[key].push(val);
  else activeFilters[key] = activeFilters[key].filter(v=>v!==val);
  applyFilters();
}
function clearFilters(){
  activeFilters={type:[],color:[],pattern:[],collection:[],occasion:[]};
  document.querySelectorAll("#filterGroups input").forEach(i=>i.checked=false);
  document.getElementById("searchInput").value="";
  applyFilters();
}
function filterType(t){
  clearFilters();
  activeFilters.type=[t];
  document.querySelectorAll("#filterGroups input").forEach(i=>{if(i.value===t)i.checked=true});
  applyFilters();
}
function filterOccasion(o){
  clearFilters();
  const match = OCCASIONS.find(x=>x.startsWith(o))||o;
  activeFilters.occasion=[match];
  document.querySelectorAll("#filterGroups input").forEach(i=>{if(i.value===match)i.checked=true});
  applyFilters();
}
function applyFilters(){
  const q = (document.getElementById("searchInput").value||"").toLowerCase().trim();
  let res = PRODUCTS.filter(p=>{
    if(baseFilter==='new' && !p.new) return false;
    if(baseFilter==='best' && !p.best) return false;
    if(activeFilters.type.length && !activeFilters.type.includes(p.type)) return false;
    if(activeFilters.pattern.length && !activeFilters.pattern.includes(p.pattern)) return false;
    if(activeFilters.collection.length && !activeFilters.collection.includes(p.collection)) return false;
    if(activeFilters.color.length && !p.colors.some(cl=>activeFilters.color.includes(cl))) return false;
    if(activeFilters.occasion.length && !p.occasion.some(o=>activeFilters.occasion.includes(o))) return false;
    if(q){
      const hay = (p.name+" "+p.type+" "+p.pattern+" "+p.collection+" "+p.colors.join(" ")+" "+p.occasion.join(" ")).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const sort = document.getElementById("sortSel").value;
  if(sort==="plow") res.sort((a,b)=>effPrice(a)-effPrice(b));
  else if(sort==="phigh") res.sort((a,b)=>effPrice(b)-effPrice(a));
  else if(sort==="name") res.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort==="new") res.sort((a,b)=>(b.new?1:0)-(a.new?1:0));
  else res.sort((a,b)=>b.sold-a.sold);

  document.getElementById("resCount").textContent = res.length;
  const grid = document.getElementById("shopGrid");
  grid.innerHTML = res.length
    ? res.map(cardHTML).join("")
    : `<div class="no-results"><h3>No fabrics match those filters</h3><p>Try removing a filter or clearing your search.</p></div>`;
  observeReveals();
}

/* =========================================================
   QUICK VIEW + PRODUCT DETAIL (shared modal)
   ========================================================= */
function quickView(id){ openProduct(id,true); }
function openProduct(id, quick=false){
  const p = PRODUCTS.find(x=>x.id===id); if(!p) return;
  let curColor = p.colors[0];
  const attrs = [
    ["Fabric Type",p.type],["Pattern",p.pattern],
    ["Collection",p.collection],["Sold By",p.unit.replace("per ","Per ")]
  ];
  const stockTxt = p.stock==="out"?`<span style="color:#999">Sold out</span>`
    :p.stock==="low"?`<span style="color:#a2622a">Low stock — order soon</span>`
    :`<span style="color:var(--olive)">In stock</span>`;
  const waMsg = encodeURIComponent(`Hello Olive Exclusive Fabrics, I'm interested in ${p.name}. Please can you send me more details?`);

  document.getElementById("modalCard").innerHTML = `
    <button class="modal-close" onclick="closeModal()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="pd">
      <div class="pd-media">
        <div class="pd-main" id="pdMain" onclick="zoomFabric(this)">
          ${mediaHTML(p,curColor)}
          <div class="pd-zoomhint"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg> Tap to feel the weave — zoom in</div>
        </div>
        <div class="pd-thumbs" id="pdThumbs">
          ${p.colors.map((cl,i)=>`<div class="pd-thumb ${i===0?'active':''}" onclick="pdSetColor('${p.id}','${cl}',this)">${swatchHTML(p.fabric,cl)}</div>`).join("")}
        </div>
      </div>
      <div class="pd-info">
        <div class="pd-type">${p.collection} Collection</div>
        <h2>${p.name}</h2>
        <div class="pd-price">${priceHTML(p)} <small>${p.unit}</small></div>
        <div class="pd-stock">${stockTxt}</div>
        <div class="pd-desc">A ${p.type.toLowerCase()} with a ${p.pattern.toLowerCase()} character, chosen for ${p.occasion.join(", ").toLowerCase()} looks. [Placeholder description — replace with the real fabric details, weight, width and composition supplied by the brand.]</div>

        <div class="pd-section-t">Colour — <span id="pdColorName">${curColor}</span></div>
        <div class="pd-colors" id="pdColors">
          ${p.colors.map((cl,i)=>`<button class="pd-color ${i===0?'active':''}" style="background:${c(cl)}" title="${cl}" onclick="pdSetColor('${p.id}','${cl}',this)"></button>`).join("")}
        </div>

        <div class="pd-attrs">
          ${attrs.map(a=>`<div class="pd-attr"><div class="k">${a[0]}</div><div class="v">${a[1]}</div></div>`).join("")}
        </div>

        <div class="pd-qtyrow">
          <div class="pd-qty">
            <button onclick="pdQty(-1)">−</button><span id="pdQ">1</span><button onclick="pdQty(1)">+</button>
          </div>
          <span class="pd-qtylabel">${p.unit}</span>
        </div>

        <div class="pd-actions">
          <button class="btn btn-outline" onclick="pdAdd('${p.id}')" ${p.stock==="out"?"disabled style='opacity:.5'":""}>Add to Bag</button>
          <button class="btn btn-dark" onclick="pdBuy('${p.id}')" ${p.stock==="out"?"disabled style='opacity:.5'":""}>Buy Now</button>
        </div>
        <a class="pd-wa" href="https://wa.me/${WA_NUMBER}?text=${waMsg}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z"/></svg>
          Ask About This Fabric
        </a>
        <div class="pd-mini">
          <div><svg viewBox="0 0 24 24"><path d="M3 7h13v8H3z"/><circle cx="7" cy="17" r="2"/><circle cx="15" cy="17" r="2"/></svg> Nationwide delivery</div>
          <div><svg viewBox="0 0 24 24"><path d="M12 21C-4 11 5-2 12 6 19-2 28 11 12 21z"/></svg> <button style="border-bottom:1px solid var(--line)" onclick="toggleWish('${p.id}');toast('Saved to wishlist')">Save for later</button></div>
        </div>
      </div>
    </div>`;
  window._pdQty = 1;
  document.getElementById("modal").classList.add("show");
  document.getElementById("overlay").classList.add("show");
  document.body.classList.add("no-scroll");
}
function pdSetColor(id,cl,el){
  const p=PRODUCTS.find(x=>x.id===id);
  {const _sw=document.querySelector("#pdMain .swatch"); if(_sw) _sw.style.setProperty("--c",c(cl));}
  document.getElementById("pdColorName").textContent=cl;
  document.querySelectorAll("#pdColors .pd-color").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll("#pdThumbs .pd-thumb").forEach(b=>b.classList.remove("active"));
  if(el.classList.contains("pd-color")) el.classList.add("active");
  // sync thumb + color button
  document.querySelectorAll("#pdColors .pd-color").forEach(b=>{if(b.title===cl)b.classList.add("active")});
  document.querySelectorAll("#pdThumbs .pd-thumb").forEach((b,i)=>{if(p.colors[i]===cl)b.classList.add("active")});
  window._pdColor = cl;
}
function pdQty(d){
  window._pdQty = Math.max(1,(window._pdQty||1)+d);
  document.getElementById("pdQ").textContent = window._pdQty;
}
function zoomFabric(el){
  const sw = el.querySelector(".swatch");
  const cur = sw.style.transform.includes("scale");
  sw.style.transform = cur ? "" : "scale(2.4)";
  el.style.cursor = cur ? "zoom-in" : "zoom-out";
}
function pdAdd(id){ addToCart(id, window._pdQty||1, window._pdColor); closeModal(); }
function pdBuy(id){ addToCart(id, window._pdQty||1, window._pdColor, true); closeModal(); goCheckout(); }
function closeModal(){
  document.getElementById("modal").classList.remove("show");
  if(!document.getElementById("cartDrawer").classList.contains("show"))
    document.getElementById("overlay").classList.remove("show");
  document.body.classList.remove("no-scroll");
}

/* =========================================================
   CART + WISHLIST
   ========================================================= */
function addToCart(id, qty=1, color=null, silent=false){
  const p=PRODUCTS.find(x=>x.id===id); if(!p||p.stock==="out") return;
  color = color || p.colors[0];
  const line = cart.find(l=>l.id===id && l.color===color);
  if(line) line.qty += qty; else cart.push({id,qty,color});
  updateCart();
  if(!silent){ toast(`${p.name} added to bag`); }
}
function updateCart(){
  saveCart();
  const count = cart.reduce((s,l)=>s+l.qty,0);
  ["cartBadge","mCartBadge"].forEach(bid=>{
    const b=document.getElementById(bid); b.textContent=count; b.classList.toggle("show",count>0);
  });
  const body=document.getElementById("cartBody"), foot=document.getElementById("cartFoot");
  if(!cart.length){
    body.innerHTML=`<div class="cart-empty">
      <svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
      <h3 style="font-family:var(--serif);font-size:24px;color:var(--olive-ink);margin-bottom:8px">Your bag is empty</h3>
      <p style="margin-bottom:20px">Discover fabrics worth waiting for.</p>
      <button class="btn btn-dark" style="justify-content:center" onclick="location.href='shop.html'">Shop Fabrics</button></div>`;
    foot.innerHTML="";
    renderCheckout(); return;
  }
  body.innerHTML = cart.map((l,idx)=>{
    const p=PRODUCTS.find(x=>x.id===l.id);
    return `<div class="cart-item">
      <div class="cart-thumb">${mediaHTML(p,l.color)}</div>
      <div class="cart-info">
        <div class="n">${p.name}</div>
        <div class="t">${p.type} · ${l.color}</div>
        <div class="cart-qty"><button onclick="chgQty(${idx},-1)">−</button><span>${l.qty}</span><button onclick="chgQty(${idx},1)">+</button></div>
      </div>
      <div class="cart-right">
        <div class="cart-price">${fmt(effPrice(p)*l.qty)}</div>
        <button class="cart-remove" onclick="removeLine(${idx})">Remove</button>
      </div>
    </div>`;
  }).join("");
  const sub = cart.reduce((s,l)=>s+effPrice(PRODUCTS.find(x=>x.id===l.id))*l.qty,0);
  foot.innerHTML = `
    <div class="cart-line"><span>Subtotal</span><span>${fmt(sub)}</span></div>
    <div class="cart-line"><span>Delivery</span><span>Calculated at checkout</span></div>
    <div class="cart-total"><span>Total</span><span>${fmt(sub)}</span></div>
    <button class="btn btn-dark" onclick="goCheckout()">Proceed to Checkout
      <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
    <p class="cart-note">Secure checkout · Paystack · Flutterwave · Bank transfer</p>`;
  renderCheckout();
}
function chgQty(idx,d){ cart[idx].qty=Math.max(1,cart[idx].qty+d); updateCart(); }
function removeLine(idx){ cart.splice(idx,1); updateCart(); }
function renderCheckout(){
  const box=document.getElementById("checkoutItems");
  if(!box) return;
  if(!cart.length){ box.innerHTML=`<p style="color:var(--ink-55);font-size:14px">Your bag is empty.</p>`;
    document.getElementById("coSub").textContent=fmt(0);
    document.getElementById("coTotal").textContent=fmt(0); return; }
  box.innerHTML = cart.map(l=>{
    const p=PRODUCTS.find(x=>x.id===l.id);
    return `<div class="cart-line" style="align-items:center"><span>${p.name} <span style="color:var(--ink-55)">×${l.qty} · ${l.color}</span></span><span>${fmt(effPrice(p)*l.qty)}</span></div>`;
  }).join("");
  const sub=cart.reduce((s,l)=>s+effPrice(PRODUCTS.find(x=>x.id===l.id))*l.qty,0);
  document.getElementById("coSub").textContent=fmt(sub);
  document.getElementById("coTotal").textContent=fmt(sub);
}
function toggleWish(id, el){
  if(wish.includes(id)) wish=wish.filter(x=>x!==id);
  else wish.push(id);
  saveWish();
  const on = wish.includes(id);
  if(el) el.classList.toggle("on",on);
  const cnt=wish.length;
  ["wishBadge","mWishBadge"].forEach(bid=>{
    const b=document.getElementById(bid); b.textContent=cnt; b.classList.toggle("show",cnt>0);
  });
  renderWish();
}
function renderWish(){
  const g=document.getElementById("wishGrid"); if(!g) return;
  if(!wish.length){
    g.innerHTML=`<div class="no-results" style="grid-column:1/-1"><h3>No saved fabrics yet</h3>
      <p>Tap the heart on any fabric to keep it here.</p>
      <button class="btn btn-dark" style="justify-content:center;margin-top:20px" onclick="location.href='shop.html'">Browse Fabrics</button></div>`;
    return;
  }
  g.innerHTML = wish.map(id=>cardHTML(PRODUCTS.find(x=>x.id===id))).join("");
}

function openCart(){
  document.getElementById("cartDrawer").classList.add("show");
  document.getElementById("overlay").classList.add("show");
  document.body.classList.add("no-scroll");
}
function closeCart(){
  document.getElementById("cartDrawer").classList.remove("show");
  if(!document.getElementById("modal").classList.contains("show"))
    document.getElementById("overlay").classList.remove("show");
  document.body.classList.remove("no-scroll");
}
function closeAll(){ closeCart(); closeModal(); }

/* ---- auth-gated checkout navigation ---- */
async function goCheckout(){
  if(!window.sb){ location.href='checkout.html'; return; }
  try{
    const { data:{ session } } = await window.sb.auth.getSession();
    if(session){ location.href='checkout.html'; }
    else{ location.href='account/sign-in.html?next=checkout.html'; }
  }catch(e){ location.href='checkout.html'; }
}

/* =========================================================
   WHATSAPP
   ========================================================= */
function waGeneral(){
  const msg=encodeURIComponent("Hello Olive Exclusive Fabrics, I'd like to know more about your fabrics.");
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`,"_blank");
}

/* =========================================================
   FAQ
   ========================================================= */
const FAQ=[
  ["How do I place an order?","Browse the shop, add fabrics to your bag and check out — or tap “Ask About This Fabric” on any product to order directly via WhatsApp. [Confirm exact process with the brand.]"],
  ["What fabrics do you offer?","A curated range including lace, sequins, velvet, silk, brocade, chiffon, organza, ankara and embroidered fabrics. [Final catalogue to match the brand's Instagram.]"],
  ["How is fabric sold?","By the yard or in fixed cuts depending on the fabric — each product shows its unit of measurement. [Confirm units and minimums with the brand.]"],
  ["Do you deliver nationwide?","[Placeholder] Yes — we deliver across Nigeria, with faster options within Lagos. Final zones and timelines to be confirmed."],
  ["How long does delivery take?","[Placeholder] Typically 1–2 working days in Lagos and 2–5 working days to other states after dispatch."],
  ["Can I request more pictures?","Yes. Message us on WhatsApp and we'll gladly send additional photos or a short video of any fabric before you buy."],
  ["Can I see the fabric before purchasing?","[Placeholder] Self-pickup viewing may be available in Lagos by appointment. Ask us on WhatsApp to arrange."],
  ["What payment methods do you accept?","Paystack, Flutterwave and bank transfer. [Payment activates once the brand supplies live credentials.]"],
  ["Do you offer fabric recommendations?","Absolutely — tell us your occasion, colour and budget and we'll suggest the right fabrics for your look."],
  ["What is your return or exchange policy?","[Placeholder — to be provided by the brand.] Please confirm the returns/exchange terms before publishing."]
];
function renderFAQ(){
  document.getElementById("faqList").innerHTML = FAQ.map((f,i)=>`
    <div class="faq-item">
      <button class="faq-q" onclick="toggleFaq(${i})"><span>${f[0]}</span><span class="ic"></span></button>
      <div class="faq-a" id="faq-${i}"><p>${f[1]}</p></div>
    </div>`).join("");
}
function toggleFaq(i){
  const item=document.querySelectorAll(".faq-item")[i];
  const a=document.getElementById("faq-"+i);
  const open=item.classList.contains("open");
  item.classList.toggle("open",!open);
  a.style.maxHeight = open ? null : a.scrollHeight+"px";
}

/* =========================================================
   CAROUSEL SCROLL
   ========================================================= */
function scrollCar(dir){
  const car=document.getElementById("bestCarousel");
  car.scrollBy({left:dir*(car.querySelector(".card").offsetWidth+14),behavior:"smooth"});
}

/* =========================================================
   TOAST
   ========================================================= */
let toastT;
function toast(msg){
  const t=document.getElementById("toast");
  document.getElementById("toastMsg").textContent=msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove("show"),2600);
}

/* =========================================================
   SCROLL REVEAL + HEADER
   ========================================================= */
let io;
function observeReveals(){
  if(!io){
    io=new IntersectionObserver((es)=>es.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}
    }),{threshold:.12,rootMargin:"0px 0px -8% 0px"});
  }
  document.querySelectorAll(".reveal:not(.in)").forEach(el=>io.observe(el));
}
window.addEventListener("scroll",()=>{
  document.getElementById("header").classList.toggle("scrolled",window.scrollY>20);
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeAll(); });

/* =========================================================
   PERSISTENCE  (cart + wishlist survive page navigation)
   ========================================================= */
function saveCart(){ try{ localStorage.setItem("oef_cart", JSON.stringify(cart)); }catch(e){} }
function saveWish(){ try{ localStorage.setItem("oef_wish", JSON.stringify(wish)); }catch(e){} }
function loadState(){
  try{ cart = JSON.parse(localStorage.getItem("oef_cart")) || []; }catch(e){ cart=[]; }
  try{ wish = JSON.parse(localStorage.getItem("oef_wish")) || []; }catch(e){ wish=[]; }
}

/* =========================================================
   SHARED CHROME  (header / menus / drawers / footer)
   Injected on every page so it is edited in ONE place.
   ========================================================= */
const NAVLINKS = [
  ["home","index.html","Home"],
  ["shop","shop.html","Shop"],
  ["new","new-arrivals.html","New Arrivals"],
  ["collections","collections.html","Collections"],
  ["best","best-sellers.html","Best Sellers"],
  ["about","about.html","About"],
  ["contact","contact.html","Contact"]
];
function navActive(key, current){ return key===current ? " active" : ""; }

function buildHeader(page){
  const links = NAVLINKS.map(l=>`<a href="${l[1]}" class="${navActive(l[0],page)}">${l[2]}</a>`).join("");
  const mlinks = NAVLINKS.map(l=>`<a href="${l[1]}">${l[2]}</a>`).join("")
    + `<a href="delivery.html">Delivery</a><a href="faq.html">FAQ</a>`;
  return `
  <div class="announce">
    <span>Complimentary styling advice on every order &nbsp;·&nbsp; <b>Nationwide delivery across Nigeria</b> &nbsp;·&nbsp; New arrivals every week</span>
  </div>
  <header class="header" id="header">
    <div class="wrap nav">
      <a class="brand" href="index.html" style="text-decoration:none">
        <span class="b1">Olive Exclusive</span><span class="b2">Fabrics</span>
      </a>
      <nav class="nav-links" id="navLinks">${links}</nav>
      <div class="nav-tools">
        <button class="tool d-hide" onclick="focusSearch()" aria-label="Search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></button>
        <a class="tool" href="wishlist.html" aria-label="Wishlist">
          <svg viewBox="0 0 24 24"><path d="M12 21C-4 11 5-2 12 6 19-2 28 11 12 21z"/></svg>
          <span class="badge" id="wishBadge">0</span></a>
        <a class="tool d-hide" id="accountTool" href="account/sign-in.html" aria-label="Account">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg></a>
        <button class="tool" onclick="openCart()" aria-label="Shopping bag">
          <svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
          <span class="badge" id="cartBadge">0</span></button>
        <button class="hamburger" onclick="toggleMenu(true)" aria-label="Menu">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
      </div>
    </div>
  </header>
  <div class="mmenu" id="mmenu">
    <div class="mmenu-head">
      <div class="brand"><span class="b1">Olive Exclusive</span><span class="b2">Fabrics</span></div>
      <button class="drawer-close" onclick="toggleMenu(false)"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    ${mlinks}
    <a href="contact.html">Contact</a>
    <div class="mmenu-account" id="mmenuAccount">
      <a href="account/sign-in.html">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
        Sign in / Account
      </a>
    </div>
  </div>`;
}

function buildOverlays(page){
  const mv = (["shop","new","collections","best"].includes(page)) ? "shop" : page;
  return `
  <div class="overlay" id="overlay" onclick="closeAll()"></div>
  <aside class="drawer" id="cartDrawer">
    <div class="drawer-head"><h3>Shopping Bag</h3>
      <button class="drawer-close" onclick="closeCart()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="drawer-body" id="cartBody"></div>
    <div class="drawer-foot" id="cartFoot"></div>
  </aside>
  <div class="modal" id="modal"><div class="modal-bg" onclick="closeModal()"></div><div class="modal-card" id="modalCard"></div></div>
  <button class="wa-float" onclick="waGeneral()" aria-label="Chat on WhatsApp">
    <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a12 12 0 0 1-5.5-4.8c-.4-.7-.8-1.5-.8-2.3 0-.8.4-1.2.6-1.4.2-.2.4-.3.6-.3h.4c.2 0 .3 0 .5.4l.6 1.5c.1.1.1.3 0 .5l-.3.4-.3.3c-.1.1-.2.3-.1.5.3.6.8 1.2 1.3 1.6.6.5 1.1.7 1.3.8.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.5.7c.2.1.4.2.4.3.1.1.1.6-.1 1.1z"/></svg>
  </button>
  <nav class="mobnav" id="mobnav" style="grid-template-columns:repeat(6,1fr)">
    <a href="index.html" data-mv="home" class="${mv==='home'?'active':''}"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg><span>Home</span></a>
    <a href="shop.html" data-mv="shop" class="${mv==='shop'?'active':''}"><svg viewBox="0 0 24 24"><path d="M4 7h16l-1 13H5zM8 7a4 4 0 0 1 8 0"/></svg><span>Shop</span></a>
    <a href="shop.html?focus=search" data-mv="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><span>Search</span></a>
    <a href="account/sign-in.html" id="mobAccountLink" class="mobnav-account"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg><span>Account</span></a>
    <a href="wishlist.html" data-mv="wishlist" class="${mv==='wishlist'?'active':''}"><svg viewBox="0 0 24 24"><path d="M12 21C-4 11 5-2 12 6 19-2 28 11 12 21z"/></svg><span>Saved</span><span class="m-badge" id="mWishBadge">0</span></a>
    <button onclick="openCart()"><svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><span>Bag</span><span class="m-badge" id="mCartBadge">0</span></button>
  </nav>
  <footer class="footer">
    <div class="wrap">
      <div class="foot-top">
        <div class="foot-brand">
          <div class="b1">Olive Exclusive</div><div class="b2">Fabrics</div>
          <p>A curated online showroom of premium fabrics for fashion, occasion wear, tailoring and unforgettable moments.</p>
          <div class="foot-social">
            <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>
            <a onclick="waGeneral()" aria-label="WhatsApp" style="cursor:pointer"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></a>
            <a href="#" aria-label="Email"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></a>
          </div>
        </div>
        <div class="foot-col"><h4>Shop</h4>
          <a href="shop.html">All Fabrics</a><a href="new-arrivals.html">New Arrivals</a>
          <a href="collections.html">Collections</a><a href="best-sellers.html">Best Sellers</a>
          <a href="wishlist.html">Wishlist</a></div>
        <div class="foot-col"><h4>Help</h4>
          <a href="delivery.html">Delivery</a><a href="faq.html">FAQ</a>
          <a href="contact.html">Contact</a><a onclick="waGeneral()" style="cursor:pointer">WhatsApp Us</a></div>
        <div class="foot-col"><h4>Brand</h4>
          <a href="about.html">Our Story</a><a href="about.html">Our Vision</a>
          <a href="#" target="_blank" rel="noopener">Instagram</a></div>
      </div>
      <div class="foot-bot">
        <span>© 2026 Olive Exclusive Fabrics. All rights reserved.</span>
        <span>Lagos, Nigeria · Made for fabric lovers</span>
      </div>
    </div>
  </footer>
  <div class="toast" id="toast"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg><span id="toastMsg"></span></div>`;
}

/* =========================================================
   NAV HELPERS
   ========================================================= */
function toggleMenu(open){
  document.getElementById("mmenu").classList.toggle("show",open);
  document.body.classList.toggle("no-scroll",open);
}
function toggleFilters(){ document.getElementById("filters").classList.toggle("show"); }
function focusSearch(){
  const s=document.getElementById("searchInput");
  if(s){ s.scrollIntoView({block:"center",behavior:"smooth"}); setTimeout(()=>s.focus(),300); }
  else { location.href="shop.html?focus=search"; }
}

/* =========================================================
   COLLECTIONS PAGE
   ========================================================= */
function renderCollections(){
  const el=document.getElementById("collectionGrid"); if(!el) return;
  el.innerHTML = CATEGORIES.map((x,i)=>catCardHTML(x,i)).join("");
}

/* =========================================================
   SHOP QUERY-PARAM FILTERS  (?type= ?collection= ?occasion= ?focus=)
   ========================================================= */
function applyUrlFilters(){
  const q=new URLSearchParams(location.search);
  const set=(key,val)=>{
    if(!val) return;
    activeFilters[key]=[val];
    document.querySelectorAll("#filterGroups input").forEach(i=>{ if(i.value===val) i.checked=true; });
  };
  set("type",q.get("type"));
  set("collection",q.get("collection"));
  if(q.get("occasion")){
    const match=OCCASIONS.find(x=>x.startsWith(q.get("occasion")))||q.get("occasion");
    set("occasion",match);
  }
  if(q.get("focus")==="search") setTimeout(focusSearch,120);
}

/* =========================================================
   PER-PAGE INIT
   ========================================================= */
function initShop(mode){
  baseFilter = (mode==="new"||mode==="best") ? mode : null;
  renderFilterGroups();
  const sortSel=document.getElementById("sortSel");
  if(mode==="new" && sortSel) sortSel.value="new";
  applyUrlFilters();
  applyFilters();
}

function renderPage(page){
  if(page==="home"){
    renderCats(); renderHomeGrid(); renderReviews();
  } else if(["shop","new","best"].includes(page) && document.getElementById("shopGrid")){
    initShop(page);
  } else if(page==="collections"){
    renderCollections(); renderEdit();
  }
  if(page==="wishlist") renderWish();
  observeReveals();
}

document.addEventListener("DOMContentLoaded", async ()=>{
  const page = document.body.dataset.page || "home";
  // inject shared chrome
  document.body.insertAdjacentHTML("afterbegin", buildHeader(page));
  document.body.insertAdjacentHTML("beforeend", buildOverlays(page));

  loadState();
  if(page==="faq") renderFAQ();          // static content, no DB needed
  refreshAccountLink();                  // session-aware account icon
  loadAnnouncement();                    // Announcement TV (admin-controlled)
  wireNewsletter();                      // subscribe form -> Supabase

  if(!window.OEF_CONFIGURED){
    showSetupNotice();                   // dev-only: not wired to Supabase yet
    updateCart(); observeReveals();
    return;
  }

  await Promise.all([loadProducts(), loadCategories(), loadSettings()]);   // real data from Supabase
  applyHero();
  renderPage(page);
  updateCart();                          // badges + drawer + checkout summary
});

window.addEventListener("scroll",()=>{
  const h=document.getElementById("header");
  if(h) h.classList.toggle("scrolled",window.scrollY>20);
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeAll(); });


/* =========================================================
   SUPABASE DATA LAYER  (storefront)
   ========================================================= */
function escapeHtml(x){ return (x==null?"":String(x)).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }

function mapProduct(r){
  const imgs = (r.product_images||[])
    .slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
    .map(i=>i.url).filter(Boolean);
  return {
    id:r.id, name:r.name, type:r.fabric_type||"",
    fabric:(r.fabric_type||"silk").toLowerCase(),
    pattern:r.pattern||"", collection:(r.categories&&r.categories.name)||"",
    occasion:r.occasions||[], price:Number(r.price)||0,
    sale_price:(r.sale_price!=null?Number(r.sale_price):null), on_sale:!!r.on_sale,
    unit:r.unit||"per yard",
    colors:(Array.isArray(r.colors)&&r.colors.length?r.colors:["Ivory"]),
    stock:r.in_stock?"in":"out", new:!!r.is_new, best:!!r.is_best_seller,
    sold:r.sold_count||0, image:imgs[0]||null, images:imgs
  };
}

async function loadProducts(){
  if(!window.sb){ PRODUCTS=[]; computeFacets(); return; }
  const { data, error } = await window.sb
    .from("products")
    .select("*, categories(name), product_images(url,sort_order)")
    .order("sort_order", { ascending:true });
  if(error){ console.error("[Olive] loadProducts:", error.message); PRODUCTS=[]; computeFacets(); return; }
  PRODUCTS = (data||[]).map(mapProduct);
  computeFacets();
}

async function loadAnnouncement(){
  const bar = document.querySelector(".announce");
  if(!bar) return;
  if(!window.sb) return;               // leave default text in dev
  try{
    const { data, error } = await window.sb
      .from("announcements").select("message,link_url,is_active")
      .eq("is_active", true).order("updated_at",{ascending:false}).limit(1);
    if(error) throw error;
    if(data && data.length){
      const a=data[0];
      bar.style.display="";
      bar.querySelector("span").innerHTML = a.link_url
        ? `<a href="${escapeHtml(a.link_url)}" style="color:inherit;text-decoration:none">${escapeHtml(a.message)}</a>`
        : escapeHtml(a.message);
    } else {
      bar.style.display="none";        // no active announcement -> bar disappears
    }
  }catch(e){ /* keep default */ }
}

async function refreshAccountLink(){
  const el=document.getElementById("accountTool");
  const mobLink=document.getElementById("mobAccountLink");
  const mmenuAcct=document.getElementById("mmenuAccount");
  if(!window.sb) return;
  try{
    const { data:{ session } } = await window.sb.auth.getSession();
    const dest = session ? "account/account.html" : "account/sign-in.html";
    if(el) el.setAttribute("href", dest);
    if(mobLink){
      mobLink.setAttribute("href", dest);
      mobLink.querySelector("span").textContent = session ? "Account" : "Sign in";
    }
    if(mmenuAcct){
      const a = mmenuAcct.querySelector("a");
      if(a){
        a.setAttribute("href", dest);
        a.innerHTML = a.querySelector("svg").outerHTML + (session ? " My Account" : " Sign in / Account");
      }
    }
  }catch(e){}
}

/* ---- newsletter subscribe ---- */
async function subscribeEmail(email){
  email=(email||"").trim().toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return {ok:false,msg:"Please enter a valid email."};
  if(!window.sb) return {ok:false,msg:"Newsletter isn't connected yet."};
  const { error } = await window.sb.from("subscribers").insert({email});
  if(error){
    if(error.code==="23505") return {ok:true,msg:"You're already on the list — thank you!"};
    return {ok:false,msg:"Couldn't subscribe just now. Please try again."};
  }
  return {ok:true,msg:"You're on the list — thank you."};
}
async function handleSubscribe(btn){
  const wrap=btn.closest(".news-form")||document;
  const input=wrap.querySelector('input[type="email"]');
  btn.disabled=true;
  const r=await subscribeEmail(input && input.value);
  btn.disabled=false;
  toast(r.msg);
  if(r.ok && input) input.value="";
}
function wireNewsletter(){
  document.querySelectorAll(".news-form button").forEach(b=>{
    b.setAttribute("onclick","handleSubscribe(this)");
  });
}

/* ---- product media + price helpers ---- */
function mediaHTML(p, color){
  if(p && p.image){
    return `<img class="pmedia" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />`;
  }
  const col = color || (p && p.colors && p.colors[0]);
  return swatchHTML(p ? p.fabric : "silk", col);
}
function effPrice(p){ return (p && p.on_sale && p.sale_price!=null) ? Number(p.sale_price) : Number(p ? p.price : 0); }
function priceHTML(p){
  if(p && p.on_sale && p.sale_price!=null){
    return `<span class="price-sale">${fmt(Number(p.sale_price))}</span> <span class="price-was">${fmt(Number(p.price))}</span>`;
  }
  return fmt(Number(p ? p.price : 0));
}

/* ---- dev-only notice when Supabase isn't configured ---- */
function showSetupNotice(){
  const grids=["homeGrid","shopGrid","bestCarousel","igGrid","editGrid"];
  grids.forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=""; });
  if(document.getElementById("oefSetup")) return;
  const n=document.createElement("div");
  n.id="oefSetup";
  n.style.cssText="position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:760px;margin:auto;background:#23261a;color:#efe6d6;border:1px solid #b3925f;border-radius:10px;padding:14px 18px;font:14px/1.5 system-ui;box-shadow:0 20px 50px -20px rgba(0,0,0,.6)";
  n.innerHTML='<b style="color:#c9ad82">Storefront not connected yet.</b> Add your Supabase URL &amp; anon key in <code>js/config.js</code>, then run <code>sql/schema.sql</code> and <code>sql/seed.sql</code>. See <b>SETUP.md</b>. '+
    '<button onclick="this.parentNode.remove()" style="float:right;background:#b3925f;border:none;color:#23261a;padding:4px 10px;border-radius:6px;cursor:pointer">Dismiss</button>';
  document.body.appendChild(n);
}
