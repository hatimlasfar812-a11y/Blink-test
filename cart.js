// =====================================================
// cart.js — Cart data layer (LocalStorage-backed)
// Preserves ALL existing product fields including options.
// Adds: options-aware pricing, delivery fee, badge helpers,
//       keepOnlyVendor, buildCheckoutPayload.
// =====================================================

const STORAGE_KEY = "cart";
const MAX_QTY = 99;

export const CART_EVENT = "cart:changed";
export const DEFAULT_DELIVERY_FEE = 10; // DH — single source of truth

/* ---------------- helpers ---------------- */
function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const price = Number(raw.price);
  const quantity = Math.floor(Number(raw.quantity));
  if (!raw.id || !raw.name) return null;
  if (!Number.isFinite(price) || price < 0) return null;

  return {
    ...raw, // preserve every unknown/optional field
    id: String(raw.id),
    name: String(raw.name),
    price,
    quantity:
      Number.isFinite(quantity) && quantity > 0
        ? Math.min(quantity, MAX_QTY)
        : 1,
    restaurantId: raw.restaurantId || "",
    restaurantName: raw.restaurantName || "",
    restaurantLogo: raw.restaurantLogo || "",
    image: raw.image || ""
  };
}

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter(Boolean);
  } catch {
    return [];
  }
}

export let cart = loadCart();

// Keep the same array instance so every page/module reference sees cart resets.
function replaceCartContents(nextCart) {
  cart.splice(0, cart.length, ...nextCart);
}

// Re-read persisted data before a store-conflict check. This protects against
// stale in-memory state when a page was restored from the browser back-forward cache
// or when another loaded module instance changed localStorage.
function syncCartFromStorage() {
  replaceCartContents(loadCart());
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (err) {
    console.error("Cart save failed:", err);
  }
  dispatchChange();
}

function dispatchChange() {
  try {
    window.dispatchEvent(new CustomEvent(CART_EVENT));
  } catch (_) {
    /* noop */
  }
}

/* Cross-tab sync — external tab changes reload this tab's state */
window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY) return;
  replaceCartContents(loadCart());
  dispatchChange();
});

/* ---------------- option utilities ---------------- */
/* Sorted name list — used inside the identity key so two items
   with the same options in different order collapse into one. */
function names(value) {
  return toArray(value)
    .map((v) => (v && typeof v === "object" ? v.name : v))
    .filter(Boolean)
    .map(String)
    .sort();
}

/* Sum of all priced options (extras + priced sauces). */
function optionTotal(value) {
  let total = 0;
  toArray(value).forEach((v) => {
    if (v && typeof v === "object") {
      const p = Number(v.price);
      if (Number.isFinite(p) && p > 0) total += p;
    }
  });
  return total;
}

/* Identity key — identical product + identical options = same line. */
function itemKey(item) {
  return JSON.stringify({
    id: item.id,
    restaurantId: item.restaurantId || "",
    sauce: names(item.sauce),
    extras: names(item.extras),
    without: names(item.without),
    specs: item.selectedSpecs || null
  });
}

/* ---------------- pricing ---------------- */
/* Unit price = base + all priced extras + all priced sauces */
export function getItemUnitPrice(item) {
  if (!item) return 0;
  const base = Number(item.price) || 0;
  return base + optionTotal(item.extras) + optionTotal(item.sauce);
}

/* Line total = unit price × quantity */
export function getItemTotal(item) {
  if (!item) return 0;
  return getItemUnitPrice(item) * (Number(item.quantity) || 0);
}

/* ---------------- reads ---------------- */
export function getCart() {
  return cart;
}

export function getCartCount() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal() {
  return cart.reduce((sum, item) => sum + getItemTotal(item), 0);
}

export function getDeliveryFee() {
  return DEFAULT_DELIVERY_FEE;
}

export function getCartTotal() {
  return getCartSubtotal() + getDeliveryFee();
}

export function getVendors() {
  const map = new Map();
  cart.forEach((item) => {
    const id = item.restaurantId || "";
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: item.restaurantName || "",
        logo: item.restaurantLogo || ""
      });
    }
  });
  return [...map.values()];
}

/* ---------------- mutations ---------------- */
export function addToCart(product) {
  // Always validate against the latest saved cart, not a stale page snapshot.
  syncCartFromStorage();

  const incoming = normalizeItem({
    ...product,
    quantity: product?.quantity ?? 1
  });
  if (!incoming) return false;

  const vendors = getVendors();
  const incomingVendorId = incoming.restaurantId || "";

  if (vendors.length > 0 && vendors[0].id !== incomingVendorId) {
    // Reject cross-store additions. The calling page displays a localized explanation.
    return false;
  }

  const key = itemKey(incoming);
  const existing = cart.find((i) => itemKey(i) === key);

  if (existing) {
    existing.quantity = Math.min(
      existing.quantity + (incoming.quantity || 1),
      MAX_QTY
    );
  } else {
    cart.push(incoming);
  }

  saveCart();
  return true;
}

export function increaseQuantity(index) {
  const item = cart[index];
  if (!item) return;
  item.quantity = Math.min(item.quantity + 1, MAX_QTY);
  saveCart();
}

export function decreaseQuantity(index) {
  const item = cart[index];
  if (!item) return;
  item.quantity -= 1;
  if (item.quantity <= 0) cart.splice(index, 1);
  saveCart();
}

export function removeFromCart(index) {
  if (!cart[index]) return;
  cart.splice(index, 1);
  saveCart();
}

export function clearCart() {
  // Empty in place instead of replacing the exported array reference.
  replaceCartContents([]);
  saveCart();
}

/* ✅ NEW — was imported by cart-page.js but missing (main bug). */
export function keepOnlyVendor(vendorId) {
  const target = String(vendorId || "");
  replaceCartContents(cart.filter((item) => String(item.restaurantId || "") === target));
  saveCart();
}

/* ---------------- global badge helpers ---------------- */
/* Sets the badge on a single element and returns the current count. */
export function updateCartBadge(el) {
  if (!el) return 0;
  const n = getCartCount();
  el.textContent = n > 99 ? "99+" : String(n);
  el.hidden = n === 0;
  el.setAttribute("data-count", String(n));
  return n;
}

/* Bind a header badge — auto-updates on every cart mutation + cross-tab. */
export function bindCartBadge(el) {
  if (!el) return () => {};
  const update = () => updateCartBadge(el);
  update();
  window.addEventListener(CART_EVENT, update);
  return update;
}

/* ---------------- checkout payload ---------------- */
/* Returns a clean, backend-ready JSON object. Nothing in the cart
   object is mutated — this is a pure read. */
export function buildCheckoutPayload() {
  const vendors = getVendors();
  const vendor = vendors[0] || { id: "", name: "" };

  const items = cart.map((item) => ({
    id: item.id,
    name: item.name,
    image: item.image || "",
    basePrice: Number(item.price) || 0,
    unitPrice: getItemUnitPrice(item),
    quantity: item.quantity,
    lineTotal: getItemTotal(item),
    sauce: names(item.sauce),
    extras: toArray(item.extras).map((e) =>
      e && typeof e === "object"
        ? { name: String(e.name || ""), price: Number(e.price) || 0 }
        : { name: String(e), price: 0 }
    ),
    without: names(item.without),
    notes: item.notes || ""
  }));

  const subtotal = getCartSubtotal();
  const deliveryFee = getDeliveryFee();

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    itemCount: getCartCount(),
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    currency: "MAD",
    createdAt: new Date().toISOString()
  };
}