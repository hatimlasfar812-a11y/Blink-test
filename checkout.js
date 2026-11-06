
import { auth, db } from "./firebase.js";
import {
  getCart,
  clearCart,
  getItemTotal,
  getDeliveryFee
} from "./cart.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  increment,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================
   BLINK — CHECKOUT
   Order Schema Version 2
========================================= */

/* =========================================
   TRANSLATIONS
========================================= */

const translations = {
  fr: {
    checkout_title: "Finaliser la commande",
    delivery_address: "Adresse de livraison",
    change: "Changer",
    order_summary: "Résumé de la commande",
    delivery_notes: "Instructions pour le livreur",
    notes_placeholder: "Ex: Veuillez sonner à l'interphone, étage 2...",
    payment_method: "Mode de paiement",
    cash_pay: "Paiement à la livraison (Cash)",
    cash_pay_desc: "Payez en espèces dès réception de votre commande.",
    card_pay: "Carte Bancaire (CB)",
    wallet_pay: "Solde Blink Wallet",
    coming_soon: "Bientôt disponible",
    coupon_code: "Code Promo",
    apply: "Appliquer",
    coupon_disabled: "Les codes promo seront bientôt disponibles.",
    coupon_placeholder: "Codes promo bientôt disponibles",
    subtotal: "Sous-total",
    delivery_fee: "Frais de livraison",
    service_fee: "Frais de service",
    discount: "Réduction",
    total_pay: "Total à payer",
    confirm_order: "Valider la commande",
    validating: "Validation en cours...",
    empty_cart: "Votre panier est vide.",
    login_req: "Veuillez vous connecter pour valider votre commande.",
    mixed_vendors: "Votre panier contient des produits de plusieurs établissements.",
    address_req: "Veuillez choisir une adresse de livraison.",
    no_internet: "Pas de connexion Internet. Vérifiez votre connexion puis réessayez.",
    error_order: "Erreur lors de la validation. Veuillez réessayer.",
    error_perm: "Impossible de valider. Veuillez vous reconnecter.",
    currency: "DH"
  },

  ar: {
    checkout_title: "إتمام الطلب",
    delivery_address: "عنوان التوصيل",
    change: "تغيير",
    order_summary: "ملخص الطلب",
    delivery_notes: "تعليمات للسائق",
    notes_placeholder: "مثال: يرجى الضغط على الجرس، الطابق الثاني...",
    payment_method: "طريقة الدفع",
    cash_pay: "الدفع عند الاستلام (نقداً)",
    cash_pay_desc: "ادفع نقداً عند استلام طلبك.",
    card_pay: "بطاقة بنكية (CB)",
    wallet_pay: "محفظة Blink",
    coming_soon: "قريباً",
    coupon_code: "رمز الخصم",
    apply: "تطبيق",
    coupon_disabled: "رموز الخصم ستكون متاحة قريباً.",
    coupon_placeholder: "قريباً",
    subtotal: "المجموع الفرعي",
    delivery_fee: "رسوم التوصيل",
    service_fee: "رسوم الخدمة",
    discount: "الخصم",
    total_pay: "الإجمالي المطلوب",
    confirm_order: "تأكيد الطلب",
    validating: "جاري التأكيد...",
    empty_cart: "سلتك فارغة.",
    login_req: "يرجى تسجيل الدخول لتأكيد طلبك.",
    mixed_vendors: "سلتك تحتوي على منتجات من متاجر مختلفة.",
    address_req: "يرجى اختيار عنوان التوصيل.",
    no_internet: "لا يوجد اتصال بالإنترنت.",
    error_order: "خطأ أثناء تأكيد الطلب. حاول مجدداً.",
    error_perm: "تعذر تأكيد الطلب. يرجى تسجيل الدخول مجدداً.",
    currency: "درهم"
  },

  en: {
    checkout_title: "Checkout",
    delivery_address: "Delivery Address",
    change: "Change",
    order_summary: "Order Summary",
    delivery_notes: "Delivery Instructions",
    notes_placeholder: "E.g. Ring the bell, 2nd floor...",
    payment_method: "Payment Method",
    cash_pay: "Cash on Delivery",
    cash_pay_desc: "Pay cash upon receiving your order.",
    card_pay: "Credit Card (CB)",
    wallet_pay: "Blink Wallet",
    coming_soon: "Coming soon",
    coupon_code: "Coupon Code",
    apply: "Apply",
    coupon_disabled: "Coupon codes will be available soon.",
    coupon_placeholder: "Coming soon",
    subtotal: "Subtotal",
    delivery_fee: "Delivery Fee",
    service_fee: "Service Fee",
    discount: "Discount",
    total_pay: "Total to pay",
    confirm_order: "Confirm Order",
    validating: "Validating...",
    empty_cart: "Your cart is empty.",
    login_req: "Please log in to confirm your order.",
    mixed_vendors: "Your cart contains items from multiple stores.",
    address_req: "Please choose a delivery address.",
    no_internet: "No internet connection.",
    error_order: "Error validating order. Please try again.",
    error_perm: "Could not validate order. Please log in again.",
    currency: "MAD"
  }
};

