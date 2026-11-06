import { db, auth } from "./firebase.js";

import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc, getDoc, updateDoc, onSnapshot, collection, query, where,
  runTransaction, getDocs, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ===================== STATE ===================== */
const state = {
  user: null, driverData: null,
  activeOrders: [], historyOrders: [],
  currentOffer: null, offerTimer: null, offerDeadline: 0,
  map: null, driverMarker: null, customerMarker: null, restaurantMarker: null,
  heartbeatInterval: null, gpsInterval: null,
  currentLocation: null, lastLocationUpdate: 0, lastRouteUpdate: 0,
  unsubscribers: [], orderUnsubs: [],
  isProcessing: false, backgroundWritesLocked: false,
  offerDocs: [], dismissed: new Set(),
  formsBound: false, activeOrdersSnapshotReady: false,
  previousAdminStatus: null,
  backgroundWrites: new Set()
};

const $ = id => document.getElementById(id);
const isDelivered = s => ["delivered", "تم التوصيل"].includes(s);
const isCancelled = s => ["cancelled", "Cancelled", "rejected", "مرفوض", "ملغي"].includes(s);
const isOfferEligible = s => s === "searching_driver";

function safeText(v, fb = "") { return v === null || v === undefined || v === "" ? fb : String(v); }
function setText(id, v) { const el = $(id); if (el) el.textContent = safeText(v); }
function setImage(id, v, fbName = "Driver") {
  const el = $(id); if (!el || el.tagName !== "IMG") return;
  const fallback = initialsAvatar(fbName);
  el.onerror = () => { el.onerror = null; el.src = fallback; };
  el.alt = fbName ? `صورة ${fbName}` : "صورة السائق";
  el.src = v || fallback;
}
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ===================== BACKGROUND WRITES ===================== */
function trackBackgroundWrite(promise) {
  const tracked = Promise.resolve(promise);
  state.backgroundWrites.add(tracked);
  tracked.finally(() => state.backgroundWrites.delete(tracked));
  return tracked;
}
async function waitForBackgroundWrites() {
  const pending = [...state.backgroundWrites];
  if (pending.length) await Promise.allSettled(pending);
}
function canWriteBackground() { return !state.isProcessing && !state.backgroundWritesLocked; }

/* ===================== UI / TOAST / AUDIO ===================== */
function showToast(message, type = "success") {
  const c = $("toastContainer"); if (!c) return;
  const t = document.createElement("div");
  t.className = `toast ${type}`; t.textContent = message;
  c.appendChild(t); setTimeout(() => t.remove(), 3500);
}

const beepAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
let offerSoundInterval = null;
function playOfferBeep() { try { beepAudio.currentTime = 0; beepAudio.volume = 1; beepAudio.play().catch(() => {}); } catch (_) {} }
function startOfferSound() { stopOfferSound(); playOfferBeep(); offerSoundInterval = setInterval(playOfferBeep, 1500); }
function stopOfferSound() { if (offerSoundInterval) { clearInterval(offerSoundInterval); offerSoundInterval = null; } }

window.enableAudio = async function () {
  const btn = $("audioPromptBtn");
  try {
    beepAudio.currentTime = 0; beepAudio.volume = 0.8;
    await beepAudio.play(); beepAudio.pause(); beepAudio.currentTime = 0;
    btn?.classList.add("activated"); if (btn) btn.style.display = "none";
    showToast("تم تفعيل نظام التنبيه الصوتي 🔔");
  } catch (_) {
    if (btn) btn.style.display = "none";
    showToast("لم يتم تفعيل الصوت. تحقق من إعدادات المتصفح", "error");
  }
};

const notifications = {
  items: [],
  key() { return state.driverData?.id ? `notifications_${state.driverData.id}` : null; },
  init() {
    const k = this.key(); if (!k) return;
    try { const s = localStorage.getItem(k); this.items = s ? JSON.parse(s) : []; if (!Array.isArray(this.items)) this.items = []; }
    catch (_) { this.items = []; }
    this.render(); this.updateBadge();
  },
  add(type, title, message) {
    const k = this.key(); if (!k) return;
    if (this.items.some(n => n.title === title && n.message === message)) return;
    this.items.unshift({ id: Date.now(), type, title, message, time: new Date().toISOString(), read: false });
    if (this.items.length > 50) this.items = this.items.slice(0, 50);
    this.save(); this.updateBadge(); this.render();
  },
  save() { const k = this.key(); if (!k) return; try { localStorage.setItem(k, JSON.stringify(this.items)); } catch (_) {} },
  updateBadge() {
    const b = $("notifBadge"); if (!b) return;
    const u = this.items.filter(n => !n.read).length;
    b.textContent = u > 9 ? "9+" : String(u); b.classList.toggle("hidden", u === 0);
  },
  markAllRead() { this.items.forEach(n => n.read = true); this.save(); this.updateBadge(); this.render(); },
  render() {
    const l = $("notificationsList"); if (!l) return;
    if (!this.items.length) {
      l.innerHTML = `<div class="empty-state"><i data-lucide="bell-off"></i><p>لا توجد إشعارات</p></div>`;
      window.lucide?.createIcons?.(); return;
    }
    l.innerHTML = this.items.map(n => {
      const color = n.type === "warning" ? "#EF4444" : n.type === "order" ? "#059669" : "#3B82F6";
      const icon = n.type === "warning" ? "alert-triangle" : n.type === "order" ? "package" : "info";
      const time = new Date(n.time).toLocaleString("ar-MA", { hour: "2-digit", minute: "2-digit" });
      return `<div style="padding:12px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:${n.read ? "var(--surface)" : "var(--primary-soft)"}">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div style="width:32px;height:32px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i data-lucide="${icon}" style="width:16px;height:16px"></i></div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:13px">${esc(n.title)}</strong><small style="color:var(--muted);font-size:10px">${esc(time)}</small></div>
            <p style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.4;word-break:break-word">${esc(n.message)}</p>
          </div>
        </div></div>`;
    }).join("");
    window.lucide?.createIcons?.();
  }
};

/* ===================== SIDE MENU / NOTIFICATIONS PANEL ===================== */
function closeSideMenu() { $("sideMenu")?.classList.remove("open"); $("sideMenuOverlay")?.classList.add("hidden"); }
function openSideMenu() { $("sideMenu")?.classList.add("open"); $("sideMenuOverlay")?.classList.remove("hidden"); }
function closeNotifPanel() { $("notificationsPanel")?.classList.remove("open"); $("notificationsOverlay")?.classList.add("hidden"); }
function openNotifPanel() { $("notificationsPanel")?.classList.add("open"); $("notificationsOverlay")?.classList.remove("hidden"); setTimeout(() => notifications.markAllRead(), 1500); }

