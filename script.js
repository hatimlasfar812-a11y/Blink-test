import { db, auth } from "./firebase.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getCartCount, CART_EVENT } from "./cart.js";
import { categoryIconHtml } from "./category-icons.js";

/* =========================================
   LUCIDE ICONS ENGINE
========================================= */
function refreshIcons() {
  if (window.lucide?.createIcons) {
    try { window.lucide.createIcons(); } catch (e) { console.warn("Lucide Error:", e); }
  }
}

// =========================================
// TRANSLATIONS
// =========================================
const translations = {
  fr: {
    search_placeholder: "Rechercher restaurant, plat, produit…", rewards_title: "Récompenses", rewards_desc: "Gagnez des points", invite_title: "Parrainage", invite_desc: "Gagnez 30 MAD",
    cat_all: "Tous", cat_food: "Food", cat_groceries: "Groceries", cat_package: "Package", cat_shops: "Shops",
    cat_para: "Para",
    pop_restaurants: "Restaurants populaires", see_all: "Voir tout", special_offer: "Offre Limitée", order_now: "Commander", pop_categories: "Catégories populaires", nearby_restaurants: "Près de chez vous", our_services: "Nos services", explore: "Explorer",
    s_food: "Food", s_food_sub: "Plats & Repas", s_courses: "Courses", s_courses_sub: "Supermarchés", s_colis: "Colis", s_colis_sub: "Express", s_flowers: "Fleurs", s_flowers_sub: "Cadeaux",
    s_para: "Para & Beauté", s_para_sub: "Santé & Cosmétiques",
    s_shops: "Boutiques", s_shops_sub: "High-Tech", app_cta_title: "Application Blink", app_cta_desc: "Profitez d'une expérience encore plus rapide sur notre application mobile.", nav_home: "Accueil", nav_explore: "Explorer", nav_cart: "Panier", nav_profile: "Profil", settings_title: "Paramètres", lang_label: "Langue", dark_mode: "Mode Sombre", profile_mgmt: "Profil", loyalty_points: "Points", dev_credit: "Premium Experience",
    chip_top: "Mieux notés", chip_offers: "Offres", chip_near: "Près de vous", chip_free: "Livraison gratuite", chip_open: "Ouverts", all_restaurants: "Tous les restaurants", deliver_to: "Livrer à", choose_address: "Choisir mon adresse", offers_today: "Offres du jour", closed: "Fermé", free: "Gratuite", soon: "Bientôt disponible", fast_delivery: "Livraison rapide", new: "Nouveau", no_results: "Aucun restaurant ne correspond.", loading_error: "Impossible de charger les données.", retry: "Réessayer", see_results: "Voir tous les résultats", near_fallback: "Tri par rapidité de livraison.", location_denied: "Position indisponible. Choisissez une adresse.",
    chip_all: "Tout", chip_reset: "Réinitialiser", filter_title: "Filtrer",
    result_single: "résultat", result_plural: "résultats", filters_reset: "Filtres réinitialisés"
  },
  ar: {
    search_placeholder: "ابحث عن مطعم، وجبة، أو منتج...", rewards_title: "المكافآت", rewards_desc: "اربح نقاطاً", invite_title: "دعوة الأصدقاء", invite_desc: "اربح 30 درهم",
    cat_all: "الكل", cat_food: "طعام", cat_groceries: "مؤونة", cat_package: "طرود", cat_shops: "متاجر",
    cat_para: "عناية",
    pop_restaurants: "المطاعم الشائعة", see_all: "عرض الكل", special_offer: "عرض محدود", order_now: "اطلب الآن", pop_categories: "التصنيفات الشائعة", nearby_restaurants: "بالقرب منك", our_services: "خدماتنا", explore: "استكشاف",
    s_food: "طعام", s_food_sub: "وجبات وأطباق", s_courses: "مشتريات", s_courses_sub: "محلات وسوبرماركت", s_colis: "طرود", s_colis_sub: "توصيل سريع", s_flowers: "زهور", s_flowers_sub: "لأحبائك",
    s_para: "عناية وجمال", s_para_sub: "صحة ومستحضرات تجميل",
    s_shops: "متاجر", s_shops_sub: "أزياء وتقنية", app_cta_title: "تطبيق Blink", app_cta_desc: "استمتع بتجربة أسرع بكثير عبر تطبيقنا الهاتفي.", nav_home: "الرئيسية", nav_explore: "استكشاف", nav_cart: "السلة", nav_profile: "الملف الشخصي", settings_title: "إعدادات التطبيق", lang_label: "اللغة", dark_mode: "الوضع المظلم", profile_mgmt: "إدارة الحساب", loyalty_points: "نقاط الولاء", dev_credit: "تجربة احترافية",
    chip_top: "الأعلى تقييماً", chip_offers: "العروض", chip_near: "قريب منك", chip_free: "توصيل مجاني", chip_open: "مفتوح الآن", all_restaurants: "كل المطاعم", deliver_to: "التوصيل إلى", choose_address: "اختر عنوانك", offers_today: "عروض اليوم", closed: "مغلق", free: "مجاني", soon: "قريباً", fast_delivery: "توصيل سريع", new: "جديد", no_results: "لا توجد نتائج مطابقة.", loading_error: "تعذر تحميل البيانات.", retry: "إعادة المحاولة", see_results: "عرض كل النتائج", near_fallback: "الترتيب حسب سرعة التوصيل.", location_denied: "تعذر تحديد موقعك. اختر عنوان التوصيل.",
    chip_all: "الكل", chip_reset: "إعادة ضبط", filter_title: "تصفية",
    result_single: "نتيجة", result_plural: "نتائج", filters_reset: "تمت إعادة ضبط الفلاتر"
  },
  en: {
    search_placeholder: "Search restaurant, dish...", rewards_title: "Rewards", rewards_desc: "Earn points", invite_title: "Referral", invite_desc: "Get 30 MAD",
    cat_all: "All", cat_food: "Food", cat_groceries: "Groceries", cat_package: "Package", cat_shops: "Shops",
    cat_para: "Beauty",
    pop_restaurants: "Popular Restaurants", see_all: "See all", special_offer: "Limited Offer", order_now: "Order Now", pop_categories: "Popular Categories", nearby_restaurants: "Near You", our_services: "Our Services", explore: "Explore",
    s_food: "Food", s_food_sub: "Meals & Dishes", s_courses: "Groceries", s_courses_sub: "Supermarkets", s_colis: "Packages", s_colis_sub: "Express", s_flowers: "Flowers", s_flowers_sub: "Gifts",
    s_para: "Beauty & Care", s_para_sub: "Health & Cosmetics",
    s_shops: "Shops", s_shops_sub: "Fashion & Tech", app_cta_title: "Blink App", app_cta_desc: "Enjoy an even faster experience on our mobile app.", nav_home: "Home", nav_explore: "Explore", nav_cart: "Cart", nav_profile: "Profile", settings_title: "Settings", lang_label: "Language", dark_mode: "Dark Mode", profile_mgmt: "Profile", loyalty_points: "Points", dev_credit: "Premium Experience",
    chip_top: "Top rated", chip_offers: "Offers", chip_near: "Near you", chip_free: "Free delivery", chip_open: "Open now", all_restaurants: "All restaurants", deliver_to: "Deliver to", choose_address: "Choose address", offers_today: "Today's offers", closed: "Closed", free: "Free", soon: "Coming soon", fast_delivery: "Fast delivery", new: "New", no_results: "No matching restaurants.", loading_error: "Could not load data.", retry: "Retry", see_results: "See all results", near_fallback: "Sorted by speed.", location_denied: "Location unavailable. Please choose an address.",
    chip_all: "All", chip_reset: "Reset", filter_title: "Filter",
    result_single: "result", result_plural: "results", filters_reset: "Filters reset"
  }
};

