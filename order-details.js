import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =========================================
// TRANSLATIONS
// =========================================
const translations = {
  fr: {
    page_title: "Détails de la commande",
    order_num: "Commande",
    items_title: "Articles commandés",
    address_title: "Adresse de livraison",
    payment_title: "Méthode de paiement",
    summary_title: "Résumé du paiement",
    subtotal: "Sous-total",
    delivery_fee: "Frais de livraison",
    service_fee: "Frais de service",
    total: "Total",
    timeline_title: "Suivi de la commande",
    status_placed: "Commande validée",
    status_preparing: "En cours de préparation",
    status_driver: "Livreur assigné",
    status_way: "En route vers vous",
    status_delivered: "Livré avec succès",
    status_cancelled: "Commande annulée",
    status_pending: "En attente",
    help_title: "Besoin d'aide ?",
    contact_support: "Contacter le support",
    track_live: "Suivre sur la carte en direct",
    no_order: "Aucune commande trouvée.",
    not_found: "Commande introuvable.",
    error_load: "Erreur lors du chargement des détails.",
    building: "Bâtiment",
    floor: "Étage / Appt",
    note: "Note",
    cash: "Espèces à la livraison (COD)",
    default_rest: "Restaurant Quickly"
  },
  ar: {
    page_title: "تفاصيل الطلب",
    order_num: "طلب رقم",
    items_title: "المنتجات المطلوبة",
    address_title: "عنوان التوصيل",
    payment_title: "طريقة الدفع",
    summary_title: "ملخص الدفع",
    subtotal: "المجموع الفرعي",
    delivery_fee: "رسوم التوصيل",
    service_fee: "رسوم الخدمة",
    total: "الإجمالي",
    timeline_title: "تتبع الطلب",
    status_placed: "تم تأكيد الطلب",
    status_preparing: "قيد التحضير",
    status_driver: "تم تعيين سائق",
    status_way: "في الطريق إليك",
    status_delivered: "تم التوصيل بنجاح",
    status_cancelled: "تم إلغاء الطلب",
    status_pending: "قيد الانتظار",
    help_title: "تحتاج مساعدة؟",
    contact_support: "اتصل بالدعم",
    track_live: "تتبع على الخريطة مباشرة",
    no_order: "لم يتم العثور على طلب.",
    not_found: "الطلب غير موجود.",
    error_load: "خطأ في تحميل التفاصيل.",
    building: "المبنى",
    floor: "الطابق / الشقة",
    note: "ملاحظة",
    cash: "الدفع عند الاستلام (COD)",
    default_rest: "مطعم Quickly"
  },
  en: {
    page_title: "Order Details",
    order_num: "Order",
    items_title: "Ordered Items",
    address_title: "Delivery Address",
    payment_title: "Payment Method",
    summary_title: "Payment Summary",
    subtotal: "Subtotal",
    delivery_fee: "Delivery Fee",
    service_fee: "Service Fee",
    total: "Total",
    timeline_title: "Order Tracking",
    status_placed: "Order Confirmed",
    status_preparing: "Preparing",
    status_driver: "Driver Assigned",
    status_way: "On the way",
    status_delivered: "Delivered Successfully",
    status_cancelled: "Order Cancelled",
    status_pending: "Pending",
    help_title: "Need Help?",
    contact_support: "Contact Support",
    track_live: "Track on Live Map",
    no_order: "No order found.",
    not_found: "Order not found.",
    error_load: "Error loading details.",
    building: "Building",
    floor: "Floor / Apt",
    note: "Note",
    cash: "Cash on Delivery (COD)",
    default_rest: "Quickly Restaurant"
  }
};

function getLang() {
  const l = QuicklyCore.getLang ? QuicklyCore.getLang() : "fr";
  return translations[l] ? l : "fr";
}

const lang = getLang();
const dict = translations[lang];
const t = key => dict[key] ?? translations.en[key] ?? key;

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  const root = document.documentElement;
  root.setAttribute("lang", lang);
  root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  document.title = "Quickly - " + t("page_title");
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// =========================================
// INIT & LOGIC
// =========================================
applyLanguage();

const urlParams = new URLSearchParams(window.location.search);
let orderId = urlParams.get("id") || localStorage.getItem("lastOrderId");

const backBtn = document.getElementById("backBtn");
const restaurantName = document.getElementById("restaurantName");
const orderNumber = document.getElementById("orderNumber");
const statusBadge = document.getElementById("orderStatus");
const addressContainer = document.getElementById("addressContainer");
const itemsContainer = document.getElementById("itemsContainer");
const paymentMethodEl = document.getElementById("paymentMethod");

const subtotal = document.getElementById("subtotal");
const deliveryFee = document.getElementById("deliveryFee");
const serviceFee = document.getElementById("serviceFee");
const totalPrice = document.getElementById("totalPrice");

if (backBtn) backBtn.onclick = () => history.back();

// Track Button URL logic
const trackBtn = document.getElementById("trackBtn");
if (trackBtn) {
  trackBtn.onclick = () => {
    window.location.href = `track-order.html?id=${encodeURIComponent(orderId || "")}`;
  };
}

