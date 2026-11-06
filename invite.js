import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { 
  doc, getDoc, setDoc, updateDoc, 
  collection, query, where, getDocs, 
  increment, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================
   TRANSLATIONS
========================================= */
const translations = {
  fr: {
    page_title: "Parrainage",
    hero_title: "Gagnez 30 MAD par ami !",
    hero_desc: "Partagez votre code unique. Votre ami reçoit 20 MAD de réduction et vous gagnez un bonus dès sa première commande.",
    your_code: "Votre Code Personnel de Parrainage",
    copy: "Copier",
    copied: "Copié !",
    share: "Partager le lien d'invitation",
    have_code: "Vous avez un code d'ami ?",
    have_code_desc: "Saisissez-le ici pour recevoir 20 MAD sur votre première commande.",
    apply: "Appliquer",
    friends_invited: "Amis invités",
    total_earned: "Gains totaux",
    how_it_works: "Comment ça marche ?",
    step1_title: "Partagez votre code",
    step1_desc: "Envoyez votre lien ou code unique à vos proches.",
    step2_title: "Votre ami commande",
    step2_desc: "Il profite d'une réduction immédiate sur son premier repas.",
    step3_title: "Vous touchez votre bonus",
    step3_desc: "Votre compte est crédité automatiquement dès validation.",
    nav_home: "Accueil", nav_explore: "Explorer", nav_cart: "Panier", nav_profile: "Profil",
    err_code: "Code invalide ou déjà utilisé.",
    err_own: "Vous ne pouvez pas utiliser votre propre code.",
    err_used: "Vous avez déjà utilisé un code de parrainage.",
    success_code: "Félicitations ! Vous avez reçu 20 MAD de réduction.",
    applied: "En attente de la première commande...",
    share_text: "Rejoins-moi sur Quickly avec mon code parrain {code} et profite de réductions exceptionnelles sur tes livraisons !"
  },
  ar: {
    page_title: "دعوة الأصدقاء",
    hero_title: "اربح 30 درهم عن كل صديق!",
    hero_desc: "شارك كودك الخاص. صديقك يحصل على خصم 20 درهم، وأنت تربح مكافأة عند أول طلب له.",
    your_code: "كود الدعوة الخاص بك",
    copy: "نسخ",
    copied: "تم النسخ!",
    share: "مشاركة رابط الدعوة",
    have_code: "هل لديك كود من صديق؟",
    have_code_desc: "أدخله هنا لتحصل على خصم 20 درهم على أول طلب لك.",
    apply: "تطبيق",
    friends_invited: "أصدقاء مدعوون",
    total_earned: "إجمالي الأرباح",
    how_it_works: "كيف تعمل؟",
    step1_title: "شارك كودك",
    step1_desc: "أرسل الرابط أو الكود الخاص بك لأصدقائك.",
    step2_title: "صديقك يطلب",
    step2_desc: "يحصل على خصم فوري على أول وجبة له.",
    step3_title: "تحصل على مكافأتك",
    step3_desc: "يتم إضافة المكافأة لحسابك تلقائياً بعد تأكيد الطلب.",
    nav_home: "الرئيسية", nav_explore: "استكشاف", nav_cart: "السلة", nav_profile: "الملف الشخصي",
    err_code: "الكود غير صالح أو مستخدم مسبقاً.",
    err_own: "لا يمكنك استخدام الكود الخاص بك.",
    err_used: "لقد استخدمت كود دعوة مسبقاً.",
    success_code: "مبروك! لقد حصلت على خصم 20 درهم.",
    applied: "بانتظار أول طلب...",
    share_text: "انضم إلي في Quickly باستخدام كود الدعوة {code} واحصل على خصومات رائعة على توصيلاتك!"
  },
  en: {
    page_title: "Referral",
    hero_title: "Earn 30 MAD per friend!",
    hero_desc: "Share your unique code. Your friend gets 20 MAD off, and you earn a bonus after their first order.",
    your_code: "Your Personal Referral Code",
    copy: "Copy",
    copied: "Copied!",
    share: "Share Invite Link",
    have_code: "Have a friend's code?",
    have_code_desc: "Enter it here to get 20 MAD off your first order.",
    apply: "Apply",
    friends_invited: "Friends Invited",
    total_earned: "Total Earned",
    how_it_works: "How it works?",
    step1_title: "Share your code",
    step1_desc: "Send your unique link or code to friends.",
    step2_title: "Friend orders",
    step2_desc: "They get an instant discount on their first meal.",
    step3_title: "You get your bonus",
    step3_desc: "Your account is credited automatically upon validation.",
    nav_home: "Home", nav_explore: "Explore", nav_cart: "Cart", nav_profile: "Profile",
    err_code: "Invalid or already used code.",
    err_own: "You can't use your own code.",
    err_used: "You already used a referral code.",
    success_code: "Congratulations! You got 20 MAD off.",
    applied: "Waiting for first order...",
    share_text: "Join me on Quickly with my referral code {code} and enjoy amazing delivery discounts!"
  }
};

function getLang() {
  const l = (window.QuicklyCore && QuicklyCore.getLang) ? QuicklyCore.getLang() : "fr";
  return translations[l] ? l : "fr";
}

const lang = getLang();
const t = key => translations[lang][key] || translations.en[key] || key;

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
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
  const el = document.getElementById("inviteToast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast-notification show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

/* =========================================
   MAIN LOGIC
========================================= */
const codeDisplay = document.getElementById("userReferralCode");
const copyBtn = document.getElementById("copyCodeBtn");
const shareBtn = document.getElementById("shareBtn");
const applySection = document.getElementById("applyCodeSection");
const friendCodeInput = document.getElementById("friendCodeInput");
const applyBtn = document.getElementById("applyCodeBtn");
const invitedCountEl = document.getElementById("invitedCount");
const earnedAmountEl = document.getElementById("earnedAmount");

let currentUser = null;
let currentUserReferralCode = "";

// توليد كود عشوائي
function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "QCK-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// جلب أو إنشاء بيانات الزبون
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    codeDisplay.textContent = "غير مسجل";
    return;
  }
  currentUser = user;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    let userData = userSnap.exists() ? userSnap.data() : {};

    // 1. إنشاء كود دعوة إذا لم يكن موجوداً
    if (!userData.referralCode) {
      currentUserReferralCode = generateReferralCode();
      await setDoc(userRef, { referralCode: currentUserReferralCode }, { merge: true });
    } else {
      currentUserReferralCode = userData.referralCode;
    }
    
    codeDisplay.textContent = currentUserReferralCode;

    // 2. التحقق من حالة "الدعوة"
    // إذا كان للزبون `referredBy`، فهذا يعني أنه أدخل كود صديق مسبقاً
    if (userData.referredBy) {
      applySection.style.display = "none"; // إخفاء حقل الإدخال
    } else {
      applySection.style.display = "block"; // إظهار حقل الإدخال
    }

    // 3. جلب عدد الأصدقاء الذين تمت دعوتهم (الذين استخدموا كوده)
    // نحن نبحث في مجموعة users عن من لديهم referredBy == currentUserReferralCode
    const q = query(collection(db, "users"), where("referredBy", "==", currentUserReferralCode));
    const invitedSnap = await getDocs(q);
    const invitedCount = invitedSnap.size;
    invitedCountEl.textContent = invitedCount;

    // 4. حساب الأرباح (المكافأة 30 درهم عن كل صديق أكمل طلباً)
    // في التطبيق الحقيقي، يتم إضافة 30 درهم فقط عندما يقوم الصديق بأول طلب.
    // هنا نفترض أن عدد الأصدقاء * 30 هو إجمالي الأرباح (أو نقرأها من حقل wallet)
    const earned = userData.referralEarnings || (invitedCount * 30);
    earnedAmountEl.textContent = earned + " MAD";

  } catch (err) {
    console.error("Error loading referral data:", err);
    codeDisplay.textContent = "خطأ في التحميل";
  }
});

