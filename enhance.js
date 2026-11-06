// enhance.js — يضبط ارتفاع الـ Header (لشريط الفلاتر اللاصق). بصري فقط.
function setHeaderHeight() {
  const h = document.querySelector(".app-header");
  if (h) document.documentElement.style.setProperty("--header-h", h.offsetHeight + "px");
}
window.addEventListener("load", setHeaderHeight);
window.addEventListener("resize", setHeaderHeight);
document.addEventListener("quickly:langchange", () => setTimeout(setHeaderHeight, 50));