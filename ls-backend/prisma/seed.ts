import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── DONNÉES DE DÉMONSTRATION ──────────────────────────────────────────────────

const SELLERS = [
  { firstName: 'Kofi', lastName: 'Asante', email: 'kofi@demo.com', country: 'GH', shop: 'TechShop Kofi', plan: 'PREMIUM' },
  { firstName: 'Aminata', lastName: 'Diallo', email: 'aminata@demo.com', country: 'CI', shop: 'Aminata Informatique', plan: 'BASIC' },
  { firstName: 'Yao', lastName: 'Mensah', email: 'yao@demo.com', country: 'TG', shop: 'Yao Tech Lomé', plan: 'ESSENTIAL' },
  { firstName: 'Fatou', lastName: 'Ndiaye', email: 'fatou@demo.com', country: 'SN', shop: 'Fatou Digital Dakar', plan: 'PRO' },
  { firstName: 'Ibrahim', lastName: 'Coulibaly', email: 'ibrahim@demo.com', country: 'CI', shop: 'IB Composants', plan: 'FREE' },
  { firstName: 'Grace', lastName: 'Akosua', email: 'grace@demo.com', country: 'GH', shop: 'Grace Electronics', plan: 'BASIC' },
  { firstName: 'Moussa', lastName: 'Traoré', email: 'moussa@demo.com', country: 'BF', shop: 'Moussa IT Store', plan: 'ESSENTIAL' },
  { firstName: 'Aïcha', lastName: 'Konaté', email: 'aicha@demo.com', country: 'ML', shop: 'Aïcha MultiTech', plan: 'FREE' },
  { firstName: 'Emmanuel', lastName: 'Laryea', email: 'emmanuel@demo.com', country: 'GH', shop: 'Emmanuel Pro Tech', plan: 'PREMIUM' },
  { firstName: 'Binta', lastName: 'Camara', email: 'binta@demo.com', country: 'SN', shop: 'Binta Solutions', plan: 'BUSINESS' },
];

const BUYERS = [
  { firstName: 'Jean', lastName: 'Dupont', email: 'jean@demo.com', country: 'TG' },
  { firstName: 'Marie', lastName: 'Ouédraogo', email: 'marie@demo.com', country: 'BF' },
  { firstName: 'Paul', lastName: 'Ayivi', email: 'paul@demo.com', country: 'TG' },
  { firstName: 'Sophie', lastName: 'Koffi', email: 'sophie@demo.com', country: 'CI' },
  { firstName: 'Ama', lastName: 'Mensah', email: 'ama@demo.com', country: 'GH' },
];

