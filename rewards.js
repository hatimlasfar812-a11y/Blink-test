import { db, auth } from "./firebase.js";
import { doc, updateDoc, increment, collection, addDoc, query, where, onSnapshot, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

/* =========================================
   TRANSLATIONS
========================================= */
const translations = {
  fr: {
    page_title: "Fidélité & Récompenses",
    current_balance: "Solde de Points Actuel",
    pts: "pts",
    vip_msg: "Commandez régulièrement pour débloquer le niveau VIP",
    tier_bronze: "Niveau Bronze",
    next_tier: "Prochain: Argent (500 pts)",
    avail_rewards: "Récompenses Disponibles",
    redeem: "Échanger",
    history_title: "Historique des transactions",
    reward_delivery: "Livraison Gratuite",
    reward_delivery_sub: "Valable sur votre prochaine commande",
    reward_voucher: "Bon d'achat 20 MAD",
    reward_voucher_sub: "À utiliser dans tous les restaurants",
    reward_burger: "Menu Burger Offert",
    reward_burger_sub: "Offert par nos restaurants partenaires",
    login_req: "Veuillez vous connecter pour échanger vos points.",
    insufficient: "Solde insuffisant pour cette récompense !",
    success_redeem: "Félicitations ! Vous avez échangé {cost} pts contre : {name}",
    error_redeem: "Erreur lors de l'échange. Veuillez réessayer.",
    no_history: "Aucune transaction pour le moment.",
    nav_home: "Accueil",
    nav_explore: "Explorer",
    nav_cart: "Panier",
    nav_profile: "Profil"
  },
  ar: {
    page_title: "الولاء والمكافآت",
    current_balance: "رصيد النقاط الحالي",
    pts: "نقطة",
    vip_msg: "اطلب بانتظام لفتح مستوى VIP",
    tier_bronze: "المستوى البرونزي",
    next_tier: "التالي: فضي (500 نقطة)",
    avail_rewards: "المكافآت المتاحة",
    redeem: "استبدال",
    history_title: "سجل المعاملات",
    reward_delivery: "توصيل مجاني",
    reward_delivery_sub: "صالح لطلبك القادم",
    reward_voucher: "قسيمة شراء 20 درهم",
    reward_voucher_sub: "صالحة في جميع المطاعم",
    reward_burger: "وجبة برغر مجانية",
    reward_burger_sub: "مقدمة من مطاعمنا الشريكة",
    login_req: "يرجى تسجيل الدخول لاستبدال نقاطك.",
    insufficient: "رصيد النقاط غير كافٍ لهذه المكافأة!",
    success_redeem: "مبروك! لقد استبدلت {cost} نقطة بـ: {name}",
    error_redeem: "خطأ أثناء الاستبدال. يرجى المحاولة مرة أخرى.",
    no_history: "لا توجد معاملات حتى الآن.",
    nav_home: "الرئيسية",
    nav_explore: "استكشاف",
    nav_cart: "السلة",
    nav_profile: "الملف الشخصي"
  },
  en: {
    page_title: "Loyalty & Rewards",
    current_balance: "Current Points Balance",
    pts: "pts",
    vip_msg: "Order regularly to unlock VIP status",
    tier_bronze: "Bronze Tier",
    next_tier: "Next: Silver (500 pts)",
    avail_rewards: "Available Rewards",
    redeem: "Redeem",
    history_title: "Transaction History",
    reward_delivery: "Free Delivery",
    reward_delivery_sub: "Valid on your next order",
    reward_voucher: "20 MAD Voucher",
    reward_voucher_sub: "Use in all restaurants",
    reward_burger: "Free Burger Menu",
    reward_burger_sub: "Offered by our partner restaurants",
    login_req: "Please log in to redeem your points.",
    insufficient: "Insufficient balance for this reward!",
    success_redeem: "Congratulations! You redeemed {cost} pts for: {name}",
    error_redeem: "Error during redemption. Please try again.",
    no_history: "No transactions yet.",
    nav_home: "Home",
    nav_explore: "Explore",
    nav_cart: "Cart",
    nav_profile: "Profile"
  }
};

function getLang() {
  const l = (window.QuicklyCore && QuicklyCore.getLang) ? QuicklyCore.getLang() : "fr";
  return translations[l] ? l : "fr";
}
const lang = getLang();
const dict = translations[lang];
const t = (key, vars = {}) => {
  let str = dict[key] || translations.en[key] || key;
  Object.keys(vars).forEach(k => { str = str.replace(`{${k}}`, vars[k]); });
  return str;
};

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

/* =========================================
   TOAST
========================================= */
let toastTimer;
function showToast(msg, type = "success") {
  const el = document.getElementById("rewardsToast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast-notification show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

/* =========================================
   MAIN LOGIC
========================================= */
const userPointsValue = document.getElementById("userPointsValue");
const tierProgressBar = document.getElementById("tierProgressBar");
const pointsHistoryList = document.getElementById("pointsHistoryList");

let userPoints = 0;
let unsubUser = null;
let unsubHistory = null;

function updateUIForPoints(pts) {
  userPoints = pts;
  userPointsValue.textContent = pts;
  const percent = Math.min((pts / 500) * 100, 100);
  tierProgressBar.style.width = `${percent}%`;
}

onAuthStateChanged(auth, (user) => {
  if (unsubUser) unsubUser();
  if (unsubHistory) unsubHistory();

  if (!user) {
    // إذا لم يكن مسجلاً، يمكنك توجيهه لتسجيل الدخول
    // location.href = "login.html";
    return;
  }

  // 1. الاستماع الفوري لنقاط المستخدم
  const userRef = doc(db, "users", user.uid);
  unsubUser = onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const pts = snap.data().points || 20;
      updateUIForPoints(pts);
    } else {
      updateUIForPoints(20);
    }
  });

  // 2. الاستماع الفوري لسجل المعاملات
  const histQuery = query(collection(db, "pointTransactions"), where("userId", "==", user.uid));
  unsubHistory = onSnapshot(histQuery, (snap) => {
    if (snap.empty) {
      pointsHistoryList.innerHTML = `<p style="text-align:center; color:var(--text-secondary); font-size:13px;">${t("no_history")}</p>`;
      return;
    }

    const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // ترتيب محلي من الأحدث للأقدم لتجنب طلب Index من Firebase
    transactions.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    pointsHistoryList.innerHTML = transactions.map(tx => {
      const isPlus = tx.amount > 0;
      const date = tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString(lang) : "";
      return `
        <div class="history-row-card">
          <div class="h-text">
            <strong>${tx.title || 'Transaction'}</strong>
            <small>${date}</small>
          </div>
          <span class="h-pts ${isPlus ? 'plus' : 'minus'}">${isPlus ? '+' : ''}${tx.amount} ${t("pts")}</span>
        </div>
      `;
    }).join("");
  });
});

/* =========================================
   REDEEM LOGIC
========================================= */
document.querySelectorAll(".btn-redeem-action").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    const rewardName = e.target.dataset.redeem;
    const cost = Number(e.target.dataset.cost);
    const user = auth.currentUser;

    if (!user) {
      showToast(t("login_req"), "error");
      return;
    }

    if (userPoints < cost) {
      showToast(t("insufficient"), "error");
      return;
    }

    // تعطيل الزر لمنع النقر المزدوج
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "...";

    try {
      const userRef = doc(db, "users", user.uid);
      
      // 1. خصم النقاط
      await updateDoc(userRef, { points: increment(-cost) });

      // 2. إضافة المعاملة في السجل
      await addDoc(collection(db, "pointTransactions"), {
        userId: user.uid,
        title: `${t("redeem")}: ${rewardName}`,
        amount: -cost,
        createdAt: serverTimestamp()
      });

      showToast(t("success_redeem", { cost, name: rewardName }), "success");
      
    } catch (err) {
      console.error("Redeem error:", err);
      showToast(t("error_redeem"), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
});

/* =========================================
   BOOT
========================================= */
applyLanguage();
refreshIcons();