function showError(msg) {
  document.getElementById("mainContainer").innerHTML = `
    <div style="text-align:center; padding:40px 20px;">
      <i data-lucide="triangle-alert" style="width:48px; height:48px; color:var(--danger); margin-bottom:16px;"></i>
      <h3 style="font-size:16px; font-weight:700;">${msg}</h3>
      <button onclick="history.back()" style="margin-top:16px; padding:10px 20px; border-radius:8px; background:var(--surface); border:1px solid var(--border); cursor:pointer; font-family:inherit;">
        ${lang === 'ar' ? 'رجوع' : 'Retour'}
      </button>
    </div>
  `;
  refreshIcons();
}

async function loadOrder() {
  if (!orderId) {
    showError(t("no_order"));
    return;
  }
  
  try {
    const snap = await getDoc(doc(db, "orders", orderId));
    
    if (!snap.exists()) {
      showError(t("not_found"));
      return;
    }
    
    const order = snap.data();
    
    // 1. Restaurant & Order Number
    if (restaurantName) restaurantName.textContent = order.restaurantName || t("default_rest");
    if (orderNumber) orderNumber.textContent = `${t("order_num")} #${orderId.slice(0, 8).toUpperCase()}`;
    
    // 2. Status Badge
    const currentStatus = String(order.status || "pending").toLowerCase();
    if (statusBadge) {
      let badgeText = t(`status_${currentStatus}`) || t("status_pending");
      if (badgeText.startsWith("status_")) badgeText = t("status_pending"); // fallback
      
      statusBadge.textContent = badgeText;
      statusBadge.className = "status"; // reset
      
      if (currentStatus === "pending") statusBadge.classList.add("badge-pending");
      else if (currentStatus === "preparing") statusBadge.classList.add("badge-preparing");
      else if (currentStatus === "driver assigned") statusBadge.classList.add("badge-driver");
      else if (currentStatus === "on the way") statusBadge.classList.add("badge-way");
      else if (currentStatus === "delivered") statusBadge.classList.add("badge-delivered");
      else if (currentStatus === "cancelled" || currentStatus === "canceled") statusBadge.classList.add("badge-cancelled");
      else statusBadge.classList.add("badge-pending");
    }
    
    // 3. Timeline Steps
    const timelineMap = {
      "pending": ["stepPlaced"],
      "preparing": ["stepPlaced", "stepPreparing"],
      "driver assigned": ["stepPlaced", "stepPreparing", "stepDriver"],
      "on the way": ["stepPlaced", "stepPreparing", "stepDriver", "stepWay"],
      "delivered": ["stepPlaced", "stepPreparing", "stepDriver", "stepWay", "stepDelivered"]
    };
    
    document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
    const activeSteps = timelineMap[currentStatus] || ["stepPlaced"];
    activeSteps.forEach(stepId => {
      const el = document.getElementById(stepId);
      if (el) el.classList.add("active");
    });
    
    // 4. Address Rendering (بدون إيموجي - باستخدام أيقونات)
    if (addressContainer) {
      addressContainer.innerHTML = `
        <div class="address-row">
          <i data-lucide="map-pin"></i>
          <span>${order.address || "-"}</span>
        </div>
        <div class="address-row">
          <i data-lucide="building"></i>
          <span>${t("building")}: ${order.building || "-"}</span>
        </div>
        <div class="address-row">
          <i data-lucide="home"></i>
          <span>${t("floor")}: ${order.floor || "-"}</span>
        </div>
        <div class="address-row">
          <i data-lucide="file-text"></i>
          <span>${t("note")}: ${order.note || "-"}</span>
        </div>
      `;
    }
    
    // 5. Items Rendering
    if (itemsContainer) {
      itemsContainer.innerHTML = "";
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
          itemsContainer.innerHTML += `
            <div class="item">
              <span class="item-name">${item.quantity || 1} × ${item.name || "Plat"}</span>
              <span class="item-price">${itemTotal.toFixed(2)} DH</span>
            </div>
          `;
        });
      }
    }
    
    // 6. Payment
    if (paymentMethodEl) {
      paymentMethodEl.textContent = order.paymentMethod || t("cash");
    }
    
    // 7. Price Summary
    const subVal = Number(order.subtotal) || 0;
    const delVal = Number(order.deliveryFee) || 0;
    const srvVal = Number(order.serviceFee) || 0;
    const totVal = Number(order.total) || (subVal + delVal + srvVal);
    
    if (subtotal) subtotal.textContent = subVal.toFixed(2) + " DH";
    if (deliveryFee) deliveryFee.textContent = delVal.toFixed(2) + " DH";
    if (serviceFee) serviceFee.textContent = srvVal.toFixed(2) + " DH";
    if (totalPrice) totalPrice.textContent = totVal.toFixed(2) + " DH";
    
    // تحديث الأيقونات بعد رسم العنوان
    refreshIcons();
    
  } catch (err) {
    console.error("Error loading order details:", err);
    showError(t("error_load"));
  }
}

loadOrder();