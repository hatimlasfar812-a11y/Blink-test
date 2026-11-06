import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { addToCart, getCart, getCartCount, clearCart, CART_EVENT } from "./cart.js";

export const PLACEHOLDER_IMG = "carrefour-logo.png";

export const escapeHtml = (v) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

export const normalizeText = (v) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/œ/g,"oe").replace(/\s+/g," ").trim();

export const safeImageUrl = (url) => {
  const s = String(url ?? "").trim(); 
  if (!s) return "";
  let f = s.startsWith("//") ? "https:" + s : s;
  if (f.includes("carrefour") || f.includes("glovo.dhmedia.io") || f.includes("deliveryhero.io")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(f)}`;
  }
  return f;
};

export const CATEGORY_TREE = {
  "viande_volaille": { label: "Viande et Volaille", icon: "beef" },
  "poissonnerie": { label: "Poissonnerie", icon: "fish" },
  "charcuterie": { label: "Charcuterie", icon: "ham" },
  "fruits_legumes": { label: "Fruits & Légumes", icon: "apple" },
  "produits_laitiers": { label: "Produits Laitiers & Œufs", icon: "milk" },
  "fromagerie": { label: "Fromagerie", icon: "package" },
  "pain_patisserie": { label: "Pain & Pâtisserie", icon: "croissant" },
  "surgeles": { label: "Surgelés", icon: "snowflake" },
  "epicerie": { label: "Épicerie", icon: "shopping-basket" },
  "petit_dejeuner": { label: "Petit Déjeuner", icon: "coffee" },
  "snacking_sale": { label: "Snacking Salé", icon: "cookie" },
  "douceurs_sucrees": { label: "Douceurs Sucrées", icon: "candy" },
  "boissons": { label: "Boissons", icon: "cup-soda" },
  "hygiene_beaute": { label: "Hygiène et Beauté", icon: "sparkles" },
  "entretien": { label: "Entretien & Nettoyage", icon: "spray-can" },
  "maison": { label: "Maison & Accessoires", icon: "home" },
  "animalerie": { label: "Animalerie", icon: "paw-print" }
};

function resolveCategory(catName, prodName) {
  const text = normalizeText(catName + " " + prodName);
  
  if (text.includes("fruit") || text.includes("legume") || text.includes("agrume") || text.includes("kiwi") || text.includes("pomme") || text.includes("banane") || text.includes("citron") || text.includes("orange") || text.includes("tomate")) return "fruits_legumes";
  if (text.includes("viande") || text.includes("boeuf") || text.includes("poulet") || text.includes("dinde") || text.includes("merguez") || text.includes("tagine") || text.includes("filet") || text.includes("pilon") || text.includes("brochette")) return "viande_volaille";
  if (text.includes("poisson") || text.includes("saumon") || text.includes("thon") || text.includes("crevette") || text.includes("merlan") || text.includes("dorade") || text.includes("truite")) return "poissonnerie";
  if (text.includes("charcuterie") || text.includes("jambon") || text.includes("salami") || text.includes("mortadelle") || text.includes("saucisson")) return "charcuterie";
  if (text.includes("fromage") || text.includes("jben") || text.includes("kiri") || text.includes("vache qui rit")) return "fromagerie";
  if (text.includes("lait") || text.includes("yaourt") || text.includes("beurre") || text.includes("oeuf") || text.includes("cremerie") || text.includes("danone") || text.includes("chergui")) return "produits_laitiers";
  if (text.includes("pain") || text.includes("viennoiserie") || text.includes("patisserie") || text.includes("boulangerie") || text.includes("croissant") || text.includes("biscotte")) return "pain_patisserie";
  if (text.includes("surgele") || text.includes("glace") || text.includes("frite") || text.includes("batonnet") || text.includes("magnum")) return "surgeles";
  if (text.includes("cafe") || text.includes("the") || text.includes("cereale") || text.includes("confiture") || text.includes("nescafe")) return "petit_dejeuner";
  if (text.includes("chips") || text.includes("sale") || text.includes("cacahuete") || text.includes("crunchips")) return "snacking_sale";
  if (text.includes("chocolat") || text.includes("biscuit") || text.includes("bonbon") || text.includes("sucre") || text.includes("tartiner") || text.includes("oreo") || text.includes("nutella")) return "douceurs_sucrees";
  if (text.includes("huile") || text.includes("conserv") || text.includes("pate") || text.includes("sauce") || text.includes("epice") || text.includes("farine") || text.includes("riz")) return "epicerie";
  if (text.includes("eau") || text.includes("jus") || text.includes("soda") || text.includes("boisson") || text.includes("sirop") || text.includes("canette") || text.includes("coca")) return "boissons";
  if (text.includes("hygiene") || text.includes("shampoo") || text.includes("savon") || text.includes("dent") || text.includes("beaute") || text.includes("gel douche")) return "hygiene_beaute";
  if (text.includes("lessive") || text.includes("nettoyant") || text.includes("javel") || text.includes("entretien") || text.includes("papier")) return "entretien";
  if (text.includes("vaisselle") || text.includes("assiette") || text.includes("verre") || text.includes("ecouteur") || text.includes("stylo") || text.includes("biberon")) return "maison";
  if (text.includes("animalerie") || text.includes("chat") || text.includes("chien") || text.includes("whiskas")) return "animalerie";
  
  return "autres";
}

export function normalizeProduct(id, data) {
  const name = String(data.name ?? "").trim();
  if (!name) return null;
  
  let price = null;
  if (typeof data.price === "number") price = data.price;
  else if (typeof data.priceMAD === "number") price = data.priceMAD;
  else if (typeof data.price === "string") price = parseFloat(data.price.replace(",", "."));
  
  let originalPrice = null;
  if (typeof data.originalPrice === "number") originalPrice = data.originalPrice;
  else if (typeof data.oldPrice === "number") originalPrice = data.oldPrice;
  else if (typeof data.comparePrice === "number") originalPrice = data.comparePrice;
  
  const isNew = data.isNew === true || data.is_new === true;
  
  const catName = data.categoryName || data.category || "";
  const category = resolveCategory(catName, name);
  
  return {
    id,
    name,
    price,
    originalPrice,
    isNew,
    image: safeImageUrl(data.image || data.imageUrl),
    category: category,
    stockStatus: data.stock_status || "in_stock",
    searchText: normalizeText(name),
  };
}

export async function fetchAllProducts(storeName) {
  // 🚀 كنحطو Timeout باش إلا تأخرت Firebase، الصفحة متبقاش معلقة
  const fetchPromise = (async () => {
    try {
      const snap = await getDocs(collection(db, "hypermarket_products"));
      const target = normalizeText(storeName);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(data => {
          const dbStore = normalizeText(data.store || data.chain || "");
          return dbStore.includes(target) && data.status === "approved";
        })
        .map(data => normalizeProduct(data.id, data))
        .filter(Boolean);
    } catch (err) {
      console.error("Error fetching products:", err);
      return [];
    }
  })();

  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve([]), 10000));

  const products = await Promise.race([fetchPromise, timeoutPromise]);
  if (products && products.length > 0) return products;

  // Fallback آمن لكي لا تظل الصفحة معلقة
  return [
    { id: "p1", name: "Lait Centrale Laitière 1L", price: 7.20, category: "produits_laitiers", stockStatus: "in_stock", searchText: "lait" },
    { id: "p2", name: "Huile de Table Lesieur 5L", price: 85.00, category: "epicerie", stockStatus: "in_stock", searchText: "huile" },
    { id: "p3", name: "Eau Minérale Oulmès 1L", price: 6.00, category: "boissons", stockStatus: "in_stock", searchText: "eau" }
  ];
}

export function resolveStoreConfig(store) {
  return { page: "carrefour.html", name: "Carrefour" };
}

export async function fetchHypermarkets() {
  return [{
    id: "carrefour",
    name: "Carrefour Oujda",
    chain: "carrefour",
    city: "Oujda",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1000&auto=format&fit=crop",
    deliveryTime: "30-50"
  }];
}

export function bindCartBadge(el) {
  const update = () => { 
    if (!el) return;
    const n = getCartCount(); 
    el.textContent = n > 99 ? "99+" : String(n); 
    el.hidden = n === 0; 
  };
  update(); 
  window.addEventListener(CART_EVENT, update); 
  return update;
}

export function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

export function showToast(message, type = "success") {
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:9999; display:flex; flex-direction:column; gap:8px;";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.style.cssText = `background:${type === 'error' ? '#e4002b' : '#004e9f'}; color:#fff; padding:12px 24px; border-radius:30px; font-weight:bold; font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,0.2); transition: opacity 0.3s;`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2500);
}

export function addProductToCart(product, vendor) {
  const success = addToCart({
    id: product.id, 
    name: product.name, 
    price: product.price, 
    image: product.image,
    quantity: 1, 
    restaurantId: vendor.id, 
    restaurantName: vendor.name
  });
  if (success === false) return "cancelled";
  return "added";
}