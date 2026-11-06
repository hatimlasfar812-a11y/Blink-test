import { auth, db } from "./firebase.js";
import { getCart, clearCart, getItemTotal, getDeliveryFee } from "./cart.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
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
    wallet_pay: "Solde Quickly Wallet",
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
    wallet_pay: "محفظة Quickly",
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
    wallet_pay: "Quickly Wallet",
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

function getLang() {
  const l = (window.QuicklyCore && QuicklyCore.getLang) ? QuicklyCore.getLang() : "fr";
  return translations[l] ? l : "fr";
}
const lang = getLang();
const t = key => translations[lang][key] || translations.en[key] || key;

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  document.title = "Quickly - " + t("checkout_title");
}

function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }

/* =========================================
   HELPERS & INIT
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

const SERVICE_FEE = 2;
const PENDING_ORDER_KEY = "pendingOrderId";

let toastTimer;
function showToast(msg) {
  const el = document.getElementById("checkoutToast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

if (backBtn) backBtn.onclick = () => history.back();
if (changeAddressBtn) changeAddressBtn.onclick = () => { location.href = "addresses.html"; };

const cart = getCart() || [];
const DELIVERY_FEE = getDeliveryFee();
let subtotalValue = 0;

const vendorIds = new Set(cart.map(i => i.restaurantId || "").filter(Boolean));
const hasMixedVendors = vendorIds.size > 1;

const savedAddress = localStorage.getItem("selectedAddress");
if (deliveryAddress) deliveryAddress.textContent = savedAddress || t("address_req");

if (orderItems) {
  if (cart.length === 0) {
    orderItems.innerHTML = `<p style="font-size:13px; color:var(--text-secondary); text-align:center;">${t("empty_cart")}</p>`;
  } else {
    orderItems.innerHTML = cart.map(item => {
      const qty = Number(item.quantity) || 1;
      const lineTotal = getItemTotal(item);
      subtotalValue += lineTotal;
      return `
        <div class="order-item-row">
          <div class="order-item-name">${qty} × ${item.name || "Produit"}</div>
          <div class="order-item-price">${lineTotal.toFixed(2)} ${t("currency")}</div>
        </div>`;
    }).join("");
  }
}

function getTotal() { return Math.max(0, subtotalValue + DELIVERY_FEE + SERVICE_FEE); }

function updateTotals() {
  if (subtotalEl) subtotalEl.textContent = `${subtotalValue.toFixed(2)} ${t("currency")}`;
  if (document.getElementById("deliveryFee")) document.getElementById("deliveryFee").textContent = `${DELIVERY_FEE.toFixed(2)} ${t("currency")}`;
  if (document.getElementById("serviceFee")) document.getElementById("serviceFee").textContent = `${SERVICE_FEE.toFixed(2)} ${t("currency")}`;
  if (totalPriceEl) totalPriceEl.textContent = `${getTotal().toFixed(2)} ${t("currency")}`;
}

if (discountRow) discountRow.style.display = "none";
if (couponInput) { couponInput.disabled = true; couponInput.placeholder = t("coupon_placeholder"); }
if (applyCouponBtn) { applyCouponBtn.disabled = true; }
if (couponMessage) { couponMessage.textContent = t("coupon_disabled"); }

/* =========================================
   AUTH & ORDER SUBMISSION
========================================= */
let currentUser = null;
onAuthStateChanged(auth, user => { currentUser = user; });

function getPendingOrderId() {
  let id = sessionStorage.getItem(PENDING_ORDER_KEY);
  if (!id) {
    id = doc(collection(db, "orders")).id;
    sessionStorage.setItem(PENDING_ORDER_KEY, id);
  }
  return id;
}

function finishOrder(orderId) {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
  clearCart();
  localStorage.setItem("lastOrderId", orderId);
  location.href = "order-success.html";
}

function resetButton() {
  placeOrderBtn.disabled = false;
  placeOrderBtn.textContent = t("confirm_order");
}

let isSubmitting = false;

