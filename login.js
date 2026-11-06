import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================
   BLINK LOGIN SYSTEM
========================================= */

const googleLogin = document.getElementById("googleLogin");
const phoneLogin = document.getElementById("phoneLogin");
const phoneForm = document.getElementById("phoneForm");
const phoneInput = document.getElementById("phoneInput");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const cancelPhoneBtn = document.getElementById("cancelPhoneBtn");
const errorMessage = document.getElementById("errorMessage");

let confirmationResult = null;
let recaptchaVerifier = null;
let isRouting = false;
let isSendingCode = false;

/* =========================================
   LANGUAGE
========================================= */

function getLanguage() {
  const core = window.BlinkCore || window.QuicklyCore;

  if (core && typeof core.getLang === "function") {
    return core.getLang();
  }

  return document.documentElement.lang || "en";
}

function translate(ar, fr, en) {
  const lang = getLanguage();

  if (lang === "ar") return ar;
  if (lang === "fr") return fr;

  return en;
}

/* =========================================
   ERROR HANDLING
========================================= */

function showError(message) {
  if (!errorMessage) return;
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  if (!errorMessage) return;
  errorMessage.textContent = "";
  errorMessage.classList.add("hidden");
}

function getAuthErrorMessage(error) {
  const code = error?.code || "";

  const errors = {
    "auth/popup-closed-by-user": translate(
      "تم إغلاق نافذة تسجيل الدخول.",
      "La fenêtre de connexion a été fermée.",
      "The sign-in window was closed."
    ),
    "auth/unauthorized-domain": translate(
      "هذا النطاق غير مصرح به في Firebase.",
      "Ce domaine n'est pas autorisé dans Firebase.",
      "This domain is not authorized in Firebase."
    ),
    "auth/operation-not-allowed": translate(
      "طريقة تسجيل الدخول غير مفعلة في Firebase.",
      "Cette méthode de connexion n'est pas activée dans Firebase.",
      "This sign-in method is not enabled in Firebase."
    ),
    "auth/account-exists-with-different-credential": translate(
      "هذا البريد مرتبط بطريقة تسجيل دخول أخرى.",
      "Cet e-mail est associé à une autre méthode de connexion.",
      "This email is associated with another sign-in method."
    ),
    "auth/invalid-phone-number": translate(
      "رقم الهاتف غير صحيح.",
      "Numéro de téléphone invalide.",
      "Invalid phone number."
    ),
    "auth/too-many-requests": translate(
      "محاولات كثيرة. حاول لاحقاً.",
      "Trop de tentatives. Réessayez plus tard.",
      "Too many attempts. Please try again later."
    ),
    "auth/invalid-verification-code": translate(
      "رمز التحقق غير صحيح.",
      "Code de vérification incorrect.",
      "Incorrect verification code."
    ),
    "auth/code-expired": translate(
      "انتهت صلاحية رمز التحقق. أعد طلب رمز جديد.",
      "Le code a expiré. Demandez un nouveau code.",
      "The verification code has expired. Request a new one."
    ),
    "auth/network-request-failed": translate(
      "تحقق من اتصال الإنترنت.",
      "Vérifiez votre connexion Internet.",
      "Check your internet connection."
    ),
    "auth/invalid-credential": translate(
      "بيانات تسجيل الدخول غير صحيحة.",
      "Identifiants de connexion invalides.",
      "Invalid sign-in credentials."
    ),
    "auth/web-storage-unsupported": translate(
      "متصفحك لا يدعم التخزين المحلي. يرجى تفعيل الكوكيز.",
      "Votre navigateur ne prend pas en charge le stockage local.",
      "Your browser does not support local storage."
    ),
    "auth/disallowed-useragent": translate(
      "متصفحك غير مدعوم من قبل جوجل. يرجى استخدام متصفح آخر.",
      "Navigateur non pris en charge par Google.",
      "Your browser is not supported by Google."
    )
  };

  return errors[code] || error?.message || translate(
    "حدث خطأ غير متوقع. حاول مرة أخرى.",
    "Une erreur inattendue s'est produite.",
    "An unexpected error occurred. Please try again."
  );
}

/* =========================================
   BUTTON LOADING
========================================= */

function setLoading(button, loading, loadingText = "Loading...") {
  if (!button) return;

  if (loading) {
    if (!button.dataset.originalHTML) {
      button.dataset.originalHTML = button.innerHTML;
    }
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader-2" class="spin"></i> <span>${loadingText}</span>`;
    if (window.lucide) window.lucide.createIcons();
  } else {
    if (button.dataset.originalHTML) {
      button.innerHTML = button.dataset.originalHTML;
      delete button.dataset.originalHTML;
    }
    button.disabled = false;
    if (window.lucide) window.lucide.createIcons();
  }
}

/* =========================================
   USER PROFILE
========================================= */

