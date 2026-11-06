import { db } from "./firebase.js";
import { addToCart, bindCartBadge } from "./cart.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { resolveOptionGroups, groupLabel } from "./menu-options.js";

/* =========================================
   TRANSLATIONS
========================================= */
const translations = {
  fr: {
    loading: "Chargement du menu...",
    no_products: "Aucun produit disponible.",
    no_products_cat: "Aucun produit dans cette catégorie.",
    error_load: "Erreur lors du chargement du menu.",
    all: "Tout",
    add_to_cart: "Ajouter au panier",
    currency: "DH",
    required: "(Requis)",
    choose_req: "Veuillez choisir",
    added_to_cart: "Ajouté au panier",
    different_store: "Votre panier contient déjà des articles d’un autre restaurant. Terminez ou annulez cette commande avant d’en commencer une nouvelle. Votre panier actuel est conservé.",
    close: "Fermer"
  },
  ar: {
    loading: "جاري تحميل المنيو...",
    no_products: "لا توجد منتجات متاحة.",
    no_products_cat: "لا توجد منتجات في هذه الفئة.",
    error_load: "حدث خطأ أثناء تحميل المنيو.",
    all: "الكل",
    add_to_cart: "إضافة للسلة",
    currency: "د.م",
    required: "(مطلوب)",
    choose_req: "الرجاء اختيار",
    added_to_cart: "تمت الإضافة للسلة",
    different_store: "سلتك تحتوي بالفعل على منتجات من مطعم آخر. أتمم طلبك الحالي أو ألغِه أولاً قبل الطلب من مطعم جديد. لا تقلق، سلتك الحالية محفوظة ولم نحذف منها أي شيء.",
    close: "إغلاق"
  },
  en: {
    loading: "Loading menu...",
    no_products: "No products available.",
    no_products_cat: "No products in this category.",
    error_load: "Error loading menu.",
    all: "All",
    add_to_cart: "Add to cart",
    currency: "MAD",
    required: "(Required)",
    choose_req: "Please choose",
    added_to_cart: "Added to cart",
    different_store: "Your cart already contains items from another restaurant. Complete or cancel that order before starting a new one. Your current cart is safe and has not been changed.",
    close: "Close"
  }
};

function getLang() {
  const l = (window.QuicklyCore && QuicklyCore.getLang) ? QuicklyCore.getLang() : "fr";
  return translations[l] ? l : "fr";
}
const lang = getLang();
const t = key => translations[lang][key] || translations.en[key] || key;

/* =========================================
   HELPERS
========================================= */
const params = new URLSearchParams(window.location.search);
const restaurantId = params.get("id");

const productModal = document.getElementById("productModal");
const menuContainer = document.getElementById("restaurantMenu");
const categoriesContainer = document.getElementById("restaurantCategories");

const FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#F3F4F6"/><path d="M50 30v40M30 50h40" stroke="#9CA3AF" stroke-width="4" stroke-linecap="round"/></svg>'
);

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function showToast(message, type = "success") {
  let el = document.getElementById("menuToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "menuToast";
    el.className = "menu-toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.dataset.type = type;
  el.classList.toggle("error", type === "error");
  el.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.classList.remove("show"), type === "error" ? 4500 : 2500);
}

let restaurant = {};
let products = [];
let currentCategory = "All";