if (placeOrderBtn) {
  placeOrderBtn.onclick = async () => {
    if (isSubmitting) return;
    
    if (!currentUser) { showToast(t("login_req")); setTimeout(() => location.href = "profile.html", 1500); return; }
    if (cart.length === 0) { showToast(t("empty_cart")); return; }
    if (hasMixedVendors) { showToast(t("mixed_vendors")); return; }
    if (!localStorage.getItem("selectedAddress")) { showToast(t("address_req")); return; }
    if (!navigator.onLine) { showToast(t("no_internet")); return; }
    
    isSubmitting = true;
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = t("validating");
    
    const orderId = getPendingOrderId();
    const orderRef = doc(db, "orders", orderId);
    const cleanItems = JSON.parse(JSON.stringify(cart));
    const restId = cart[0]?.restaurantId;
    
    // ✅ جلب تفاصيل المطعم والزبون قبل الحفظ
    let restaurantLocation = null;
    let restaurantAddress = "";
    let restaurantPhone = "";
    let customerName = currentUser.displayName || "Customer";
    let customerPhone = currentUser.phoneNumber || "";

    try {
      if (restId) {
        const restSnap = await getDoc(doc(db, "restaurants", restId));
        if (restSnap.exists()) {
          const rData = restSnap.data();
          restaurantLocation = rData.location || rData.coordinates || null;
          restaurantAddress = rData.address || rData.city || rData.location?.address || "";
          restaurantPhone = rData.phone || "";
        }
      }

      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (userSnap.exists()) {
        const uData = userSnap.data();
        customerName = uData.name || uData.fullName || customerName;
        customerPhone = uData.phone || customerPhone;
      }
    } catch (e) {
      console.warn("Could not fetch extra details for order:", e);
    }

    const orderData = {
      userId: currentUser.uid,  
      uid: currentUser.uid,     
      orderNumber: orderId.slice(0, 8).toUpperCase(),
      
      restaurantId: restId || "",
      restaurantName: cart[0].restaurantName || "Restaurant Quickly",
      restaurantLogo: cart[0].restaurantLogo || "",
      restaurantLocation: restaurantLocation, 
      restaurantAddress: restaurantAddress,
      restaurantPhone: restaurantPhone,
      
      customerName: customerName,             
      customerPhone: customerPhone,           
      
      items: cleanItems,
      subtotal: subtotalValue,
      deliveryFee: DELIVERY_FEE,
      serviceFee: SERVICE_FEE,
      discount: 0,
      total: getTotal(),
      paymentMethod: "Cash",
      status: "pending",
      
      address: localStorage.getItem("selectedAddress"),
      latitude: localStorage.getItem("latitude") || null,
      longitude: localStorage.getItem("longitude") || null,
      building: localStorage.getItem("building") || "",
      floor: localStorage.getItem("floor") || "",
      note: (document.getElementById("orderNote")?.value || "").slice(0, 500),
      
      createdAt: serverTimestamp()
    };
    
    try {
      await setDoc(orderRef, orderData);

      // إضافة النقاط للزبون
      const earnedPoints = Math.floor(getTotal() / 10);
      
      if (earnedPoints > 0) {
        try {
          const pointRef = doc(db, "pointTransactions", `${orderId}_points`);
          const userRef = doc(db, "users", currentUser.uid);
          await runTransaction(db, async transaction => {
            const pointSnap = await transaction.get(pointRef);
            if (pointSnap.exists()) return;
            transaction.update(userRef, { points: increment(earnedPoints) });
            transaction.set(pointRef, {
              userId: currentUser.uid,
              orderId,
              title: `طلب رقم #${orderId.slice(0, 6).toUpperCase()}`,
              amount: earnedPoints,
              createdAt: serverTimestamp()
            });
          });
        } catch (pointErr) {
          console.error("Points award failed:", pointErr);
        }
      }

      finishOrder(orderId);

    } catch (err) {
      console.error("Checkout Error:", err);
      try {
        const existing = await getDoc(orderRef);
        if (existing.exists()) { finishOrder(orderId); return; }
      } catch (_) {}
      
      showToast(err?.code === "permission-denied" ? t("error_perm") : t("error_order"));
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