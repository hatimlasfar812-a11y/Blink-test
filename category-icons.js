// category-icons.js
// يحوّل تصنيفات Firestore (foodCategories) إلى أيقونات Vector موحّدة (Lucide, outline).
// لا يغيّر بنية البيانات: يقرأ item.slug و item.name فقط.

const TACOS_SVG =
  '<svg class="lucide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 18a9 9 0 0 1 18 0Z"/><path d="M7.5 14.5c1-1.5 2-1.5 3 0s2 1.5 3 0 2-1.5 3 0"/></svg>';

// الترتيب مهم: أول تطابق يفوز.
const RULES = [
  [/burger|hamburger|برغر|برجر/, "hamburger"],
  [/pizza|بيتزا/, "pizza"],
  [/sandwich|panini|snack|ساندويتش/, "sandwich"],
  [/salad|salade|سلطة/, "salad"],
  [/soup|soupe|harira|شوربة|حريرة/, "soup"],
  [/chicken|poulet|grill|bbq|دجاج|مشاوي/, "drumstick"],
  [/fish|poisson|seafood|sushi|سمك|سوشي/, "fish"],
  [/viande|meat|steak|لحم/, "beef"],
  [/glace|ice|مثلجات/, "ice-cream-cone"],
  [/dessert|cake|gateau|gâteau|sweet|حلويات|كعك/, "cake-slice"],
  [/crep|crêp|waffle|gaufre|كريب|وافل/, "cookie"],
  [/boulang|bakery|croissant|مخبز/, "croissant"],
  [/coffee|caf[eé]|قهوة/, "coffee"],
  [/juice|jus|drink|boisson|عصير|مشروب/, "cup-soda"]
];

export function categoryIconHtml(item) {
  const key = `${item.slug || ""} ${item.name || ""}`.toLowerCase();
  let inner;
  if (/taco|تاكو/.test(key)) {
    inner = TACOS_SVG;
  } else {
    const hit = RULES.find(([re]) => re.test(key));
    inner = `<i data-lucide="${hit ? hit[1] : "utensils"}"></i>`;
  }
  return `<div class="cat-icon">${inner}</div>`;
}