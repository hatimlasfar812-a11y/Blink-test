import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
/* =========================================
   BLINK AUTHENTICATION
========================================= */
const googleLogin = document.getElementById("googleLogin");
const phoneLogin = document.getElementById("phoneLogin");
const phoneForm = document.getElementById("phoneForm");
const phoneInput = document.getElementById("phoneInput");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const cancelPhoneBtn = document.getElementById("cancelPhoneBtn");
const errorMessage = document.getElementById("errorMessage");
let recaptchaVerifier = null;
let confirmationResult = null;
let isRouting = false;
let isGoogleLoading = false;
let isPhoneLoading = false;
let authInitialized = false;
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
   ERROR DISPLAY
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
  const messages = {
    "auth/popup-closed-by-user": translate(
      "أغلقت نافذة تسجيل الدخول قبل إكمال العملية.",
      "Vous avez fermé la fenêtre de connexion.",
      "You closed the sign-in window."
    ),
    "auth/popup-blocked": translate(
      "المتصفح منع نافذة Google. اسمح بالنوافذ المنبثقة وحاول مجدداً.",
      "Le navigateur a bloqué la fenêtre Google.",
      "The browser blocked the Google sign-in window."
    ),
    "auth/unauthorized-domain": translate(
      "هذا النطاق غير مصرح به في Firebase.",
      "Ce domaine n'est pas autorisé dans Firebase.",
      "This domain is not authorized in Firebase."
    ),
    "auth/operation-not-allowed": translate(
      "تسجيل الدخول بهذه الطريقة غير مفعل في Firebase.",
      "Cette méthode de connexion n'est pas activée.",
      "This sign-in method is not enabled in Firebase."
    ),
    "auth/account-exists-with-different-credential": translate(
      "هذا البريد مرتبط بطريقة تسجيل دخول أخرى.",
      "Cet e-mail est associé à une autre méthode.",
      "This email is associated with another sign-in method."
    ),
    "auth/network-request-failed": translate(
      "تعذر الاتصال بالإنترنت. تحقق من اتصالك.",
      "Erreur réseau. Vérifiez votre connexion.",
      "Network error. Check your internet connection."
    ),
    "auth/web-storage-unsupported": translate(
      "التخزين المحلي غير مدعوم في هذا المتصفح.",
      "Le stockage local n'est pas pris en charge.",
      "Local storage is not supported in this browser."
    ),
    "auth/invalid-phone-number": translate(
      "رقم الهاتف غير صحيح.",
      "Numéro de téléphone invalide.",
      "Invalid phone number."
    ),
    "auth/too-many-requests": translate(
      "محاولات كثيرة. حاول مرة أخرى لاحقاً.",
      "Trop de tentatives. Réessayez plus tard.",
      "Too many attempts. Try again later."
    ),
    "auth/invalid-verification-code": translate(
      "رمز التحقق غير صحيح.",
      "Code de vérification incorrect.",
      "Incorrect verification code."
    ),
    "auth/code-expired": translate(
      "انتهت صلاحية رمز التحقق. اطلب رمزاً جديداً.",
      "Le code a expiré. Demandez un nouveau code.",
      "The verification code expired. Request a new one."
    ),
    "auth/cancelled-popup-request": translate(
      "هناك عملية تسجيل دخول أخرى قيد التنفيذ.",
      "Une autre connexion est déjà en cours.",
      "Another sign-in operation is already in progress."
    ),
    "auth/credential-already-in-use": translate(
      "بيانات الحساب مستخدمة بالفعل.",
      "Ces identifiants sont déjà utilisés.",
      "This credential is already in use."
    )
  };
  return messages[code] || translate(
    "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.",
    "Une erreur de connexion s'est produite.",
    "A sign-in error occurred. Please try again."
  );
}
/* =========================================
   BUTTON LOADING
========================================= */
function setLoading(button, loading, message = "") {
  if (!button) return;
  if (loading) {
    if (!button.dataset.originalHTML) {
      button.dataset.originalHTML = button.innerHTML;
    }
    button.disabled = true;
    button.innerHTML = `
      <span>${message || "Loading..."}</span>
    `;
  } else {
    if (button.dataset.originalHTML) {
      button.innerHTML = button.dataset.originalHTML;
      delete button.dataset.originalHTML;
    }
    button.disabled = false;
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}
/* =========================================
   CREATE OR READ USER PROFILE
========================================= */
async function ensureUserProfile(user) {
  if (!user?.uid) {
    throw new Error("Invalid authenticated user.");
  }
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  // Existing users: never overwrite their role.
  if (snapshot.exists()) {
    return snapshot.data();
  }
  // New Google/phone accounts are customers by default.
  const profile = {
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    phone: user.phoneNumber || "",
    photoURL: user.photoURL || "",
    role: "customer",
    createdAt: serverTimestamp()
  };
  await setDoc(userRef, profile);
  return profile;
}
/* =========================================
   ROUTING
========================================= */
async function redirectUser(user) {
  if (!user?.uid || isRouting) return;
  isRouting = true;
  try {
    const profile = await ensureUserProfile(user);
    const role = profile.role;
    let destination = "index.html";
    if (role === "driver") {
      destination = "driver.html";
    } else if (role === "admin") {
      destination = "admin.html";
    }
    console.log("Authenticated user:", user.uid);
    console.log("User role:", role);
    console.log("Redirecting to:", destination);
    window.location.replace(destination);
  } catch (error) {
    console.error("Profile / routing error:", error);
    isRouting = false;
    showError(
      translate(
        "تم تسجيل الدخول، لكن تعذر تحميل ملف حسابك. تحقق من صلاحيات Firestore.",
        "Connexion réussie, mais impossible de charger votre profil.",
        "Signed in, but your user profile could not be loaded. Check Firestore permissions."
      )
    );
  }
}
/* =========================================
   GOOGLE SIGN IN
========================================= */
async function loginWithGoogle() {
  if (isGoogleLoading || isRouting) return;
  hideError();
  if (!googleLogin) return;
  isGoogleLoading = true;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });
  try {
    setLoading(
      googleLogin,
      true,
      translate(
        "جاري تسجيل الدخول...",
        "Connexion...",
        "Signing in..."
      )
    );
    const result = await signInWithPopup(auth, provider);
    if (!result?.user) {
      throw new Error("Google did not return an authenticated user.");
    }
    console.log("Google authentication successful:", result.user.uid);
    await redirectUser(result.user);
  } catch (error) {
    console.error("Google authentication failed:", error);
    showError(getAuthErrorMessage(error));
  } finally {
    isGoogleLoading = false;
    if (!isRouting) {
      setLoading(googleLogin, false);
    }
  }
}
if (googleLogin) {
  googleLogin.addEventListener("click", loginWithGoogle);
}
/* =========================================
   PHONE FORM
========================================= */
if (phoneLogin && phoneForm) {
  phoneLogin.addEventListener("click", () => {
    hideError();
    phoneForm.classList.remove("hidden");
    phoneInput?.focus();
  });
}
if (cancelPhoneBtn && phoneForm) {
  cancelPhoneBtn.addEventListener("click", () => {
    phoneForm.classList.add("hidden");
    hideError();
  });
}
/* =========================================
   PHONE NUMBER NORMALIZATION
========================================= */
function normalizePhoneNumber(value) {
  let phone = value.trim().replace(/[\s()-]/g, "");
  if (/^0[67]\d{8}$/.test(phone)) {
    phone = "+212" + phone.substring(1);
  }
  if (/^[67]\d{8}$/.test(phone)) {
    phone = "+212" + phone;
  }
  return phone;
}
/* =========================================
   RECAPTCHA
========================================= */
async function initializeRecaptcha() {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }
  const container = document.getElementById("recaptcha-container");
  if (!container) {
    throw new Error("reCAPTCHA container not found.");
  }
  recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "invisible",
      callback: () => {
        console.log("Phone reCAPTCHA verified.");
      },
      "expired-callback": () => {
        console.log("Phone reCAPTCHA expired.");
      }
    }
  );
  await recaptchaVerifier.render();
  return recaptchaVerifier;
}
/* =========================================
   SEND PHONE CODE
========================================= */
async function sendPhoneCode() {
  if (isPhoneLoading || isRouting) return;
  hideError();
  if (!phoneInput || !sendCodeBtn) return;
  const phone = normalizePhoneNumber(phoneInput.value);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    showError(
      translate(
        "أدخل رقم هاتف صحيحاً مع رمز الدولة.",
        "Entrez un numéro valide avec indicatif.",
        "Enter a valid phone number with country code."
      )
    );
    return;
  }
  isPhoneLoading = true;
  try {
    setLoading(
      sendCodeBtn,
      true,
      translate(
        "جاري إرسال الرمز...",
        "Envoi du code...",
        "Sending code..."
      )
    );
    const verifier = await initializeRecaptcha();
    confirmationResult = await signInWithPhoneNumber(
      auth,
      phone,
      verifier
    );
    const code = window.prompt(
      translate(
        "أدخل رمز التحقق الذي وصلك عبر SMS:",
        "Entrez le code reçu par SMS:",
        "Enter the verification code received by SMS:"
      )
    );
    if (!code?.trim()) {
      showError(
        translate(
          "لم تدخل رمز التحقق.",
          "Aucun code saisi.",
          "No verification code entered."
        )
      );
      return;
    }
    const result = await confirmationResult.confirm(code.trim());
    if (result?.user) {
      await redirectUser(result.user);
    }
  } catch (error) {
    console.error("Phone authentication error:", error);
    showError(getAuthErrorMessage(error));
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch (clearError) {
        console.warn("reCAPTCHA cleanup:", clearError);
      }
      recaptchaVerifier = null;
    }
  } finally {
    isPhoneLoading = false;
    if (!isRouting) {
      setLoading(sendCodeBtn, false);
    }
  }
}
if (sendCodeBtn) {
  sendCodeBtn.addEventListener("click", sendPhoneCode);
}
/* =========================================
   AUTH STATE LISTENER
========================================= */
onAuthStateChanged(
  auth,
  async (user) => {
    authInitialized = true;
    if (!user || isRouting) return;
    // If the user is already authenticated,
    // do not leave them stuck on the login page.
    await redirectUser(user);
  },
  (error) => {
    console.error("Firebase auth state error:", error);
    showError(getAuthErrorMessage(error));
  }
);
/* =========================================
   LANGUAGE EVENTS
========================================= */
window.addEventListener("blink:langchange", hideError);
window.addEventListener("quickly:langchange", hideError);
console.log("Blink Login initialized.");
