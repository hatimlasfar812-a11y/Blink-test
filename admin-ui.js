/* =====================================================
   QUICKLY ADMIN — UI shell + i18n (ar / fr / en)
   - Arabic is the source language of the markup and of admin.js.
   - Only text shown in the interface is translated; Firestore data is never touched.
   - A MutationObserver translates anything admin.js renders later (tables, toasts, modals).
   - To add/fix a translation: edit the ROWS table (ar | fr | en) or PATTERNS below.
===================================================== */

const LANGS = {
    ar: { dir: "rtl", locale: "ar-MA" },
    fr: { dir: "ltr", locale: "fr-FR" },
    en: { dir: "ltr", locale: "en-GB" }
};
const STORAGE_KEY = "adminLang";
const ATTRS = ["placeholder", "title", "aria-label"];

/* ── Dictionary: ar | fr | en ─────────────────────── */
const ROWS = `
جاري التحميل...|Chargement...|Loading...
البريد الإلكتروني|E-mail|Email
كلمة المرور|Mot de passe|Password
تسجيل الدخول|Se connecter|Sign in
نسيت كلمة المرور؟|Mot de passe oublié ?|Forgot password?
البريد أو كلمة المرور غير صحيحة|E-mail ou mot de passe incorrect|Incorrect email or password
الرئيسية|Accueil|Home
مركز القيادة|Tableau de bord|Dashboard
الأقسام|Catalogue|Catalog
المطاعم|Restaurants|Restaurants
المتاجر|Boutiques|Shops
الهايبرماركت|Hypermarchés|Hypermarkets
الطرود|Colis|Parcels
الأسطول|Flotte|Fleet
السائقون|Livreurs|Drivers
لوحة الشرف|Classement|Leaderboard
الخريطة|Carte|Map
التقييمات|Avis|Reviews
الأرباح والدفعات|Gains et paiements|Earnings & payouts
التحليلات|Analyses|Analytics
العمليات|Opérations|Operations
الطلبات|Commandes|Orders
العروض|Offres|Offers
الكوبونات|Coupons|Coupons
مناطق التوصيل|Zones de livraison|Delivery zones
النظام|Système|System
حالة الخدمات|État des services|Service status
التقارير|Rapports|Reports
سجل الإجراءات|Journal d'audit|Audit log
المسؤول|Administrateur|Admin
القائمة الرئيسية|Menu principal|Main menu
إغلاق القائمة|Fermer le menu|Close menu
القائمة|Menu|Menu
خروج|Déconnexion|Log out
تم الخروج|Déconnecté|Signed out
بحث...|Rechercher...|Search...
بحث|Rechercher|Search
تحديث|Actualiser|Refresh
الوضع الليلي|Mode sombre|Dark mode
إغلاق|Fermer|Close
نظرة شاملة على أداء النظام|Vue d'ensemble de la plateforme|Platform overview
تصدير|Exporter|Export
مبيعات اليوم|Ventes du jour|Today's sales
اليوم|Aujourd'hui|Today
طلبات اليوم|Commandes du jour|Today's orders
طلب|commande|order
الطلبات النشطة|Commandes actives|Active orders
قيد التنفيذ|En cours|In progress
متصلون|En ligne|Online
مسجل|Inscrits|Registered
نشط|Actif|Active
نشاط الطلبات (24 ساعة)|Activité des commandes (24 h)|Order activity (24h)
أحدث الطلبات|Dernières commandes|Latest orders
عرض الكل|Voir tout|View all
الطلب|Commande|Order
العميل|Client|Customer
المتجر|Magasin|Store
المبلغ|Montant|Amount
الحالة|Statut|Status
إدارة المطاعم|Gestion des restaurants|Restaurant management
إضافة مطعم|Ajouter un restaurant|Add restaurant
المطعم|Restaurant|Restaurant
التصنيف|Catégorie|Category
الهاتف|Téléphone|Phone
التوصيل|Livraison|Delivery
التقييم|Note|Rating
إجراءات|Actions|Actions
إجراء|Action|Action
بوتيكات فردية|Boutiques indépendantes|Independent boutiques
إضافة متجر|Ajouter une boutique|Add shop
الكل|Tous|All
أزياء|Mode|Fashion
إلكترونيات|Électronique|Electronics
عطور|Parfums|Perfumes
إكسسوارات|Accessoires|Accessories
منزل|Maison|Home
أخرى|Autre|Other
الفئة|Catégorie|Category
سلاسل كبرى مع جلب تلقائي|Grandes enseignes avec synchro auto|Major chains with auto-sync
إضافة سلسلة|Ajouter une enseigne|Add chain
السلاسل|Enseignes|Chains
المنتجات|Produits|Products
آخر مزامنة|Dernière synchro|Last sync
المنتجات المُجلبة|Produits importés|Imported products
قيد المراجعة|En révision|Under review
معتمد|Approuvé|Approved
مرفوض|Rejeté|Rejected
بحث منتج...|Rechercher un produit...|Search product...
بحث منتج|Rechercher un produit|Search product
المنتج|Produit|Product
السلسلة|Enseigne|Chain
المعرّف|Identifiant|Identifier
السعر|Prix|Price
لا توجد منتجات.|Aucun produit.|No products.
لا توجد منتجات|Aucun produit|No products
إضافة|Ajouter|Add
المرسل/المستلم|Expéditeur/Destinataire|Sender/Recipient
السائق|Livreur|Driver
إدارة السائقين|Gestion des livreurs|Driver management
إنشاء حساب|Créer un compte|Create account
إضافة سائق|Ajouter un livreur|Add driver
الإجمالي|Total|Total
متاحون|Disponibles|Available
مشغولون|Occupés|Busy
غير متصلين|Hors ligne|Offline
موقوفون|Suspendus|Suspended
كل الحالات|Tous les statuts|All statuses
متاح|Disponible|Available
مشغول|Occupé|Busy
غير متصل|Hors ligne|Offline
موقوف|Suspendu|Suspended
التوثيق|Vérification|Verification
موثّق|Vérifié|Verified
موثق|Vérifié|Verified
المركبة|Véhicule|Vehicle
أسبوع|Semaine|Week
شهر|Mois|Month
الخريطة الحية|Carte en direct|Live map
التاريخ|Date|Date
التعليق|Commentaire|Comment
متابعة وتحديث حالات الطلبات|Suivre et mettre à jour les commandes|Track and update order statuses
تعيين تلقائي للكل|Tout affecter automatiquement|Auto-assign all
تصدير CSV|Exporter en CSV|Export CSV
بحث برقم الطلب أو اسم العميل...|Rechercher par n° de commande ou client...|Search by order number or customer...
معلق|En attente|Pending
مؤكد|Confirmée|Confirmed
قيد التحضير|En préparation|Preparing
جاهز|Prête|Ready
معين|Affectée|Assigned
مقبول|Acceptée|Accepted
مستلم|Récupérée|Picked up
في الطريق|En route|On the way
مكتمل|Livrée|Delivered
ملغي|Annulée|Cancelled
العروض والبانرز|Offres et bannières|Offers & banners
عرض|Offre|Offer
بانر|Bannière|Banner
البانرز|Bannières|Banners
الصورة|Image|Image
العنوان|Titre|Title
الثمن|Prix|Price
كوبون|Coupon|Coupon
الكود|Code|Code
القيمة|Valeur|Value
الاستخدام|Utilisation|Usage
منطقة|Zone|Zone
المنطقة|Zone|Zone
المدينة|Ville|City
الرسوم|Frais|Fee
مبيعات الشهر|Ventes du mois|Monthly sales
الإجراء|Action|Action
الهدف|Cible|Target
تسجيل دفعة|Enregistrer un paiement|Record payment
إدارة أرباح السائقين وتسجيل الدفعات|Gérer les gains des livreurs et les paiements|Manage driver earnings and payouts
إجمالي الأرباح (الشهر)|Gains totaux (mois)|Total earnings (month)
هذا الشهر|Ce mois-ci|This month
مدفوع للسائقين|Versé aux livreurs|Paid to drivers
تم الدفع|Payé|Paid
مستحقات متبقية|Solde restant|Outstanding balance
للدفع|À payer|To pay
دفعات هذا الشهر|Paiements ce mois-ci|Payments this month
دفعة|paiement|payment
بحث باسم السائق...|Rechercher un livreur...|Search by driver name...
كل الفترات|Toutes les périodes|All periods
هذا الأسبوع|Cette semaine|This week
مستحق|Dû|Due
مدفوع|Payé|Paid
الفترة|Période|Period
التوصيلات|Livraisons|Deliveries
المدفوع|Payé|Paid
المتبقي|Restant|Remaining
آخر دفعة|Dernier paiement|Last payment
سجل الدفعات|Historique des paiements|Payment history
طريقة الدفع|Mode de paiement|Payment method
بواسطة|Par|By
ملاحظات|Notes|Notes
لا توجد دفعات بعد|Aucun paiement pour l'instant|No payments yet
لا توجد دفعات|Aucun paiement|No payments
لا توجد بيانات أرباح|Aucune donnée de gains|No earnings data
التحليلات المتقدمة|Analyses avancées|Advanced analytics
رؤى تفصيلية عن أداء النظام|Performances détaillées de la plateforme|Detailed platform insights
معدل إتمام الطلبات|Taux de livraison|Order completion rate
متوسط وقت التوصيل|Délai moyen de livraison|Avg. delivery time
من الطلب للتسليم|De la commande à la livraison|From order to delivery
متوسط قيمة الطلب|Panier moyen|Avg. order value
متوسط|Moyenne|Average
معدل التكرار|Taux de réachat|Repeat rate
عملاء متكررون|Clients fidèles|Repeat customers
الطلبات خلال 7 أيام|Commandes sur 7 jours|Orders over 7 days
أفضل السائقين|Meilleurs livreurs|Top drivers
أفضل المطاعم|Meilleurs restaurants|Top restaurants
الإيرادات|Revenus|Revenue
متوسط التقييم|Note moyenne|Avg. rating
لا توجد بيانات|Aucune donnée|No data
إضافة هايبرماركت|Ajouter un hypermarché|Add hypermarket
إضافة مطعم جديد|Ajouter un restaurant|Add new restaurant
تعديل المطعم|Modifier le restaurant|Edit restaurant
إضافة متجر|Ajouter un magasin|Add store
تعديل السائق|Modifier le livreur|Edit driver
-- اختر --|-- Choisir --|-- Select --
السلسلة *|Enseigne *|Chain *
الاسم المعروض *|Nom affiché *|Display name *
مخصصة|Personnalisée|Custom
مخصص|Personnalisé|Custom
الاسم *|Nom *|Name *
الاسم|Nom|Name
العنوان الكامل|Adresse complète|Full address
العنوان *|Titre *|Title *
الصورة *|Image *|Image *
رابط المصدر (URL)|URL source|Source URL
تكرار المزامنة|Fréquence de synchro|Sync frequency
كل ساعة|Toutes les heures|Hourly
كل 6 ساعات|Toutes les 6 heures|Every 6 hours
يومياً|Quotidienne|Daily
يدوياً|Manuelle|Manual
هامش الربح (%)|Marge (%)|Markup (%)
العملة|Devise|Currency
حالة المزامنة|État de la synchro|Sync status
مفعّلة|Activée|Enabled
موقوفة|En pause|Paused
ربط التصنيفات|Correspondance des catégories|Category mapping
إضافة ربط|Ajouter une correspondance|Add mapping
تصنيف المصدر|Catégorie source|Source category
إلغاء|Annuler|Cancel
حفظ|Enregistrer|Save
الهاتف *|Téléphone *|Phone *
البريد|E-mail|Email
المركبة *|Véhicule *|Vehicle *
موتو|Moto|Motorbike
سكوتر|Scooter|Scooter
سيارة|Voiture|Car
دراجة|Vélo|Bike
شاحنة|Camionnette|Van
رقم اللوحة|Plaque d'immatriculation|Plate number
الحالة الإدارية|Statut administratif|Admin status
قيد التحقق|En vérification|Pending verification
موقوف مؤقت|Suspendu temporairement|Temporarily suspended
محظور|Banni|Banned
الصورة الشخصية|Photo de profil|Profile photo
البطاقة الوطنية CIN *|Carte nationale (CIN) *|National ID (CIN) *
ملاحظات إدارية|Notes internes|Admin notes
إنشاء حساب دخول|Créer un compte de connexion|Create login account
البريد (اختياري)|E-mail (facultatif)|Email (optional)
إنشاء|Créer|Create
تحكم:|Contrôle :|Control:
إنذار|Avertissement|Warning
المدة|Durée|Duration
24 ساعة|24 heures|24 hours
48 ساعة|48 heures|48 hours
السبب|Motif|Reason
تطبيق|Appliquer|Apply
مطعم|Restaurant|Restaurant
اسم التصنيف الظاهر|Nom de catégorie affiché|Display category name
وقت التوصيل|Délai de livraison|Delivery time
رسوم|Frais|Fee
خط العرض (Latitude)|Latitude|Latitude
خط الطول (Longitude)|Longitude|Longitude
استخدام موقعي الحالي|Utiliser ma position|Use my current location
توصيل مجاني|Livraison gratuite|Free delivery
عرض اليوم|Offre du jour|Today's offer
مفتوح|Ouvert|Open
مغلق|Fermé|Closed
المنيو|Menu|Menu
إضافة وتعديل وحذف الوجبات|Ajouter, modifier et supprimer des plats|Add, edit and delete dishes
إضافة / تعديل|Ajouter / modifier|Add / edit
الوصف|Description|Description
السعر *|Prix *|Price *
منتجات|Produits|Products
إدارة المنتجات|Gérer les produits|Manage products
متجر|Magasin|Store
نشر|Publier|Publish
الفرعي|Sous-titre|Subtitle
النسبة (%) *|Remise (%) *|Discount (%) *
الكود *|Code *|Code *
الثمن *|Prix *|Price *
تفاصيل|Détails|Details
تفاصيل السائق|Détails du livreur|Driver details
السائق *|Livreur *|Driver *
اختر سائقاً|Choisissez un livreur|Select a driver
اختر سائقاً أولاً|Choisissez d'abord un livreur|Select a driver first
اختر سائقاً لعرض المستحقات|Choisissez un livreur pour voir le solde|Select a driver to see the balance
المبلغ (د.م) *|Montant (MAD) *|Amount (MAD) *
المرجع|Référence|Reference
رقم المعاملة|N° de transaction|Transaction number
تسجيل|Enregistrer|Record
نقدي|Espèces|Cash
تحويل بنكي|Virement bancaire|Bank transfer
تحويل|Virement|Transfer
محفظة|Portefeuille|Wallet
تأكيد|Confirmer|Confirm
هل أنت متأكد؟|Êtes-vous sûr ?|Are you sure?
تأكيد؟|Confirmer ?|Confirm?
رفع صورة|Importer une image|Upload image
توليد ID جديد|Générer un nouvel ID|Generate new ID
توليد كلمة مرور|Générer un mot de passe|Generate password
نسخ|Copier|Copy
حذف المطعم|Supprimer le restaurant|Delete restaurant
سيتم الحذف مع المنيو|Le menu sera aussi supprimé|The menu will be deleted too
حذف الوجبة|Supprimer le plat|Delete dish
حذف المتجر|Supprimer le magasin|Delete store
سيتم الحذف مع منتجاته|Ses produits seront aussi supprimés|Its products will be deleted too
حذف المنتج|Supprimer le produit|Delete product
حذف السائق|Supprimer le livreur|Delete driver
سيتم الحذف|La suppression est définitive|This will be deleted
حذف المنطقة|Supprimer la zone|Delete zone
حذف|Supprimer|Delete
بدون موقع|Sans position|No location
متوفر|Disponible|Available
مفقود|Manquant|Missing
عام|Général|General
عناية|Soins|Care
لا توجد مطاعم.|Aucun restaurant.|No restaurants.
لا توجد متاجر.|Aucun magasin.|No stores.
لا توجد وجبات.|Aucun plat.|No dishes.
لا يوجد سائقون.|Aucun livreur.|No drivers.
لا توجد عروض|Aucune offre|No offers
لا توجد بانرات|Aucune bannière|No banners
لا توجد كوبونات|Aucun coupon|No coupons
لا توجد مناطق|Aucune zone|No zones
لا توجد سجلات|Aucun enregistrement|No records
لا توجد تقييمات|Aucun avis|No reviews
لا توجد هايبرماركت|Aucun hypermarché|No hypermarkets
لا توجد عمليات|Aucune opération|No operations
لا توجد طلبات|Aucune commande|No orders
لا توجد طلبات.|Aucune commande.|No orders.
لا تفاصيل|Aucun détail|No details
عميل|Client|Customer
سائق|Livreur|Driver
جديد|Nouveau|New
متصل|En ligne|Online
استراحة|En pause|On break
فشل|Échec|Failed
تم|Terminé|Done
تم!|Terminé !|Done!
تم التحديث|Mis à jour|Updated
تم التحديد|Position définie|Location set
تمت الإضافة|Ajouté|Added
أضيف|Ajouté|Added
فُتح|Ouvert|Opened
أُغلق|Fermé|Closed
جاهز للتعديل|Prêt à modifier|Ready to edit
جاهز|Prêt|Ready
تم النسخ|Copié|Copied
الرجاء اختيار صورة صالحة|Veuillez choisir une image valide|Please choose a valid image
جاري معالجة الصورة...|Traitement de l'image...|Processing image...
تم رفع الصورة بنجاح|Image importée|Image uploaded
فشل قراءة الصورة، جرب صورة أخرى|Lecture impossible, essayez une autre image|Could not read the image, try another one
فشل في قراءة الملف|Lecture du fichier impossible|Could not read the file
متصفحك لا يدعم تحديد الموقع|Votre navigateur ne gère pas la géolocalisation|Your browser does not support geolocation
جاري تحديد الموقع...|Localisation en cours...|Getting location...
لم يُحدد المطعم|Aucun restaurant sélectionné|No restaurant selected
لم يُحدد المتجر|Aucun magasin sélectionné|No store selected
Driver ID مستخدم!|Driver ID déjà utilisé !|Driver ID already in use!
اختر سائق|Choisissez un livreur|Select a driver
كلمة المرور قصيرة|Mot de passe trop court|Password too short
كلمة المرور ضعيفة|Mot de passe trop faible|Password too weak
البريد مستخدم|E-mail déjà utilisé|Email already in use
جاري الإنشاء...|Création...|Creating...
جاري التسجيل...|Enregistrement...|Saving...
لا توجد طلبات معلقة|Aucune commande en attente|No pending orders
الطلب غير موجود|Commande introuvable|Order not found
الطلب معين بالفعل|Commande déjà affectée|Order already assigned
المطعم غير موجود|Restaurant introuvable|Restaurant not found
لا يوجد سائقون متاحون الآن|Aucun livreur disponible|No drivers available right now
البحث عن أقرب سائق...|Recherche du livreur le plus proche...|Finding the nearest driver...
المبلغ يجب أن يكون أكبر من 0|Le montant doit être supérieur à 0|Amount must be greater than 0
اختر سائقاً|Choisissez un livreur|Select a driver
الآن|À l'instant|Just now
لم تتم|Jamais|Never
منتج|produits|products
هامش|marge|markup
الوثائق|Documents|Documents
آخر 10 طلبات|10 dernières commandes|Last 10 orders
آخر التقييمات|Derniers avis|Latest reviews
البريد:|E-mail :|Email:
المركبة:|Véhicule :|Vehicle:
اللوحة:|Plaque :|Plate:
التوثيق:|Vérification :|Verification:
آخر نشاط:|Dernière activité :|Last activity:
عدد التقييمات:|Nombre d'avis :|Number of reviews:
العميل:|Client :|Customer:
الهاتف:|Téléphone :|Phone:
العنوان:|Adresse :|Address:
المتجر:|Magasin :|Store:
السائق:|Livreur :|Driver:
الحالة:|Statut :|Status:
الدفع:|Paiement :|Payment:
التاريخ:|Date :|Date:
المنتجات:|Produits :|Products:
الإجمالي:|Total :|Total:
التقييم|Note|Rating
`.trim().split("\n").map(l => l.split("|"));

