import { auth, db } from "./firebase.js";
import { collection, getDocs, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

function showFatalError(msg) {
  const grid = document.getElementById("shopsGridContainer");
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:30px; background:#fef2f2; border:1px solid #fecaca; border-radius:12px; color:#b91c1c; margin: 20px auto; max-width: 500px;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:30px; margin-bottom:10px;"></i>
        <p style="font-weight:bold; font-size:16px;">حدث خطأ أثناء التحميل</p>
        <p style="font-size:13px; direction:ltr; word-break:break-all; background:#fff; padding:10px; border-radius:8px; margin-top:10px;">${msg}</p>
      </div>`;
  }
}

const state = {
  allStores: [], currentStoreProducts: [],
  category: "all", search: "", sort: "default",
  onlyFeatured: false, onlyRated: false, storesUnsubscribe: null
};

const CATEGORY_ALIASES = {
  fashion: ["fashion", "أزياء", "ملابس"],
  electronics: ["electronics", "إلكترونيات", "تقنية"],
  perfume: ["perfume", "عطور", "عطر"],
  accessories: ["accessories", "إكسسوارات"],
  home: ["home", "منزل", "ديكور"],
  sports: ["sports", "رياضة"],
  gifts: ["gifts", "هدايا"],
  other: ["other", "أخرى"]
};

async function boot() {
  initDrawerAndNav();
  renderLocationBar();
  try { initUserProfileListener(); } catch (e) {}
  injectToastContainer();

  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get("id");

  if (storeId) {
    showDetailsView();
    await loadSingleStoreDetails(storeId);
  } else {
    showListView();
    initStoresRealtimeListener();
    setupCategoryFilters();
    setupSearchInput();
    setupFilterButton();
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

function initDrawerAndNav() {
  const menuToggleBtn = document.getElementById("menuToggleBtn");
  const sideDrawer = document.getElementById("sideDrawer");
  const drawerOverlay = document.getElementById("drawerOverlay");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");

  if (menuToggleBtn && sideDrawer && drawerOverlay) {
    menuToggleBtn.addEventListener("click", () => {
      sideDrawer.classList.add("open");
      drawerOverlay.classList.remove("hidden");
    });
    const close = () => {
      sideDrawer.classList.remove("open");
      drawerOverlay.classList.add("hidden");
    };
    if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", close);
    drawerOverlay.addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  const updateCart = () => {
    const badge = document.getElementById("cartBadgeCount");
    if (!badge) return;
    try {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.style.display = count > 0 ? "flex" : "none";
    } catch (e) {}
  };
  updateCart();
  window.addEventListener("cart:changed", updateCart);
}

function renderLocationBar() {
  const el = document.getElementById("locationText");
  if (!el) return;
  el.textContent = localStorage.getItem("selectedAddress") || "اختر عنوانك...";
}

function initUserProfileListener() {
  const profileImgEl = document.getElementById("userProfileImg");
  if (!profileImgEl || !auth) return;
  onAuthStateChanged(auth, user => {
    if (user) profileImgEl.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "U")}&background=0878D1&color=fff`;
    else profileImgEl.src = "https://cdn-icons-png.flaticon.com/512/1144/1144760.png";
  });
}

function injectToastContainer() {
  if (!document.getElementById("toast-container")) {
    const c = document.createElement("div");
    c.id = "toast-container";
    document.body.appendChild(c);
  }
}

function showListView() {
  document.getElementById("shopsListView")?.classList.remove("hidden-view");
  document.getElementById("storeDetailsView")?.classList.add("hidden-view");
}

function showDetailsView() {
  document.getElementById("shopsListView")?.classList.add("hidden-view");
  document.getElementById("storeDetailsView")?.classList.remove("hidden-view");
}

function initStoresRealtimeListener() {
  const gridContainer = document.getElementById("shopsGridContainer");
  if (!gridContainer) return;

  if (state.storesUnsubscribe) state.storesUnsubscribe();
  renderSkeletonGrid(gridContainer);

  // ✅ Admin يستعمل collection "stores"
  state.storesUnsubscribe = onSnapshot(
    collection(db, "stores"),
    snapshot => {
      state.allStores = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      renderShops();
    },
    error => {
      console.error("Firebase error:", error);
      showFatalError(`فشل الاتصال بقاعدة البيانات: ${error.message}`);
    }
  );
}

function normalizeCategory(raw) { return String(raw || "").toLowerCase().trim(); }

function matchesCategory(val, filter) {
  if (filter === "all") return true;
  const aliases = CATEGORY_ALIASES[filter] || [filter];
  return aliases.some(a => normalizeCategory(a) === normalizeCategory(val));
}

function applyFilters() {
  let list = [...state.allStores];
  // ✅ Admin stores section: "shops" | "parapharmacy" — نفلتر على section
  const shopStores = list.filter(s => s.section === "shops" || !s.section);
  list = shopStores;

  if (state.category !== "all") list = list.filter(s => matchesCategory(s.categoryType || s.category, state.category));

  const q = state.search.toLowerCase().trim();
  if (q) list = list.filter(s => String(s.name || "").toLowerCase().includes(q) || String(s.categoryType || s.category || "").toLowerCase().includes(q));

  if (state.onlyFeatured) list = list.filter(s => s.isFeatured === true || s.todayOffer === true);

  return list;
}