/* ===================== NAVIGATION ===================== */
const headerTitles = {
  "view-home": "الرئيسية", "view-orders-active": "الطلب الحالي", "view-order-details": "تفاصيل الطلب",
  "view-history": "سجل الطلبات", "view-earnings": "الأرباح", "view-profile": "حسابي",
  "view-edit-profile": "تعديل المعلومات", "view-vehicle": "المركبة", "view-documents": "الوثائق",
  "view-settings": "الإعدادات", "view-offer": "طلب جديد"
};
window.goToView = function (viewId) {
  if (state.currentOffer && viewId !== "view-offer") return;
  const t = $(viewId); if (!t) return;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  t.classList.add("active");
  document.querySelectorAll(".nav-item, .bottom-nav-item, .nav-link").forEach(i => i.classList.remove("active"));
  document.querySelectorAll(`[data-target="${viewId}"]`).forEach(i => i.classList.add("active"));
  setText("headerTitle", headerTitles[viewId] || "Blink");
  closeSideMenu(); window.scrollTo(0, 0);
  
  if (viewId === "view-orders-active" && state.map) setTimeout(() => state.map?.invalidateSize(), 300);
  if (viewId === "view-history") renderHistory();
  if (viewId === "view-earnings") renderEarnings();
};
document.querySelectorAll(".nav-item, .bottom-nav-item, .nav-link").forEach(el => {
  el.addEventListener("click", e => { e.preventDefault(); if (el.dataset.target) window.goToView(el.dataset.target); });
});
$("menuToggleBtn")?.addEventListener("click", openSideMenu);
$("closeMenuBtn")?.addEventListener("click", closeSideMenu);
$("sideMenuOverlay")?.addEventListener("click", closeSideMenu);
$("notifBtn")?.addEventListener("click", openNotifPanel);
$("closeNotifPanel")?.addEventListener("click", closeNotifPanel);
$("notificationsOverlay")?.addEventListener("click", closeNotifPanel);
$("audioPromptBtn")?.addEventListener("click", window.enableAudio);

/* ===================== HEARTBEAT & GPS ===================== */
function stopHeartbeatAndGPS() {
  if (state.heartbeatInterval) clearInterval(state.heartbeatInterval);
  if (state.gpsInterval) clearInterval(state.gpsInterval);
  state.heartbeatInterval = null; state.gpsInterval = null; state.lastLocationUpdate = 0;
}
function requestDriverLocation() {
  if (!state.driverData || isDriverSuspended() || !canWriteBackground() || !navigator.geolocation) return;
  const driverId = state.driverData.id;
  navigator.geolocation.getCurrentPosition(
    async position => {
      if (!state.driverData || state.driverData.id !== driverId || isDriverSuspended() || !canWriteBackground()) return;
      const lat = position.coords.latitude, lng = position.coords.longitude;
      state.currentLocation = [lat, lng];
      updateDriverMapMarker([lat, lng]);
      const write = updateDoc(doc(db, "drivers", driverId), {
        location: { lat, lng }, locationUpdatedAt: serverTimestamp(), lastHeartbeat: serverTimestamp()
      });
      try {
        await trackBackgroundWrite(write);
        if (state.driverData?.id === driverId) state.driverData.location = { lat, lng };
      } catch (error) { console.warn("تعذر تحديث موقع السائق:", error); }
    },
    error => console.warn("GPS error:", error.message),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );
}
function startHeartbeatAndGPS() {
  if (!state.driverData || isDriverSuspended()) return;
  if (!["online", "online_busy"].includes(state.driverData.status)) return;
  if (!state.heartbeatInterval) {
    state.heartbeatInterval = setInterval(async () => {
      if (!state.driverData || isDriverSuspended() || !canWriteBackground()) return;
      try {
        await trackBackgroundWrite(updateDoc(doc(db, "drivers", state.driverData.id), { lastHeartbeat: serverTimestamp() }));
      } catch (error) { console.warn("Heartbeat update failed:", error); }
    }, 60000);
  }
  if (!navigator.geolocation) return;
  if (!state.gpsInterval) { requestDriverLocation(); state.gpsInterval = setInterval(requestDriverLocation, 30000); }
}

/* ===================== LOGIN / LOGOUT ===================== */
$("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("loginEmail")?.value.trim(); const password = $("loginPassword")?.value;
  const errorEl = $("loginError"); const btn = $("loginBtn");
  if (errorEl) { errorEl.textContent = ""; errorEl.classList.remove("hidden"); }
  if (!email || !password) { if (errorEl) errorEl.textContent = "يرجى إدخال البريد وكلمة المرور"; return; }
  if (btn) { btn.disabled = true; btn.textContent = "جاري الدخول..."; }
  try { await signInWithEmailAndPassword(auth, email, password); }
  catch (err) { console.error("Login error:", err); if (errorEl) errorEl.textContent = "تعذر تسجيل الدخول. تحقق من بياناتك."; }
  finally { if (btn) { btn.disabled = false; btn.textContent = "تسجيل الدخول"; } }
});
$("logoutBtn")?.addEventListener("click", async () => {
  cleanupAll();
  try { await signOut(auth); } catch (error) { console.error("Logout error:", error); }
  showToast("تم تسجيل الخروج");
});
function cleanupAll() {
  stopHeartbeatAndGPS(); stopOfferSound(); stopOfferTimer();
  state.unsubscribers.forEach(fn => { try { fn(); } catch (_) {} }); state.unsubscribers = [];
  state.orderUnsubs.forEach(fn => { try { fn(); } catch (_) {} }); state.orderUnsubs = [];
  if (state.map) { try { state.map.remove(); } catch (_) {} state.map = null; }
  state.driverMarker = null; state.customerMarker = null; state.restaurantMarker = null;
  state.currentOffer = null; state.driverData = null; state.user = null;
  state.activeOrders = []; state.offerDocs = []; state.historyOrders = [];
  state.dismissed.clear(); state.isProcessing = false; state.backgroundWrites.clear();
  state.backgroundWritesLocked = false;
}