/* =========================================
   LANGUAGE
========================================= */

function getLang() {
  const l =
    window.QuicklyCore && window.QuicklyCore.getLang
      ? window.QuicklyCore.getLang()
      : "fr";

  return translations[l] ? l : "fr";
}

const lang = getLang();

const t = key =>
  translations[lang][key] ||
  translations.en[key] ||
  key;

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute(
    "dir",
    lang === "ar" ? "rtl" : "ltr"
  );

  document.title = "Blink - " + t("checkout_title");
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* =========================================
   DOM ELEMENTS
========================================= */

const orderItems = document.getElementById("orderItems");
const subtotalEl = document.getElementById("subtotal");
const totalPriceEl = document.getElementById("totalPrice");

const deliveryAddress = document.getElementById("deliveryAddress");
const placeOrderBtn = document.getElementById("placeOrder");

const changeAddressBtn = document.getElementById("changeAddress");
const backBtn = document.getElementById("backBtn");

const couponInput = document.getElementById("couponInput");
const applyCouponBtn = document.getElementById("applyCouponBtn");
const couponMessage = document.getElementById("couponMessage");
const discountRow = document.getElementById("discountRow");

/* =========================================
   CONFIGURATION
========================================= */

const ORDER_SCHEMA_VERSION = 2;

const SERVICE_FEE = 2;
const CURRENCY = "MAD";

const PENDING_ORDER_KEY = "pendingOrderId";

const DEFAULT_PAYMENT_METHOD = "Cash";

/* =========================================
   TOAST
========================================= */

let toastTimer;

function showToast(msg) {
  const el = document.getElementById("checkoutToast");

  if (!el) return;

  el.textContent = msg;
  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}

/* =========================================
   NAVIGATION
========================================= */

if (backBtn) {
  backBtn.onclick = () => history.back();
}

if (changeAddressBtn) {
  changeAddressBtn.onclick = () => {
    location.href = "addresses.html";
  };
}

/* =========================================
   CART
========================================= */

const cart = getCart() || [];

const DELIVERY_FEE = Number(getDeliveryFee()) || 0;

let subtotalValue = 0;

const vendorIds = new Set(
  cart
    .map(item => item.restaurantId || "")
    .filter(Boolean)
);

const hasMixedVendors = vendorIds.size > 1;

/* =========================================
   SAFE HELPERS
========================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[char];
  });
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getStoredCoordinate(key) {
  return toNumber(localStorage.getItem(key));
}

function getTotal() {
  return Math.max(
    0,
    subtotalValue + DELIVERY_FEE + SERVICE_FEE
  );
}

/* =========================================
   DISPLAY ADDRESS
========================================= */

const savedAddress = localStorage.getItem("selectedAddress");

if (deliveryAddress) {
  deliveryAddress.textContent =
    savedAddress || t("address_req");
}

/* =========================================
   DISPLAY CART ITEMS
========================================= */