function renderShops() {
  const grid = document.getElementById("shopsGridContainer");
  if (!grid) return;
  const list = applyFilters();
  grid.setAttribute("aria-busy", "false");

  if (!list.length) {
    grid.innerHTML = `<div class="state-box"><i class="fa-solid fa-store-slash"></i><p class="state-title">لا توجد نتائج مطابقة</p></div>`;
    return;
  }
  grid.innerHTML = list.map(store => {
    const name = String(store.name || "").trim() || "متجر بدون اسم";
    const catName = String(store.categoryType || store.category || "").trim();
    const img = String(store.image || "").trim();
    return `
      <a href="shops.html?id=${encodeURIComponent(store.id)}" class="shop-card">
        <div class="shop-img-box">
          ${img ? `<img src="${esc(img)}" loading="lazy">` : ""}
          ${catName ? `<span class="category-tag"><i class="fa-solid fa-tag"></i>${esc(catName)}</span>` : ""}
          ${store.isFeatured ? `<span class="featured-badge"><i class="fa-solid fa-star"></i> مميز</span>` : ""}
        </div>
        <div class="shop-info">
          <div class="shop-title-row"><h4>${esc(name)}</h4></div>
        </div>
      </a>`;
  }).join("");
}

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderSkeletonGrid(container) {
  container.innerHTML = Array.from({ length: 4 }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-info"><div class="skeleton-line w-70"></div><div class="skeleton-line w-40"></div></div>
    </div>`).join("");
}

function setupCategoryFilters() {
  document.querySelectorAll(".cat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.category = btn.dataset.category || "all";
      renderShops();
    });
  });
}

function setupSearchInput() {
  const input = document.getElementById("shopSearchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  if (!input) return;
  let timer;
  input.addEventListener("input", e => {
    state.search = e.target.value;
    if (clearBtn) clearBtn.classList.toggle("hidden", !e.target.value);
    clearTimeout(timer);
    timer = setTimeout(renderShops, 180);
  });
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = ""; state.search = ""; clearBtn.classList.add("hidden"); renderShops();
    });
  }
}

function setupFilterButton() {
  const openBtn = document.getElementById("openFilterBtn");
  const modal = document.getElementById("filterModal");
  if (!openBtn || !modal) return;

  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    const body = document.getElementById("filterModalBody");
    if (body) {
      body.innerHTML = `
        <div class="filter-option-row ${state.onlyFeatured ? "selected" : ""}" id="toggleFeatured">
          <span>المتاجر المميزة فقط</span><i class="fa-solid fa-check check"></i>
        </div>
        <button class="retry-btn" style="width:100%; margin-top:20px;" id="applyBtn">تطبيق</button>`;
      document.getElementById("toggleFeatured").addEventListener("click", function () {
        state.onlyFeatured = !state.onlyFeatured;
        this.classList.toggle("selected", state.onlyFeatured);
      });
      document.getElementById("applyBtn").addEventListener("click", () => {
        renderShops();
        modal.classList.add("hidden");
      });
    }
  });

  document.getElementById("closeFilterModal")?.addEventListener("click", () => modal.classList.add("hidden"));
}

async function loadSingleStoreDetails(storeId) {
  const hero = document.getElementById("storeHeroContainer");
  const grid = document.getElementById("storeProductsGrid");
  if (!hero || !grid) return;

  try {
    const { getDoc } = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js");
    const storeSnap = await getDoc(doc(db, "stores", storeId));
    if (!storeSnap.exists()) {
      hero.innerHTML = `<div class="state-box error"><p>المتجر غير موجود.</p></div>`;
      return;
    }
    const store = storeSnap.data();
    hero.innerHTML = `
      ${store.image ? `<img src="${store.image}" style="width:100%; height:200px; object-fit:cover;">` : ""}
      <div class="store-hero-body" style="padding:20px;"><h2>${esc(store.name || "متجر")}</h2></div>`;

    grid.innerHTML = `<div class="loading-box"><p>جاري جلب المنتجات...</p></div>`;
    const productsSnap = await getDocs(collection(db, "stores", storeId, "products"));

    if (productsSnap.empty) {
      grid.innerHTML = `<div class="state-box"><p>لا توجد منتجات.</p></div>`;
      return;
    }

    grid.innerHTML = productsSnap.docs.map(d => {
      const p = d.data();
      return `
        <div class="shop-card" style="padding:12px; cursor:default;">
          <img src="${esc(p.image || "")}" style="width:100%; height:120px; border-radius:10px; object-fit:cover;">
          <h4 style="margin-top:8px;">${esc(p.name)}</h4>
          <p style="color:var(--shops-primary); font-weight:bold; margin-top:4px;">${Number(p.price || 0).toFixed(2)} د.م</p>
        </div>`;
    }).join("");
  } catch (err) {
    showFatalError(err.message);
  }
}