import { Restaurant, Profile, Category, MenuItem, QrSettings } from '../types';
import { isValidUUID, generateUUID } from './uuid';

// Storage keys
const RESTAURANT_KEY_PREFIX = 'touchbizz_local_restaurant_';
const PROFILE_KEY_PREFIX = 'touchbizz_local_profile_';
const CATEGORIES_KEY_PREFIX = 'touchbizz_local_categories_';
const PRODUCTS_KEY_PREFIX = 'touchbizz_local_products_';
const QR_KEY_PREFIX = 'touchbizz_local_qr_';
const LANGS_KEY_PREFIX = 'touchbizz_local_langs_';

export interface LocalCategoryWithExtra extends Category {
  translations?: Record<string, { name: string; description?: string }>;
  items_count?: number;
}

export interface LocalProductWithExtra extends MenuItem {
  translations?: Record<string, { name: string; description?: string }>;
  category_name?: string;
}

export const localStore = {
  // PROFILE
  getProfile(userId: string, email?: string, fullName?: string): Profile {
    const validUserId = isValidUUID(userId) ? userId : generateUUID();
    const key = `${PROFILE_KEY_PREFIX}${validUserId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fallback
      }
    }
    const fallback: Profile = {
      id: validUserId,
      email: email || 'chef@touchbizz.com',
      full_name: fullName || 'Chef Propriétaire',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  },

  setProfile(profile: Profile) {
    localStorage.setItem(`${PROFILE_KEY_PREFIX}${profile.id}`, JSON.stringify(profile));
  },

  // RESTAURANT
  getRestaurant(userId: string, suggestedName?: string): Restaurant {
    this.sanitizeLegacyStorage();

    const key = `${RESTAURANT_KEY_PREFIX}${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed: Restaurant = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // If stored restaurant has a legacy invalid UUID, replace it and migrate related items
          if (!isValidUUID(parsed.id)) {
            const oldId = parsed.id;
            const newId = generateUUID();
            parsed.id = newId;
            localStorage.setItem(key, JSON.stringify(parsed));
            this.migrateRestaurantId(oldId, newId);
          }
          return parsed;
        }
      } catch {
        // fallback
      }
    }

    const cleanName = suggestedName?.trim() || 'Le Bistrot Gourmand';
    const slug = cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'mon-etablissement';

    const fallback: Restaurant = {
      id: generateUUID(),
      owner_id: isValidUUID(userId) ? userId : generateUUID(),
      name: cleanName,
      slug,
      description: 'Cuisine raffinée & saveurs fraîches préparées avec passion.',
      address: '12 Boulevard d’Anfa, Casablanca',
      phone: '+212 6 61 23 45 67',
      logo_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80',
      cover_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
      primary_color: '#0ea5e9',
      theme: 'minimal',
      is_published: true,
      currency: 'MAD',
      default_language: 'fr',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(fallback));
    this.seedDefaults(fallback.id);
    return fallback;
  },

  updateRestaurant(restaurant: Restaurant): Restaurant {
    const updated = { ...restaurant, updated_at: new Date().toISOString() };
    localStorage.setItem(`${RESTAURANT_KEY_PREFIX}${restaurant.owner_id}`, JSON.stringify(updated));
    return updated;
  },

  saveRestaurant(restaurant: Restaurant): Restaurant {
    return this.updateRestaurant(restaurant);
  },

  // SEED DEFAULTS
  seedDefaults(restaurantId: string) {
    // Check categories
    if (!localStorage.getItem(`${CATEGORIES_KEY_PREFIX}${restaurantId}`)) {
      const cat1Id = generateUUID();
      const cat2Id = generateUUID();
      const cat3Id = generateUUID();
      const cat4Id = generateUUID();

      const defaultCategories: LocalCategoryWithExtra[] = [
        {
          id: cat1Id,
          restaurant_id: restaurantId,
          name: 'Entrées & Tapas',
          description: 'Fraîcheur et mises en bouche savoureuses',
          sort_order: 0,
          is_visible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'Starters & Tapas', description: 'Fresh and tasty appetizers' },
            ar: { name: 'المقبلات والتاباس', description: 'أطباق افتتاحية شهية وطازجة' },
          },
        },
        {
          id: cat2Id,
          restaurant_id: restaurantId,
          name: 'Plats Signature',
          description: 'Nos créations du chef cuisinées minute',
          sort_order: 1,
          is_visible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'Signature Dishes', description: 'Chef special creations' },
            ar: { name: 'الأطباق المميزة', description: 'إبداعات الشيف الخاصة' },
          },
        },
        {
          id: cat3Id,
          restaurant_id: restaurantId,
          name: 'Desserts Maison',
          description: 'Douceurs sucrées artisanales',
          sort_order: 2,
          is_visible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'House Desserts', description: 'Sweet artisanal treats' },
            ar: { name: 'حلويات منزلية', description: 'حلويات يدوية الصنع' },
          },
        },
        {
          id: cat4Id,
          restaurant_id: restaurantId,
          name: 'Boissons & Cocktails',
          description: 'Rafraîchissements, jus frais et créations',
          sort_order: 3,
          is_visible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'Drinks & Cocktails', description: 'Fresh juices and cocktails' },
            ar: { name: 'المشروبات والكوكتيل', description: 'عصائر طازجة ومشروبات' },
          },
        },
      ];
      localStorage.setItem(`${CATEGORIES_KEY_PREFIX}${restaurantId}`, JSON.stringify(defaultCategories));

      // Seed Products
      const defaultProducts: LocalProductWithExtra[] = [
        {
          id: generateUUID(),
          restaurant_id: restaurantId,
          category_id: cat1Id,
          name: 'Burrata Crémeuse aux Tomates Confites',
          description: 'Burrata fraîche 150g, pesto de basilic maison, pignons de pin torréfiés et réduction balsamique.',
          price: 85,
          compare_at_price: 95,
          image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef2396e?w=600&auto=format&fit=crop&q=80',
          is_visible: true,
          is_available: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'Creamy Burrata with Candied Tomatoes', description: 'Fresh burrata, homemade basil pesto and balsamic glaze.' },
            ar: { name: 'بوراتا كريمية مع طماطم مجففة', description: 'جبنة بوراتا طازجة مع بيستو الريحان وخل البلسميك.' },
          },
        },
        {
          id: generateUUID(),
          restaurant_id: restaurantId,
          category_id: cat2Id,
          name: 'Filet de Bœuf Grillé & Purée Truffée',
          description: 'Cœur de filet de bœuf 200g, jus réduit au romarin, purée maison à la truffe noire.',
          price: 160,
          compare_at_price: undefined,
          image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
          is_visible: true,
          is_available: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'Grilled Beef Tenderloin with Truffled Mash', description: '200g tenderloin with rosemary reduction and truffle mash.' },
            ar: { name: 'فيليه لحم بقري مشوي مع بيوريه الكمأة', description: 'فيليه بقري فاخر مع صلصة الروزماري وبيوريه الكمأة.' },
          },
        },
        {
          id: generateUUID(),
          restaurant_id: restaurantId,
          category_id: cat2Id,
          name: 'Burger Gourmet TouchBizz',
          description: 'Steak haché façon bouchère, cheddar affiné, oignons caramélisés et frites rustiques.',
          price: 110,
          compare_at_price: 125,
          image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
          is_visible: true,
          is_available: true,
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'TouchBizz Gourmet Burger', description: 'Butcher steak, mature cheddar, caramelized onions, rustic fries.' },
            ar: { name: 'برغر تاتش بيز الفاخر', description: 'لحم بقري بلدي، جبنة شيدر معتقة، بصل مكرمل وبطاطس.' },
          },
        },
        {
          id: generateUUID(),
          restaurant_id: restaurantId,
          category_id: cat3Id,
          name: 'Tiramisu Traditionnel au Café',
          description: 'Mascarpone aéré, biscuits cuillère imbibés d’espresso d’Éthiopie et cacao amer.',
          price: 55,
          compare_at_price: undefined,
          image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
          is_visible: true,
          is_available: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'Traditional Coffee Tiramisu', description: 'Fluffy mascarpone, ladyfingers soaked in espresso, cocoa.' },
            ar: { name: 'تيراميسو القهوة التقليدي', description: 'ماسكاربوني مخفوق مع بسكويت مشبع بالإسبريسو والكاكاو.' },
          },
        },
        {
          id: generateUUID(),
          restaurant_id: restaurantId,
          category_id: cat4Id,
          name: 'Mojito Passion & Menthe Fraîche',
          description: 'Purée de fruit de la passion fraîche, menthe pilée, citron vert bio et eau pétillante.',
          price: 45,
          compare_at_price: undefined,
          image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
          is_visible: true,
          is_available: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: {
            en: { name: 'Passion Fruit & Mint Mojito', description: 'Fresh passion fruit, crushed mint, organic lime, sparkling water.' },
            ar: { name: 'موهيتو فاكهة الآلام والنعناع', description: 'فاكهة العاطفة مع النعناع والليمون والمياه الغازية.' },
          },
        },
      ];
      localStorage.setItem(`${PRODUCTS_KEY_PREFIX}${restaurantId}`, JSON.stringify(defaultProducts));
    }
  },


  // CATEGORIES
  getCategories(restaurantId: string): LocalCategoryWithExtra[] {
    const key = `${CATEGORIES_KEY_PREFIX}${restaurantId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.seedDefaults(restaurantId);
      const recheck = localStorage.getItem(key);
      return recheck ? JSON.parse(recheck) : [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveCategories(restaurantId: string, categories: LocalCategoryWithExtra[]) {
    localStorage.setItem(`${CATEGORIES_KEY_PREFIX}${restaurantId}`, JSON.stringify(categories));
  },

  // PRODUCTS
  getProducts(restaurantId: string): LocalProductWithExtra[] {
    const key = `${PRODUCTS_KEY_PREFIX}${restaurantId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.seedDefaults(restaurantId);
      const recheck = localStorage.getItem(key);
      return recheck ? JSON.parse(recheck) : [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveProducts(restaurantId: string, products: LocalProductWithExtra[]) {
    localStorage.setItem(`${PRODUCTS_KEY_PREFIX}${restaurantId}`, JSON.stringify(products));
  },

  // QR SETTINGS
  getQrSettings(restaurantId: string): QrSettings {
    const key = `${QR_KEY_PREFIX}${restaurantId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    const defaultSettings: QrSettings = {
      id: generateUUID(),
      restaurant_id: restaurantId,
      foreground_color: '#0f172a',
      background_color: '#ffffff',
      style: 'squares',
      with_logo: true,
      frame_type: 'badge',
      frame_text: 'Scannez le menu',
      margin: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(defaultSettings));
    return defaultSettings;
  },

  saveQrSettings(settings: QrSettings) {
    localStorage.setItem(`${QR_KEY_PREFIX}${settings.restaurant_id}`, JSON.stringify(settings));
  },

  // LANGUAGES
  getLanguages(restaurantId: string): string[] {
    const key = `${LANGS_KEY_PREFIX}${restaurantId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    const defaults = ['fr', 'en', 'ar'];
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  },

  saveLanguages(restaurantId: string, langs: string[]) {
    localStorage.setItem(`${LANGS_KEY_PREFIX}${restaurantId}`, JSON.stringify(langs));
  },

  // MIGRATION & SANITIZATION FOR LEGACY NON-UUID IDs
  migrateRestaurantId(oldId: string, newId: string) {
    if (!oldId || !newId || oldId === newId) return;

    // Migrate categories
    const catOldKey = `${CATEGORIES_KEY_PREFIX}${oldId}`;
    const catRaw = localStorage.getItem(catOldKey);
    if (catRaw) {
      try {
        const cats: LocalCategoryWithExtra[] = JSON.parse(catRaw);
        const updatedCats = cats.map((c) => ({
          ...c,
          id: isValidUUID(c.id) ? c.id : generateUUID(),
          restaurant_id: newId,
        }));
        localStorage.setItem(`${CATEGORIES_KEY_PREFIX}${newId}`, JSON.stringify(updatedCats));
        localStorage.removeItem(catOldKey);
      } catch {
        // ignore
      }
    }

    // Migrate products
    const prodOldKey = `${PRODUCTS_KEY_PREFIX}${oldId}`;
    const prodRaw = localStorage.getItem(prodOldKey);
    if (prodRaw) {
      try {
        const prods: LocalProductWithExtra[] = JSON.parse(prodRaw);
        const updatedProds = prods.map((p) => ({
          ...p,
          id: isValidUUID(p.id) ? p.id : generateUUID(),
          restaurant_id: newId,
        }));
        localStorage.setItem(`${PRODUCTS_KEY_PREFIX}${newId}`, JSON.stringify(updatedProds));
        localStorage.removeItem(prodOldKey);
      } catch {
        // ignore
      }
    }

    // Migrate QR
    const qrOldKey = `${QR_KEY_PREFIX}${oldId}`;
    const qrRaw = localStorage.getItem(qrOldKey);
    if (qrRaw) {
      try {
        const qr: QrSettings = JSON.parse(qrRaw);
        qr.id = isValidUUID(qr.id) ? qr.id : generateUUID();
        qr.restaurant_id = newId;
        localStorage.setItem(`${QR_KEY_PREFIX}${newId}`, JSON.stringify(qr));
        localStorage.removeItem(qrOldKey);
      } catch {
        // ignore
      }
    }

    // Migrate Languages
    const langOldKey = `${LANGS_KEY_PREFIX}${oldId}`;
    const langRaw = localStorage.getItem(langOldKey);
    if (langRaw) {
      localStorage.setItem(`${LANGS_KEY_PREFIX}${newId}`, langRaw);
      localStorage.removeItem(langOldKey);
    }
  },

  sanitizeLegacyStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(RESTAURANT_KEY_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const r: Restaurant = JSON.parse(raw);
              if (r && !isValidUUID(r.id)) {
                const oldId = r.id;
                const newId = generateUUID();
                r.id = newId;
                localStorage.setItem(key, JSON.stringify(r));
                this.migrateRestaurantId(oldId, newId);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch {
      // ignore
    }
  },

  // FIND RESTAURANT BY SLUG (FOR PUBLIC MENU FALLBACK)
  findRestaurantBySlug(slug: string): Restaurant | null {
    const cleanSlug = slug.toLowerCase().trim();
    // Search all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(RESTAURANT_KEY_PREFIX)) {
        try {
          const r: Restaurant = JSON.parse(localStorage.getItem(k) || '');
          if (r && r.slug?.toLowerCase().trim() === cleanSlug) {
            return r;
          }
        } catch {
          // ignore
        }
      }
    }
    return null;
  },
};

