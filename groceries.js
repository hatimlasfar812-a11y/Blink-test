import {
  fetchHypermarkets,
  resolveStoreConfig,
  escapeHtml,
  normalizeText,
  safeImageUrl,
  PLACEHOLDER_IMG,
  bindCartBadge,
  refreshIcons
} from "./hypermarket-core.js";

const grid = document.getElementById("storesGrid");
const searchInput = document.getElementById("searchInput");
const countInfo = document.getElementById("countInfo");

let stores = [];

document.getElementById("backBtn")?.addEventListener("click", e => {
  if (history.length > 1) { e.preventDefault(); history.back(); }
});

const badge = document.getElementById("cartBadge");
if (badge) bindCartBadge(badge);

function cardHtml(h) {
  const cfg = resolveStoreConfig(h);
  const href = cfg ? cfg.page : "carrefour.html";
  const logo = h.image || "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1000&auto=format&fit=crop";
  const place = [h.city, h.address].filter(Boolean).join(" · ") || "Oujda";
  const delivery = h.deliveryTime ? `${h.deliveryTime} min` : "30-50 min";
  
  return `
    <a class="store-card" href="${href}">
      <div class="cover"><img src="${logo}" alt="${h.name || 'Carrefour'}" loading="lazy"></div>
      <div class="body">
        <h3>${h.name || "Carrefour Oujda"}</h3>
        <div class="meta"><i data-lucide="map-pin"></i><span>${place}</span></div>
        <div class="meta"><i data-lucide="clock"></i><span>Livraison ${delivery}</span></div>
        <div class="tags">
          <span class="tag">Supermarché</span>
          <span class="tag open">Disponible</span>
        </div>
        <div class="go"><span>Voir les produits</span><i data-lucide="chevron-right"></i></div>
      </div>
    </a>`;
}

function render() {
  const q = normalizeText(searchInput ? searchInput.value : "");
  const list = stores.filter(h => !q || normalizeText(`${h.name} ${h.city} ${h.chain}`).includes(q));
  
  if (countInfo) {
    countInfo.textContent = stores.length ? `${list.length} magasin${list.length > 1 ? "s" : ""}` : "";
  }
  
  if (!list.length) {
    grid.innerHTML = `<div style="text-align:center; padding:40px; color:#666;">Aucun supermarché disponible.</div>`;
  } else {
    grid.innerHTML = list.map(cardHtml).join("");
  }
  refreshIcons();
}

async function load() {
  if (grid) grid.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div>`;
  try {
    stores = await fetchHypermarkets();
    render();
  } catch (err) {
    console.error(err);
    stores = [{ name: "Carrefour Oujda", city: "Oujda", deliveryTime: "30-50" }];
    render();
  }
}

let timer;
searchInput?.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 150); });

refreshIcons();
load();