const PRODUCTS_DATA = [
  // Ordinateurs
  { title: 'Laptop HP ProBook 450 G8 Intel Core i5', category: 'ordinateurs', price: 320000, stock: 5, condition: 'USED', brand: 'HP', model: 'ProBook 450 G8' },
  { title: 'MacBook Air M1 2021 256Go SSD', category: 'ordinateurs', price: 580000, stock: 3, condition: 'USED', brand: 'Apple', model: 'MacBook Air M1' },
  { title: 'Ordinateur portable Dell Latitude 5520 i7', category: 'ordinateurs', price: 450000, stock: 2, condition: 'REFURBISHED', brand: 'Dell', model: 'Latitude 5520' },
  { title: 'PC Bureau Dell OptiPlex 7090 Core i5 SSD', category: 'ordinateurs', price: 280000, stock: 4, condition: 'USED', brand: 'Dell', model: 'OptiPlex 7090' },
  { title: 'Lenovo ThinkPad X1 Carbon i7 16Go RAM', category: 'ordinateurs', price: 620000, stock: 1, condition: 'USED', brand: 'Lenovo', model: 'ThinkPad X1 Carbon' },
  { title: 'HP EliteBook 840 G6 14 pouces i5 8Go', category: 'ordinateurs', price: 290000, stock: 6, condition: 'REFURBISHED', brand: 'HP', model: 'EliteBook 840 G6' },
  { title: 'PC Portable Asus VivoBook 15 AMD Ryzen 5', category: 'ordinateurs', price: 245000, stock: 3, condition: 'USED', brand: 'Asus', model: 'VivoBook 15' },

  // Composants
  { title: 'RAM DDR4 16Go 3200MHz Kingston Fury', category: 'composants', price: 45000, stock: 15, condition: 'NEW', brand: 'Kingston', model: 'Fury Beast' },
  { title: 'SSD Samsung 970 EVO Plus 500Go NVMe', category: 'composants', price: 55000, stock: 8, condition: 'NEW', brand: 'Samsung', model: '970 EVO Plus' },
  { title: 'Processeur Intel Core i7-11700K 8 Cœurs', category: 'composants', price: 120000, stock: 4, condition: 'USED', brand: 'Intel', model: 'Core i7-11700K' },
  { title: 'Carte graphique GTX 1660 Super 6Go GDDR6', category: 'composants', price: 145000, stock: 2, condition: 'USED', brand: 'Nvidia', model: 'GTX 1660 Super' },
  { title: 'Carte mère ASUS ROG Strix B550-F Gaming', category: 'composants', price: 95000, stock: 3, condition: 'NEW', brand: 'Asus', model: 'ROG Strix B550-F' },
  { title: 'Alimentation Corsair 650W 80+ Gold Modulaire', category: 'composants', price: 42000, stock: 7, condition: 'NEW', brand: 'Corsair', model: 'RM650x' },

  // Réseau
  { title: 'Switch TP-Link 24 ports Gigabit TL-SG1024', category: 'reseau-serveurs', price: 65000, stock: 5, condition: 'NEW', brand: 'TP-Link', model: 'TL-SG1024' },
  { title: 'Routeur Cisco RV340 Dual WAN VPN', category: 'reseau-serveurs', price: 185000, stock: 2, condition: 'USED', brand: 'Cisco', model: 'RV340' },
  { title: 'Point d\'accès WiFi Ubiquiti UniFi AP-AC-Pro', category: 'reseau-serveurs', price: 75000, stock: 4, condition: 'USED', brand: 'Ubiquiti', model: 'UAP-AC-PRO' },
  { title: 'NAS Synology DS220+ 2 baies sans disque', category: 'reseau-serveurs', price: 130000, stock: 3, condition: 'NEW', brand: 'Synology', model: 'DS220+' },

  // Périphériques
  { title: 'Écran Dell UltraSharp 24" U2422H IPS', category: 'peripheriques', price: 145000, stock: 4, condition: 'USED', brand: 'Dell', model: 'U2422H' },
  { title: 'Clavier mécanique Logitech MX Keys', category: 'peripheriques', price: 38000, stock: 10, condition: 'NEW', brand: 'Logitech', model: 'MX Keys' },
  { title: 'Souris sans fil Logitech MX Master 3', category: 'peripheriques', price: 42000, stock: 8, condition: 'NEW', brand: 'Logitech', model: 'MX Master 3' },
  { title: 'Imprimante HP LaserJet Pro M404dn', category: 'peripheriques', price: 125000, stock: 3, condition: 'USED', brand: 'HP', model: 'LaserJet Pro M404dn' },
  { title: 'Webcam Logitech C920 HD Pro 1080p', category: 'peripheriques', price: 28000, stock: 12, condition: 'NEW', brand: 'Logitech', model: 'C920' },

  // Accessoires
  { title: 'Sac à dos pour laptop 15.6" Targus CityGear', category: 'accessoires', price: 18000, stock: 20, condition: 'NEW', brand: 'Targus', model: 'CityGear' },
  { title: 'Hub USB-C 7-en-1 Anker pour MacBook', category: 'accessoires', price: 22000, stock: 15, condition: 'NEW', brand: 'Anker', model: 'PowerExpand 7-in-1' },
  { title: 'Chargeur USB-C 65W Universel GaN', category: 'accessoires', price: 15000, stock: 25, condition: 'NEW', brand: 'Anker', model: 'Nano II 65W' },
  { title: 'Câbles HDMI 4K 2m lot de 3', category: 'accessoires', price: 8500, stock: 30, condition: 'NEW', brand: 'Générique', model: 'HDMI 4K' },

  // Mobiles & Tablettes
  { title: 'Samsung Galaxy Tab A8 10.5" 64Go WiFi', category: 'mobiles-tablettes', price: 85000, stock: 5, condition: 'USED', brand: 'Samsung', model: 'Galaxy Tab A8' },
  { title: 'iPad 9e génération 64Go WiFi', category: 'mobiles-tablettes', price: 175000, stock: 3, condition: 'USED', brand: 'Apple', model: 'iPad 9th Gen' },
  { title: 'Samsung Galaxy S21 FE 5G 128Go', category: 'mobiles-tablettes', price: 195000, stock: 4, condition: 'USED', brand: 'Samsung', model: 'Galaxy S21 FE' },

  // Logiciels
  { title: 'Licence Microsoft Office 2021 Pro (1 PC)', category: 'logiciels-licences', price: 45000, stock: 999, condition: 'NEW', brand: 'Microsoft', model: 'Office 2021 Pro' },
  { title: 'Antivirus Kaspersky Total Security 3 PC 1 an', category: 'logiciels-licences', price: 22000, stock: 999, condition: 'NEW', brand: 'Kaspersky', model: 'Total Security' },
  { title: 'Adobe Creative Cloud 1 an (toutes applis)', category: 'logiciels-licences', price: 185000, stock: 999, condition: 'NEW', brand: 'Adobe', model: 'Creative Cloud' },

  // Reconditionné
  { title: 'Laptop HP 840 G5 Reconditionné Grade A+', category: 'reconditionne-ls', price: 220000, stock: 8, condition: 'REFURBISHED', brand: 'HP', model: 'EliteBook 840 G5' },
  { title: 'iPhone 11 64Go Reconditionné Grade B', category: 'reconditionne-ls', price: 190000, stock: 5, condition: 'REFURBISHED', brand: 'Apple', model: 'iPhone 11' },
  { title: 'Dell XPS 13 9310 Reconditionné Grade A', category: 'reconditionne-ls', price: 480000, stock: 2, condition: 'REFURBISHED', brand: 'Dell', model: 'XPS 13 9310' },
];