/* ===================== AUTH ===================== */
onAuthStateChanged(auth, async user => {
  if (!user) {
    cleanupAll();
    $("appLoader")?.classList.add("hidden"); $("view-login")?.classList.add("active"); $("mainApp")?.classList.add("hidden");
    return;
  }
  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists() || userSnap.data().role !== "driver") {
      await signOut(auth); showToast("هذا الحساب غير مسجل كسائق", "error"); return;
    }
    const driverDocId = userSnap.data().driverDocId;
    if (!driverDocId) throw new Error("لا يوجد ملف سائق مرتبط بحسابك");
    const driverSnap = await getDoc(doc(db, "drivers", driverDocId));
    if (!driverSnap.exists()) throw new Error("ملف السائق غير موجود");
    state.user = user; state.driverData = { id: driverDocId, ...driverSnap.data() };
    $("view-login")?.classList.remove("active"); $("mainApp")?.classList.remove("hidden"); $("appLoader")?.classList.add("hidden");
    notifications.init(); fillDriverProfile(); setupOrdersListeners(); setupOnlineToggle();
    bindDriverForms(); applySavedTheme();
    if (["online", "online_busy"].includes(state.driverData.status)) startHeartbeatAndGPS();
    subscribeDriverSnapshot(driverDocId);
  } catch (err) {
    console.error("Driver authentication error:", err);
    $("appLoader")?.classList.add("hidden"); $("view-login")?.classList.add("active");
    showToast(err.message || "تعذر تحميل الحساب", "error");
    try { await signOut(auth); } catch (_) {}
  }
});

/* ===================== TIMER / HELPERS ===================== */
function stopOfferTimer() { if (state.offerTimer) { clearInterval(state.offerTimer); state.offerTimer = null; } }
function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
  const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d;
}
function isDriverSuspended(d = state.driverData) {
  if (!d) return false;
  if (d.adminStatus === "banned") return true;
  if (d.adminStatus === "suspended_temp") {
    const until = toDate(d.suspendedUntil);
    return !until || until.getTime() > Date.now();
  }
  return false;
}

/* ===================== DRIVER PROFILE ===================== */
function initialsAvatar(name) {
  const ini = String(name || "س").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" rx="80" fill="#e8f7f1"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="58" font-weight="700" fill="#059669">${esc(ini)}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function fillDriverProfile() {
  const d = state.driverData; if (!d) return;
  const name = d.name || state.user?.displayName || "السائق";
  const phone = d.phone || state.user?.phoneNumber || "لم يضف رقم الهاتف";
  const image = d.image || state.user?.photoURL || initialsAvatar(name);
  ["driverNameHome", "menuName", "profileName"].forEach(id => setText(id, name));
  ["menuPhone", "profilePhone"].forEach(id => setText(id, phone));
  ["menuAvatar", "profileAvatar"].forEach(id => setImage(id, image, name));
  setText("profileRating", d.rating?.average ? Number(d.rating.average).toFixed(1) : "لا يوجد تقييم بعد");
  setText("profileDriverId", d.driverId || "—");
  setText("verificationStatus", d.verificationStatus === "verified" ? "الحساب موثق" : d.verificationStatus === "rejected" ? "الوثائق مرفوضة" : "التحقق قيد المراجعة");
  setText("homeRating", d.rating?.average ? Number(d.rating.average).toFixed(1) : "—");
  setText("vType", vehicleName(d.vehicle)); setText("vPlate", d.plate || "غير مسجل");
  if ($("editName")) $("editName").value = d.name || "";
  if ($("editPhone")) $("editPhone").value = d.phone || "";
  updateAdminStatusUI(d); setupOnlineToggle();
}
function vehicleName(v) { const map = { moto: "دراجة نارية", motorcycle: "دراجة نارية", bike: "دراجة", bicycle: "دراجة", car: "سيارة", scooter: "سكوتر" }; return map[v] || v || "غير مسجل"; }
function updateAdminStatusUI(d) {
  const banner = $("warningBanner"); if (!banner || !d) return;
  const status = d.adminStatus || "active"; const suspended = isDriverSuspended(d);
  if (status === "warned" || suspended) {
    const title = banner.querySelector("strong");
    if (title) title.textContent = status === "warned" ? "إنذار من الإدارة" : "حسابك موقوف";
    setText("warningMessageText", d.adminNotes || "يرجى التواصل مع الإدارة.");
    banner.classList.remove("hidden");
  } else banner.classList.add("hidden");
  state.previousAdminStatus = status;
}

/* ===================== DRIVER SNAPSHOT ===================== */
function subscribeDriverSnapshot(driverId) {
  const unsub = onSnapshot(doc(db, "drivers", driverId), snap => {
    if (!snap.exists()) return;
    const prevStatus = state.driverData?.status; const prevOrderId = state.driverData?.currentOrderId;
    state.driverData = { id: snap.id, ...snap.data() };
    fillDriverProfile();
    if (isDriverSuspended()) stopHeartbeatAndGPS();
    else {
      const shouldRun = ["online", "online_busy"].includes(state.driverData.status);
      if (!shouldRun) stopHeartbeatAndGPS();
      else if (prevStatus !== state.driverData.status || prevOrderId !== state.driverData.currentOrderId) startHeartbeatAndGPS();
    }
    evaluateOffers();
  }, error => console.error("Driver snapshot error:", error));
  state.unsubscribers.push(unsub);
}

/* ===================== ONLINE TOGGLE ===================== */
function setupOnlineToggle() {
  const toggle = $("onlineToggle"); const d = state.driverData; if (!toggle || !d) return;
  const suspended = isDriverSuspended(d);
  const busy = d.status === "online_busy" || !!d.currentOrderId;
  const online = d.status === "online" || busy;
  toggle.checked = online && !suspended; toggle.disabled = busy || suspended;
  setText("statusText", suspended ? "الحساب موقوف" : busy ? "لديك طلب" : online ? "متصل الآن" : "غير متصل");
  toggle.onchange = async e => {
    const wantOnline = e.target.checked;
    if (isDriverSuspended()) { e.target.checked = false; showToast("حسابك موقوف من الإدارة", "error"); return; }
    if (state.isProcessing) { e.target.checked = !wantOnline; return; }
    toggle.disabled = true;
    try {
      await updateDoc(doc(db, "drivers", d.id), { status: wantOnline ? "online" : "offline", updatedAt: serverTimestamp() });
      state.driverData.status = wantOnline ? "online" : "offline";
      if (wantOnline) startHeartbeatAndGPS(); else stopHeartbeatAndGPS();
      setupOnlineToggle(); evaluateOffers();
    } catch (error) {
      console.error("Online toggle error:", error); e.target.checked = !wantOnline; showToast("تعذر تغيير حالة الاتصال", "error");
    } finally { toggle.disabled = false; setupOnlineToggle(); }
  };
}