if (orderItems) {
  if (cart.length === 0) {
    orderItems.innerHTML = `
      <p style="
        font-size:13px;
        color:var(--text-secondary);
        text-align:center;
      ">
        ${t("empty_cart")}
      </p>
    `;
  } else {
    orderItems.innerHTML = cart.map(item => {
      const qty = Number(item.quantity) || 1;
      const lineTotal = Number(getItemTotal(item)) || 0;

      subtotalValue += lineTotal;

      return `
        <div class="order-item-row">
          <div class="order-item-name">
            ${qty} × ${escapeHTML(item.name || "Produit")}
          </div>

          <div class="order-item-price">
            ${lineTotal.toFixed(2)} ${t("currency")}
          </div>
        </div>
      `;
    }).join("");
  }
}

/* =========================================
   PRICE DISPLAY
========================================= */

function updateTotals() {
  if (subtotalEl) {
    subtotalEl.textContent =
      `${subtotalValue.toFixed(2)} ${t("currency")}`;
  }

  const deliveryFeeEl = document.getElementById("deliveryFee");

  if (deliveryFeeEl) {
    deliveryFeeEl.textContent =
      `${DELIVERY_FEE.toFixed(2)} ${t("currency")}`;
  }

  const serviceFeeEl = document.getElementById("serviceFee");

  if (serviceFeeEl) {
    serviceFeeEl.textContent =
      `${SERVICE_FEE.toFixed(2)} ${t("currency")}`;
  }

  if (totalPriceEl) {
    totalPriceEl.textContent =
      `${getTotal().toFixed(2)} ${t("currency")}`;
  }
}

/* =========================================
   COUPONS
========================================= */

if (discountRow) {
  discountRow.style.display = "none";
}

if (couponInput) {
  couponInput.disabled = true;
  couponInput.placeholder = t("coupon_placeholder");
}

if (applyCouponBtn) {
  applyCouponBtn.disabled = true;
}

if (couponMessage) {
  couponMessage.textContent = t("coupon_disabled");
}

/* =========================================
   AUTHENTICATION
========================================= */

let currentUser = auth.currentUser || null;

onAuthStateChanged(auth, user => {
  currentUser = user;
});

/* =========================================
   PENDING ORDER ID
========================================= */

function getPendingOrderId() {
  let id = sessionStorage.getItem(PENDING_ORDER_KEY);

  if (!id) {
    id = doc(collection(db, "orders")).id;

    sessionStorage.setItem(
      PENDING_ORDER_KEY,
      id
    );
  }

  return id;
}

/* =========================================
   ORDER FINISH
========================================= */

function finishOrder(orderId) {
  sessionStorage.removeItem(PENDING_ORDER_KEY);

  clearCart();

  localStorage.setItem("lastOrderId", orderId);

  location.href = "order-success.html";
}

/* =========================================
   BUTTON RESET
========================================= */

function resetButton() {
  if (!placeOrderBtn) return;

  placeOrderBtn.disabled = false;
  placeOrderBtn.textContent = t("confirm_order");
}

/* =========================================
   LOCATION NORMALIZATION
========================================= */

function buildPickupLocation({
  restaurantName,
  restaurantAddress,
  restaurantLocation,
  restaurantPhone
}) {
  let latitude = null;
  let longitude = null;

  if (restaurantLocation && typeof restaurantLocation === "object") {
    latitude = toNumber(
      restaurantLocation.latitude ??
      restaurantLocation.lat
    );

    longitude = toNumber(
      restaurantLocation.longitude ??
      restaurantLocation.lng ??
      restaurantLocation.lon
    );
  }

  return {
    name: restaurantName || "",
    address: restaurantAddress || "",

    latitude,
    longitude,

    phone: restaurantPhone || ""
  };
}

function buildDeliveryLocation() {
  return {
    address: localStorage.getItem("selectedAddress") || "",

    latitude: getStoredCoordinate("latitude"),
    longitude: getStoredCoordinate("longitude"),

    building: localStorage.getItem("building") || "",
    floor: localStorage.getItem("floor") || ""
  };
}

/* =========================================
   PRICING NORMALIZATION
========================================= */

function buildPricing() {
  return {
    currency: CURRENCY,

    subtotal: Number(subtotalValue.toFixed(2)),

    deliveryFee: Number(DELIVERY_FEE.toFixed(2)),

    serviceFee: Number(SERVICE_FEE.toFixed(2)),

    discount: 0,

    total: Number(getTotal().toFixed(2)),

    status: "pending_server_validation"
  };
}

