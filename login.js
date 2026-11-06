import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const googleLogin = document.getElementById("googleLogin");
const errorMessage = document.getElementById("errorMessage");

let isRouting = false;

function showError(msg) {
  if (!errorMessage) return alert(msg); // سيظهر تنبيه إذا لم يجد العنصر
  errorMessage.textContent = msg;
  errorMessage.style.display = "block";
}

// دالة التوجيه
async function redirectUser(user) {
  if (!user || isRouting) return;
  isRouting = true;
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);
    
    // إذا كان المستخدم جديداً، أنشئ له حساب زبون
    if (!userSnapshot.exists()) {
        await setDoc(userRef, {
            uid: user.uid, name: user.displayName || "", email: user.email || "",
            role: "customer", createdAt: serverTimestamp()
        });
    } else {
        // إذا كان سائق، وجهه لتطبيق السائق
        if (userSnapshot.data().role === "driver") {
            window.location.replace("driver.html");
            return;
        }
    }
    // التوجيه الافتراضي (للزبائن)
    window.location.replace("index.html");
  } catch (error) {
    console.error("Routing Error:", error);
    showError("حدث خطأ في قاعدة البيانات: " + error.message);
    isRouting = false;
  }
}

// 1. تسجيل الدخول بجوجل
googleLogin?.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error(error);
    showError("فشل الاتصال بجوجل: " + error.message);
  }
});

// 2. استقبال النتيجة بعد العودة من جوجل
async function handleGoogleRedirect() {
  try {
    console.log("Checking redirect result...");
    const result = await getRedirectResult(auth);
    
    if (result && result.user) {
      console.log("User found from redirect:", result.user.email);
      await redirectUser(result.user);
    } else {
      console.log("No redirect result found (normal if arriving normally).");
    }
  } catch (error) {
    console.error("Redirect Error:", error);
    // سيعرض لك الخطأ الحقيقي على الشاشة
    showError("خطأ العودة من جوجل: " + error.message + " (Code: " + error.code + ")");
  }
}

// 3. المستمع لحالة الدخول
async function initializeLogin() {
  await handleGoogleRedirect(); // يجب أن يعمل أولاً

  onAuthStateChanged(auth, async (user) => {
    if (user && !isRouting) {
      console.log("Auth state changed, user is:", user.email);
      await redirectUser(user);
    }
  });
}

initializeLogin();