/* ===================== ORDERS LISTENERS ===================== */
function setupOrdersListeners() {
  if (!state.driverData) return;
  state.orderUnsubs.forEach(fn => { try { fn(); } catch (_) {} }); state.orderUnsubs = [];
  const id = state.driverData.id; if (!id) return;
  
  const offersQ = query(collection(db, "orders"), where("offeredTo", "==", id));
  const driverQ = query(collection(db, "orders"), where("driverId", "==", id));
  
  const u1 = onSnapshot(offersQ, snap => {
    state.offerDocs = snap.docs.map(x => ({ id: x.id, ...x.data() })).filter(o => isOfferEligible(o.status));
    evaluateOffers();
  }, error => console.error("Offers listener error:", error));
  
  const u2 = onSnapshot(driverQ, snap => {
    const allDriverOrders = snap.docs.map(x => ({ id: x.id, ...x.data() }));
    
    state.activeOrders = allDriverOrders.filter(o => !isDelivered(o.status) && !isCancelled(o.status));
    state.historyOrders = allDriverOrders
      .filter(o => isDelivered(o.status))
      .sort((a, b) => (b.deliveredAt?.toMillis?.() || 0) - (a.deliveredAt?.toMillis?.() || 0));
      
    renderActiveOrders(state.activeOrders);
    renderHistory();
    renderEarnings();
    
  }, error => console.error("Driver orders listener error:", error));
  
  state.orderUnsubs.push(u1, u2);
}

/* ===================== OFFER MANAGEMENT ===================== */
function evaluateOffers() {
  if (state.currentOffer || state.isProcessing || isDriverSuspended()) return;
  if (state.driverData?.status !== "online" || state.driverData?.currentOrderId) return;
  const next = state.offerDocs.find(o => !state.dismissed.has(o.id));
  if (next) showOffer(next);
}
function showOffer(order) {
  if (state.currentOffer || !isOfferEligible(order.status) || isDriverSuspended()) return;
  const expiry = toDate(order.offerExpiresAt);
  if (!expiry || expiry.getTime() <= Date.now()) {
    state.dismissed.add(order.id);
    releaseExpiredOfferIfMine(order.id);
    return;
  }
  state.currentOffer = order;
  setText("offerRest", order.restaurantName || order.restaurant?.name || "المطعم");
  const fee = Number(order.driverEarnings ?? order.deliveryFee ?? 0);
  setText("offerPrice", `${Number.isFinite(fee) ? fee.toFixed(2) : "0.00"} DH`);
  window.goToView("view-offer"); startOfferSound();
  state.offerDeadline = expiry.getTime(); stopOfferTimer();
  state.offerTimer = setInterval(() => {
    const left = Math.max(0, Math.ceil((state.offerDeadline - Date.now()) / 1000));
    setText("timerText", left);
    if (!left && !state.isProcessing) {
      state.dismissed.add(order.id);
      releaseExpiredOfferIfMine(order.id);
      hideOffer();
    }
  }, 250);
  setText("timerText", Math.max(0, Math.ceil((state.offerDeadline - Date.now()) / 1000)));
  const acceptBtn = $("acceptOfferBtn");
  if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.onclick = acceptCurrentOffer; }
  const rejectBtn = $("rejectOfferBtn");
  if (rejectBtn) rejectBtn.onclick = () => $("rejectReasonModal")?.classList.remove("hidden");
}
function hideOffer() {
  stopOfferSound(); stopOfferTimer(); state.currentOffer = null;
  if (state.activeOrders.length) window.goToView("view-orders-active"); else window.goToView("view-home");
  setTimeout(evaluateOffers, 300);
}