async function main() {
  console.log('🌱 Démarrage du seed complet...\n');

  // ─── ADMIN ────────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@LS2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ls-marketplace.com' },
    update: {},
    create: {
      email: 'admin@ls-marketplace.com',
      firstName: 'Admin',
      lastName: 'LS',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isEmailVerified: true,
      profile: { create: { country: 'TG', language: 'fr' } },
      subscription: { create: { plan: 'PRO' } },
      loyaltyAccount: { create: {} },
    },
  });
  console.log(`✅ Admin : ${admin.email}`);

  // ─── FORFAITS ─────────────────────────────────────────────────────────────────
  const plans = [
    { plan: 'FREE', name: 'Gratuit', nameEn: 'Free', maxProducts: 10, monthlyPrice: 0, yearlyPrice: 0, commission: 0.05, features: ['10 annonces', 'Chat interne', 'Avis acheteurs'] },
    { plan: 'BASIC', name: 'Basic', nameEn: 'Basic', maxProducts: 30, monthlyPrice: 2000, yearlyPrice: 20000, hasStats: true, sponsoredAdsPerMonth: 1, commission: 0.045, features: ['30 annonces', 'Statistiques', '1 annonce sponsorisée/mois'] },
    { plan: 'ESSENTIAL', name: 'Essentiel', nameEn: 'Essential', maxProducts: 60, monthlyPrice: 5000, yearlyPrice: 50000, hasStats: true, sponsoredAdsPerMonth: 3, commission: 0.04, features: ['60 annonces', 'Statistiques', '3 annonces sponsorisées/mois'] },
    { plan: 'PREMIUM', name: 'Premium', nameEn: 'Premium', maxProducts: 100, monthlyPrice: 10000, yearlyPrice: 100000, hasStats: true, hasShopPage: true, hasBadge: true, sponsoredAdsPerMonth: 10, commission: 0.035, features: ['100 annonces', 'Boutique Pro', 'Badge Premium'] },
    { plan: 'PRO', name: 'Pro', nameEn: 'Pro', maxProducts: 200, monthlyPrice: 17500, yearlyPrice: 175000, hasStats: true, hasShopPage: true, hasBadge: true, sponsoredAdsPerMonth: 999, commission: 0.03, features: ['200 annonces', 'Stats avancées', 'Badge Pro'] },
    { plan: 'BUSINESS', name: 'Business B2B', nameEn: 'Business B2B', maxProducts: 999999, monthlyPrice: 50000, yearlyPrice: 500000, hasStats: true, hasShopPage: true, hasBadge: true, sponsoredAdsPerMonth: 999, commission: 0.02, features: ['Illimité', 'API accès', 'Support dédié'] },
  ];
  for (const plan of plans) {
    await prisma.subscriptionPlanConfig.upsert({ where: { plan: plan.plan as any }, update: {}, create: plan as any });
  }
  console.log(`✅ ${plans.length} forfaits`);

  // ─── CATÉGORIES ───────────────────────────────────────────────────────────────
  const categories = [
    { name: 'Ordinateurs', nameEn: 'Computers', slug: 'ordinateurs', order: 1 },
    { name: 'Composants', nameEn: 'Components', slug: 'composants', order: 2 },
    { name: 'Réseau & Serveurs', nameEn: 'Network & Servers', slug: 'reseau-serveurs', order: 3 },
    { name: 'Périphériques', nameEn: 'Peripherals', slug: 'peripheriques', order: 4 },
    { name: 'Accessoires', nameEn: 'Accessories', slug: 'accessoires', order: 5 },
    { name: 'Mobiles & Tablettes', nameEn: 'Mobile & Tablets', slug: 'mobiles-tablettes', order: 6 },
    { name: 'Logiciels & Licences', nameEn: 'Software & Licenses', slug: 'logiciels-licences', order: 7 },
    { name: 'Reconditionné LS', nameEn: 'LS Refurbished', slug: 'reconditionne-ls', order: 8 },
  ];
  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
    categoryMap[cat.slug] = c.id;
  }
  console.log(`✅ ${categories.length} catégories`);

  // ─── VENDEURS DÉMO ────────────────────────────────────────────────────────────
  const sellerPassword = await bcrypt.hash('Demo@2024!', 12);
  const sellerIds: string[] = [];

  for (const s of SELLERS) {
    const seller = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        passwordHash: sellerPassword,
        role: 'SELLER',
        isEmailVerified: true,
        isKycVerified: true,
        profile: { create: { country: s.country, language: 'fr' } },
        sellerProfile: {
          create: {
            shopName: s.shop,
            shopSlug: s.shop.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            avgRating: +(3.5 + Math.random() * 1.5).toFixed(1),
            isBadgeVerified: true,
          },
        },
        subscription: {
          create: {
            plan: s.plan as any,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        },
        loyaltyAccount: { create: { points: Math.floor(Math.random() * 500), totalEarned: Math.floor(Math.random() * 500) } },
      },
    });
    sellerIds.push(seller.id);
  }
  console.log(`✅ ${SELLERS.length} vendeurs démo`);

  // ─── ACHETEURS DÉMO ───────────────────────────────────────────────────────────
  const buyerPassword = await bcrypt.hash('Demo@2024!', 12);
  const buyerIds: string[] = [];

  for (const b of BUYERS) {
    const buyer = await prisma.user.upsert({
      where: { email: b.email },
      update: {},
      create: {
        email: b.email,
        firstName: b.firstName,
        lastName: b.lastName,
        passwordHash: buyerPassword,
        role: 'BUYER',
        isEmailVerified: true,
        profile: { create: { country: b.country, language: 'fr' } },
        subscription: { create: { plan: 'FREE' } },
        loyaltyAccount: { create: { points: Math.floor(Math.random() * 200), totalEarned: Math.floor(Math.random() * 200) } },
      },
    });
    buyerIds.push(buyer.id);
  }
  console.log(`✅ ${BUYERS.length} acheteurs démo`);

  // ─── PRODUITS DÉMO ────────────────────────────────────────────────────────────
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const productIds: string[] = [];

  for (let i = 0; i < PRODUCTS_DATA.length; i++) {
    const p = PRODUCTS_DATA[i];
    const sellerId = sellerIds[i % sellerIds.length];
    const catId = categoryMap[p.category];
    const baseSlug = slugify(p.title);
    const slug = `${baseSlug}-${Date.now() + i}`;

    const product = await prisma.product.create({
      data: {
        title: p.title,
        slug,
        description: `${p.title} — en excellent état. Livraison disponible dans toute l'Afrique de l'Ouest. Paiement Mobile Money accepté (Wave, Orange Money, MTN MoMo).`,
        price: p.price,
        originalPrice: p.condition !== 'NEW' ? Math.floor(p.price * 1.25) : null,
        stock: p.stock,
        condition: p.condition as any,
        brand: p.brand,
        model: p.model,
        status: 'ACTIVE',
        publishedAt: new Date(),
        sellerId,
        categoryId: catId,
        viewCount: Math.floor(Math.random() * 200),
        favoriteCount: Math.floor(Math.random() * 30),
        isFeatured: i < 8,
        images: {
          create: [{
            url: `https://via.placeholder.com/600x400?text=${encodeURIComponent(p.brand)}`,
            isPrimary: true,
            order: 0,
          }],
        },
      },
    });
    productIds.push(product.id);
  }
  console.log(`✅ ${PRODUCTS_DATA.length} produits démo`);

  // ─── COMMANDES DÉMO ───────────────────────────────────────────────────────────
  const orderStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'DELIVERED', 'PROCESSING', 'PENDING', 'CANCELLED', 'REFUNDED'];
  const paymentMethods = ['STRIPE', 'FEDAPAY_WAVE', 'FEDAPAY_ORANGE_MONEY', 'FEDAPAY_TMONEY', 'FEDAPAY_MTN_MOMO'];
  let orderCount = 0;

  for (let i = 0; i < 20; i++) {
    const buyerId = buyerIds[i % buyerIds.length];
    const productId = productIds[i % productIds.length];
    const product = PRODUCTS_DATA[i % PRODUCTS_DATA.length];
    const sellerId = sellerIds[i % sellerIds.length];
    const quantity = Math.ceil(Math.random() * 2);
    const totalAmount = product.price * quantity;
    const commission = totalAmount * 0.04;
    const sellerAmount = totalAmount - commission;
    const status = orderStatuses[i % orderStatuses.length];
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    const orderNumber = `LS-${String(1000 + i).padStart(6, '0')}`;

    try {
      await prisma.order.create({
        data: {
          orderNumber,
          buyerId,
          sellerId,
          status: status as any,
          totalAmount,
          commission,
          sellerAmount,
          currency: 'XOF',
          paymentMethod: paymentMethod as any,
          deliveryAddress: { street: '123 Rue Demo', city: 'Lomé', country: 'TG' },
          escrowReleaseAt: status === 'DELIVERED' ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null,
          completedAt: status === 'COMPLETED' ? new Date(Date.now() - 24 * 60 * 60 * 1000 * (i + 1)) : null,
          items: {
            create: [{
              productId,
              quantity,
              unitPrice: product.price,
              totalPrice: totalAmount,
              productTitle: product.title,
            }],
          },
          payment: {
            create: {
              amount: totalAmount,
              method: paymentMethod as any,
              status: ['COMPLETED', 'DELIVERED', 'PROCESSING'].includes(status) ? 'COMPLETED' : 'PENDING',
              currency: 'XOF',
              escrowReleasedAt: status === 'COMPLETED' ? new Date() : null,
            },
          },
        },
      });
      orderCount++;
    } catch {
      // Skip si le produit ou user n'existe pas
    }
  }
  console.log(`✅ ${orderCount} commandes démo`);

  // ─── RÉSUMÉ ───────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complet avec succès !');
  console.log('══════════════════════════════════════════');
  console.log('  Admin    : admin@ls-marketplace.com');
  console.log('  Password : Admin@LS2024!');
  console.log('──────────────────────────────────────────');
  console.log('  Vendeurs : demo@demo.com → Demo@2024!');
  console.log('  Ex.      : kofi@demo.com / Demo@2024!');
  console.log('  Ex.      : binta@demo.com / Demo@2024!');
  console.log('──────────────────────────────────────────');
  console.log('  Acheteur : jean@demo.com / Demo@2024!');
  console.log('══════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