/* ── Patterns for strings with dynamic parts ───────── */
const PATTERNS = [
    [/^مرحبا\s*(.*)$/, "Bienvenue $1", "Welcome $1"],
    [/^طلب جديد من (.*)$/, "Nouvelle commande de $1", "New order from $1"],
    [/^صفحة (\d+) من (\d+) \((\d+)\)$/, "Page $1 sur $2 ($3)", "Page $1 of $2 ($3)"],
    [/^الطلب #(.*)$/, "Commande #$1", "Order #$1"],
    [/^المنيو: (.*)$/, "Menu : $1", "Menu: $1"],
    [/^منتجات: (.*)$/, "Produits : $1", "Products: $1"],
    [/^آخر مزامنة: (.*)$/, "Dernière synchro : $1", "Last sync: $1"],
    [/^(\d+) د$/, "$1 min", "$1 min"],
    [/^(\d+) س$/, "$1 h", "$1 h"],
    [/^(\d+) ي$/, "$1 j", "$1 d"],
    [/^-- اختر \((\d+) بدون حساب\) --$/, "-- Choisir ($1 sans compte) --", "-- Select ($1 without account) --"],
    [/^(\d+) توصيل • (\d+) د\.م$/, "$1 livraisons • $2 MAD", "$1 deliveries • $2 MAD"],
    [/^تم تعيين (\d+) طلب \(فشل (\d+)\)$/, "$1 commande(s) affectée(s) ($2 échec)", "$1 order(s) assigned ($2 failed)"],
    [/^تم تعيين (\d+) طلب$/, "$1 commande(s) affectée(s)", "$1 order(s) assigned"],
    [/^تم تعيين (.+) \((.+) كم\)$/, "$1 affecté ($2 km)", "$1 assigned ($2 km)"],
    [/^سيتم تعيين (\d+) طلب تلقائياً\. متابعة؟$/, "$1 commande(s) seront affectées automatiquement. Continuer ?", "$1 order(s) will be assigned automatically. Continue?"],
    [/^المبلغ \((.+)\) أكبر من المستحق \((.+)\)\. متابعة؟$/, "Le montant ($1) dépasse le solde dû ($2). Continuer ?", "Amount ($1) exceeds the amount due ($2). Continue?"],
    [/^تم تسجيل دفعة (.+) د\.م لـ (.+)$/, "Paiement de $1 MAD enregistré pour $2", "Payment of $1 MAD recorded for $2"],
    [/^لا يوجد سائقون في نطاق (\d+) كم$/, "Aucun livreur dans un rayon de $1 km", "No drivers within $1 km"],
    [/^المطعم "(.*)" لا يملك موقع$/, "Le restaurant « $1 » n'a pas de position", "Restaurant \"$1\" has no location"],
    [/^فشل: (.*)$/, "Échec : $1", "Failed: $1"]
];

/* ── Engine ───────────────────────────────────────── */
const fwd = new Map();   // arabic core -> { fr, en }
const rev = new Map();   // translated core -> arabic core
ROWS.forEach(([ar, fr, en]) => {
    if (!fwd.has(ar)) fwd.set(ar, { fr, en });
    if (!rev.has(fr) && !fwd.has(fr)) rev.set(fr, ar);
    if (!rev.has(en) && !fwd.has(en)) rev.set(en, ar);
});

let lang = localStorage.getItem(STORAGE_KEY);
if (!LANGS[lang]) lang = "ar";

const SPLIT = /^([\s\p{Extended_Pictographic}\uFE0F\u200D]*)([\s\S]*?)(\s*)$/u;

function translate(src, l) {
    const m = SPLIT.exec(src);
    if (!m || !m[2]) return src;
    const [, lead, core, trail] = m;
    // Pagination arrows must follow the writing direction
    if (core === "‹" || core === "›") {
        return l === "ar" ? lead + (core === "‹" ? "›" : "‹") + trail : src;
    }
    if (l === "ar") return src;
    let out = fwd.get(core)?.[l];
    if (out === undefined) {
        for (const [re, fr, en] of PATTERNS) {
            if (re.test(core)) { out = core.replace(re, l === "fr" ? fr : en); break; }
        }
    }
    if (out === undefined) out = core;
    out = out.replace(/د\.م/g, "MAD");
    return lead + out + trail;
}

/** Recover the Arabic original of a string that may already be translated. */
function toOriginal(current) {
    const m = SPLIT.exec(current);
    if (!m || !m[2]) return current;
    const ar = rev.get(m[2]);
    return ar ? m[1] + ar + m[3] : current;
}

const textRec = new WeakMap();   // text node -> { orig, shown }
const attrRec = new WeakMap();   // element   -> { attr: { orig, shown } }

function visitText(node) {
    const cur = node.nodeValue;
    if (!cur || !cur.trim()) return;
    let rec = textRec.get(node);
    const orig = rec && cur === rec.shown ? rec.orig : toOriginal(cur);
    const shown = translate(orig, lang);
    if (shown !== cur) node.nodeValue = shown;
    textRec.set(node, { orig, shown });
}

function visitAttrs(el) {
    for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        const cur = el.getAttribute(a);
        const recs = attrRec.get(el) || {};
        const r = recs[a];
        const orig = r && cur === r.shown ? r.orig : toOriginal(cur);
        const shown = translate(orig, lang);
        if (shown !== cur) el.setAttribute(a, shown);
        recs[a] = { orig, shown };
        attrRec.set(el, recs);
    }
}

