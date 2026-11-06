import {
  CATEGORY_TREE,
  fetchAllProducts,
  bindCartBadge,
  showToast,
  addProductToCart,
} from "./hypermarket-core.js";

import { getCart, addToCart, clearCart } from "./cart.js";

const translations = {
  fr: {
    deliver_to: "Livrer à", search_placeholder: "Rechercher un produit...",
    hero_subtitle: "Vos courses livrées chez vous", open: "Ouvert",
    categories: "Catégories", sort_relevance: "Trier : Pertinence",
    sort_price_asc: "Prix croissant", sort_price_desc: "Prix décroissant", sort_name: "Nom (A-Z)",
    nav_home: "Accueil", nav_explore: "Explorer", nav_cart: "Panier", nav_profile: "Profil",
    drawer_promo: "Promotions & Offres", drawer_orders: "Mes Commandes",
    drawer_categories: "Rayons Carrefour", drawer_catalogue: "Catalogue de la Semaine",
    drawer_rewards: "Carte de Fidélité", drawer_settings: "Paramètres", drawer_support: "Aide & Support",
    settings_title: "Paramètres", settings_lang: "Langue", settings_dark: "Mode Sombre",
    products_count: "produits", no_results: "Aucun produit trouvé."
  },
  ar: {
    deliver_to: "التوصيل إلى", search_placeholder: "البحث عن منتج...",
    hero_subtitle: "مشترياتك توصل لبابك", open: "مفتوح",
    categories: "الأقسام", sort_relevance: "ترتيب: الصلة",
    sort_price_asc: "السعر: الأقل أولاً", sort_price_desc: "السعر: الأعلى أولاً", sort_name: "الاسم (أ-ي)",
    nav_home: "الرئيسية", nav_explore: "استكشاف", nav_cart: "السلة", nav_profile: "الملف",
    drawer_promo: "العروض والتخفيضات", drawer_orders: "طلباتي",
    drawer_categories: "أقسام كارفور", drawer_catalogue: "كتالوج الأسبوع",
    drawer_rewards: "بطاقة الولاء", drawer_settings: "الإعدادات", drawer_support: "المساعدة والدعم",
    settings_title: "الإعدادات", settings_lang: "اللغة", settings_dark: "الوضع المظلم",
    products_count: "منتجات", no_results: "لا توجد منتجات."
  },
  en: {
    deliver_to: "Deliver to", search_placeholder: "Search for a product...",
    hero_subtitle: "Groceries delivered to your door", open: "Open",
    categories: "Categories", sort_relevance: "Sort: Relevance",
    sort_price_asc: "Price: Low to High", sort_price_desc: "Price: High to Low", sort_name: "Name (A-Z)",
    nav_home: "Home", nav_explore: "Explore", nav_cart: "Cart", nav_profile: "Profile",
    drawer_promo: "Promotions & Offers", drawer_orders: "My Orders",
    drawer_categories: "Carrefour Aisles", drawer_catalogue: "Weekly Catalogue",
    drawer_rewards: "Loyalty Card", drawer_settings: "Settings", drawer_support: "Help & Support",
    settings_title: "Settings", settings_lang: "Language", settings_dark: "Dark Mode",
    products_count: "products", no_results: "No products found."
  }
};

let currentLang = QuicklyCore.getLang();
const t = (key) => translations[currentLang][key] || key;

function applyLanguage(lang) {
  currentLang = lang; // التخزين والاتجاه يديرهما core.js

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });

  updateResultCount();
}

const grid = document.getElementById("productsGrid");
const resultCount = document.getElementById("resultCount");
const categoryMenu = document.getElementById("categoryMenu");
const mobileCategoriesBar = document.getElementById("mobileCategoriesBar");
const globalSearch = document.getElementById("globalSearchInput");
const sortSelect = document.getElementById("sortSelect");

let allProducts = [];
let filteredProducts = [];
let state = { cat: "all", query: "", sort: "default" };

const cartBadgeEl = document.getElementById("cartBadgeCount");
if (cartBadgeEl) bindCartBadge(cartBadgeEl);

// الثيم: يديره core.js