/* =========================================
   COPY & SHARE ACTIONS
========================================= */
copyBtn.onclick = () => {
  const code = codeDisplay.textContent;
  navigator.clipboard.writeText(code).then(() => {
    const originalHTML = copyBtn.innerHTML;
    copyBtn.innerHTML = `<i data-lucide="check"></i> <span>${t("copied")}</span>`;
    copyBtn.style.background = "var(--primary)";
    copyBtn.style.color = "#fff";
    refreshIcons();
    
    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
      copyBtn.style.background = "";
      copyBtn.style.color = "";
      refreshIcons();
    }, 2000);
  });
};

shareBtn.onclick = async () => {
  const code = codeDisplay.textContent;
  const shareText = t("share_text").replace("{code}", code);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Quickly - Referral',
        text: shareText,
        url: window.location.origin
      });
    } catch (err) {
      console.log("Share canceled", err);
    }
  } else {
    navigator.clipboard.writeText(shareText);
    showToast(t("copied"));
  }
};

/* =========================================
   APPLY FRIEND'S CODE
========================================= */
applyBtn.onclick = async () => {
  const enteredCode = friendCodeInput.value.trim().toUpperCase();
  if (!enteredCode) return;

  if (enteredCode === currentUserReferralCode) {
    showToast(t("err_own"), "error");
    return;
  }

  applyBtn.disabled = true;
  applyBtn.textContent = "...";

  try {
    // 1. التحقق من وجود الكود
    const q = query(collection(db, "users"), where("referralCode", "==", enteredCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      showToast(t("err_code"), "error");
      applyBtn.disabled = false;
      applyBtn.textContent = t("apply");
      return;
    }

    // 2. الحصول على الزبون صاحب الكود
    const referrerDoc = snap.docs[0];
    const referrerId = referrerDoc.id;

    // 3. تحديث حساب الزبون الحالي (أدخل الكود)
    const myRef = doc(db, "users", currentUser.uid);
    await updateDoc(myRef, {
      referredBy: enteredCode,
      referredById: referrerId,
      referralClaimed: false // سيتم تغييرها إلى true عند أول طلب
    });

    // 4. تحديث حساب صاحب الكود (زيادة عدد المدعوين)
    // ملاحظة: يتم إضافة المكافأة (30 درهم) فقط عند إتمام الطلب (من خلال Cloud Function أو Checkout)
    const referrerRef = doc(db, "users", referrerId);
    await updateDoc(referrerRef, {
      referralInvitedCount: increment(1)
    });

    showToast(t("success_code"));
    applySection.style.display = "none";

  } catch (err) {
    console.error(err);
    showToast("حدث خطأ، حاول مجدداً", "error");
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = t("apply");
  }
};

/* =========================================
   BOOT
========================================= */
applyLanguage();
refreshIcons();