async function ensureUserProfile(user) {
  if (!user || !user.uid) {
    throw new Error("Invalid user.");
  }

  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    return userSnapshot.data();
  }

  const newProfile = {
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    phone: user.phoneNumber || "",
    photoURL: user.photoURL || "",
    role: "customer",
    createdAt: serverTimestamp()
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

/* =========================================
   REDIRECT USER
========================================= */

async function redirectUser(user) {
  if (!user || isRouting) return;

  isRouting = true;

  try {
    await ensureUserProfile(user);

    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      throw new Error("User profile not found.");
    }

    const userData = userSnapshot.data();

    if (userData.role === "driver") {
      window.location.replace("driver.html");
      return;
    }

    // التوجيه الافتراضي (للزبائن والأدمن الذين يتصفحون كزبائن)
    window.location.replace("index.html");

  } catch (error) {
    console.error("User routing error:", error);
    isRouting = false;
    showError(
      translate(
        "تعذر تحميل حسابك. حاول مرة أخرى.",
        "Impossible de charger votre compte.",
        "Unable to load your account. Please try again."
      )
    );
  }
}

/* =========================================
   GOOGLE LOGIN
========================================= */

async function loginWithGoogle() {
  hideError();
  if (!googleLogin) return;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    setLoading(googleLogin, true, translate("جاري الاتصال...", "Connexion...", "Connecting..."));
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Google login error:", error);
    setLoading(googleLogin, false);
    showError(getAuthErrorMessage(error));
  }
}

if (googleLogin) {
  googleLogin.addEventListener("click", loginWithGoogle);
}

/* =========================================
   GOOGLE REDIRECT RESULT
========================================= */

async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await ensureUserProfile(result.user);
      await redirectUser(result.user);
    }
  } catch (error) {
    console.error("Google redirect result error:", error);
    showError(getAuthErrorMessage(error));
  }
}

/* =========================================
   PHONE LOGIN - RECAPTCHA
========================================= */

function initializeRecaptcha() {
  if (recaptchaVerifier) return recaptchaVerifier;

  const container = document.getElementById("recaptcha-container");
  if (!container) throw new Error("recaptcha-container element not found.");

  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => console.log("reCAPTCHA verified."),
    "expired-callback": () => console.log("reCAPTCHA expired.")
  });

  return recaptchaVerifier;
}

/* =========================================
   PHONE FORM VISIBILITY
========================================= */

if (phoneLogin && phoneForm) {
  phoneLogin.addEventListener("click", () => {
    hideError();
    phoneForm.classList.remove("hidden");
    if (phoneInput) phoneInput.focus();
  });
}

if (cancelPhoneBtn && phoneForm) {
  cancelPhoneBtn.addEventListener("click", () => {
    phoneForm.classList.add("hidden");
    hideError();
  });
}

/* =========================================
   NORMALIZE PHONE NUMBER
========================================= */

function normalizePhoneNumber(value) {
  let phone = value.trim().replace(/[\s()-]/g, "");
  if (/^0[67]\d{8}$/.test(phone)) phone = "+212" + phone.substring(1);
  if (/^[67]\d{8}$/.test(phone)) phone = "+212" + phone;
  return phone;
}

/* =========================================
   SEND PHONE VERIFICATION CODE
========================================= */

async function sendPhoneCode() {
  if (isSendingCode) return;
  hideError();

  if (!phoneInput || !sendCodeBtn) return;

  const phone = normalizePhoneNumber(phoneInput.value);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    showError(
      translate(
        "أدخل رقم هاتف صحيحاً مع رمز الدولة.",
        "Entrez un numéro valide avec l'indicatif du pays.",
        "Enter a valid phone number with country code."
      )
    );
    return;
  }

  isSendingCode = true;

  try {
    setLoading(sendCodeBtn, true, translate("جاري الإرسال...", "Envoi...", "Sending..."));
    const verifier = initializeRecaptcha();

    confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);

    const code = window.prompt(
      translate(
        "أدخل رمز التحقق الذي وصلك عبر SMS:",
        "Entrez le code reçu par SMS:",
        "Enter the verification code sent by SMS:"
      )
    );

    if (!code || !code.trim()) {
      showError(
        translate(
          "لم تدخل رمز التحقق.",
          "Vous n'avez pas saisi le code.",
          "You did not enter the verification code."
        )
      );
      return;
    }

    const result = await confirmationResult.confirm(code.trim());

    if (result && result.user) {
      await ensureUserProfile(result.user);
      await redirectUser(result.user);
    }

  } catch (error) {
    console.error("Phone login error:", error);
    showError(getAuthErrorMessage(error));

    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (e) { console.warn(e); }
      recaptchaVerifier = null;
    }
  } finally {
    isSendingCode = false;
    setLoading(sendCodeBtn, false);
  }
}

if (sendCodeBtn) {
  sendCodeBtn.addEventListener("click", sendPhoneCode);
}

/* =========================================
   AUTH STATE
========================================= */

async function initializeLogin() {
  await handleGoogleRedirect();

  onAuthStateChanged(auth, async (user) => {
    if (user && !isRouting) {
      await redirectUser(user);
    }
  });
}

initializeLogin().catch((error) => {
  console.error("Login initialization error:", error);
  showError(getAuthErrorMessage(error));
});

window.addEventListener("blink:langchange", hideError);
window.addEventListener("quickly:langchange", hideError);

console.log("Blink Login initialized successfully.");