const SKIP = new Set(["SCRIPT", "STYLE", "CANVAS", "TEXTAREA", "NOSCRIPT"]);

function apply(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
        if (!SKIP.has(root.parentNode?.nodeName) && !root.parentElement?.closest("[data-no-i18n]")) visitText(root);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || SKIP.has(root.nodeName) || root.closest("[data-no-i18n]")) return;
    visitAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.nodeType === Node.ELEMENT_NODE && (SKIP.has(n.nodeName) || n.hasAttribute("data-no-i18n")))
            ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let n;
    while ((n = walker.nextNode())) {
        if (n.nodeType === Node.TEXT_NODE) visitText(n);
        else visitAttrs(n);
    }
}

const observer = new MutationObserver(muts => {
    for (const m of muts) {
        if (m.type === "childList") m.addedNodes.forEach(apply);
        else if (m.type === "characterData") apply(m.target);
        else if (m.type === "attributes") visitAttrs(m.target);
    }
});

function setLang(l, persist = true) {
    if (!LANGS[l]) l = "ar";
    lang = l;
    if (persist) { try { localStorage.setItem(STORAGE_KEY, l); } catch (e) {} }
    const root = document.documentElement;
    root.lang = l;
    root.dir = LANGS[l].dir;
    const sel = document.getElementById("langSelect");
    if (sel) sel.value = l;
    apply(document.body);
    document.dispatchEvent(new CustomEvent("admin:langchange", { detail: { lang: l } }));
}

