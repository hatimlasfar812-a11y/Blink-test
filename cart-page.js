import {
  CART_EVENT,
  getCart,
  getCartCount,
  getCartSubtotal,
  getCartTotal,
  getDeliveryFee,
  getItemUnitPrice,
  getItemTotal,
  getVendors,
  keepOnlyVendor,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  buildCheckoutPayload,
  bindCartBadge
} from "./cart.js";

/* ---------------- i18n ---------------- */
const I18N = {
  fr: {
    title: "Votre panier",
    empty: "Votre panier est vide",
    emptyHint: "Ajoutez quelque chose de délicieux pour commencer.",
    browse: "Voir les magasins",
    clear: "Vider",
    confirmClear: "Sûr ?",
    subtotal: "Sous-total",
    delivery: "Livraison",
    total: "Total",
    checkout: "Passer la commande",
    sauce: "Sauce",
    extras: "Suppléments",
    without: "Sans",
    remove: "Supprimer",
    currency: "DH",
    attention: "Attention",
    conflictHint: "Une seule boutique par commande. Terminez ou annulez votre commande actuelle avant de commander dans une autre boutique. Votre panier actuel reste conservé :",
    keep: "Garder"
  },
  ar: {
    title: "سلة المشتريات",
    empty: "سلتك فارغة",
    emptyHint: "أضف شيئاً لذيذاً للبدء.",
    browse: "تصفح المتاجر",
    clear: "إفراغ",
    confirmClear: "تأكيد؟",
    subtotal: "المجموع الفرعي",
    delivery: "التوصيل",
    total: "الإجمالي",
    checkout: "إتمام الطلب",
    sauce: "الصلصة",
    extras: "إضافات",
    without: "بدون",
    remove: "حذف",
    currency: "درهم",
    attention: "تنبيه",
    conflictHint: "يمكنك الطلب من مطعم أو متجر واحد فقط في كل طلب. أتمم طلبك الحالي أو ألغِه أولاً، وبعدها يمكنك الطلب من متجر آخر. لن نفقد محتويات سلتك الحالية:",
    keep: "احتفظ بـ"
  },
  en: {
    title: "Your Cart",
    empty: "Your cart is empty",
    emptyHint: "Add something delicious to get started.",
    browse: "Browse stores",
    clear: "Clear",
    confirmClear: "Sure?",
    subtotal: "Subtotal",
    delivery: "Delivery",
    total: "Total",
    checkout: "Checkout",
    sauce: "Sauce",
    extras: "Extras",
    without: "Without",
    remove: "Remove",
    currency: "MAD",
    attention: "Warning",
    conflictHint: "Only one store can be included in each order. Complete or cancel your current order before ordering from another store. Your current cart will be kept:",
    keep: "Keep"
  }
};

function getLang() {
  const l = (window.QuicklyCore ? QuicklyCore.getLang() : "fr").toLowerCase();
  return I18N[l] ? l : "fr";
}

const lang = getLang();
const t = I18N[lang];
document.documentElement.lang = lang;
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

/* ---------------- utilities ---------------- */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function money(value) {
  const n = Number(value);
  return (Number.isFinite(n) ? n : 0).toFixed(2) + " " + t.currency;
}

function optionNames(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((v) => (v && typeof v === "object" ? v.name : v)).filter(Boolean).map(String);
}

function formatExtras(extras, currency) {
  if (!Array.isArray(extras) || extras.length === 0) return "";
  return extras.map((e) => {
    if (e && typeof e === "object") {
      const price = Number(e.price);
      return Number.isFinite(price) && price > 0 ? `${e.name} (+${price} ${currency})` : String(e.name || "");
    }
    return String(e);
  }).filter(Boolean).join(", ");
}

