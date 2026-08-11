/* =========================================================
   OLIVE EXCLUSIVE FABRICS — Admin dashboard logic
   Depends on js/config.js (window.sb) loaded first.
   Role-based: only profiles.role='admin' may use this.
   ========================================================= */
const A  = (id) => document.getElementById(id);
const CUR = () => (window.OEF_CONFIG && window.OEF_CONFIG.CURRENCY) || "\u20a6";
const money = (n) => CUR() + Number(n || 0).toLocaleString("en-NG");
const esc = (x) => (x == null ? "" : String(x)).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
const BUCKET = "product-images";

let PROFILE = null, CATEGORIES = [], PRODUCTS = [], SUBSCRIBERS = [], ANNOUNCEMENTS = [];

function toast(t, isErr) {
  let el = A("aToast");
  if (!el) { el = document.createElement("div"); el.id = "aToast"; el.className = "a-toast"; document.body.appendChild(el); }
  el.textContent = t; el.className = "a-toast show" + (isErr ? " err" : "");
  clearTimeout(window._tt); window._tt = setTimeout(() => el.classList.remove("show"), 2800);
}

/* ---------------- GUARD + SHELL ---------------- */
async function guard() {
  if (!window.sb) { gate("Not connected to Supabase yet", "Add your project keys in <code>js/config.js</code> and run the SQL in <b>SETUP.md</b>."); return false; }
  const { data: { session } } = await window.sb.auth.getSession();
  if (!session) { location.href = "../account/sign-in.html?next=" + encodeURIComponent("../admin/" + (location.pathname.split("/").pop() || "index.html")); return false; }
  const { data, error } = await window.sb.from("profiles").select("full_name,email,role").eq("id", session.user.id).single();
  if (error || !data || data.role !== "admin") { gate("Access denied", "This area is for administrators only.", true); return false; }
  PROFILE = data;
  return true;
}
function gate(title, html, showOut) {
  document.body.className = "admin";
  document.body.innerHTML =
    `<div class="a-gate"><div class="box">
      <div class="a-brand" style="margin-bottom:14px"><span class="b1">Olive Exclusive</span><span class="b2">Admin</span></div>
      <h1>${esc(title)}</h1><p>${html}</p>
      <div class="a-actions" style="justify-content:center">
        <a class="a-btn" href="../index.html">Back to store</a>
        ${showOut ? '<button class="a-btn danger" onclick="signOut()">Sign out</button>' : '<a class="a-btn primary" href="../account/sign-in.html">Sign in</a>'}
      </div></div></div>`;
}
async function signOut() { if (window.sb) await window.sb.auth.signOut(); location.href = "../index.html"; }