/* Dates rendered by admin.js use "ar-MA": follow the selected language instead. */
["toLocaleString", "toLocaleDateString", "toLocaleTimeString"].forEach(fn => {
    const orig = Date.prototype[fn];
    Date.prototype[fn] = function (loc, opts) {
        return orig.call(this, loc === "ar-MA" ? LANGS[lang].locale : loc, opts);
    };
});

/* Native confirm() dialogs used by admin.js */
const nativeConfirm = window.confirm.bind(window);
window.confirm = msg => nativeConfirm(translate(String(msg), lang));

window.adminI18n = { setLang, getLang: () => lang, t: s => translate(s, lang) };

/* ── UI shell ─────────────────────────────────────── */
function initShell() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const toggle = document.getElementById("mobileToggle");
    const closeNav = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("show"); };

    document.getElementById("sidebarClose")?.addEventListener("click", closeNav);

    // Keep body scroll lock + aria-expanded in sync with whatever admin.js does to the drawer
    if (sidebar) {
        new MutationObserver(() => {
            const open = sidebar.classList.contains("open");
            document.body.classList.toggle("nav-open", open);
            toggle?.setAttribute("aria-expanded", String(open));
        }).observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    }
    window.matchMedia("(min-width: 993px)").addEventListener("change", e => { if (e.matches) closeNav(); });

    // Esc closes the top-most modal, otherwise the drawer
    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        const open = [...document.querySelectorAll(".modal-overlay:not(.hidden)")];
        if (open.length) open[open.length - 1].classList.add("hidden");
        else closeNav();
    });
    // Click on the dimmed backdrop closes a modal
    document.addEventListener("mousedown", e => {
        if (e.target.classList?.contains("modal-overlay")) e.target.classList.add("hidden");
    });

    // Focus management for modals (move focus in on open, restore on close)
    document.querySelectorAll(".modal-overlay").forEach(ov => {
        let opener = null;
        new MutationObserver(() => {
            if (!ov.classList.contains("hidden")) {
                opener = document.activeElement;
                setTimeout(() => ov.querySelector("input:not([type=hidden]):not(.hidden):not([readonly]), select, textarea, .close-modal")?.focus({ preventScroll: true }), 60);
            } else if (opener && document.contains(opener)) {
                opener.focus?.({ preventScroll: true });
                opener = null;
            }
        }).observe(ov, { attributes: true, attributeFilter: ["class"] });
    });

    document.getElementById("langSelect")?.addEventListener("change", e => setLang(e.target.value));
}

function boot() {
    initShell();
    setLang(lang, false);
    observer.observe(document.body, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ATTRS
    });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();