/* ===================== RELEASE EXPIRED OFFER ===================== */
async function releaseExpiredOfferIfMine(orderId) {
  if (!state.driverData) return;
  try {
    const ref = doc(db, "orders", orderId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const o = snap.data();
    if (o.offeredTo !== state.driverData.id) return;
    if (o.status !== "searching_driver") return;
    const exp = toDate(o.offerExpiresAt);
    const stillActive = exp && exp.getTime() > Date.now();
    if (stillActive) return;
    await updateDoc(ref, {
      offeredTo: null,
      offerExpiresAt: null,
      lastOfferResult: "expired",
      updatedAt: serverTimestamp()
    });
    state.offerDocs = state.offerDocs.filter(x => x.id !== orderId);
  } catch (err) {
    console.warn("releaseExpiredOfferIfMine failed:", err);
  }
}

/* ===================== REJECT OFFER ===================== */
window.submitRejectOffer = async function () {
  const order = state.currentOffer;
  if (!order || !state.driverData) return;
  const reason = $("rejectReasonSelect")?.value || "other";
  const notes = $("rejectReasonNotes")?.value?.trim() || "";
  try {
    await updateDoc(doc(db, "orders", order.id), {
      rejectedBy: arrayUnion(state.driverData.id),
      lastRejectReason: reason,
      lastRejectNotes: notes,
      updatedAt: serverTimestamp()
    });
    state.dismissed.add(order.id);
    state.offerDocs = state.offerDocs.filter(o => o.id !== order.id);
    $("rejectReasonModal")?.classList.add("hidden");
    showToast("تم رفض العرض");
    hideOffer();
  } catch (err) {
    console.error("Reject offer error:", err);
    showToast("تعذر رفض العرض", "error");
  }
};

/* ===================== ACCEPT OFFER ===================== */
function mkErr(code) { const e = new Error(code); e.customCode = code; return e; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function isRetryableAcceptError(err) {
  const code = err.customCode || err.code;
  const msg = String(err.message || "");
  if (code === "aborted" || code === "failed-precondition" || code === "unavailable") return true;
  if (msg.toLowerCase().includes("version") || msg.toLowerCase().includes("contention")) return true;
  return false;
}
function translateAcceptError(err) {
  const code = err.customCode || err.code;
  const msg = String(err.message || "");
  if (code === "permission-denied") return { message: "لا تملك صلاحية قبول هذا الطلب.", dismiss: true };
  if (code === "aborted" || code === "failed-precondition" || msg.toLowerCase().includes("version")) return { message: "حدث تعارض مؤقت. أعد المحاولة.", dismiss: false };
  if (code === "unavailable" || msg.includes("network") || msg.includes("unavailable")) return { message: "تعذر الاتصال بالإنترنت.", dismiss: false };
  if (code === "ORDER_MISSING") return { message: "الطلب لم يعد موجوداً.", dismiss: true };
  if (code === "DRIVER_MISSING") return { message: "ملف السائق غير موجود.", dismiss: true };
  if (code === "DRIVER_SUSPENDED") return { message: "حسابك موقوف. راجع الإدارة.", dismiss: false };
  if (code === "DRIVER_BUSY") return { message: "لديك طلب نشط بالفعل.", dismiss: false };
  if (code === "DRIVER_NOT_ONLINE") return { message: "حسابك غير متصل.", dismiss: false };
  if (code === "ORDER_NOT_AVAILABLE") return { message: "الطلب لم يعد متاحاً.", dismiss: true };
  if (code === "ORDER_NOT_YOURS") return { message: "هذا الطلب لم يعد موجهاً إليك.", dismiss: true };
  if (code === "OFFER_NO_EXPIRY") return { message: "انتهت صلاحية العرض.", dismiss: true };
  if (code === "OFFER_EXPIRED") return { message: "انتهت مهلة قبول الطلب.", dismiss: true };
  return { message: msg || "تعذر قبول الطلب.", dismiss: false };
}

async function acceptCurrentOffer() {
  if (!state.currentOffer || state.isProcessing || !state.driverData || isDriverSuspended()) return;
  const selected = state.currentOffer; const driverId = state.driverData.id;
  state.isProcessing = true; state.backgroundWritesLocked = true;
  const acceptBtn = $("acceptOfferBtn");
  if (acceptBtn) { acceptBtn.disabled = true; acceptBtn.textContent = "جاري قبول الطلب..."; }
  stopHeartbeatAndGPS();
  const MAX_RETRIES = 2;
  let lastError = null;

  try {
    await waitForBackgroundWrites();
    const orderRef = doc(db, "orders", selected.id);
    const driverRef = doc(db, "drivers", driverId);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await runTransaction(db, async tx => {
          const orderSnap = await tx.get(orderRef);
          const driverSnap = await tx.get(driverRef);
          if (!orderSnap.exists()) throw mkErr("ORDER_MISSING");
          if (!driverSnap.exists()) throw mkErr("DRIVER_MISSING");
          const order = orderSnap.data(); const driver = driverSnap.data();

          if (driver.adminStatus === "banned") throw mkErr("DRIVER_SUSPENDED");
          if (driver.adminStatus === "suspended_temp") {
            const until = toDate(driver.suspendedUntil);
            if (!until || until.getTime() > Date.now()) throw mkErr("DRIVER_SUSPENDED");
          }
          if (driver.currentOrderId && driver.currentOrderId !== selected.id) throw mkErr("DRIVER_BUSY");
          if (!["online", "online_busy"].includes(driver.status)) throw mkErr("DRIVER_NOT_ONLINE");

          if (order.status !== "searching_driver") throw mkErr("ORDER_NOT_AVAILABLE");
          if (order.offeredTo !== driverId) throw mkErr("ORDER_NOT_YOURS");

          const expiry = toDate(order.offerExpiresAt);
          if (!expiry) throw mkErr("OFFER_NO_EXPIRY");
          if (expiry.getTime() <= Date.now()) throw mkErr("OFFER_EXPIRED");

          tx.update(orderRef, {
            status: "assigned",
            driverId: driverId,
            driverName: driver.name || "سائق",
            offeredTo: null,
            assignedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          tx.update(driverRef, {
            status: "online_busy",
            currentOrderId: selected.id,
            updatedAt: serverTimestamp()
          });
        });
        lastError = null; break;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES && isRetryableAcceptError(err)) {
          await delay(500 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
    if (lastError) throw lastError;

    state.driverData.status = "online_busy";
    state.driverData.currentOrderId = selected.id;
    state.activeOrders = [
      { ...selected, status: "assigned", driverId, offeredTo: null, driverName: state.driverData.name || "سائق" },
      ...state.activeOrders.filter(o => o.id !== selected.id)
    ];
    state.offerDocs = state.offerDocs.filter(o => o.id !== selected.id);
    stopOfferSound(); stopOfferTimer(); state.currentOffer = null;
    setupOnlineToggle(); renderActiveOrders(state.activeOrders);
    window.goToView("view-orders-active"); showToast("تم قبول الطلب بنجاح");

  } catch (err) {
    console.error("ACCEPT ORDER ERROR:", err);
    const { message, dismiss } = translateAcceptError(err);
    showToast(message, "error");
    if (dismiss) { state.dismissed.add(selected.id); releaseExpiredOfferIfMine(selected.id); hideOffer(); }
  } finally {
    state.isProcessing = false; state.backgroundWritesLocked = false;
    if (acceptBtn) { acceptBtn.disabled = false; acceptBtn.textContent = "قبول الطلب"; }
    if (state.driverData && ["online", "online_busy"].includes(state.driverData.status) && !isDriverSuspended()) startHeartbeatAndGPS();
  }
}

/* ===================== MAP & ACTIVE ORDER WORKFLOW ===================== */
function validLatLng(v) {
  if (!v || typeof v !== "object") return null;
  const lat = Number(v.lat ?? v.latitude ?? v._lat); const lng = Number(v.lng ?? v.lon ?? v.longitude ?? v._long);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function orderCoords(o, type) {
  const c = type === "restaurant" ? [o.restaurantLocation, o.restaurantCoordinates, o.restaurant?.location] : [o.customerLocation, o.deliveryLocation, { lat: o.latitude, lng: o.longitude }];
  for (const x of c) { const coords = validLatLng(x); if (coords) return coords; }
  return null;
}

async function getRestaurantCoords(order) {
  let coords = orderCoords(order, "restaurant");
  if (coords) return coords;
  
  if (order.restaurantId) {
    try {
      const restSnap = await getDoc(doc(db, "restaurants", order.restaurantId));
      if (restSnap.exists()) {
        const rData = restSnap.data();
        return validLatLng(rData.location || rData.coordinates);
      }
    } catch (e) { console.warn("Could not fetch restaurant coords:", e); }
  }
  return null;
}

async function getRestaurantDetails(order) {
  let address = order.restaurantAddress || "";
  let phone = order.restaurantPhone || "";

  if ((!address || !phone) && order.restaurantId) {
    try {
      const restSnap = await getDoc(doc(db, "restaurants", order.restaurantId));
      if (restSnap.exists()) {
        const rData = restSnap.data();
        // البحث في جميع الحقول المحتملة للعنوان
        address = address || rData.address || rData.street || rData.city || rData.location?.address || rData.location?.street || "";
        phone = phone || rData.phone || rData.phoneNumber || "";
      }
    } catch (e) { console.warn("Could not fetch restaurant details:", e); }
  }
  
  // إذا لم يوجد نص للعنوان، نظهر رسالة توجيهية بدل "غير مسجل"
  return { 
    address: address || "الموقع متاح على الخريطة (اضغط على زر التوجه)", 
    phone 
  };
}

function getActionButtonText(status) {
  if (status === "assigned") return "استلمت الطلب من المطعم";
  if (status === "picked_up" || status === "on_the_way") return "تم توصيل الطلب للزبون";
  return "متابعة";
}
function getNextStatus(current) {
  if (current === "assigned") return "picked_up";
  if (current === "picked_up" || current === "on_the_way") return "delivered";
  return null;
}

async function renderActiveOrders(orders) {
  const list = $("activeOrdersList"); 
  const empty = $("homeEmptyState");
  const summary = $("activeOrderSummary"); 
  const mapBox = $("map-container");
  
  if (!orders.length) {
    if (list) list.innerHTML = `<div class="empty-state"><p>لا يوجد طلب نشط حالياً</p></div>`;
    empty?.classList.remove("hidden"); summary?.classList.add("hidden"); mapBox?.classList.add("hidden"); return;
  }
  
  const first = orders[0];
  empty?.classList.add("hidden"); summary?.classList.remove("hidden"); mapBox?.classList.remove("hidden");
  
  if (list) {
    let html = '';
    for (const o of orders) {
      const btnText = getActionButtonText(o.status);
      const nextStatus = getNextStatus(o.status);
      
      const restCoords = await getRestaurantCoords(o);
      const restDetails = await getRestaurantDetails(o);
      const custCoords = orderCoords(o, "customer");
      
      let navCoords = null;
      let navLabel = "";
      if (o.status === 'assigned' && restCoords) { navCoords = restCoords; navLabel = "التوجه إلى المطعم"; }
      if ((o.status === 'picked_up' || o.status === 'on_the_way') && custCoords) { navCoords = custCoords; navLabel = "التوجه إلى الزبون"; }

      const isPickedUp = o.status === 'picked_up' || o.status === 'on_the_way';
      const isDelivered = o.status === 'delivered';

      html += `
      <article class="driver-order-card" style="background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); margin-bottom: 16px;">
        
        <!-- Progress Bar -->
        <div style="display:flex; justify-content:space-between; margin-bottom:24px; position:relative; padding: 0 10px;">
          <div style="position:absolute; top:12px; left:30px; right:30px; height:4px; background:#E5E7EB; z-index:1;"></div>
          <div style="position:absolute; top:12px; left:30px; right:${isDelivered ? '30px' : isPickedUp ? '50%' : 'calc(100% - 30px)'}; height:4px; background:var(--primary); z-index:2; transition:0.3s;"></div>
          
          <div style="z-index:3; text-align:center; width:60px;">
            <div style="width:24px; height:24px; border-radius:50%; background:var(--primary); color:#fff; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; font-size:12px;">✓</div>
            <span style="font-size:10px; font-weight:bold; color:var(--primary);">مقبول</span>
          </div>
          <div style="z-index:3; text-align:center; width:60px;">
            <div style="width:24px; height:24px; border-radius:50%; background:${isPickedUp || isDelivered ? 'var(--primary)' : '#E5E7EB'}; color:#fff; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; font-size:12px;">${isPickedUp || isDelivered ? '✓' : '2'}</div>
            <span style="font-size:10px; color:${isPickedUp || isDelivered ? 'var(--primary)' : '#9CA3AF'}; font-weight:bold;">استلام</span>
          </div>
          <div style="z-index:3; text-align:center; width:60px;">
            <div style="width:24px; height:24px; border-radius:50%; background:${isDelivered ? 'var(--primary)' : '#E5E7EB'}; color:#fff; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; font-size:12px;">${isDelivered ? '✓' : '3'}</div>
            <span style="font-size:10px; color:${isDelivered ? 'var(--primary)' : '#9CA3AF'}; font-weight:bold;">توصيل</span>
          </div>
        </div>

        <!-- Restaurant Card -->
        <div style="border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <h4 style="margin:0 0 4px; font-size:16px; font-weight:bold;">${esc(o.restaurantName || "المطعم")}</h4>
              <p style="margin:0; font-size:12px; color:var(--text-secondary);">${esc(restDetails.address)}</p>
            </div>
            <div style="display:flex; gap:8px;">
              ${restDetails.phone ? `<a href="tel:${restDetails.phone}" style="width:36px;height:36px;border-radius:50%;background:#E0F2FE;color:#0284C7;display:flex;align-items:center;justify-content:center;"><i data-lucide="phone" style="width:16px;"></i></a>` : ''}
            </div>
          </div>
          
          <!-- Order Items -->
          <div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border);">
            <p style="font-size:12px; font-weight:bold; margin-bottom:6px; color:var(--text-secondary);">محتويات الطلب:</p>
            <ul style="margin:0; padding:0 16px; font-size:13px; color:var(--text);">
              ${(o.items || []).map(i => `<li style="margin-bottom:4px;">${i.quantity || 1}× ${esc(i.name)}</li>`).join('') || '<li>لا توجد تفاصيل</li>'}
            </ul>
          </div>
        </div>

        <!-- Customer Card (Hidden if not picked up yet) -->
        ${isPickedUp || isDelivered ? `
        <div style="border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <h4 style="margin:0 0 4px; font-size:16px; font-weight:bold;">${esc(o.customerName || "الزبون")}</h4>
              <p style="margin:0; font-size:12px; color:var(--text-secondary);">${esc(o.address || "عنوان الزبون")}</p>
            </div>
            <div style="display:flex; gap:8px;">
              ${o.customerPhone ? `<a href="tel:${o.customerPhone}" style="width:36px;height:36px;border-radius:50%;background:#DCFCE7;color:#16A34A;display:flex;align-items:center;justify-content:center;"><i data-lucide="phone" style="width:16px;"></i></a>` : ''}
            </div>
          </div>
          ${o.note ? `<div style="background:#FEF3C7; color:#92400E; padding:8px; border-radius:8px; font-size:12px; margin-top:8px;"><strong>ملاحظة:</strong> ${esc(o.note)}</div>` : ''}
        </div>` : ''}

        <!-- Actions -->
        <div style="display: flex; gap: 8px; flex-direction: column; margin-top: 20px;">
          
          ${navCoords ? `
          <button onclick="openNavigation(${navCoords[0]}, ${navCoords[1]})" 
                  style="width:100%; padding:14px; background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; border-radius:12px; font-weight:bold; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
            <i data-lucide="navigation"></i> ${navLabel} (Google Maps)
          </button>` : ''}
          
          ${nextStatus ? `
          <button onclick="updateOrderStatus('${o.id}', '${nextStatus}')" 
                  style="width:100%; padding:16px; background:var(--primary); color:#fff; border:none; border-radius:12px; font-weight:bold; font-size:16px; cursor:pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
            ${btnText}
          </button>` : `
          <div style="text-align: center; padding: 14px; color: var(--success); font-weight: bold; background: #ECFDF5; border-radius: 12px;">
            <i data-lucide="check-circle"></i> اكتمل هذا الطلب
          </div>`}
          
        </div>
      </article>
      `;
    }
    list.innerHTML = html;
  }
  
  drawOrderMap(first);
  window.lucide?.createIcons?.();
}

window.updateOrderStatus = async function(orderId, newStatus) {
  if (state.isProcessing) return;
  state.isProcessing = true;
  
  document.querySelectorAll(`button[onclick*="updateOrderStatus('${orderId}'"]`).forEach(b => {
    b.disabled = true;
    b.style.opacity = "0.7";
  });

  try {
    const orderRef = doc(db, "orders", orderId);
    const driverRef = doc(db, "drivers", state.driverData.id);
    const now = serverTimestamp();
    
    let updateData = { status: newStatus, updatedAt: now };
    if (newStatus === 'picked_up') updateData.pickedUpAt = now;
    if (newStatus === 'delivered') updateData.deliveredAt = now;

    if (newStatus === 'delivered') {
      await runTransaction(db, async (tx) => {
        const oSnap = await tx.get(orderRef);
        if (!oSnap.exists() || oSnap.data().driverId !== state.driverData.id) throw new Error("Unauthorized");
        
        tx.update(orderRef, updateData);
        tx.update(driverRef, { currentOrderId: null, status: "online", updatedAt: now });
      });
      state.driverData.currentOrderId = null;
      state.driverData.status = "online";
      showToast("تم توصيل الطلب بنجاح! 🎉");
      window.goToView("view-home");
    } else {
      await updateDoc(orderRef, updateData);
      showToast("تم تحديث حالة الطلب بنجاح");
      const orderIndex = state.activeOrders.findIndex(o => o.id === orderId);
      if (orderIndex > -1) {
        state.activeOrders[orderIndex].status = newStatus;
        renderActiveOrders(state.activeOrders);
      }
    }
  } catch (error) {
    console.error("Update status error:", error);
    showToast("تعذر تحديث حالة الطلب، تحقق من الاتصال", "error");
  } finally {
    state.isProcessing = false;
  }
};

window.openNavigation = function(lat, lng) {
  if (!lat || !lng) return showToast("لا يوجد موقع متاح للتوجه إليه", "error");
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
};

async function drawOrderMap(order) {
  const box = $("map-container"); const el = $("map"); if (!box || !el) return;
  
  const customer = orderCoords(order, "customer"); 
  const rest = await getRestaurantCoords(order);
  const driver = state.currentLocation || (state.driverData?.location ? [state.driverData.location.lat, state.driverData.location.lng] : [33.5731, -7.5898]);
  const points = [driver, rest, customer].filter(Boolean);
  
  if (!points.length) return;
  box.classList.remove("hidden"); if (!window.L) return;
  
  if (!state.map) {
    state.map = L.map(el, { zoomControl: false }).setView(driver, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(state.map);
  }
  
  // Driver Marker (Blue)
  if (driver) {
    const driverIcon = L.divIcon({ className: 'custom-marker', html: '<div style="background:#3B82F6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>', iconSize: [22,22], iconAnchor: [11,11] });
    if (!state.driverMarker) state.driverMarker = L.marker(driver, {icon: driverIcon}).addTo(state.map).bindPopup("أنت هنا");
    else state.driverMarker.setLatLng(driver);
  }
  
  // Restaurant Marker (Orange)
  if (rest) {
    const restIcon = L.divIcon({ className: 'custom-marker', html: '<div style="background:#F59E0B;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>', iconSize: [22,22], iconAnchor: [11,11] });
    if (!state.restaurantMarker) state.restaurantMarker = L.marker(rest, {icon: restIcon}).addTo(state.map).bindPopup("المطعم");
    else state.restaurantMarker.setLatLng(rest);
  }
  
  // Customer Marker (Purple)
  if (customer) {
    const custIcon = L.divIcon({ className: 'custom-marker', html: '<div style="background:#8B5CF6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>', iconSize: [22,22], iconAnchor: [11,11] });
    if (!state.customerMarker) state.customerMarker = L.marker(customer, {icon: custIcon}).addTo(state.map).bindPopup("الزبون");
    else state.customerMarker.setLatLng(customer);
  }
  
  const bounds = L.latLngBounds(points); 
  if (bounds.isValid()) state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
}

function updateDriverMapMarker(coords) {
  if (!window.L || !state.map || !coords) return;
  const driverIcon = L.divIcon({ className: 'custom-marker', html: '<div style="background:#3B82F6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>', iconSize: [22,22], iconAnchor: [11,11] });
  if (!state.driverMarker) state.driverMarker = L.marker(coords, {icon: driverIcon}).addTo(state.map).bindPopup("موقعي");
  else state.driverMarker.setLatLng(coords);
}

/* ===================== HISTORY & EARNINGS ===================== */
function renderHistory() {
  const container = $("view-history");
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 16px;">
      <div style="text-align: right; margin-bottom: 24px;">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">سجل التوصيلات</p>
        <h2 style="margin: 0; font-size: 24px; font-weight: 900;">طلباتي السابقة</h2>
      </div>
      <div id="history-list-container"></div>
    </div>
  `;

  const listEl = $("history-list-container");
  
  if (!state.historyOrders.length) {
    listEl.innerHTML = `<div class="empty-state" style="text-align:center; padding:40px 20px; color:var(--text-muted); display:flex; flex-direction:column; align-items:center;">
      <i data-lucide="history" style="width:48px;height:48px;margin-bottom:12px;opacity:0.5;"></i>
      <p>لا توجد طلبات سابقة</p>
    </div>`;
    window.lucide?.createIcons?.();
    return;
  }

  listEl.innerHTML = state.historyOrders.map(o => {
    const dateStr = o.deliveredAt?.toDate ? o.deliveredAt.toDate().toLocaleString("ar-MA", { dateStyle: 'medium', timeStyle: 'short' }) : "غير محدد";
    const fee = Number(o.deliveryFee || 0).toFixed(2);
    
    return `
      <div style="background: var(--surface); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin: 0 0 6px; font-size: 15px; font-weight: bold; color: var(--text);">${esc(o.restaurantName || "المطعم")}</h4>
          <p style="margin: 0; font-size: 12px; color: var(--text-secondary);"><i data-lucide="clock" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>${dateStr}</p>
        </div>
        <div style="text-align: left;">
          <span class="badge" style="background:#ECFDF5; color:#059669; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: bold; display:inline-block; margin-bottom: 6px;">
            <i data-lucide="check-circle" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i> مكتمل
          </span>
          <div style="font-size: 15px; font-weight: 900; color: var(--text);">${fee} <span style="font-size:10px;">درهم</span></div>
        </div>
      </div>
    `;
  }).join("");
  window.lucide?.createIcons?.();
}

function renderEarnings() {
  const container = $("view-earnings");
  if (!container) return;

  const todayStr = new Date().toDateString();
  let totalEarnings = 0;
  let todayEarnings = 0;
  let completedCount = 0;

  state.historyOrders.forEach(o => {
    const fee = Number(o.deliveryFee || 0);
    totalEarnings += fee;
    completedCount++;
    if (o.deliveredAt) {
      const d = o.deliveredAt.toDate ? o.deliveredAt.toDate() : new Date(o.deliveredAt);
      if (d.toDateString() === todayStr) {
        todayEarnings += fee;
      }
    }
  });

  container.innerHTML = `
    <div style="padding: 16px;">
      <div style="text-align: right; margin-bottom: 24px;">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">ملخصك المالي</p>
        <h2 style="margin: 0; font-size: 24px; font-weight: 900;">الأرباح</h2>
      </div>

      <div style="display:flex; background:#F3F4F6; border-radius:12px; padding:4px; margin-bottom:24px;">
        <button style="flex:1; padding:8px; border:none; border-radius:8px; font-size:13px; font-weight:bold; color:var(--text-secondary); background:transparent;">الشهر</button>
        <button style="flex:1; padding:8px; border:none; border-radius:8px; font-size:13px; font-weight:bold; color:var(--text-secondary); background:transparent;">الأسبوع</button>
        <button style="flex:1; padding:8px; border:none; border-radius:8px; font-size:13px; font-weight:bold; color:var(--primary); background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.1);">اليوم</button>
      </div>

      <div style="background: var(--primary); color: #fff; padding: 24px; border-radius: 20px; text-align: center; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(16,185,129,0.3);">
        <p style="margin: 0 0 8px; font-size: 14px; opacity: 0.9;">إجمالي أرباح اليوم</p>
        <h1 style="margin: 0; font-size: 36px; font-weight: 900;">${todayEarnings.toFixed(2)} <span style="font-size: 16px; font-weight:normal;">DH</span></h1>
        <p style="margin: 8px 0 0; font-size: 12px; opacity: 0.8;">حسب البيانات المسجلة من قاعدة البيانات</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px; border-radius: 16px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; color: var(--text-secondary); font-weight:bold;">إجمالي الأرباح</p>
          <h3 style="margin: 0; font-size: 22px; font-weight: 900; color: var(--text);">${totalEarnings.toFixed(2)} <span style="font-size: 12px;">DH</span></h3>
        </div>
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px; border-radius: 16px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; color: var(--text-secondary); font-weight:bold;">الطلبات المكتملة</p>
          <h3 style="margin: 0; font-size: 22px; font-weight: 900; color: var(--text);">${completedCount} <span style="font-size: 12px;">طلب</span></h3>
        </div>
      </div>

      <h4 style="margin: 0 0 12px; font-size: 16px; color: var(--text);">تفاصيل الأرباح (آخر الطلبات)</h4>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${state.historyOrders.slice(0, 10).map(o => {
           const fee = Number(o.deliveryFee || 0).toFixed(2);
           const dateStr = o.deliveredAt?.toDate ? o.deliveredAt.toDate().toLocaleDateString("ar-MA") : "";
           return `
             <div style="display:flex; justify-content:space-between; align-items:center; padding: 16px; background:var(--surface); border-radius:12px; border:1px solid var(--border);">
               <div>
                  <h5 style="margin:0 0 4px; font-size:14px; font-weight:bold;">${esc(o.restaurantName || "طلب")}</h5>
                  <span style="font-size:11px; color:var(--text-muted);">${dateStr}</span>
               </div>
               <span style="font-size:15px; color:var(--success); font-weight:900;">+${fee} DH</span>
             </div>
           `;
        }).join('') || '<p style="text-align:center; color:var(--text-muted); font-size:12px; padding:20px;">لا توجد أرباح مسجلة بعد</p>'}
      </div>
    </div>
  `;
  window.lucide?.createIcons?.();
}

/* ===================== FORMS ===================== */
function bindDriverForms() {
  if (state.formsBound) return; state.formsBound = true;
  $("editProfileForm")?.addEventListener("submit", async e => {
    e.preventDefault(); if (!state.driverData) return;
    const name = $("editName")?.value.trim(); const phone = $("editPhone")?.value.trim();
    if (!name || !phone) return;
    if (state.isProcessing) { showToast("جاري معالجة عملية أخرى، حاول بعد لحظات.", "error"); return; }
    try {
      await updateDoc(doc(db, "drivers", state.driverData.id), { name, phone, updatedAt: serverTimestamp() });
      state.driverData.name = name; state.driverData.phone = phone;
      showToast("تم الحفظ بنجاح"); window.goToView("view-profile");
    } catch (error) { console.error("Edit profile error:", error); showToast("تعذر الحفظ", "error"); }
  });
}

/* ===================== THEME ===================== */
function applySavedTheme() {
  let dark = false; try { dark = localStorage.getItem("blinkDriverDark") === "1"; } catch (_) {}
  document.documentElement.toggleAttribute("data-theme", dark);
}