function applyLanguage(lang) {
  const dict = translations[lang] || translations.fr;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.placeholder = dict[key];
  });
  const root = document.documentElement;
  if (lang === "ar") { root.setAttribute("dir", "rtl"); root.setAttribute("lang", "ar"); }
  else { root.setAttribute("dir", "ltr"); root.setAttribute("lang", lang); }
}

function t(key) {
  const lang = QuicklyCore.getLang();
  return (translations[lang] && translations[lang][key]) || translations.fr[key] || key;
}

function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/* =========================================
   UI LOGIC & STATE
========================================= */
const menuToggleBtn = document.getElementById("menuToggleBtn");
const sideDrawer = document.getElementById("sideDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");

function openDrawer() { sideDrawer?.classList.add("open"); drawerOverlay?.classList.remove("hidden"); }
function closeDrawer() { sideDrawer?.classList.remove("open"); drawerOverlay?.classList.add("hidden"); }

if (menuToggleBtn) menuToggleBtn.onclick = openDrawer;
if (closeDrawerBtn) closeDrawerBtn.onclick = closeDrawer;
if (drawerOverlay) drawerOverlay.onclick = closeDrawer;

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const filterBtn = document.getElementById("filterBtn");
const filterModal = document.getElementById("filterModal");
const closeFilterModal = document.getElementById("closeFilterModal");

if (settingsBtn && settingsModal) {
  settingsBtn.onclick = () => { settingsModal.classList.remove("hidden"); setTimeout(refreshIcons, 60); };
  if (closeSettingsModal) closeSettingsModal.onclick = () => settingsModal.classList.add("hidden");
}
if (filterBtn && filterModal) {
  filterBtn.onclick = () => { filterModal.classList.remove("hidden"); setTimeout(refreshIcons, 60); };
  if (closeFilterModal) closeFilterModal.onclick = () => filterModal.classList.add("hidden");
}

applyLanguage(QuicklyCore.getLang());
document.addEventListener("quickly:langchange", (e) => applyLanguage(e.detail.lang));

