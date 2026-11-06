import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup, // 👈 استخدمنا Popup بدلاً من Redirect
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================================
   STATE & DOM
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
   ERROR HANDLING
========================================= */
function showError(message) {
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    errorMessage.style.display = "block";
  } else {
    alert(message); // في حال لم يجد العنصر، سيظهر تنبيه
  }
}

function hideError() {
  if (errorMessage) {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
    errorMessage.style.display = "none";
  }
}

/* =========================================
   ROUTING
========================================= */
async function redirectUser(user) {
  if (!user || isRouting) return;
  isRouting = true;

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      // إنشاء حساب زبون جديد إذا لم يكن موجوداً
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email || "",
        phone: user.phoneNumber || "",
        photoURL: user.photoURL || "",
        role: "customer",
        createdAt: serverTimestamp()
      });
    } else {
      const userData = userSnapshot.data();
      if (userData.role === "driver") {
        window.location.replace("driver.html");
        return;
      }
    }

    window.location.replace("index.html");

  } catch (error) {
    console.error("Routing error:", error);
    showError("خطأ في قاعدة البيانات: " + error.message);
    isRouting = false;
  }
}

/* =========================================
   GOOGLE LOGIN (POPUP)
========================================= */
async function loginWithGoogle() {
  hideError();
  if (!googleLogin) return;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  // تغيير شكل الزر
  const originalHTML = googleLogin.innerHTML;
  googleLogin.disabled = true;
  googleLogin.innerHTML = `<span>جاري الاتصال...</span>`;

  try {
    // استخدام Popup بدلاً من Redirect لسهولة التقاط الأخطاء
    const result = await signInWithPopup(auth, provider);
    
    // نجاح تسجيل الدخول
    if (result && result.user) {
      await redirectUser(result.user);
    }

  } catch (error) {
    console.error("Google Login Error:", error);
    
    // عرض الخطأ بوضوح
    let msg = error.message;
    if (error.code === 'auth/popup-blocked') {
      msg = "المتصفح منع النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.";
    } else if (error.code === 'auth/unauthorized-domain') {
      msg = "هذا النطاق غير مصرح به في Firebase. أضف النطاق في Authorized Domains.";
    } else if (error.code === 'auth/operation-not-allowed') {
      msg = "تسجيل الدخول بجوجل غير مفعل في Firebase.";
    }
    
    showError("خطأ جوجل: " + msg);
    alert("سبب المشكلة: " + msg); // تنبيه إجباري لتراه فوراً
    
    // إرجاع الزر لحالته
    googleLogin.disabled = false;
    googleLogin.innerHTML = originalHTML;
  }
}

if (googleLogin) {
  googleLogin.addEventListener("click", loginWithGoogle);
}

/* =========================================
   AUTH STATE
========================================= */
onAuthStateChanged(auth, async (user) => {
  if (user && !isRouting) {
    await redirectUser(user);
  }
});

/* =========================================
   PHONE LOGIN (Unchanged)
========================================= */
function initializeRecaptcha() {
  if (recaptchaVerifier) return recaptchaVerifier;
  const container = document.getElementById("recaptcha-container");
  if (!container) throw new Error("recaptcha-container element not found.");

  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => console.log("reCAPTCHA verified."),
  });
  return recaptchaVerifier;
}

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

if (sendCodeBtn) {
  sendCodeBtn.addEventListener("click", async () => {
    if (isSendingCode) return;
    hideError();
    const phone = phoneInput.value.trim();
    if (!phone) return showError("أدخل رقم الهاتف");

    isSendingCode = true;
    const originalHTML = sendCodeBtn.innerHTML;
    sendCodeBtn.disabled = true;
    sendCodeBtn.innerHTML = `<span>جاري الإرسال...</span>`;

    try {
      const verifier = initializeRecaptcha();
      confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
      
      const code = prompt("أدخل رمز التحقق الذي وصلك:");
      if (!code) return;

      const result = await confirmationResult.confirm(code);
      if (result && result.user) {
        await redirectUser(result.user);
      }
    } catch (error) {
      console.error(error);
      showError("خطأ الهاتف: " + error.message);
    } finally {
      isSendingCode = false;
      sendCodeBtn.disabled = false;
      sendCodeBtn.innerHTML = originalHTML;
    }
  });
}