function buildShell(active) {
  const nav = [
    ["index.html", "Overview", '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
    ["products.html", "Products", '<path d="M4 7h16l-1 13H5zM8 7a4 4 0 0 1 8 0"/>'],
    ["subscribers.html", "Subscribers", '<path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="8" r="4"/><path d="M21 20v-2a4 4 0 0 0-3-3.9"/>'],
    ["announcements.html", "Announcements", '<path d="M3 11l14-6v14L3 13zM3 11v2M17 8a4 4 0 0 1 0 8"/>']
  ];
  const links = nav.map(n => `<a href="${n[0]}" class="${n[0] === active ? "active" : ""}"><svg viewBox="0 0 24 24">${n[2]}</svg>${n[1]}</a>`).join("");
  const side = `
  <aside class="a-side">
    <div class="a-brand"><span class="b1">Olive Exclusive</span><span class="b2">Admin</span></div>
    <div class="a-tag">Store manager</div>
    <nav class="a-nav">${links}</nav>
    <div class="a-side-foot">
      <div style="color:#efe6d6">${esc(PROFILE ? PROFILE.full_name || PROFILE.email : "")}</div>
      <a href="../index.html" target="_blank">View store ↗</a>
      <button onclick="signOut()">Sign out</button>
    </div>
  </aside>`;
  const main = document.getElementById("adminMain");
  const shell = document.createElement("div");
  shell.className = "admin-shell";
  shell.innerHTML = side + '<div class="a-main" id="aMain"></div>';
  document.body.appendChild(shell);
  A("aMain").appendChild(main);
}

/* ---------------- DATA ---------------- */
async function loadCategories() {
  const { data } = await window.sb.from("categories").select("*").order("sort_order");
  CATEGORIES = data || [];
}
async function loadProducts() {
  const { data, error } = await window.sb.from("products")
    .select("*, categories(name), product_images(id,url,storage_path,sort_order)")
    .order("sort_order");
  if (error) { toast(error.message, true); return; }
  PRODUCTS = (data || []).map(p => ({ ...p, product_images: (p.product_images || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) }));
}

/* ================= OVERVIEW ================= */
async function initOverview() {
  const [prodC, outC, subC, annC] = await Promise.all([
    window.sb.from("products").select("*", { count: "exact", head: true }),
    window.sb.from("products").select("*", { count: "exact", head: true }).eq("in_stock", false),
    window.sb.from("subscribers").select("*", { count: "exact", head: true }),
    window.sb.from("announcements").select("message").eq("is_active", true).order("updated_at", { ascending: false }).limit(1)
  ]);
  const total = prodC.count || 0, out = outC.count || 0;
  const active = (annC.data && annC.data[0]) ? annC.data[0].message : null;
  A("adminMain").innerHTML = `
    <div class="a-head"><div><h1>Overview</h1><p>Welcome back, ${esc((PROFILE.full_name || "admin").split(" ")[0])}. Here's your store at a glance.</p></div>
      <a class="a-btn primary" href="products.html">Manage products</a></div>
    <div class="a-stats">
      <div class="a-stat"><div class="n">${total}</div><div class="l">Total products</div></div>
      <div class="a-stat"><div class="n">${total - out}</div><div class="l">In stock</div></div>
      <div class="a-stat"><div class="n">${out}</div><div class="l">Out of stock</div></div>
      <div class="a-stat"><div class="n">${subC.count || 0}</div><div class="l">Subscribers</div></div>
    </div>
    <div class="a-panel"><div class="a-panel-head"><h2>Announcement TV</h2><a class="a-btn sm" href="announcements.html">Manage</a></div>
      <div style="padding:20px">${active
        ? `<span class="pill on">● Live</span> <span style="margin-left:10px">${esc(active)}</span>`
        : `<span class="pill off">● Off</span> <span style="margin-left:10px;color:var(--a-muted)">No active announcement — the storefront bar is hidden.</span>`}</div>
    </div>
    <div class="a-panel" style="margin-top:20px"><div class="a-panel-head"><h2>Quick actions</h2></div>
      <div style="padding:18px 20px" class="a-actions">
        <a class="a-btn" href="products.html">＋ Add product</a>
        <a class="a-btn" href="announcements.html">＋ New announcement</a>
        <a class="a-btn" href="subscribers.html">View subscribers</a>
      </div></div>`;
}

/* ================= PRODUCTS ================= */
async function initProducts() {
  await Promise.all([loadCategories(), loadProducts()]);
  A("adminMain").innerHTML = `
    <div class="a-head"><div><h1>Products</h1><p>Add, edit, price and manage stock. Changes go live on the storefront immediately.</p></div>
      <button class="a-btn primary" onclick="openProduct()">＋ Add product</button></div>
    <div class="a-panel"><div class="a-panel-head"><h2>${PRODUCTS.length} products</h2>
      <div class="a-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="prodSearch" placeholder="Search products…" oninput="renderProducts()"></div></div>
      <div id="prodTable"></div></div>
    <div class="a-modal" id="prodModal"><div class="a-modal-card"><div id="prodModalInner"></div></div></div>`;
  renderProducts();
}
function renderProducts() {
  const q = (A("prodSearch") && A("prodSearch").value || "").toLowerCase().trim();
  const rows = PRODUCTS.filter(p => !q || (p.name + " " + (p.fabric_type || "") + " " + ((p.categories && p.categories.name) || "")).toLowerCase().includes(q));
  const box = A("prodTable");
  if (!rows.length) { box.innerHTML = `<div class="a-empty">No products found.</div>`; return; }
  box.innerHTML = `<table class="a-table"><thead><tr>
    <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>${
    rows.map(p => {
      const img = p.product_images[0];
      const thumb = img ? `<img class="a-thumb" src="${esc(img.url)}" alt="">` : `<div class="a-thumb"></div>`;
      const price = (p.on_sale && p.sale_price != null)
        ? `${money(p.sale_price)} <span class="a-sub" style="text-decoration:line-through">${money(p.price)}</span>`
        : money(p.price);
      return `<tr>
        <td><div style="display:flex;gap:12px;align-items:center">${thumb}
          <div><div class="a-name">${esc(p.name)}</div>
            <div class="a-sub">${esc(p.fabric_type || "")}${p.is_new ? " · New" : ""}${p.is_best_seller ? " · Best seller" : ""}</div></div></div></td>
        <td>${esc((p.categories && p.categories.name) || "—")}</td>
        <td>${price}${p.on_sale ? ' <span class="pill sale">Sale</span>' : ""}</td>
        <td><label class="switch"><input type="checkbox" ${p.in_stock ? "checked" : ""} onchange="toggleStock('${p.id}',this.checked)"><span class="track"></span><span class="dot"></span></label>
          <span class="a-sub" style="margin-left:8px">${p.in_stock ? "In stock" : "Out"}</span></td>
        <td><div class="a-actions">
          <button class="a-btn sm" onclick="openProduct('${p.id}')">Edit</button>
          <button class="a-btn sm danger" onclick="deleteProduct('${p.id}')">Delete</button></div></td></tr>`;
    }).join("")}</tbody></table>`;
}
async function toggleStock(id, val) {
  const { error } = await window.sb.from("products").update({ in_stock: val }).eq("id", id);
  if (error) return toast(error.message, true);
  const p = PRODUCTS.find(x => x.id === id); if (p) p.in_stock = val;
  toast(val ? "Marked in stock — live on storefront" : "Marked out of stock — live on storefront");
  renderProducts();
}
async function deleteProduct(id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  if (!confirm(`Delete “${p.name}”? This also removes its images. This cannot be undone.`)) return;
  const paths = p.product_images.map(i => i.storage_path).filter(Boolean);
  if (paths.length) await window.sb.storage.from(BUCKET).remove(paths);
  const { error } = await window.sb.from("products").delete().eq("id", id);
  if (error) return toast(error.message, true);
  PRODUCTS = PRODUCTS.filter(x => x.id !== id);
  toast("Product deleted"); renderProducts();
}

/* ---- product modal (add / edit) ---- */
let EDITING = null; // product id being edited (null = new)
function openProduct(id) {
  EDITING = id || null;
  const p = id ? PRODUCTS.find(x => x.id === id) : null;
  const catOpts = `<option value="">— none —</option>` + CATEGORIES.map(c => `<option value="${c.id}" ${p && p.category_id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  const v = (k, d = "") => p && p[k] != null ? p[k] : d;
  A("prodModalInner").innerHTML = `
    <div class="a-modal-head"><h2>${p ? "Edit product" : "Add product"}</h2>
      <button class="x-close" onclick="closeProduct()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="a-modal-body">
      <div class="a-field"><label>Product name</label><input id="f_name" value="${esc(v("name"))}" placeholder="e.g. Beaded French Lace"></div>
      <div class="a-field"><label>Description</label><textarea id="f_desc" placeholder="Fabric details, weight, width, composition…">${esc(v("description"))}</textarea></div>
      <div class="a-grid2">
        <div class="a-field"><label>Category</label><select id="f_cat">${catOpts}</select></div>
        <div class="a-field"><label>Fabric type</label><input id="f_type" value="${esc(v("fabric_type"))}" placeholder="Lace, Silk, Velvet…"></div>
        <div class="a-field"><label>Pattern</label><input id="f_pattern" value="${esc(v("pattern"))}" placeholder="Floral, Plain…"></div>
        <div class="a-field"><label>Sold by (unit)</label><input id="f_unit" value="${esc(v("unit", "per yard"))}" placeholder="per yard"></div>
        <div class="a-field"><label>Price (${CUR()})</label><input id="f_price" type="number" min="0" step="100" value="${esc(v("price", 0))}"></div>
        <div class="a-field"><label>Sale price (${CUR()}) — optional</label><input id="f_sale" type="number" min="0" step="100" value="${p && p.sale_price != null ? esc(p.sale_price) : ""}"></div>
        <div class="a-field"><label>Colours (comma-separated)</label><input id="f_colors" value="${esc((v("colors", []) || []).join(", "))}" placeholder="Ivory, Champagne, Blush"></div>
        <div class="a-field"><label>Occasions (comma-separated)</label><input id="f_occ" value="${esc((v("occasions", []) || []).join(", "))}" placeholder="Wedding, Party"></div>
      </div>
      <div style="display:flex;gap:22px;flex-wrap:wrap;margin:4px 0 6px">
        <label class="a-check"><input type="checkbox" id="f_onsale" ${v("on_sale") ? "checked" : ""}> On sale</label>
        <label class="a-check"><input type="checkbox" id="f_instock" ${p ? (p.in_stock ? "checked" : "") : "checked"}> In stock</label>
        <label class="a-check"><input type="checkbox" id="f_new" ${v("is_new") ? "checked" : ""}> New arrival</label>
        <label class="a-check"><input type="checkbox" id="f_best" ${v("is_best_seller") ? "checked" : ""}> Best seller</label>
      </div>
      <div class="a-field" style="margin-top:10px">
        <label>Images</label>
        ${p ? `<div id="imgManager"></div>
          <div style="margin-top:10px"><input type="file" id="f_files" accept="image/*" multiple>
          <div class="a-hint">Upload one or more images. The first image is the storefront cover. Drag order via the ↑ ↓ buttons.</div></div>`
             : `<div class="a-hint">Save the product first, then you can upload and arrange images.</div>`}
      </div>
    </div>
    <div class="a-modal-foot">
      <button class="a-btn" onclick="closeProduct()">Cancel</button>
      <button class="a-btn primary" id="saveProdBtn" onclick="saveProduct()">${p ? "Save changes" : "Create product"}</button>
    </div>`;
  A("prodModal").classList.add("show");
  if (p) { renderImageManager(); A("f_files").addEventListener("change", onFilesChosen); }
}
function closeProduct() { A("prodModal").classList.remove("show"); EDITING = null; }

function parseList(s) { return (s || "").split(",").map(x => x.trim()).filter(Boolean); }
async function saveProduct() {
  const btn = A("saveProdBtn"); btn.disabled = true;
  const name = A("f_name").value.trim();
  if (!name) { btn.disabled = false; return toast("Product name is required", true); }
  const payload = {
    name,
    description: A("f_desc").value.trim(),
    category_id: A("f_cat").value || null,
    fabric_type: A("f_type").value.trim(),
    pattern: A("f_pattern").value.trim(),
    unit: A("f_unit").value.trim() || "per yard",
    price: Number(A("f_price").value || 0),
    sale_price: A("f_sale").value === "" ? null : Number(A("f_sale").value),
    on_sale: A("f_onsale").checked,
    in_stock: A("f_instock").checked,
    is_new: A("f_new").checked,
    is_best_seller: A("f_best").checked,
    colors: parseList(A("f_colors").value),
    occasions: parseList(A("f_occ").value),
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6)
  };
  if (EDITING) {
    delete payload.slug;
    const { error } = await window.sb.from("products").update(payload).eq("id", EDITING);
    btn.disabled = false;
    if (error) return toast(error.message, true);
    toast("Saved — live on storefront");
    await loadProducts(); renderProducts();
    const p = PRODUCTS.find(x => x.id === EDITING); if (p) { /* refresh manager */ renderImageManager(); }
  } else {
    const { data, error } = await window.sb.from("products").insert(payload).select().single();
    btn.disabled = false;
    if (error) return toast(error.message, true);
    toast("Product created — now add images");
    await loadProducts();
    openProduct(data.id);   // reopen in edit mode so images can be added
    renderProducts();
  }
}

/* ---- image manager ---- */
function currentProduct() { return PRODUCTS.find(x => x.id === EDITING); }
function renderImageManager() {
  const box = A("imgManager"); if (!box) return;
  const p = currentProduct(); const imgs = p ? p.product_images : [];
  if (!imgs.length) { box.innerHTML = `<div class="a-hint">No images yet.</div>`; return; }
  box.innerHTML = `<div class="img-grid">${imgs.map((im, i) => `
    <div class="img-cell ${i === 0 ? "first" : ""}">
      <img src="${esc(im.url)}" alt="">
      <div class="ic-tools">
        <button title="Move left" onclick="moveImg('${im.id}',-1)">↑</button>
        <button title="Move right" onclick="moveImg('${im.id}',1)">↓</button>
        <button title="Replace" onclick="replaceImg('${im.id}')">⟳</button>
        <button title="Delete" onclick="removeImg('${im.id}')">✕</button>
      </div></div>`).join("")}</div>`;
}
async function onFilesChosen(e) {
  const files = [...e.target.files]; e.target.value = "";
  const p = currentProduct(); if (!p) return;
  let order = p.product_images.length;
  for (const f of files) {
    try { await uploadImage(EDITING, f, order++); }
    catch (err) { toast(err.message || "Upload failed", true); }
  }
  await loadProducts(); renderImageManager(); renderProducts();
  toast("Images updated — live on storefront");
}
async function uploadImage(productId, file, sort) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await window.sb.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data: pub } = window.sb.storage.from(BUCKET).getPublicUrl(path);
  const { error: e2 } = await window.sb.from("product_images").insert({ product_id: productId, storage_path: path, url: pub.publicUrl, sort_order: sort });
  if (e2) throw e2;
}
async function removeImg(imgId) {
  const p = currentProduct(); const im = p.product_images.find(x => x.id === imgId); if (!im) return;
  if (!confirm("Delete this image?")) return;
  if (im.storage_path) await window.sb.storage.from(BUCKET).remove([im.storage_path]);
  await window.sb.from("product_images").delete().eq("id", imgId);
  await loadProducts(); renderImageManager(); renderProducts();
  toast("Image deleted");
}
function replaceImg(imgId) {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    const p = currentProduct(); const im = p.product_images.find(x => x.id === imgId); if (!im) return;
    try {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${EDITING}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await window.sb.storage.from(BUCKET).upload(path, f, { cacheControl: "3600" });
      if (error) throw error;
      const { data: pub } = window.sb.storage.from(BUCKET).getPublicUrl(path);
      const old = im.storage_path;
      await window.sb.from("product_images").update({ storage_path: path, url: pub.publicUrl }).eq("id", imgId);
      if (old) await window.sb.storage.from(BUCKET).remove([old]);
      await loadProducts(); renderImageManager(); renderProducts();
      toast("Image replaced");
    } catch (err) { toast(err.message || "Replace failed", true); }
  };
  inp.click();
}
async function moveImg(imgId, dir) {
  const p = currentProduct(); const imgs = p.product_images;
  const i = imgs.findIndex(x => x.id === imgId); const j = i + dir;
  if (j < 0 || j >= imgs.length) return;
  const a = imgs[i], b = imgs[j];
  await Promise.all([
    window.sb.from("product_images").update({ sort_order: j }).eq("id", a.id),
    window.sb.from("product_images").update({ sort_order: i }).eq("id", b.id)
  ]);
  await loadProducts(); renderImageManager(); renderProducts();
}

/* ================= SUBSCRIBERS ================= */
async function initSubscribers() {
  A("adminMain").innerHTML = `
    <div class="a-head"><div><h1>Subscribers</h1><p>Everyone who signed up through the storefront newsletter.</p></div></div>
    <div class="a-panel"><div class="a-panel-head"><h2 id="subCount">—</h2>
      <div class="a-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="subSearch" placeholder="Search email…" oninput="renderSubs()"></div></div>
      <div id="subTable"><div class="a-empty">Loading…</div></div></div>`;
  const { data, error } = await window.sb.from("subscribers").select("*").order("created_at", { ascending: false });
  if (error) { A("subTable").innerHTML = `<div class="a-empty">${esc(error.message)}</div>`; return; }
  SUBSCRIBERS = data || [];
  renderSubs();
}
function renderSubs() {
  const q = (A("subSearch") && A("subSearch").value || "").toLowerCase().trim();
  const rows = SUBSCRIBERS.filter(s => !q || s.email.toLowerCase().includes(q));
  A("subCount").textContent = `${SUBSCRIBERS.length} subscriber${SUBSCRIBERS.length === 1 ? "" : "s"}`;
  const box = A("subTable");
  if (!rows.length) { box.innerHTML = `<div class="a-empty">No subscribers${q ? " match your search" : " yet"}.</div>`; return; }
  box.innerHTML = `<table class="a-table"><thead><tr><th>Email</th><th>Subscribed</th><th></th></tr></thead><tbody>${
    rows.map(s => `<tr>
      <td class="a-name">${esc(s.email)}</td>
      <td class="a-sub">${new Date(s.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}</td>
      <td><button class="a-btn sm danger" onclick="deleteSub('${s.id}')">Remove</button></td></tr>`).join("")}</tbody></table>`;
}
async function deleteSub(id) {
  if (!confirm("Remove this subscriber?")) return;
  const { error } = await window.sb.from("subscribers").delete().eq("id", id);
  if (error) return toast(error.message, true);
  SUBSCRIBERS = SUBSCRIBERS.filter(s => s.id !== id);
  toast("Subscriber removed"); renderSubs();
}

/* ================= ANNOUNCEMENTS ================= */
async function initAnnouncements() {
  A("adminMain").innerHTML = `
    <div class="a-head"><div><h1>Announcement TV</h1><p>Control the promo bar at the top of the storefront. Toggle ON to show it, OFF to hide it instantly.</p></div>
      <button class="a-btn primary" onclick="openAnn()">＋ New announcement</button></div>
    <div id="annList"><div class="a-empty">Loading…</div></div>
    <div class="a-modal" id="annModal"><div class="a-modal-card"><div id="annModalInner"></div></div></div>`;
  await loadAnns(); renderAnns();
}
async function loadAnns() {
  const { data, error } = await window.sb.from("announcements").select("*").order("updated_at", { ascending: false });
  if (error) { toast(error.message, true); ANNOUNCEMENTS = []; return; }
  ANNOUNCEMENTS = data || [];
}
function renderAnns() {
  const box = A("annList");
  if (!ANNOUNCEMENTS.length) { box.innerHTML = `<div class="a-panel"><div class="a-empty">No announcements yet. Create one to promote an offer.</div></div>`; return; }
  box.innerHTML = `<div class="a-panel"><table class="a-table"><thead><tr><th>Message</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${
    ANNOUNCEMENTS.map(a => `<tr>
      <td><div class="a-name">${esc(a.message)}</div>${a.link_url ? `<div class="a-sub">${esc(a.link_url)}</div>` : ""}</td>
      <td><label class="switch"><input type="checkbox" ${a.is_active ? "checked" : ""} onchange="toggleAnn('${a.id}',this.checked)"><span class="track"></span><span class="dot"></span></label>
        <span class="pill ${a.is_active ? "on" : "off"}" style="margin-left:8px">${a.is_active ? "ON" : "OFF"}</span></td>
      <td class="a-sub">${new Date(a.updated_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</td>
      <td><div class="a-actions"><button class="a-btn sm" onclick="openAnn('${a.id}')">Edit</button>
        <button class="a-btn sm danger" onclick="deleteAnn('${a.id}')">Delete</button></div></td></tr>`).join("")}</tbody></table></div>
    <p class="a-hint" style="margin-top:12px">The storefront shows the most recently updated <b>active</b> announcement. Turn all OFF to hide the bar.</p>`;
}
async function toggleAnn(id, val) {
  const { error } = await window.sb.from("announcements").update({ is_active: val }).eq("id", id);
  if (error) return toast(error.message, true);
  const a = ANNOUNCEMENTS.find(x => x.id === id); if (a) a.is_active = val;
  toast(val ? "Announcement is now LIVE" : "Announcement turned off");
  renderAnns();
}
function openAnn(id) {
  const a = id ? ANNOUNCEMENTS.find(x => x.id === id) : null;
  A("annModalInner").innerHTML = `
    <div class="a-modal-head"><h2>${a ? "Edit announcement" : "New announcement"}</h2>
      <button class="x-close" onclick="closeAnn()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="a-modal-body">
      <div class="a-field"><label>Message</label><textarea id="a_msg" placeholder="🔥 20% OFF ALL FABRICS THIS WEEK">${esc(a ? a.message : "")}</textarea></div>
      <div class="a-field"><label>Link (optional)</label><input id="a_link" value="${esc(a ? (a.link_url || "") : "")}" placeholder="shop.html or https://…"></div>
      <label class="a-check"><input type="checkbox" id="a_active" ${a ? (a.is_active ? "checked" : "") : "checked"}> Active (show on storefront now)</label>
    </div>
    <div class="a-modal-foot"><button class="a-btn" onclick="closeAnn()">Cancel</button>
      <button class="a-btn primary" id="saveAnnBtn" onclick="saveAnn('${id || ""}')">${a ? "Save" : "Create"}</button></div>`;
  A("annModal").classList.add("show");
}
function closeAnn() { A("annModal").classList.remove("show"); }
async function saveAnn(id) {
  const btn = A("saveAnnBtn"); btn.disabled = true;
  const message = A("a_msg").value.trim();
  if (!message) { btn.disabled = false; return toast("Message is required", true); }
  const payload = { message, link_url: A("a_link").value.trim() || null, is_active: A("a_active").checked };
  const res = id ? await window.sb.from("announcements").update(payload).eq("id", id)
                 : await window.sb.from("announcements").insert(payload);
  btn.disabled = false;
  if (res.error) return toast(res.error.message, true);
  closeAnn(); await loadAnns(); renderAnns();
  toast(id ? "Announcement saved" : "Announcement created");
}
async function deleteAnn(id) {
  if (!confirm("Delete this announcement?")) return;
  const { error } = await window.sb.from("announcements").delete().eq("id", id);
  if (error) return toast(error.message, true);
  ANNOUNCEMENTS = ANNOUNCEMENTS.filter(a => a.id !== id);
  toast("Announcement deleted"); renderAnns();
}

/* ---------------- BOOT ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const ok = await guard();
  if (!ok) return;
  const section = document.body.dataset.admin || "index";
  buildShell(section === "index" ? "index.html" : section + ".html");
  if (section === "index") initOverview();
  else if (section === "products") initProducts();
  else if (section === "subscribers") initSubscribers();
  else if (section === "announcements") initAnnouncements();
});