/* =========================================
   ORDER DATA — SCHEMA VERSION 2
========================================= */

function buildOrderData({
  orderId,
  user,
  restaurant,
  customer,
  cleanItems
}) {
  const now = serverTimestamp();

  const restaurantName =
    restaurant.name || "Restaurant Blink";

  const restaurantLocation = buildPickupLocation({
    restaurantName,
    restaurantAddress: restaurant.address,
    restaurantLocation: restaurant.location,
    restaurantPhone: restaurant.phone
  });

  const deliveryLocation = buildDeliveryLocation();

  const pricing = buildPricing();

  const note = (
    document.getElementById("orderNote")?.value || ""
  ).slice(0, 500);

  return {
    /* -------------------------------------
       SCHEMA
    ------------------------------------- */

    schemaVersion: ORDER_SCHEMA_VERSION,

    /* -------------------------------------
       ORDER CLASSIFICATION
    ------------------------------------- */

    orderType: "restaurant",

    source: "customer_app",

    serviceType: "food",

    /* -------------------------------------
       ORDER IDENTIFIERS
    ------------------------------------- */

    userId: user.uid,

    uid: user.uid,

    orderNumber: orderId.slice(0, 8).toUpperCase(),

    /* -------------------------------------
       RESTAURANT — LEGACY COMPATIBILITY
    ------------------------------------- */

    restaurantId: restaurant.id || "",

    restaurantName,

    restaurantLogo: restaurant.logo || "",

    restaurantLocation: restaurant.location || null,

    restaurantAddress: restaurant.address || "",

    restaurantPhone: restaurant.phone || "",

    /* -------------------------------------
       PICKUP LOCATION
    ------------------------------------- */

    pickup: restaurantLocation,

    /* -------------------------------------
       DELIVERY LOCATION
    ------------------------------------- */

    delivery: deliveryLocation,

    /* -------------------------------------
       CUSTOMER
    ------------------------------------- */

    customerName: customer.name,

    customerPhone: customer.phone,

    /* -------------------------------------
       ITEMS
    ------------------------------------- */

    items: cleanItems,

    itemCount: cleanItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 1);
    }, 0),

    /* -------------------------------------
       PRICING — LEGACY FIELDS PRESERVED
    ------------------------------------- */

    subtotal: pricing.subtotal,

    deliveryFee: pricing.deliveryFee,

    serviceFee: pricing.serviceFee,

    discount: pricing.discount,

    total: pricing.total,

    currency: CURRENCY,

    pricing,

    /* -------------------------------------
       PAYMENT
    ------------------------------------- */

    paymentMethod: DEFAULT_PAYMENT_METHOD,

    paymentStatus: "pending",

    /* -------------------------------------
       ORDER STATUS
    ------------------------------------- */

    status: "pending",

    confirmationStatus: "pending",

    dispatchStatus: "not_started",

    /* -------------------------------------
       DRIVER — LEGACY FIELDS PRESERVED
    ------------------------------------- */

    driverId: null,

    offeredTo: null,

    offerExpiresAt: null,

    driverLocation: null,

    /* -------------------------------------
       ORDER CREATOR
    ------------------------------------- */

    createdBy: {
      uid: user.uid,
      role: "customer",
      source: "customer_app"
    },

    /* -------------------------------------
       NOTES
    ------------------------------------- */

    note,

    /* -------------------------------------
       TIMESTAMPS
    ------------------------------------- */

    createdAt: now,

    updatedAt: now,

    statusUpdatedAt: now
  };
}

/* =========================================
   ORDER SUBMISSION
========================================= */

let isSubmitting = false;

