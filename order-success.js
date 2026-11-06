// =========================================
// TRANSLATIONS
// =========================================
const translations = {
  fr: {
    page_title: "Commande Validée",
    order_placed: "Commande Validée !",
    order_received: "Votre commande a été reçue avec succès.",
    order_number: "Numéro de commande",
    my_orders: "Mes Commandes",
    back_home: "Retour à l'accueil"
  },
  ar: {
    page_title: "تم تأكيد الطلب",
    order_placed: "تم تأكيد الطلب!",
    order_received: "تم استلام طلبك بنجاح.",
    order_number: "رقم الطلب",
    my_orders: "طلباتي",
    back_home: "العودة للرئيسية"
  },
  en: {
    page_title: "Order Placed",
    order_placed: "Order Placed!",
    order_received: "Your order has been received successfully.",
    order_number: "Order Number",
    my_orders: "My Orders",
    back_home: "Back Home"
  }
};

function getLang() {
  const l = (window.QuicklyCore && QuicklyCore.getLang) ? QuicklyCore.getLang() : "fr";
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

// جلب رقم الطلب من الرابط أو الذاكرة
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get("id") || localStorage.getItem("lastOrderId");

const orderNumberEl = document.getElementById("orderNumber");

if (orderId) {
  // عرض أول 8 أحرف من الـ ID بشكل كبير
  orderNumberEl.textContent = `#${orderId.slice(0, 8).toUpperCase()}`;
} else {
  orderNumberEl.textContent = "---";
}

// تشغيل الأيقونات
refreshIcons();