// ✅ صورة بديلة بدون إيموجي
const FALLBACK_IMG = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><rect width='90' height='90' fill='#F3F4F6'/><path d='M45 30v30M30 45h30' stroke='#9CA3AF' stroke-width='4' stroke-linecap='round'/></svg>`);

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

/* ---------------- DOM refs ---------------- */
const $ = (id) => document.getElementById(id);

const cartItemsEl = $("cartItems");
const cartTotalEl = $("cartTotal");
const subtotalValueEl = $("subtotalValue");
const deliveryValueEl = $("deliveryValue");
const checkoutBtn = $("checkoutBtn");
const clearBtn = $("clearBtn");
const footer = $("cartFooter");
const conflictBox = $("vendorConflict");
const backBtn = $("backBtn");
const pageTitleEl = $("pageTitle");
const subtotalLabelEl = $("subtotalLabel");
const deliveryLabelEl = $("deliveryLabel");
const totalLabelEl = $("totalLabel");
const vendorNameEl = $("vendorName");

/* ---------------- bind header badges ---------------- */
["globalCartBadge", "cartBadge", "headerCartBadge", "cart-count", "cartCountBadge"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) bindCartBadge(el);
});

/* ---------------- header text ---------------- */
if (pageTitleEl) pageTitleEl.textContent = t.title;
if (subtotalLabelEl) subtotalLabelEl.textContent = t.subtotal;
if (deliveryLabelEl) deliveryLabelEl.textContent = t.delivery;
if (totalLabelEl) totalLabelEl.textContent = t.total;
if (checkoutBtn) checkoutBtn.textContent = t.checkout;
document.title = t.title + " · Quickly";

/* ---------------- render helpers ---------------- */
function renderConflict(vendors) {
  if (!conflictBox) return;
  if (vendors.length <= 1) {
    conflictBox.hidden = true;
    conflictBox.innerHTML = "";
    return;
  }
  conflictBox.hidden = false;
  conflictBox.innerHTML = `
    <div class="conflict-title"><i data-lucide="triangle-alert"></i> ${esc(t.attention)}</div>
    <p>${esc(t.conflictHint)}</p>
    <div class="conflict-actions">
      ${vendors.map((v) => `<button class="keep-btn" data-vendor="${esc(v.id)}">${esc(t.keep)} ${esc(v.name || "Store")}</button>`).join("")}
    </div>`;
  refreshIcons();
}

function renderEmpty(backHref) {
  if (!cartItemsEl) return;
  cartItemsEl.innerHTML = `
    <div class="empty">
      <div class="empty-icon"><i data-lucide="shopping-bag"></i></div>
      <h3>${esc(t.empty)}</h3>
      <p>${esc(t.emptyHint)}</p>
      <a href="${esc(backHref)}" class="empty-btn">${esc(t.browse)}</a>
    </div>`;

  if (footer) footer.hidden = true;
  if (clearBtn) clearBtn.hidden = true;
  if (conflictBox) conflictBox.hidden = true;
  document.body.classList.add("is-empty");
  refreshIcons();
}

/* ---------------- main render ---------------- */
function render() {
  const cart = getCart();
  const vendors = getVendors();
  const first = cart[0];

  const vendorId = first?.restaurantId || localStorage.getItem("restaurantId") || localStorage.getItem("vendorId") || "";
  let backHref = "food.html";
  if (vendorId === "carrefour") {
    backHref = "carrefour.html";
  } else if (vendorId) {
    backHref = `restaurant.html?id=${encodeURIComponent(vendorId)}`;
  }
  
  if (vendorNameEl) vendorNameEl.textContent = vendors.length === 1 ? first?.restaurantName || "" : "";

  /* Empty cart */
  if (cart.length === 0) {
    renderEmpty(backHref);
    return;
  }

  document.body.classList.remove("is-empty");
  if (footer) footer.hidden = false;
  if (clearBtn) clearBtn.hidden = false;

  renderConflict(vendors);

  /* Items */
  if (cartItemsEl) {
    cartItemsEl.innerHTML = cart.map((item, index) => {
      const sauces = optionNames(item.sauce);
      const extrasText = formatExtras(item.extras, t.currency);
      const without = optionNames(item.without);
      const lineTotal = getItemTotal(item);
      const unitTotal = getItemUnitPrice(item);
      const hasOptions = unitTotal > (Number(item.price) || 0);

      return `
        <article class="cart-item">
          <img src="${esc(item.image || FALLBACK_IMG)}" class="cart-image" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
          <div class="cart-info">
            <div class="cart-top">
              <h3>${esc(item.name)}</h3>
              <button class="delete-item" data-index="${index}" aria-label="${esc(t.remove)}"><i data-lucide="trash-2"></i></button>
            </div>
            ${sauces.length ? `<p class="opt"><strong>${esc(t.sauce)}:</strong> ${esc(sauces.join(", "))}</p>` : ""}
            ${extrasText ? `<p class="opt"><strong>${esc(t.extras)}:</strong> ${esc(extrasText)}</p>` : ""}
            ${without.length ? `<p class="opt"><strong>${esc(t.without)}:</strong> ${esc(without.join(", "))}</p>` : ""}
            <div class="cart-bottom">
              <span class="price">
                ${money(lineTotal)}
                ${hasOptions ? `<small>(${money(unitTotal)} × ${item.quantity})</small>` : ""}
              </span>
              <div class="qty-box">
                <button class="minus" data-index="${index}" aria-label="−">−</button>
                <span>${item.quantity}</span>
                <button class="plus" data-index="${index}" aria-label="+">+</button>
              </div>
            </div>
          </div>
        </article>`;
    }).join("");
    refreshIcons();
  }

  /* Update Totals */
  const subtotal = getCartSubtotal();
  const delivery = getDeliveryFee();
  const total = getCartTotal();

  if (subtotalValueEl) subtotalValueEl.textContent = money(subtotal);
  if (deliveryValueEl) deliveryValueEl.textContent = money(delivery);
  if (cartTotalEl) cartTotalEl.textContent = money(total);

  /* Block checkout if conflict */
  if (checkoutBtn) checkoutBtn.disabled = vendors.length > 1;
}

/* ---------------- Events ---------------- */

// 1. زر الرجوع
if (backBtn) {
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      const cart = getCart();
      const vid = cart[0]?.restaurantId || "";
      window.location.href = vid === "carrefour" ? "carrefour.html" : (vid ? `restaurant.html?id=${vid}` : "food.html");
    }
  });
}

// 2. زر الحذف (تأكيد بالنقر المزدوج)
let clearTimer = null;
if (clearBtn) {
  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (clearBtn.dataset.confirm === "true") {
      clearCart();
      clearBtn.dataset.confirm = "false";
      clearBtn.innerHTML = `<i data-lucide="trash-2"></i> <span>${t.clear}</span>`;
      render();
      refreshIcons();
    } else {
      clearBtn.dataset.confirm = "true";
      clearBtn.innerHTML = `<i data-lucide="check"></i> <span>${t.confirmClear}</span>`;
      refreshIcons();
      
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        clearBtn.dataset.confirm = "false";
        clearBtn.innerHTML = `<i data-lucide="trash-2"></i> <span>${t.clear}</span>`;
        refreshIcons();
      }, 3000);
    }
  });
}

// 3. الأحداث داخل السلة
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || btn === clearBtn) return;

  if (btn.classList.contains("keep-btn")) {
    keepOnlyVendor(btn.dataset.vendor);
    return;
  }

  const index = Number(btn.dataset.index);
  if (!Number.isFinite(index)) return;

  if (btn.classList.contains("plus")) increaseQuantity(index);
  else if (btn.classList.contains("minus")) decreaseQuantity(index);
  else if (btn.classList.contains("delete-item")) removeFromCart(index);
});

// 4. زر إتمام الطلب
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", () => {
    if (getCart().length === 0 || checkoutBtn.disabled) return;
    const payload = buildCheckoutPayload();
    try {
      sessionStorage.setItem("checkout_payload", JSON.stringify(payload));
    } catch (err) {
      console.warn("Could not persist checkout payload:", err);
    }
    location.href = "checkout.html";
  });
}

window.addEventListener(CART_EVENT, render);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});

/* First paint */
render();