let toastTimer;
function showToast(message) {
  let el = document.getElementById("homeToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "homeToast"; el.className = "filter-toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

const state = { restaurants: [], offers: [], banners: [], filters: new Set(), userPos: null };

function isListed(r) { return r.active !== false && !["inactive", "disabled", "hidden", "deleted"].includes(String(r.status || "").toLowerCase()); }
const isOpenNow = (r) => r.isOpen !== false;

/* ✅ دالة التقييم الذكية */
function ratingOf(r) {
  if (!r) return null;
  let raw = r.rating ?? r.averageRating ?? r.avgRating ?? r.ratingAverage ?? r.rate ?? r.stars ?? r.score ?? r.ratingValue ?? r.reviewsRating;
  if (raw && typeof raw === 'object') {
    raw = raw.average ?? raw.score ?? raw.value ?? raw.overall ?? raw.rating ?? raw.stars;
  }
  if (typeof raw === 'string') {
    raw = raw.replace(',', '.');
    const match = raw.match(/(\d+(\.\d+)?)/);
    if (match) raw = match[0];
  }
  if (raw === undefined || raw === null || isNaN(parseFloat(raw))) {
    for (const key in r) {
      if (/rating|rate|star|score|review/i.test(key)) {
        let val = r[key];
        if (val && typeof val === 'object') val = val.average ?? val.score ?? val.value ?? val.overall ?? val.rating;
        if (typeof val === 'string') {
          val = val.replace(',', '.');
          const match = val.match(/(\d+(\.\d+)?)/);
          if (match) val = match[0];
        }
        const n = parseFloat(val);
        if (Number.isFinite(n) && n > 0 && n <= 5) { raw = n; break; }
      }
    }
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ✅ دالة جلب عدد المقيمين */
function reviewsCountOf(r) {
  if (!r) return 0;
  let raw = r.reviewsCount ?? r.ratingCount ?? r.totalRatings ?? r.reviewCount ?? r.reviews ?? r.ratings ?? r.count;
  if (Array.isArray(raw)) return raw.length;
  if (raw && typeof raw === 'object') {
     raw = raw.count ?? raw.total ?? raw.length;
  }
  if (raw === undefined || raw === null) {
    for (const key in r) {
      if (/review|rating|count/i.test(key)) {
         let val = r[key];
         if (Array.isArray(val)) return val.length;
         if (typeof val === 'number') return val;
         if (val && typeof val === 'object' && (val.count || val.total)) return val.count || val.total;
      }
    }
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ✅ دالة الترتيب الجديدة: تعطي الأولوية للتقييم، ثم لعدد المقيمين الأكثر */
function compareRestaurants(a, b) {
  const rateA = ratingOf(a) || 0;
  const rateB = ratingOf(b) || 0;
  if (rateA !== rateB) return rateB - rateA;
  return reviewsCountOf(b) - reviewsCountOf(a);
}

function isFree(r) { return r.freeDelivery === true || r.deliveryFee === "Free" || (r.deliveryFee !== undefined && r.deliveryFee !== "" && Number(r.deliveryFee) === 0); }
function feeLabel(r) { if (isFree(r)) return t("free"); const n = Number(r.deliveryFee); return Number.isFinite(n) && r.deliveryFee !== "" && r.deliveryFee != null ? `${n} DH` : ""; }
function etaMinutes(r) { const m = String(r.deliveryTime || "").match(/\d+/); return m ? Number(m[0]) : 999; }

function coordsOf(r) {
  const lat = Number(r.lat ?? r.latitude ?? r.location?.lat ?? r.location?.latitude ?? r.coordinates?.lat);
  const lng = Number(r.lng ?? r.longitude ?? r.location?.lng ?? r.location?.longitude ?? r.coordinates?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : null;
}
function distanceKm(a, b) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function distanceOf(r) { const c = coordsOf(r); return c && state.userPos ? distanceKm(state.userPos, c) : null; }
function isOfferValid(o) { if (o.active === false) return false; const n = new Date(), s = toDate(o.startAt), e = toDate(o.endAt); return !(s && s > n) && !(e && e < n); }
function offerFor(r) { return state.offers.find(o => o.restaurantId === r.id) || null; }
function hasOffer(r) { return r.todayOffer === true || !!offerFor(r); }
function readSavedPosition() {
  const la = parseFloat(localStorage.getItem("latitude")), lo = parseFloat(localStorage.getItem("longitude"));
  return Number.isFinite(la) && Number.isFinite(lo) ? { lat: la, lng: lo } : null;
}
function askBrowserPosition() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(null),
      { timeout: 8000 }
    );
  });
}

function renderLocationBar() {
  const el = document.getElementById("locationText");
  if (el) el.textContent = localStorage.getItem("selectedAddress") || t("choose_address");
}
function updateCartBadge() {
  const b = document.getElementById("cartBadgeCount");
  if (!b) return;
  const c = getCartCount();
  b.textContent = c > 99 ? "99+" : String(c);
  b.style.display = c > 0 ? "flex" : "none";
}
window.addEventListener(CART_EVENT, updateCartBadge);

// =========================================
// CARDS TEMPLATES
// =========================================
const PLACEHOLDER_BG = "background:var(--surface-muted)";
function imgTag(src, alt) {
  return src
    ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.style.visibility='hidden'">`
    : "";
}
function badgesHtml(r) {
  const parts = [];
  if (offerFor(r) || r.todayOffer) parts.push(`<span class="mini-badge badge-offer"><i data-lucide="tag"></i> ${esc(offerFor(r)?.title || t("chip_offers"))}</span>`);
  if (isFree(r)) parts.push(`<span class="mini-badge badge-free"><i data-lucide="bike"></i> ${esc(t("free"))}</span>`);
  return parts.length ? `<div class="badge-stack">${parts.join("")}</div>` : "";
}

function metaLine(r) {
  const b = [];
  const rt = ratingOf(r);
  const rv = reviewsCountOf(r);
  
  if (rt) {
    let ratingHtml = `<span class="meta-rating"><i data-lucide="star"></i> ${rt.toFixed(1)}`;
    if (rv > 0) ratingHtml += ` <span style="font-size:10px; color:var(--text-secondary); font-weight:normal; margin-left:2px;">(${rv})</span>`;
    ratingHtml += `</span>`;
    b.push(ratingHtml);
  } else {
    b.push(`<span>${esc(t("new"))}</span>`);
  }
  
  if (r.deliveryTime) b.push(`<span><i data-lucide="clock"></i> ${esc(r.deliveryTime)}</span>`);
  if (feeLabel(r)) b.push(`<span><i data-lucide="bike"></i> ${esc(feeLabel(r))}</span>`);
  const d = distanceOf(r);
  if (d !== null) b.push(`<span><i data-lucide="map-pin"></i> ${d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1) + " km"}</span>`);
  return b.join("");
}

function closedOverlay(r) { return isOpenNow(r) ? "" : `<div class="closed-overlay"><span>${esc(t("closed"))}</span></div>`; }

function hCard(r) {
  return `
    <a href="restaurant.html?id=${encodeURIComponent(r.id)}" class="restaurant-link-card">
      <div class="restaurant-card-box">
        <div class="card-image-wrap" style="${PLACEHOLDER_BG}">
          ${imgTag(r.image || r.logo, r.name)}${badgesHtml(r)}${closedOverlay(r)}
        </div>
        <div class="card-details-pad">
          <h4 class="card-title">${esc(r.name)}</h4>
          <p class="card-subtitle">${esc(r.categoryName || r.category || "")}</p>
          <div class="card-meta">${metaLine(r)}</div>
        </div>
      </div>
    </a>`;
}

function vCard(r) {
  const showLogo = r.logo && r.logo !== r.image;
  return `
    <a href="restaurant.html?id=${encodeURIComponent(r.id)}" class="rest-card-v ${showLogo ? 'has-logo' : ''}">
      <div class="rest-card-v-img" style="${PLACEHOLDER_BG}">
        ${imgTag(r.image || r.logo, r.name)}${badgesHtml(r)}${closedOverlay(r)}
        ${showLogo ? `<div class="rest-logo-chip">${imgTag(r.logo, "")}</div>` : ""}
      </div>
      <div class="rest-card-v-body">
        <h4>${esc(r.name)}</h4><p>${esc(r.categoryName || r.category || "Restaurant")}</p>
        <div class="card-meta">${metaLine(r)}</div>
      </div>
    </a>`;
}

function skeletons(n, cls) { return Array.from({ length: n }, () => `<div class="skeleton ${cls}"></div>`).join(""); }
function errorBox(id) { return `<div class="home-state"><i data-lucide="triangle-alert"></i><p>${esc(t("loading_error"))}</p><button class="retry-btn" data-retry="${id}">${esc(t("retry"))}</button></div>`; }

const popularEl = document.getElementById("restaurantsContainer");
const nearbyEl = document.getElementById("nearbyRestaurantsContainer");
const allListEl = document.getElementById("allRestaurantsList");
const filterNoteEl = document.getElementById("filterNote");
const nearbyTitleEl = document.getElementById("nearbyTitle");
const countBadgeEl = document.getElementById("allRestaurantsCount");

function renderPopular() {
  if (!popularEl) return;
  let list = [...state.restaurants].filter(r => ratingOf(r) !== null).sort(compareRestaurants).slice(0, 10);
  if (!list.length) list = [...state.restaurants].sort((a, b) => Number(isOpenNow(b)) - Number(isOpenNow(a)) || etaMinutes(a) - etaMinutes(b)).slice(0, 10);
  popularEl.innerHTML = list.length ? list.map(hCard).join("") : `<div class="home-state"><p>${esc(t("no_results"))}</p></div>`;
}

function renderNearby() {
  if (!nearbyEl) return;
  const withDist = state.restaurants.map(r => ({ r, d: distanceOf(r) })).filter(x => x.d !== null).sort((a, b) => a.d - b.d);
  let list;
  if (withDist.length) {
    list = withDist.map(x => x.r).slice(0, 10);
    if (nearbyTitleEl) nearbyTitleEl.textContent = t("nearby_restaurants");
  } else {
    list = [...state.restaurants].filter(isOpenNow).sort((a, b) => etaMinutes(a) - etaMinutes(b)).slice(0, 10);
    if (nearbyTitleEl) nearbyTitleEl.textContent = t("fast_delivery");
  }
  nearbyEl.innerHTML = list.length ? list.map(hCard).join("") : `<div class="home-state"><p>${esc(t("no_results"))}</p></div>`;
}

function applyFilters() {
  let list = [...state.restaurants], f = state.filters, note = "";
  
  if (f.has("top")) list = list.filter(r => (ratingOf(r) || 0) >= 4.0);
  if (f.has("offers")) list = list.filter(hasOffer);
  if (f.has("free")) list = list.filter(isFree);
  if (f.has("open")) list = list.filter(isOpenNow);

  if (f.has("near")) {
    const any = list.some(r => distanceOf(r) !== null);
    if (any) list = list.map(r => ({ r, d: distanceOf(r) })).sort((a, b) => (a.d ?? 9999) - (b.d ?? 9999)).map(x => x.r);
    else { list.sort((a, b) => etaMinutes(a) - etaMinutes(b)); note = t("near_fallback"); }
  } else if (f.has("top")) {
    list.sort(compareRestaurants);
  } else {
    list.sort((a, b) => Number(isOpenNow(b)) - Number(isOpenNow(a)));
  }

  return { list, note };
}

function renderAllList() {
  if (!allListEl) return;
  const { list, note } = applyFilters();
  if (countBadgeEl) countBadgeEl.textContent = String(list.length);

  if (filterNoteEl) {
    if (note) { filterNoteEl.innerHTML = `<i data-lucide="info"></i><span>${esc(note)}</span>`; filterNoteEl.style.display = "flex"; }
    else filterNoteEl.style.display = "none";
  }

  if (!list.length) {
    allListEl.innerHTML = `<div class="home-state" style="flex:0 0 100%; min-width:100%;"><i data-lucide="store"></i><p style="margin-bottom:12px;">${esc(t("no_results"))}</p><button class="retry-btn" onclick="document.getElementById('chipReset').click()"><i data-lucide="rotate-ccw"></i> ${esc(t("retry"))}</button></div>`;
  } else {
    allListEl.innerHTML = list.map(vCard).join("");
  }

  allListEl.scrollLeft = 0;
  setTimeout(refreshIcons, 30);
}

function renderChipsState() {
  const isAll = state.filters.size === 0;
  document.querySelectorAll(".chip-filter").forEach(c => {
    const key = c.dataset.filter;
    if (!key) return;
    c.classList.toggle("active", isAll ? key === "all" : state.filters.has(key));
  });
}

let offerSlideTimer = null;
let offerClockTimer = null;
let activeOfferIndex = 0;
let renderedOfferItems = [];
let offerCarouselPaused = false;

function offerEndDate(offer) {
  return toDate(offer?.endAt || offer?.endsAt || offer?.endDate || offer?.expiresAt);
}

function formatOfferCountdown(endDate) {
  if (!endDate) return null;
  const seconds = Math.max(0, Math.floor((endDate.getTime() - Date.now()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [days, hours, minutes, secs].map(v => String(v).padStart(2, "0")).join(":");
}

function updateOfferCountdown() {
  const value = document.getElementById("offerCountdown");
  const wrap = document.getElementById("offerCountdownWrap");
  const item = renderedOfferItems[activeOfferIndex];
  if (!value || !wrap || !item) return;
  const end = offerEndDate(item.o);
  if (!end) {
    wrap.style.display = "none";
    return;
  }
  const remaining = formatOfferCountdown(end);
  if (!remaining || remaining === "00:00:00:00") {
    value.textContent = "00:00:00:00";
    wrap.classList.add("is-expired");
    value.setAttribute("aria-label", "انتهى العرض");
  } else {
    value.textContent = remaining;
    wrap.classList.remove("is-expired");
    value.setAttribute("aria-label", `ينتهي العرض بعد ${remaining}`);
  }
  wrap.style.display = "inline-flex";
}

function showOfferSlide(index) {
  const items = renderedOfferItems;
  if (!items.length) return;
  activeOfferIndex = (index + items.length) % items.length;
  const { o, r } = items[activeOfferIndex];
  const showcase = document.getElementById("specialOfferSection");
  const bg = document.getElementById("offerBgImg");
  const img = o.image || r.image || "";
  if (bg) {
    const imageWrap = bg.closest(".offer-image-wrap");
    const safeImage = typeof img === "string" ? img.trim() : "";
    if (safeImage) {
      bg.style.backgroundImage = `url("${safeImage.replace(/[\"\\]/g, "\\$&")}")`;
      bg.dataset.imageLoaded = "true";
      imageWrap?.classList.remove("image-unavailable");
    } else {
      bg.style.backgroundImage = "none";
      bg.dataset.imageLoaded = "false";
      imageWrap?.classList.add("image-unavailable");
    }
    bg.setAttribute("aria-label", o.title || r.name || "Offre spéciale");
  }

  const logoImg = document.getElementById("offerRestaurantLogo");
  if (logoImg) {
    const logoSrc = r.logo || r.image || "";
    logoImg.onerror = function () { this.onerror = null; this.style.visibility = "hidden"; };
    logoImg.onload = function () { this.style.visibility = "visible"; };
    logoImg.style.visibility = logoSrc ? "visible" : "hidden";
    logoImg.src = logoSrc;
  }
  const title = document.getElementById("offerTitle");
  const restaurant = document.getElementById("offerRestaurantName");
  const price = document.getElementById("offerPrice");
  const description = document.getElementById("offerDescription");
  const originalPrice = document.getElementById("offerOriginalPrice");
  const discountBadge = document.getElementById("offerDiscountBadge");
  if (title) title.textContent = o.title || "عرض خاص";
  if (restaurant) restaurant.textContent = r.name || "";
  if (price) {
    const amount = Number(o.discountValue);
    if (Number.isFinite(amount) && amount > 0) {
      price.textContent = `${amount} DH`;
      price.style.display = "inline-flex";
    } else price.style.display = "none";
  }
  if (description) {
    const text = o.description || o.subtitle || "";
    description.textContent = text;
    description.hidden = !text;
  }
  if (originalPrice) {
    const oldAmount = Number(o.originalPrice ?? o.oldPrice);
    const hasOldAmount = Number.isFinite(oldAmount) && oldAmount > 0;
    originalPrice.textContent = hasOldAmount ? `${oldAmount} DH` : "";
    originalPrice.hidden = !hasOldAmount;
  }
  if (discountBadge) {
    const percent = Number(o.discountPercent ?? o.discountPercentage);
    const hasPercent = Number.isFinite(percent) && percent > 0;
    discountBadge.textContent = hasPercent ? `-${percent}%` : "";
    discountBadge.hidden = !hasPercent;
  }
  if (showcase) showcase.dataset.restaurantId = r.id;
  const dots = document.getElementById("offerDots");
  if (dots) dots.querySelectorAll("button").forEach((dot, i) => {
    dot.classList.toggle("active", i === activeOfferIndex);
    dot.setAttribute("aria-current", i === activeOfferIndex ? "true" : "false");
  });
  const controls = document.getElementById("offerCarouselControls");
  if (controls) controls.style.display = items.length > 1 ? "flex" : "none";
  updateOfferCountdown();
  refreshIcons();
}

function renderOffers() {
  const showcase = document.getElementById("specialOfferSection");
  const offersSection = document.getElementById("offersSection");
  const offersEl = document.getElementById("offersContainer");
  renderedOfferItems = state.offers
    .map(o => ({ o, r: state.restaurants.find(x => x.id === o.restaurantId) }))
    .filter(x => x.r && isOfferValid(x.o));

  clearInterval(offerSlideTimer);
  clearInterval(offerClockTimer);
  activeOfferIndex = 0;

  if (showcase) {
    if (renderedOfferItems.length) {
      const dots = document.getElementById("offerDots");
      if (dots) dots.innerHTML = renderedOfferItems.map((_, i) => `<button type="button" class="offer-dot ${i === 0 ? "active" : ""}" data-offer-index="${i}" aria-label="الانتقال إلى العرض ${i + 1}" aria-current="${i === 0 ? "true" : "false"}"></button>`).join("");
      showcase.style.display = "block";
      showOfferSlide(0);
      showcase.onclick = (event) => {
        if (event.target.closest("button")) return;
        const item = renderedOfferItems[activeOfferIndex];
        if (item) location.href = `restaurant.html?id=${encodeURIComponent(item.r.id)}`;
      };
      const claim = document.getElementById("offerBtn");
      if (claim) claim.onclick = (event) => {
        event.stopPropagation();
        const item = renderedOfferItems[activeOfferIndex];
        if (item) location.href = `restaurant.html?id=${encodeURIComponent(item.r.id)}`;
      };
      const prev = document.getElementById("offerPrev");
      const next = document.getElementById("offerNext");
      if (prev) prev.onclick = (event) => { event.stopPropagation(); showOfferSlide(activeOfferIndex - 1); };
      if (next) next.onclick = (event) => { event.stopPropagation(); showOfferSlide(activeOfferIndex + 1); };
      if (dots) dots.onclick = (event) => {
        const dot = event.target.closest("[data-offer-index]");
        if (dot) { event.stopPropagation(); showOfferSlide(Number(dot.dataset.offerIndex)); }
      };

      // Swipe navigation for touch screens.
      let touchStartX = 0;
      showcase.ontouchstart = (event) => { touchStartX = event.changedTouches?.[0]?.clientX || 0; };
      showcase.ontouchend = (event) => {
        const endX = event.changedTouches?.[0]?.clientX || 0;
        const delta = endX - touchStartX;
        if (Math.abs(delta) > 45 && renderedOfferItems.length > 1) showOfferSlide(activeOfferIndex + (delta < 0 ? 1 : -1));
      };
      showcase.onmouseenter = () => { offerCarouselPaused = true; };
      showcase.onmouseleave = () => { offerCarouselPaused = false; };
      if (renderedOfferItems.length > 1) {
        offerSlideTimer = setInterval(() => {
          if (!document.hidden && !offerCarouselPaused) showOfferSlide(activeOfferIndex + 1);
        }, 3000);
      }
      offerClockTimer = setInterval(updateOfferCountdown, 1000);
    } else {
      showcase.style.display = "none";
    }
  }

  if (offersSection && offersEl) {
    if (renderedOfferItems.length > 1) {
      offersEl.innerHTML = renderedOfferItems.map(({ o, r }) => `<a href="restaurant.html?id=${encodeURIComponent(r.id)}" class="offer-mini-card"><div class="offer-mini-img">${imgTag(o.image || r.image, o.title)}</div><div class="offer-mini-body"><h5>${esc(o.title)}</h5><p>${esc(r.name)}</p></div></a>`).join("");
      offersSection.style.display = "";
    } else {
      offersSection.style.display = "none";
    }
  }
  refreshIcons();
}

let bannerTimer = null;
function renderBanners() {
  const box = document.getElementById("promoSliderContainer"), track = document.getElementById("bannerSlidesWrapper");
  if (!box || !track) return;
  clearInterval(bannerTimer);
  if (!state.banners.length) { box.style.display = "none"; return; }

  track.innerHTML = state.banners.map((b, i) => `<div class="banner-slide-item ${i === 0 ? "active" : ""}">${b.image ? `<img class="banner-img-element" src="${esc(b.image)}" alt="${esc(b.title || "")}" onerror="this.onerror=null;this.style.visibility='hidden'">` : ""}</div>`).join("");
  box.style.display = "";
  const slides = track.querySelectorAll(".banner-slide-item");
  let current = 0;
  const show = (i) => { current = (i + slides.length) % slides.length; slides.forEach((s, idx) => s.classList.toggle("active", idx === current)); };
  slides.forEach((s, idx) => { s.onclick = () => bannerAction(state.banners[idx]); });
  if (slides.length > 1) bannerTimer = setInterval(() => { if (!document.hidden) show(current + 1); }, 4500);
}

function safeLink(link) {
  if (!link) return null;
  const s = String(link).trim();
  if (!s) return null;
  if (/^[a-z0-9_\-]+\.html(\?|#|$)/i.test(s)) return s;
  if (/^\/[^/]/.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^#/.test(s)) return s;
  return null;
}
function bannerAction(b) {
  if (!b) return;
  const link = safeLink(b.link);
  if (link) { location.href = link; return; }
  if (b.restaurantId) { location.href = `restaurant.html?id=${encodeURIComponent(b.restaurantId)}`; return; }
  if (b.category) { location.href = `food.html?category=${encodeURIComponent(b.category)}`; }
}

/* =========================================
   POPULAR CATEGORIES (تم إصلاح التكرار)
========================================= */
const categoriesContainer = document.getElementById("categoriesContainer");

const customCategoryIcons = {
  "asia": "images/food-categories/asia.png",
  "bakery": "images/food-categories/bakery.png",
  "breakfast": "images/food-categories/breakfast.png",
  "burger": "images/food-categories/burger.png",
  "chicken": "images/food-categories/chicken.png",
  "international": "images/food-categories/international.png",
  "moroccan": "images/food-categories/moroccan.png",
  "pizza": "images/food-categories/pizza.png",
  "sandwich": "images/food-categories/sandwich.png",
  "shawarma": "images/food-categories/shawarma.png",
  "sushi": "images/food-categories/sushi.png",
  "vegetarians": "images/food-categories/vegetarians.png",
  // "all": "images/food-categories/all.png" 
};

async function loadCategories() {
  if (!categoriesContainer) return;
  try {
    const snapshot = await getDocs(query(collection(db, "foodCategories"), orderBy("order")));
    
    // زر "الكل" (All)
    let allIconHtml = `<div class="cat-icon-placeholder"><i data-lucide="layout-grid"></i></div>`;
    if (customCategoryIcons["all"]) {
      allIconHtml = `<img src="${customCategoryIcons["all"]}" alt="All" class="cat-custom-img" loading="lazy">`;
    }
    let html = `<a class="category-mini-card active" href="food.html?category=all">${allIconHtml}<span>${esc(t("cat_all"))}</span></a>`;
    
    // ✅ إضافة مصفوفات لتتبع ما تم عرضه ومنع التكرار
    const seenCategories = new Set();
    const seenImages = new Set();

    snapshot.forEach(doc => {
      const item = doc.data();
      if (item.active === false) return;
      
      const slug = (item.slug || doc.id).toLowerCase().trim();
      const name = (item.name || "").toLowerCase().trim();
      
      // البحث عن الصورة
      let imgSrc = customCategoryIcons[slug] || customCategoryIcons[name];

      // إذا لم نجد صورة، نتخطاه
      if (!imgSrc) return;

      // ✅ إذا تم عرض هذا التصنيف مسبقاً (بالاسم أو الرابط أو نفس الصورة)، نتخطاه
      if (seenCategories.has(slug) || seenCategories.has(name) || seenImages.has(imgSrc)) return;

      // تسجيل التصنيف لمنع تكراره
      seenCategories.add(slug);
      seenCategories.add(name);
      seenImages.add(imgSrc);

      html += `
        <a class="category-mini-card" href="food.html?category=${encodeURIComponent(item.slug || doc.id)}">
          <img src="${imgSrc}" alt="${esc(item.name)}" class="cat-custom-img" loading="lazy">
          <span>${esc(item.name)}</span>
        </a>`;
    });
    
    categoriesContainer.innerHTML = html;
    refreshIcons(); 

  } catch (err) {
    categoriesContainer.innerHTML = errorBox("categories");
    setTimeout(refreshIcons, 30);
  }
}

async function loadRestaurantsAndOffers() {
  if (popularEl) popularEl.innerHTML = skeletons(3, "sk-h");
  if (nearbyEl) nearbyEl.innerHTML = skeletons(3, "sk-h");
  if (allListEl) allListEl.innerHTML = skeletons(3, "sk-v");
  try {
    const [restSnap, offerSnap] = await Promise.all([
      getDocs(collection(db, "restaurants")),
      getDocs(collection(db, "offers")).catch(() => null)
    ]);
    state.restaurants = restSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isListed);
    state.offers = offerSnap ? offerSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isOfferValid) : [];
    renderAll();
    updateChipCounts();
  } catch (err) {
    if (popularEl) popularEl.innerHTML = errorBox("restaurants");
    if (nearbyEl) nearbyEl.innerHTML = "";
    if (allListEl) allListEl.innerHTML = "";
  }
}

async function loadBanners() {
  try {
    const snap = await getDocs(collection(db, "banners")), now = new Date();
    state.banners = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => {
      if (b.active === false) return false;
      const s = toDate(b.startAt), e = toDate(b.endAt);
      return !(s && s > now) && !(e && e < now) && !!(b.image || b.title);
    }).sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));
    renderBanners();
  } catch (err) {
    const box = document.getElementById("promoSliderContainer");
    if (box) box.style.display = "none";
  }
}

function renderAll() {
  renderLocationBar();
  renderPopular();
  renderNearby();
  renderAllList();
  renderOffers();
  renderChipsState();
  setTimeout(refreshIcons, 40);
}

/* =========================================
   FILTERS & SEARCH
========================================= */
const chipsRow = document.getElementById("filterChipsRow");
const chipReset = document.getElementById("chipReset");
let filterToastTimer;

function showFilterToast(msg, icon = "check") {
  let el = document.getElementById("filterToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "filterToast";
    el.className = "filter-toast";
    document.body.appendChild(el);
  }
  el.innerHTML = `<i data-lucide="${esc(icon)}"></i><span>${esc(msg)}</span>`;
  el.classList.add("show");
  setTimeout(refreshIcons, 40);
  clearTimeout(filterToastTimer);
  filterToastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function scrollToRestaurantsSection() {
  const section = document.getElementById("allRestaurantsSection");
  if (!section) return;
  window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
  setTimeout(() => {
    section.classList.remove("highlight-flash");
    void section.offsetWidth;
    section.classList.add("highlight-flash");
    setTimeout(() => section.classList.remove("highlight-flash"), 1300);
  }, 400);
}

function updateChipCounts() {
  if (!chipsRow) return;
  chipsRow.querySelectorAll(".chip-filter").forEach(chip => {
    const key = chip.dataset.filter;
    if (!key || key === "all" || key === "near") {
      const b = chip.querySelector(".chip-count");
      if (b) b.remove();
      return;
    }
    
    const count =
      key === "top" ? state.restaurants.filter(r => (ratingOf(r) || 0) >= 4.0).length :
      key === "offers" ? state.restaurants.filter(hasOffer).length :
      key === "free" ? state.restaurants.filter(isFree).length :
      key === "open" ? state.restaurants.filter(isOpenNow).length : 0;
      
    let badge = chip.querySelector(".chip-count");
    if (count > 0) {
      if (!badge) { badge = document.createElement("span"); badge.className = "chip-count"; chip.appendChild(badge); }
      badge.textContent = count;
    } else if (badge) badge.remove();
  });
}

function activateChip(filterKey, options = {}) {
  const { scroll = true, silent = false } = options;
  if (!chipsRow) return;
  chipsRow.querySelectorAll(".chip-filter").forEach(c => c.classList.remove("active"));
  const target = chipsRow.querySelector(`.chip-filter[data-filter="${filterKey}"]`);
  if (target) target.classList.add("active");
  state.filters.clear();
  if (filterKey !== "all") state.filters.add(filterKey);
  if (chipReset) chipReset.classList.toggle("hidden", filterKey === "all");
  renderAllList();
  
  if (!silent && filterKey !== "all") {
    const count = state.restaurants.filter(r =>
      filterKey === "top" ? (ratingOf(r) || 0) >= 4.0 :
      filterKey === "offers" ? hasOffer(r) :
      filterKey === "free" ? isFree(r) :
      filterKey === "open" ? isOpenNow(r) : true
    ).length;
    const unit = count === 1 ? t("result_single") : t("result_plural");
    showFilterToast(`${count} ${unit}`, "check-circle");
  }
  if (scroll) setTimeout(scrollToRestaurantsSection, 100);
}

if (chipsRow) {
  chipsRow.querySelectorAll(".chip-filter").forEach(chip => {
    chip.addEventListener("click", async (e) => {
      e.preventDefault();
      const key = chip.dataset.filter;
      if (chip.id === "chipReset" || key === "all") {
        activateChip("all", { scroll: true, silent: true });
        showFilterToast(t("filters_reset"), "rotate-ccw");
        return;
      }
      if (chip.classList.contains("active") && key !== "all") {
        activateChip("all", { scroll: true, silent: true });
        return;
      }
      if (key === "near") {
        if (!state.userPos) {
          state.userPos = readSavedPosition();
          if (!state.userPos) {
            chip.classList.add("loading");
            state.userPos = await askBrowserPosition();
            chip.classList.remove("loading");
            if (!state.userPos) { showToast(t("location_denied")); return; }
          }
          renderNearby();
        }
      }
      await activateChip(key, { scroll: true });
    });
  });
  let lastY = 0;
  window.addEventListener("scroll", () => {
    const r = chipsRow.getBoundingClientRect();
    if (r.top <= 0 && window.scrollY > lastY) chipsRow.classList.add("sticky");
    else if (window.scrollY < lastY - 20) chipsRow.classList.remove("sticky");
    lastY = window.scrollY;
  }, { passive: true });
}

const searchInput = document.getElementById("searchInput");
const searchDropdown = document.getElementById("searchResultsDropdown");
if (searchInput && searchDropdown) {
  let debounce;
  const runSearch = () => {
    const text = searchInput.value.trim().toLowerCase();
    if (!text) { searchDropdown.classList.add("hidden"); return; }
    const matches = state.restaurants.filter(r =>
      String(r.name || "").toLowerCase().includes(text) ||
      String(r.categoryName || "").toLowerCase().includes(text)
    ).slice(0, 6);
    let html = matches.map(r => `<a href="restaurant.html?id=${encodeURIComponent(r.id)}" class="search-result-row">${imgTag(r.image || r.logo, r.name)}<div class="search-result-info"><h5>${esc(r.name)}</h5><p>${esc(r.categoryName || "")}</p></div></a>`).join("");
    if (!html) html = `<div style="padding:14px; text-align:center; font-size:12px; color:var(--text-secondary);">${esc(t("no_results"))}</div>`;
    html += `<a href="search.html?q=${encodeURIComponent(searchInput.value.trim())}" class="search-see-all">${esc(t("see_results"))} <i data-lucide="arrow-right"></i></a>`;
    searchDropdown.innerHTML = html;
    searchDropdown.classList.remove("hidden");
    setTimeout(refreshIcons, 30);
  };
  searchInput.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(runSearch, 200); });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) location.href = `search.html?q=${encodeURIComponent(searchInput.value.trim())}`;
  });
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) searchDropdown.classList.add("hidden");
  });
}

/* =========================================
   INIT & EVENTS
========================================= */
document.querySelectorAll("[data-soon], #packageServiceBtn, #paraServiceBtn").forEach(el => {
  el.style.cursor = "pointer";
  el.addEventListener("click", () => showToast(t("soon")));
});
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-retry]");
  if (!btn) return;
  if (btn.dataset.retry === "categories") loadCategories();
  else loadRestaurantsAndOffers();
});
document.addEventListener("quickly:langchange", () => { renderAll(); loadCategories(); });

function hideLoader() {
  const l = document.getElementById("customerLoader");
  if (!l) return;
  l.style.opacity = "0";
  setTimeout(() => l.remove(), 300);
}

document.addEventListener("DOMContentLoaded", async () => {
  refreshIcons();
  updateCartBadge();
  renderLocationBar();
  state.userPos = readSavedPosition();

  const safety = setTimeout(hideLoader, 4000);
  try {
    await Promise.all([loadCategories(), loadRestaurantsAndOffers(), loadBanners()]);
  } finally {
    clearTimeout(safety);
    hideLoader();
    setTimeout(refreshIcons, 100);
    setTimeout(refreshIcons, 500);
  }
});