import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =========================================
// TRANSLATIONS
// =========================================
const translations = {
  fr: {
    page_title: "Mes Commandes",
    order_num: "Commande",
    no_orders: "Aucune commande",
    no_orders_sub: "Vous n'avez pas encore passé de commande.",
    start_order: "Commander maintenant",
    status_pending: "En attente",
    status_preparing: "En préparation",
    status_driver: "Livreur assigné",
    status_way: "En route",
    status_delivered: "Livré",
    status_cancelled: "Annulé",
    view_details: "Voir les détails",
    default_rest: "Restaurant Quickly"
  },
  ar: {
    page_title: "طلباتي",
    order_num: "طلب",
    no_orders: "لا توجد طلبات",
    no_orders_sub: "لم تقم بأي طلب حتى الآن.",
    start_order: "اطلب الآن",
    status_pending: "قيد الانتظار",
    status_preparing: "قيد التحضير",
    status_driver: "تم تعيين سائق",
    status_way: "في الطريق",
    status_delivered: "تم التوصيل",
    status_cancelled: "ملغى",
    view_details: "عرض التفاصيل",
    default_rest: "مطعم Quickly"
  },
  en: {
    page_title: "My Orders",
    order_num: "Order",
    no_orders: "No Orders Yet",
    no_orders_sub: "You haven't placed any orders yet.",
    start_order: "Order Now",
    status_pending: "Pending",
    status_preparing: "Preparing",
    status_driver: "Driver Assigned",
    status_way: "On the way",
    status_delivered: "Delivered",
    status_cancelled: "Cancelled",
    view_details: "View Details",
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
// HELPERS
// =========================================
const ordersContainer = document.getElementById("ordersContainer");
const backBtn = document.getElementById("backBtn");

if (backBtn) backBtn.onclick = () => history.back();

function formatDate(timestamp) {
  if (!timestamp) return "";
  let date;
  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) return "";
  
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : (lang === 'fr' ? 'fr-FR' : 'en-US'), options).format(date);
}

function getStatusInfo(status) {
  const s = String(status || "pending").toLowerCase().trim();
  if (s === "preparing") return { text: t("status_preparing"), cls: "badge-preparing" };
  if (s === "driver assigned") return { text: t("status_driver"), cls: "badge-driver" };
  if (s === "on the way") return { text: t("status_way"), cls: "badge-way" };
  if (s === "delivered") return { text: t("status_delivered"), cls: "badge-delivered" };
  if (s === "cancelled" || s === "canceled") return { text: t("status_cancelled"), cls: "badge-cancelled" };
  return { text: t("status_pending"), cls: "badge-pending" };
}

// =========================================
// AUTH & DATA FETCHING
// =========================================
applyLanguage();
refreshIcons();

onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  
  const q = query(
    collection(db, "orders"),
    where("uid", "==", user.uid)
  );
  
  // استخدام onSnapshot للتحديث الفوري
  onSnapshot(q, (snapshot) => {
    
    if (snapshot.empty) {
      ordersContainer.innerHTML = `
        <div class="empty-state">
          <i data-lucide="package-search"></i>
          <h3>${t("no_orders")}</h3>
          <p>${t("no_orders_sub")}</p>
          <a href="index.html">${t("start_order")}</a>
        </div>
      `;
      refreshIcons();
      return;
    }
    
    // تحويل البيانات إلى مصفوفة وترتيبها من الأحدث للأقدم
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    orders.sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;
      return dateB - dateA;
    });
    
    ordersContainer.innerHTML = orders.map(order => {
      const status = getStatusInfo(order.status);
      const totalVal = Number(order.total || order.totalPrice || 0).toFixed(2);
      const dateStr = formatDate(order.createdAt);
      const restName = order.restaurantName || t("default_rest");
      const orderNum = `${t("order_num")} #${order.id.slice(0, 6).toUpperCase()}`;
      
      return `
        <div class="order-card" data-id="${order.id}">
          <div class="order-top">
            <div>
              <h3 class="restaurant-name">${restName}</h3>
              <span class="order-number">${orderNum}</span>
            </div>
            <span class="status ${status.cls}">${status.text}</span>
          </div>
          
          <div class="order-middle">
            <span class="price">${totalVal} DH</span>
            <span class="date">
              <i data-lucide="calendar"></i>
              ${dateStr}
            </span>
          </div>
          
          <div class="view-btn">
            <span>${t("view_details")}</span>
            <i data-lucide="chevron-right"></i>
          </div>
        </div>
      `;
    }).join("");
    
    refreshIcons();
    
    // ربط حدث النقر بكل بطاقة
    document.querySelectorAll(".order-card").forEach(card => {
      card.onclick = () => {
        location.href = `order-details.html?id=${card.dataset.id}`;
      };
    });
    
  }, (err) => {
    console.error("Error fetching orders:", err);
    ordersContainer.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Erreur de chargement.</p></div>`;
  });
});