if (placeOrderBtn) {
  placeOrderBtn.onclick = async () => {
    if (isSubmitting) return;

    /* -------------------------------------
       VALIDATION
    ------------------------------------- */

    const user = currentUser || auth.currentUser;

    if (!user) {
      showToast(t("login_req"));

      setTimeout(() => {
        location.href = "profile.html";
      }, 1500);

      return;
    }

    currentUser = user;

    if (cart.length === 0) {
      showToast(t("empty_cart"));
      return;
    }

    if (hasMixedVendors) {
      showToast(t("mixed_vendors"));
      return;
    }

    if (!localStorage.getItem("selectedAddress")) {
      showToast(t("address_req"));
      return;
    }

    if (!navigator.onLine) {
      showToast(t("no_internet"));
      return;
    }

    /* -------------------------------------
       START SUBMISSION
    ------------------------------------- */

    isSubmitting = true;

    placeOrderBtn.disabled = true;

    placeOrderBtn.textContent = t("validating");

    const orderId = getPendingOrderId();

    const orderRef = doc(db, "orders", orderId);

    const cleanItems = JSON.parse(
      JSON.stringify(cart)
    );

    const restId = cart[0]?.restaurantId || "";

    /* -------------------------------------
       CUSTOMER DEFAULT DATA
    ------------------------------------- */

    let restaurantData = {
      id: restId,
      name: cart[0]?.restaurantName || "Restaurant Blink",
      logo: cart[0]?.restaurantLogo || "",
      location: null,
      address: "",
      phone: ""
    };

    let customerData = {
      name: user.displayName || "Customer",
      phone: user.phoneNumber || ""
    };

    /* -------------------------------------
       FETCH RESTAURANT AND CUSTOMER
    ------------------------------------- */

    try {
      if (restId) {
        const restSnap = await getDoc(
          doc(db, "restaurants", restId)
        );

        if (restSnap.exists()) {
          const rData = restSnap.data();

          restaurantData = {
            id: restId,

            name:
              rData.name ||
              restaurantData.name,

            logo:
              rData.logo ||
              rData.image ||
              restaurantData.logo,

            location:
              rData.location ||
              rData.coordinates ||
              null,

            address:
              rData.address ||
              rData.city ||
              rData.location?.address ||
              "",

            phone:
              rData.phone || ""
          };
        }
      }

      const userSnap = await getDoc(
        doc(db, "users", user.uid)
      );

      if (userSnap.exists()) {
        const uData = userSnap.data();

        customerData = {
          name:
            uData.name ||
            uData.fullName ||
            customerData.name,

          phone:
            uData.phone ||
            customerData.phone
        };
      }
    } catch (error) {
      console.warn(
        "Could not fetch extra order details:",
        error
      );
    }

    /* -------------------------------------
       BUILD ORDER
    ------------------------------------- */

    const orderData = buildOrderData({
      orderId,

      user,

      restaurant: restaurantData,

      customer: customerData,

      cleanItems
    });

    /* -------------------------------------
       SAVE ORDER
    ------------------------------------- */

    try {
      await setDoc(orderRef, orderData);

      /* -----------------------------------
         CUSTOMER POINTS
      ----------------------------------- */

      const earnedPoints = Math.floor(
        getTotal() / 10
      );

      if (earnedPoints > 0) {
        try {
          const pointRef = doc(
            db,
            "pointTransactions",
            `${orderId}_points`
          );

          const userRef = doc(
            db,
            "users",
            user.uid
          );

          await runTransaction(db, async transaction => {
            const pointSnap = await transaction.get(pointRef);

            if (pointSnap.exists()) {
              return;
            }

            transaction.update(userRef, {
              points: increment(earnedPoints)
            });

            transaction.set(pointRef, {
              userId: user.uid,

              orderId,

              title:
                `طلب رقم #${orderId.slice(0, 6).toUpperCase()}`,

              amount: earnedPoints,

              createdAt: serverTimestamp()
            });
          });

        } catch (pointErr) {
          console.error(
            "Points award failed:",
            pointErr
          );
        }
      }

      /* -----------------------------------
         FINISH
      ----------------------------------- */

      finishOrder(orderId);

    } catch (err) {
      console.error("Checkout Error:", err);

      /* -----------------------------------
         CHECK IF ORDER WAS ALREADY SAVED
      ----------------------------------- */

      try {
        const existing = await getDoc(orderRef);

        if (existing.exists()) {
          finishOrder(orderId);
          return;
        }

      } catch (_) {}

      showToast(
        err?.code === "permission-denied"
          ? t("error_perm")
          : t("error_order")
      );

      isSubmitting = false;

      resetButton();
    }
  };
}

/* =========================================
   BOOT
========================================= */

applyLanguage();

updateTotals();

refreshIcons();