async function fetchOptionsFromFirebase(type) {
  try {
    const docRef = doc(db, "menuOptions", type);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
}

/* =========================================
   LOAD MENU
========================================= */
async function loadMenu() {
  if (!restaurantId || !menuContainer) return;
  
  // عرض Skeleton أثناء التحميل
  menuContainer.innerHTML = Array(4).fill(`
    <div class="menu-card skeleton-card">
      <div class="food-info">
        <div class="sk-line w-60"></div>
        <div class="sk-line w-80"></div>
        <div class="sk-line w-40"></div>
      </div>
      <div class="food-image sk-img"></div>
    </div>
  `).join("");
  
  try {
    const restaurantDoc = await getDoc(doc(db, "restaurants", restaurantId));
    restaurant = restaurantDoc.exists() ? restaurantDoc.data() : {};
    
    const snapshot = await getDocs(collection(db, "restaurants", restaurantId, "menu"));
    
    products = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        image: data.image || ""
      };
    });
    
    if (products.length === 0) {
      menuContainer.innerHTML = `<p class="empty-state">${t("no_products")}</p>`;
      return;
    }
    
    createCategories();
    renderProducts(products);
    
  } catch (err) {
    console.error(err);
    menuContainer.innerHTML = `<p class="error-state">${t("error_load")}</p>`;
  }
}

/* =========================================
   RENDER CATEGORIES
========================================= */
function createCategories() {
  categoriesContainer.innerHTML = "";
  const uniqueCats = [...new Set(products.map(p => p.category).filter(Boolean))];
  const allCats = ["All", ...uniqueCats];
  
  allCats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "category-btn" + (cat === "All" ? " active" : "");
    btn.textContent = cat === "All" ? t("all") : cat;
    
    btn.onclick = () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = cat;
      
      const filtered = cat === "All" ? products : products.filter(p => p.category === cat);
      renderProducts(filtered);
    };
    
    categoriesContainer.appendChild(btn);
  });
}

/* =========================================
   RENDER PRODUCTS
========================================= */
function renderProducts(list) {
  if (!list.length) {
    menuContainer.innerHTML = `<p class="empty-state">${t("no_products_cat")}</p>`;
    return;
  }
  
  menuContainer.innerHTML = list.map(item => `
    <div class="menu-card" data-id="${item.id}">
      <div class="food-info">
        <h3>${item.name || "Product"}</h3>
        <p>${item.description || ""}</p>
        <h4>${Number(item.price || 0).toFixed(2)} ${t("currency")}</h4>
      </div>
      <div class="food-image">
        <img src="${item.image || FALLBACK_IMG}" alt="${item.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
        <button class="product-plus" aria-label="Add">
          <i data-lucide="plus" style="width:16px;height:16px;stroke-width:3;"></i>
        </button>
      </div>
    </div>
  `).join("");
  
  refreshIcons();
}

// Event Delegation للمنتجات
menuContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".menu-card");
  if (card) {
    openProductModal(card.dataset.id);
  }
});