const menuToggleBtn = document.getElementById("menuToggleBtn");
const sideDrawer = document.getElementById("sideDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const settingsBtn = document.getElementById("settingsBtn");
const drawerSettingsBtn = document.getElementById("drawerSettingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModal = document.getElementById("closeSettingsModal");

function openDrawer() {
  if (sideDrawer && drawerOverlay) {
    sideDrawer.classList.add("open");
    drawerOverlay.classList.remove("hidden");
    document.body.classList.add("no-scroll");
  }
}
function closeDrawer() {
  if (sideDrawer && drawerOverlay) {
    sideDrawer.classList.remove("open");
    drawerOverlay.classList.add("hidden");
    document.body.classList.remove("no-scroll");
  }
}
function openSettings() {
  if (settingsModal) {
    settingsModal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  }
}

if (menuToggleBtn) menuToggleBtn.addEventListener("click", openDrawer);
if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);
if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
if (drawerSettingsBtn) drawerSettingsBtn.addEventListener("click", (e) => { e.preventDefault(); closeDrawer(); setTimeout(openSettings, 300); });
if (closeSettingsModal) closeSettingsModal.addEventListener("click", () => settingsModal.classList.add("hidden"));

const languageSelect = document.getElementById("languageSelect");
document.addEventListener("quickly:langchange", (e) => applyLanguage(e.detail.lang));

document.getElementById("drawerPromo").addEventListener("click", (e) => {
  e.preventDefault(); closeDrawer(); state.cat = "promo"; applyFilters();
  setTimeout(() => document.getElementById("productsGrid").scrollIntoView({ behavior: "smooth", block: "start" }), 300);
});
document.getElementById("drawerCategories").addEventListener("click", (e) => {
  e.preventDefault(); closeDrawer();
  setTimeout(() => document.getElementById("mobileCategoriesBar").scrollIntoView({ behavior: "smooth", block: "start" }), 300);
});
document.getElementById("drawerCatalogue").addEventListener("click", (e) => {
  e.preventDefault(); closeDrawer(); showToast("Bientôt disponible !", "error");
});

const WISHLIST_KEY = "carrefour_wishlist";
const getWishlist = () => { try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]"); } catch { return []; } };
const isWishlisted = (id) => getWishlist().includes(id);

window.toggleWish = function (id) {
  let list = getWishlist();
  const wasWished = list.includes(id);
  list = wasWished ? list.filter((x) => x !== id) : [...list, id];
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  const btn = document.querySelector(`.p-wish[data-id="${id}"]`);
  if (btn) btn.classList.toggle("active", !wasWished);
  showToast(wasWished ? "Retiré des favoris" : "Ajouté aux favoris");
};

function getProductQty(id) {
  const item = getCart().find((i) => i.id === id);
  return item ? item.quantity : 0;
}

function refreshCardState(id) {
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  if (!card) return;
  const actionsEl = card.querySelector(".p-actions");
  const qty = getProductQty(id);
  
  if (qty > 0) {
    actionsEl.innerHTML = `
      <div class="qty-selector">
        <button class="qty-btn" type="button" onclick="event.stopPropagation(); window.decrementCart('${id}')"><i data-lucide="minus"></i></button>
        <span class="qty-value">${qty}</span>
        <button class="qty-btn" type="button" onclick="event.stopPropagation(); window.addToCart('${id}')"><i data-lucide="plus"></i></button>
      </div>`;
  } else {
    actionsEl.innerHTML = `<button class="p-add" type="button" onclick="event.stopPropagation(); window.addToCart('${id}')"><i data-lucide="plus"></i> Ajouter</button>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

window.addToCart = function (id) {
  const prod = allProducts.find((p) => p.id === id);
  if (!prod || prod.price == null || prod.stockStatus === "out_of_stock") return showToast("Indisponible.", "error");
  
  const result = addProductToCart(prod, { id: "carrefour", name: "Carrefour" });
  if (result === "added") { showToast("✅ Ajouté au panier"); refreshCardState(id); }
  else if (result === "cancelled") showToast("Panier contient d'autres articles.", "error");
};

window.decrementCart = function (id) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  const updated = cart.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
  clearCart();
  updated.forEach((i) => addToCart(i));
  refreshCardState(id);
};

function isCategoryMatch(pCat, pName, uiKey, uiLabel) {
    const cat = (pCat || '').toLowerCase();
    const name = (pName || '').toLowerCase();
    const label = (uiLabel || '').toLowerCase();

    if (label.includes('fruit') || label.includes('légume')) return cat.includes('fruit') || cat.includes('légume') || cat.includes('agrume') || name.includes('kiwi') || name.includes('pomme') || name.includes('banane') || name.includes('citron') || name.includes('orange') || name.includes('tomate');
    if (label.includes('viande') || label.includes('volaille')) return (cat.includes('viande') || cat.includes('volaille') || name.includes('viande') || name.includes('poulet') || name.includes('bœuf')) && !cat.includes('poisson') && !name.includes('poisson');
    if (label.includes('poisson')) return cat.includes('poisson') || cat.includes('saumon') || name.includes('poisson') || name.includes('saumon');
    if (label.includes('laitier') || label.includes('crémerie')) return (cat.includes('lait') || cat.includes('yaourt') || cat.includes('œuf') || name.includes('lait') || name.includes('yaourt')) && !cat.includes('fromage') && !name.includes('fromage');
    if (label.includes('fromage')) return cat.includes('fromagerie') || cat.includes('fromage') || name.includes('fromage') || name.includes('jben');
    if (label.includes('hygiène') || label.includes('beauté') || label.includes('hygiene')) return cat.includes('dentifrice') || cat.includes('hygiène') || cat.includes('beauté') || name.includes('dentifrice') || name.includes('savon');
    if (label.includes('boisson') || label.includes('eau')) return cat.includes('eau') || cat.includes('boisson') || cat.includes('jus') || name.includes('eau') || name.includes('jus');
    if (label.includes('pain') || label.includes('boulangerie') || label.includes('pâtisserie')) return cat.includes('pain') || cat.includes('baguette') || cat.includes('viennoiserie') || name.includes('pain') || name.includes('croissant');
    if (label.includes('surgelé') || label.includes('glace')) return cat.includes('glacée') || cat.includes('surgelé') || name.includes('glace') || name.includes('frite');
    if (label.includes('maison') || label.includes('accessoire') || label.includes('bazar')) return cat.includes('vaisselle') || cat.includes('écouteur') || name.includes('assiette') || name.includes('écouteur');
    if (label.includes('épicerie') || label.includes('epicerie')) return cat.includes('huile') || cat.includes('biscuit') || cat.includes('café') || name.includes('huile') || name.includes('biscuit');
    if (label.includes('entretien') || label.includes('nettoyage')) return cat.includes('lessive') || cat.includes('nettoyant') || name.includes('lessive') || name.includes('nettoyant');
    if (label.includes('animalerie')) return cat.includes('animalerie') || name.includes('whiskas') || name.includes('chat');

    return cat === label;
}

async function init() {
  applyLanguage(currentLang);
  if (grid) grid.innerHTML = `<div style="text-align:center; padding:40px;">Chargement des produits...</div>`;
  if (window.lucide) window.lucide.createIcons(); // 🚀 باش تبان السيمبولات دغيا
  
  try {
    allProducts = await fetchAllProducts("Carrefour");
    console.log("Produits chargés:", allProducts.length); // 🚀 كيعطيك الخبر فالتيرمينال
    
    renderCategories();
    applyFilters();
  } catch (err) {
    console.error("Erreur init:", err);
    if (grid) grid.innerHTML = `<div style="text-align:center; padding:40px; color:red;">Erreur: ${err.message}</div>`;
  }
}

function updateResultCount() {
  if (resultCount) resultCount.textContent = `${filteredProducts.length} ${t("products_count")}`;
}

function renderCategories() {
  if (!categoryMenu || !mobileCategoriesBar) return;

  let sidebarHtml = `<li class="${state.cat === "all" ? "active" : ""}" data-cat="all"><div style="display:flex; gap:8px; align-items:center;"><i data-lucide="layout-grid"></i> ${t("categories")}</div></li>`;
  let mobileHtml = `<div class="mcat-pill ${state.cat === "all" ? "active" : ""}" data-cat="all"><i data-lucide="layout-grid"></i> Tout</div>`;

  const counts = {};
  allProducts.forEach((p) => {
      let matched = false;
      for (const [key, obj] of Object.entries(CATEGORY_TREE)) {
          if (isCategoryMatch(p.category, p.name, key, obj.label)) {
              counts[key] = (counts[key] || 0) + 1;
              matched = true;
              break; 
          }
      }
      if (!matched) counts['autres'] = (counts['autres'] || 0) + 1;
  });

  Object.entries(CATEGORY_TREE).forEach(([key, obj]) => {
    if ((counts[key] || 0) > 0) {
      sidebarHtml += `<li class="${state.cat === key ? "active" : ""}" data-cat="${key}"><div style="display:flex; gap:8px; align-items:center;"><i data-lucide="${obj.icon}"></i> ${obj.label}</div><span style="font-size:11px; opacity:0.6;">${counts[key]}</span></li>`;
      mobileHtml += `<div class="mcat-pill ${state.cat === key ? "active" : ""}" data-cat="${key}"><i data-lucide="${obj.icon}"></i> ${obj.label}</div>`;
    }
  });

  categoryMenu.innerHTML = sidebarHtml;
  mobileCategoriesBar.innerHTML = mobileHtml;
  if (window.lucide) window.lucide.createIcons();

  const handleCatClick = (e) => {
    const target = e.target.closest("[data-cat]");
    if (!target) return;
    state.cat = target.dataset.cat;
    document.querySelectorAll("[data-cat]").forEach(x => x.classList.toggle("active", x.dataset.cat === state.cat));
    if (target.classList.contains("mcat-pill")) {
      target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    applyFilters();
  };

  categoryMenu.removeEventListener("click", handleCatClick);
  mobileCategoriesBar.removeEventListener("click", handleCatClick);
  categoryMenu.addEventListener("click", handleCatClick);
  mobileCategoriesBar.addEventListener("click", handleCatClick);
}

if (globalSearch) globalSearch.addEventListener("input", (e) => { state.query = e.target.value.toLowerCase().trim(); applyFilters(); });
if (sortSelect) sortSelect.addEventListener("change", (e) => { state.sort = e.target.value; applyFilters(); });

function applyFilters() {
  filteredProducts = allProducts.filter((p) => {
    if (state.cat === "promo") {
      if (p.originalPrice == null || Number(p.originalPrice) <= p.price) return false;
    } else if (state.cat !== "all") {
      let uiLabel = state.cat;
      if (CATEGORY_TREE[state.cat]) uiLabel = CATEGORY_TREE[state.cat].label;
      if (!isCategoryMatch(p.category, p.name, state.cat, uiLabel)) return false;
    }
    if (state.query && !p.searchText.includes(state.query)) return false;
    return true;
  });

  if (state.sort === "price-asc") filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (state.sort === "price-desc") filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
  else if (state.sort === "name") filteredProducts.sort((a, b) => a.name.localeCompare(b.name));

  renderGrid();
}

function renderGrid() {
  if (!grid) return;
  updateResultCount();
  
  if (filteredProducts.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">${t("no_results")}</div>`;
    return;
  }

  grid.innerHTML = filteredProducts.slice(0, 200).map((p) => {
    const isOutOfStock = p.stockStatus === "out_of_stock";
    const originalPrice = p.originalPrice != null ? Number(p.originalPrice) : null;
    const hasPromo = originalPrice != null && originalPrice > p.price;
    const discount = hasPromo ? Math.round((1 - p.price / originalPrice) * 100) : 0;
    const qty = getProductQty(p.id);

    let badgeHtml = hasPromo ? `<span class="p-promo-badge">-${discount}%</span>` : (p.isNew ? `<span class="p-new-badge">Nouveau</span>` : "");
    
    let actionsHtml = isOutOfStock 
      ? `<button class="p-add" style="background:#ccc;" disabled>Épuisé</button>`
      : qty > 0 
        ? `<div class="qty-selector"><button class="qty-btn" onclick="event.stopPropagation(); window.decrementCart('${p.id}')"><i data-lucide="minus"></i></button><span class="qty-value">${qty}</span><button class="qty-btn" onclick="event.stopPropagation(); window.addToCart('${p.id}')"><i data-lucide="plus"></i></button></div>`
        : `<button class="p-add" onclick="event.stopPropagation(); window.addToCart('${p.id}')"><i data-lucide="plus"></i> Ajouter</button>`;

    return `
      <div class="product-card ${isOutOfStock ? "out-of-stock" : ""}" data-id="${p.id}">
        ${badgeHtml}
        <button class="p-wish ${isWishlisted(p.id) ? "active" : ""}" data-id="${p.id}" onclick="event.stopPropagation(); window.toggleWish('${p.id}')"><i data-lucide="heart"></i></button>
        <div class="p-img">
          <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/150'">
        </div>
        <h3 class="p-name">${p.name}</h3>
        <div class="p-unit" style="color:${isOutOfStock ? '#e4002b' : 'var(--text-muted)'}">${isOutOfStock ? '⚠️ Épuisé' : 'Carrefour'}</div>
        <div class="p-bottom">
          <div class="p-price-box">
            <span class="p-price">${p.price != null ? p.price.toFixed(2) : '---'} DH</span>
            ${hasPromo ? `<span class="p-old-price">${originalPrice.toFixed(2)} DH</span>` : ""}
          </div>
          <div class="p-actions">${actionsHtml}</div>
        </div>
      </div>`;
  }).join("");

  if (window.lucide) window.lucide.createIcons();
}

init();