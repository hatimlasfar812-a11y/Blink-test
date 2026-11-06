// =====================================================
// menu-options.js
// أنواع الخيارات (optionType) لكل صنف من المنتجات
// =====================================================

export const OPTION_PRESETS = {
  // ---------- BURGER ----------
  burger: {
    groups: [
      {
        key: "sauces",
        type: "single",
        required: false,
        options: [
          { name: "Biggy" },
          { name: "Algérienne" },
          { name: "Mayonnaise" },
          { name: "Ketchup" },
          { name: "Sauce oignon" }
        ]
      },
      {
        key: "extras",
        type: "multi",
        options: [
          { name: "Salade", price: 2 },
          { name: "Viande hachée", price: 10 },
          { name: "Fromage extra", price: 5 },
          { name: "Tomate", price: 2 },
          { name: "Oeuf", price: 4 }
        ]
      },
      {
        key: "without",
        type: "multi",
        options: [
          { name: "Salade" },
          { name: "Oignon" },
          { name: "Tomate" },
          { name: "Sauce" },
          { name: "Fromage" }
        ]
      }
    ]
  },

  // ---------- PIZZA ----------
  pizza: {
    groups: [
      {
        key: "with",
        type: "multi",
        options: [
          { name: "Pepperoni" },
          { name: "Jambon" },
          { name: "Oignon" },
          { name: "Thon" }
        ]
      },
      {
        key: "extras",
        type: "multi",
        options: [
          { name: "Sauce tomate", price: 3 },
          { name: "Extra fromage", price: 5 },
          { name: "Extra viande", price: 10 }
        ]
      },
      {
        key: "without",
        type: "multi",
        options: [
          { name: "Olives" },
          { name: "Oignon" },
          { name: "Champignons" },
          { name: "Falafel" }
        ]
      }
    ]
  },

  // ---------- TACOS ----------
  tacos: {
    groups: [
      {
        key: "sauces",
        type: "single",
        required: false,
        options: [
          { name: "Biggy" },
          { name: "Algérienne" },
          { name: "Ketchup" }
        ]
      },
      {
        key: "extras",
        type: "multi",
        options: [
          { name: "Sauce", price: 2 },
          { name: "Frites", price: 5 },
          { name: "Viande", price: 10 }
        ]
      },
      {
        key: "without",
        type: "multi",
        options: [
          { name: "Frites" },
          { name: "Sauce" },
          { name: "Fromage" }
        ]
      }
    ]
  }
};

export const TYPE_KEYWORDS = {
  burger: ["burger", "hamburger", "cheeseburger", "برغر", "برجر", "بورغر", "بورجر"],
  pizza: ["pizza", "pizzas", "بيتزا", "بيتزة", "بيتسا"],
  tacos: ["tacos", "taco", "تاكوس", "طاكوس", "تاكو"]
};

export const GROUP_LABELS = {
  sauces: { en: "Sauces", fr: "Sauces", ar: "الصلصات" },
  with: { en: "With", fr: "Avec", ar: "مع" },
  extras: { en: "Extras", fr: "Suppléments", ar: "إضافات" },
  without: { en: "Without", fr: "Sans", ar: "بدون" }
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function inferOptionType(product) {
  const sources = [product?.name, product?.category].map(normalizeText);

  for (const text of sources) {
    if (!text) continue;
    for (const [type, words] of Object.entries(TYPE_KEYWORDS)) {
      if (words.some(w => text.includes(normalizeText(w)))) return type;
    }
  }
  return "";
}

function toPrice(value) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  return 0;
}

function normalizeOption(option) {
  if (typeof option === "string") return { name: option, price: 0 };
  if (!option || !option.name) return null;
  return { name: String(option.name), price: toPrice(option.price) };
}

function normalizeGroup(group) {
  if (!group || !group.key) return null;

  const key = String(group.key).trim();

  let options = group.options;
  if (options && !Array.isArray(options) && typeof options === "object") {
    options = Object.entries(options).map(([name, price]) => ({ name, price }));
  }

  options = (options || []).map(normalizeOption).filter(Boolean);
  if (!options.length) return null;

  return {
    key,
    type: group.type === "single" || (group.type !== "multi" && key === "sauces")
      ? "single"
      : "multi",
    required: group.required === true,
    label: group.label || null,
    options
  };
}

export function normalizeOptions(raw) {
  if (!raw || typeof raw !== "object") return null;

  if (Array.isArray(raw.groups)) {
    const groups = raw.groups.map(normalizeGroup).filter(Boolean);
    return groups.length ? { groups, isNewFormat: true } : null;
  }

  const groups = ["sauces", "with", "extras", "without"]
    .filter(key => raw[key] && typeof raw[key] === "object")
    .map(key => normalizeGroup({ key, options: raw[key] }))
    .filter(Boolean);

  return groups.length ? { groups, isNewFormat: false } : null;
}

export function groupLabel(group, lang) {
  if (group.label) {
    if (typeof group.label === "string") return group.label;
    return group.label[lang] || group.label.en || group.key;
  }
  const preset = GROUP_LABELS[group.key];
  return preset ? (preset[lang] || preset.en) : group.key;
}

export async function resolveOptionGroups(product, fetchDoc) {
  const declared = product?.optionType ? String(product.optionType).trim() : "";

  if (declared.toLowerCase() === "none") return null;

  const type = declared || inferOptionType(product);
  if (!type) return null;

  let remote = null;
  try {
    remote = await fetchDoc(type);
  } catch (err) {
    console.warn("menuOptions fetch failed:", err);
  }

  const normalized = normalizeOptions(remote);

  if (normalized && normalized.isNewFormat) {
    return { type, groups: normalized.groups };
  }

  const preset = OPTION_PRESETS[type.toLowerCase()];
  if (preset) {
    return { type, groups: preset.groups.map(normalizeGroup).filter(Boolean) };
  }

  if (normalized) {
    return { type, groups: normalized.groups };
  }

  return null;
}