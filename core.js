/* =====================================================
   QUICKLY - core.js
   نظام مشترك للغة والاتجاه والثيم.
   يُحمَّل كسكربت عادي (غير module) داخل <head> حتى تُطبَّق
   الإعدادات قبل أول رسم للصفحة (لا وميض للثيم الفاتح).
   ===================================================== */
(function () {
  "use strict";

  var LANG_KEY = "quickly_lang";
  var THEME_KEY = "quickly_theme";
  var LANGS = ["fr", "ar", "en"];
  var DEFAULT_LANG = "fr";
  var root = document.documentElement;

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* تخزين غير متاح */ } }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  function validLang(l) {
    l = String(l || "").toLowerCase().slice(0, 2);
    return LANGS.indexOf(l) > -1 ? l : null;
  }
  function validTheme(t) { return t === "dark" || t === "light" ? t : null; }

  /* ---- استعادة الإعدادات (مع ترحيل المفاتيح القديمة "lang" و"language") ---- */
  var lang = validLang(read(LANG_KEY)) || validLang(read("lang")) || validLang(read("language")) || DEFAULT_LANG;
  drop("lang");
  drop("language");
  if (validLang(read(LANG_KEY)) !== lang) write(LANG_KEY, lang);

  var theme = validTheme(read(THEME_KEY));
  if (!theme) {
    var prefersDark = false;
    try { prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { /* ignore */ }
    theme = prefersDark ? "dark" : "light"; // قيمة أولية فقط، ولا تُحفظ حتى يختار المستخدم
  }

  /* ---- التطبيق على <html> ---- */
  function applyLang(l) {
    root.setAttribute("lang", l);
    root.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
  }
  function applyTheme(t) {
    if (t === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }
  applyLang(lang);
  applyTheme(theme);

  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) { /* ignore */ }
  }

  /* ---- مزامنة عناصر التحكم الموجودة في الصفحة (إن وجدت) ---- */
  function syncControls() {
    var sel = document.getElementById("languageSelect");
    if (sel) sel.value = lang;
    var tog = document.getElementById("darkModeToggle");
    if (tog) tog.checked = theme === "dark";
  }

  var api = {
    languages: LANGS.slice(),
    getLang: function () { return lang; },
    getTheme: function () { return theme; },
    isRTL: function () { return lang === "ar"; },
    setLang: function (l, fromStorage) {
      l = validLang(l);
      if (!l || l === lang) return;
      lang = l;
      if (!fromStorage) write(LANG_KEY, l);
      applyLang(l);
      syncControls();
      emit("quickly:langchange", { lang: l });
    },
    setTheme: function (t, fromStorage) {
      t = validTheme(t);
      if (!t || t === theme) return;
      theme = t;
      if (!fromStorage) write(THEME_KEY, t);
      applyTheme(t);
      syncControls();
      emit("quickly:themechange", { theme: t });
    },
    toggleTheme: function () { api.setTheme(theme === "dark" ? "light" : "dark"); }
  };
  window.QuicklyCore = api;

  /* ---- ربط عناصر التحكم + مزامنة التبويبات الأخرى ---- */
  document.addEventListener("DOMContentLoaded", function () {
    syncControls();
    var sel = document.getElementById("languageSelect");
    if (sel) sel.addEventListener("change", function (e) { api.setLang(e.target.value); });
    var tog = document.getElementById("darkModeToggle");
    if (tog) tog.addEventListener("change", function (e) { api.setTheme(e.target.checked ? "dark" : "light"); });
  });

  window.addEventListener("storage", function (e) {
    if (e.key === LANG_KEY) api.setLang(e.newValue, true);
    if (e.key === THEME_KEY) api.setTheme(e.newValue, true);
  });
})();