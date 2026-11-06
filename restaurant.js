import { db } from "./firebase.js";
import { isFavorite, toggleFavorite } from "./favorites.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ✅ استيراد دالة العداد
import { bindCartBadge } from "./cart.js";

// Keep the restaurant and menu page direction in sync with the selected app language.
const pageLang = (window.QuicklyCore && QuicklyCore.getLang) ? QuicklyCore.getLang() : "fr";
const safePageLang = ["ar", "fr", "en"].includes(String(pageLang).toLowerCase()) ? String(pageLang).toLowerCase() : "fr";
document.documentElement.lang = safePageLang;
document.documentElement.dir = safePageLang === "ar" ? "rtl" : "ltr";

const params = new URLSearchParams(window.location.search);
const restaurantId = params.get("id");

const hero = document.getElementById("restaurantHero");
const info = document.getElementById("restaurantInfo");
const backBtn = document.getElementById("backBtn");
const favoriteBtn = document.getElementById("favoriteBtn");

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

backBtn.addEventListener("click", () => {
  if (document.referrer) window.history.back();
  else window.location.href = "food.html";
});

const FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="#F3F4F6"/><text x="200" y="140" font-size="72" text-anchor="middle" fill="#9CA3AF">🍽️</text></svg>'
);

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ✅ دوال التقييم الذكية */
function ratingOf(r) {
  if (!r) return null;
  let raw = r.ratingStats?.average ?? r.rating ?? r.averageRating ?? r.avgRating ?? r.ratingAverage ?? r.rate ?? r.stars ?? r.score ?? r.ratingValue ?? r.reviewsRating;
  if (raw && typeof raw === 'object') {
    raw = raw.average ?? raw.score ?? raw.value ?? raw.overall ?? raw.rating ?? raw.stars;
  }
  if (typeof raw === 'string') {
    raw = raw.replace(',', '.');
    const match = raw.match(/(\d+(\.\d+)?)/);
    if (match) raw = match[0];
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function reviewsCountOf(r) {
  if (!r) return 0;
  let raw = r.ratingStats?.count ?? r.reviewsCount ?? r.ratingCount ?? r.totalRatings ?? r.reviewCount ?? r.reviews ?? r.ratings ?? r.count;
  if (Array.isArray(raw)) return raw.length;
  if (raw && typeof raw === 'object') {
    raw = raw.count ?? raw.total ?? raw.length;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function renderRestaurant(item) {
  const rt = ratingOf(item);
  const rv = reviewsCountOf(item);
  
  let ratingHtml = "";
  if (rt) {
    ratingHtml = `
            <span style="display:flex; align-items:center; gap:4px;">
                <i data-lucide="star" class="star-icon"></i>
                <span>${rt.toFixed(1)}</span>
                ${rv > 0 ? `<span style="color:var(--text-secondary); font-weight:normal; font-size:12px;">(${rv})</span>` : ""}
            </span>
        `;
  } else {
    ratingHtml = `<span style="color:var(--primary); font-weight:700;">جديد</span>`;
  }
  
  const isOpen = item.isOpen !== false;
  const statusColor = isOpen ? "var(--primary)" : "var(--danger)";
  const statusText = isOpen ? "مفتوح" : "مغلق";
  
  const fee = item.freeDelivery || Number(item.deliveryFee) === 0 ?
    `<span style="color:var(--primary); font-weight:700;">توصيل مجاني</span>` :
    `<span>${item.deliveryFee ?? 0} DH</span>`;
  
  hero.innerHTML = `
    <div class="restaurant-cover">
      ${item.image ? `<img class="cover-image" src="${esc(item.image)}" alt="${esc(item.name || "")}" onerror="this.src='${FALLBACK}'">` : `<div class="restaurant-cover" style="background:#F3F4F6"></div>`}
      <div class="cover-overlay"></div>
    </div>
  `;
  
  info.innerHTML = `
    <div class="restaurant-logo-wrapper">
      <img class="restaurant-logo" src="${esc(item.logo || item.image || FALLBACK)}" alt="${esc(item.name || "")}" onerror="this.src='${FALLBACK}'">
    </div>
    <div class="restaurant-info-card">
      <div class="restaurant-top">
        <div class="restaurant-main">
          <h1>${esc(item.name || "Restaurant")}</h1>
          
          <div class="restaurant-rating">
            ${ratingHtml}
            <span class="dot">•</span>
            ${esc(item.categoryName || item.cuisine || item.category || "Restaurant")}
            <span class="dot">•</span>
            <span style="color:${statusColor}; font-weight:700;">${statusText}</span>
          </div>
          
          <div class="restaurant-meta">
            <span><i data-lucide="clock" style="width:14px;height:14px;"></i> ${esc(item.deliveryTime || "30 min")}</span>
            <span><i data-lucide="bike" style="width:14px;height:14px;"></i> ${fee}</span>
          </div>
        </div>
        <button class="info-btn">Info</button>
      </div>
    </div>
  `;
  
  refreshIcons();
}

function updateFavoriteUI() {
  const fav = isFavorite(restaurantId);
  if (fav) {
    favoriteBtn.classList.add("is-fav");
  } else {
    favoriteBtn.classList.remove("is-fav");
  }
}

function loadRestaurant() {
  if (!restaurantId) {
    info.innerHTML = "<h2 style='text-align:center; padding:40px;'>Restaurant introuvable</h2>";
    return;
  }
  
  updateFavoriteUI();
  
  const ref = doc(db, "restaurants", restaurantId);
  onSnapshot(ref, snapshot => {
    if (!snapshot.exists()) {
      info.innerHTML = "<h2 style='text-align:center; padding:40px;'>Restaurant introuvable</h2>";
      return;
    }
    renderRestaurant(snapshot.data());
  });
}

favoriteBtn.onclick = () => {
  toggleFavorite(restaurantId);
  updateFavoriteUI();
};

// ✅ تفعيل عداد السلة في الزر العائم
const cartBadgeEl = document.getElementById("cartBadge");
if (cartBadgeEl) {
  bindCartBadge(cartBadgeEl);
}

document.addEventListener("DOMContentLoaded", refreshIcons);

loadRestaurant();