/* =========================================
   PRODUCT MODAL
========================================= */
async function openProductModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  
  const content = document.getElementById("productContent");
  
  content.innerHTML = `
    <div class="pm-image-wrap">
      <button class="pm-close-btn" onclick="closeProductModal()">
        <i data-lucide="x"></i>
      </button>
      <img src="${product.image || FALLBACK_IMG}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
    </div>
    <div class="pm-content">
      <h2 class="pm-title">${product.name}</h2>
      <p class="pm-desc">${product.description || ''}</p>
      <div id="pm-options-container">
         <p style="text-align:center; color:var(--text-secondary); font-size:13px;">${t("loading")}</p>
      </div>
    </div>
    <div class="pm-footer">
      <button class="pm-add-btn" id="pm-add-to-cart">
        <span>${t("add_to_cart")}</span>
        <span id="pm-total-price">${Number(product.price || 0).toFixed(2)} ${t("currency")}</span>
      </button>
    </div>
  `;
  
  productModal.classList.add("active");
  document.body.style.overflow = 'hidden';
  refreshIcons();
  
  // جلب الخيارات
  const optionsData = await resolveOptionGroups(product, fetchOptionsFromFirebase);
  const optionsContainer = document.getElementById("pm-options-container");
  
  if (!optionsData || !optionsData.groups || optionsData.groups.length === 0) {
    optionsContainer.innerHTML = ""; 
  } else {
    optionsContainer.innerHTML = optionsData.groups.map((group, index) => `
      <details class="pm-option-group" ${group.required ? 'open' : ''}>
        <summary>
          ${groupLabel(group, lang)} 
          ${group.required ? `<span style="color:var(--danger); font-size:12px;">${t("required")}</span>` : ''}
        </summary>
        <div class="pm-option-list">
          ${group.options.map(opt => `
            <label class="pm-option-item">
              <div class="pm-option-left">
                <input 
                  type="${group.type === 'single' ? 'radio' : 'checkbox'}" 
                  name="group-${index}" 
                  value="${opt.name}" 
                  data-price="${opt.price}"
                  data-group-key="${group.key}"
                >
                <span>${opt.name}</span>
              </div>
              ${opt.price > 0 ? `<span class="pm-option-price">+ ${opt.price.toFixed(2)} ${t("currency")}</span>` : ''}
            </label>
          `).join("")}
        </div>
      </details>
    `).join("");
    
    // تحديث السعر عند التحديد
    const inputs = optionsContainer.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('change', () => updateModalPrice(product.price));
    });
  }
  
  // زر الإضافة للسلة
  const addBtn = document.getElementById("pm-add-to-cart");
  addBtn.onclick = () => {
    // التحقق من الحقول الإجبارية
    if (optionsData && optionsData.groups) {
      for (let i = 0; i < optionsData.groups.length; i++) {
        const group = optionsData.groups[i];
        if (group.required) {
          const checked = optionsContainer.querySelector(`input[name="group-${i}"]:checked`);
          if (!checked) {
            showToast(`${t("choose_req")} ${groupLabel(group, lang)}`);
            return;
          }
        }
      }
    }
    
    // تجهيز الخيارات بالشكل الذي يتوقعه ملف cart.js
    const sauce = [];
    const extras = [];
    const without = [];
    
    optionsContainer.querySelectorAll('input:checked').forEach(input => {
      const groupKey = String(input.dataset.groupKey).toLowerCase();
      const optionObj = {
        name: input.value,
        price: Number(input.dataset.price) || 0
      };
      
      // ربط الخيارات بأسماء الحقول المتوقعة في cart.js
      if (groupKey === "sauces" || groupKey === "sauce") {
        sauce.push(optionObj);
      } else if (groupKey === "extras" || groupKey === "with") {
        extras.push(optionObj);
      } else if (groupKey === "without") {
        without.push(optionObj);
      } else {
        extras.push(optionObj); // أي شيء آخر نضعه في الإضافات
      }
    });
    
    // إرسال المنتج للسلة
    const cartProduct = {
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0, // السعر الأساسي فقط
      image: product.image,
      restaurantId: restaurantId,
      restaurantName: restaurant.name || "Restaurant",
      restaurantLogo: restaurant.logo || "",
      sauce: sauce,
      extras: extras,
      without: without,
      quantity: 1
    };
    
    const added = addToCart(cartProduct);
    if (added === false) {
      showToast(t("different_store"), "error");
      return;
    }
    showToast(t("added_to_cart"));
    closeProductModal();
  };
}

window.closeProductModal = function() {
  productModal.classList.remove("active");
  document.body.style.overflow = '';
};

function updateModalPrice(basePrice) {
  let total = Number(basePrice) || 0;
  const optionsContainer = document.getElementById("pm-options-container");
  optionsContainer.querySelectorAll('input:checked').forEach(input => {
    total += Number(input.dataset.price) || 0;
  });
  const priceEl = document.getElementById("pm-total-price");
  if (priceEl) priceEl.textContent = `${total.toFixed(2)} ${t("currency")}`;
}

productModal.addEventListener('click', function(e) {
  if (e.target === this) window.closeProductModal();
});

/* =========================================
   CART BADGE
========================================= */
const cartBadgeEl = document.getElementById("cartBadge");
if (cartBadgeEl) bindCartBadge(cartBadgeEl);

// Start
loadMenu();