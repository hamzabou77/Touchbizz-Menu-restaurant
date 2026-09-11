import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Phone,
  MapPin,
  Search,
  Globe,
  Share2,
  X,
  AlertCircle,
  Clock,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import { supabase, isSchemaMissingError, isValidUUID, isInvalidUUIDError } from '../../lib/supabase';
import { localStore } from '../../lib/localStore';
import { THEMES } from '../../lib/themes';
import { Restaurant, Category, MenuItem, SUPPORTED_LANGUAGES } from '../../types';

interface PublicCategoryWithItems extends Category {
  items: (MenuItem & {
    translations?: Record<string, { name: string; description?: string }>;
  })[];
  translations?: Record<string, { name: string; description?: string }>;
}

export const PublicMenuPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<PublicCategoryWithItems[]>([]);
  const [activeLanguages, setActiveLanguages] = useState<string[]>(['fr']);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('fr');

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isUnpublished, setIsUnpublished] = useState(false);

  // Search & Active Category
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');

  // Selected item modal
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadMenu();
  }, [slug]);

  const loadMenu = async () => {
    setLoading(true);
    setNotFound(false);
    setIsUnpublished(false);

    try {
      // 1. Fetch restaurant by slug
      const { data: restData, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug?.toLowerCase().trim())
        .maybeSingle();

      if (restError || !restData) {
        // Try local fallback
        const localRest = localStore.findRestaurantBySlug(slug || '');
        if (localRest) {
          if (!localRest.is_published) {
            setIsUnpublished(true);
            setRestaurant(localRest);
            setLoading(false);
            return;
          }
          setRestaurant(localRest);
          setSelectedLanguage(localRest.default_language || 'fr');
          setActiveLanguages(['fr', 'en', 'ar']);

          const localCats = localStore.getCategories(localRest.id);
          const localItems = localStore.getProducts(localRest.id);

          const formatted: PublicCategoryWithItems[] = localCats
            .filter((c) => c.is_visible)
            .map((cat) => {
              const catItems = localItems
                .filter((it) => it.category_id === cat.id && it.is_visible)
                .sort((a, b) => a.sort_order - b.sort_order);
              return {
                ...cat,
                items: catItems,
              };
            });

          setCategories(formatted);
          setLoading(false);
          return;
        }

        setNotFound(true);
        setLoading(false);
        return;
      }

      const rest = restData as Restaurant;

      // If restaurant is not published, check
      if (!rest.is_published) {
        setIsUnpublished(true);
        setRestaurant(rest);
        setLoading(false);
        return;
      }

      setRestaurant(rest);
      setSelectedLanguage(rest.default_language || 'fr');

      if (!isValidUUID(rest.id)) {
        const localCats = localStore.getCategories(rest.id);
        const localItems = localStore.getProducts(rest.id);
        const formatted: PublicCategoryWithItems[] = localCats
          .filter((c) => c.is_visible)
          .map((cat) => ({
            ...cat,
            items: localItems.filter((it) => it.category_id === cat.id && it.is_visible),
          }));
        setCategories(formatted);
        setLoading(false);
        return;
      }

      // 2. Fetch active languages for this restaurant
      const { data: langData } = await supabase
        .from('restaurant_languages')
        .select('language_code')
        .eq('restaurant_id', rest.id)
        .eq('is_active', true);

      if (langData && langData.length > 0) {
        setActiveLanguages(langData.map((l: any) => l.language_code));
      } else {
        setActiveLanguages(['fr']);
      }

      // 3. Fetch categories and items
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select(`
          *,
          category_translations (*),
          menu_items (
            *,
            menu_item_translations (*)
          )
        `)
        .eq('restaurant_id', rest.id)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (catError && (isSchemaMissingError(catError) || isInvalidUUIDError(catError))) {
        const localCats = localStore.getCategories(rest.id);
        const localItems = localStore.getProducts(rest.id);
        const formatted: PublicCategoryWithItems[] = localCats
          .filter((c) => c.is_visible)
          .map((cat) => ({
            ...cat,
            items: localItems.filter((it) => it.category_id === cat.id && it.is_visible),
          }));
        setCategories(formatted);
        setLoading(false);
        return;
      }

      if (catData) {
        const formatted: PublicCategoryWithItems[] = (catData as any[]).map((cat) => {
          const catTransMap: Record<string, { name: string; description?: string }> = {};
          if (cat.category_translations) {
            cat.category_translations.forEach((ct: any) => {
              catTransMap[ct.language_code] = {
                name: ct.name,
                description: ct.description,
              };
            });
          }

          const visibleItems = (cat.menu_items || [])
            .filter((item: any) => item.is_visible)
            .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((item: any) => {
              const itemTransMap: Record<string, { name: string; description?: string }> = {};
              if (item.menu_item_translations) {
                item.menu_item_translations.forEach((it: any) => {
                  itemTransMap[it.language_code] = {
                    name: it.name,
                    description: it.description,
                  };
                });
              }
              return {
                ...item,
                translations: itemTransMap,
              };
            });

          return {
            ...cat,
            translations: catTransMap,
            items: visibleItems,
          };
        });

        setCategories(formatted);
      }
    } catch (err: any) {
      // Try local fallback on error
      const localRest = localStore.findRestaurantBySlug(slug || '');
      if (localRest) {
        if (!localRest.is_published) {
          setIsUnpublished(true);
          setRestaurant(localRest);
          setLoading(false);
          return;
        }
        setRestaurant(localRest);
        setSelectedLanguage(localRest.default_language || 'fr');
        setActiveLanguages(['fr', 'en', 'ar']);

        const localCats = localStore.getCategories(localRest.id);
        const localItems = localStore.getProducts(localRest.id);

        const formatted: PublicCategoryWithItems[] = localCats
          .filter((c) => c.is_visible)
          .map((cat) => ({
            ...cat,
            items: localItems.filter((it) => it.category_id === cat.id && it.is_visible),
          }));

        setCategories(formatted);
      } else {
        console.error('Error loading public menu:', err);
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper for localized text
  const getLocalizedCategoryName = (cat: PublicCategoryWithItems) => {
    if (selectedLanguage !== 'fr' && cat.translations?.[selectedLanguage]?.name) {
      return cat.translations[selectedLanguage].name;
    }
    return cat.name;
  };

  const getLocalizedCategoryDesc = (cat: PublicCategoryWithItems) => {
    if (selectedLanguage !== 'fr' && cat.translations?.[selectedLanguage]?.description) {
      return cat.translations[selectedLanguage].description;
    }
    return cat.description;
  };

  const getLocalizedItemName = (item: any) => {
    if (selectedLanguage !== 'fr' && item.translations?.[selectedLanguage]?.name) {
      return item.translations[selectedLanguage].name;
    }
    return item.name;
  };

  const getLocalizedItemDesc = (item: any) => {
    if (selectedLanguage !== 'fr' && item.translations?.[selectedLanguage]?.description) {
      return item.translations[selectedLanguage].description;
    }
    return item.description;
  };

  const isRtl = selectedLanguage === 'ar';
  const currentTheme = THEMES[restaurant?.theme || 'minimal'] || THEMES.minimal;

  // Filter items by category tab and search query
  const displayedCategories = categories
    .map((cat) => {
      if (activeCategoryTab !== 'all' && cat.id !== activeCategoryTab) {
        return null;
      }

      const filteredItems = cat.items.filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const name = getLocalizedItemName(item).toLowerCase();
        const desc = (getLocalizedItemDesc(item) || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });

      if (filteredItems.length === 0 && searchQuery.trim()) {
        return null;
      }

      return {
        ...cat,
        items: filteredItems,
      };
    })
    .filter(Boolean) as PublicCategoryWithItems[];

  // Share menu link
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant?.name || 'Menu Digital',
        text: `Découvrez la carte digitale de ${restaurant?.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien du menu copié dans le presse-papiers !');
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Chargement du menu...
          </p>
        </div>
      </div>
    );
  }

  // Not Found State
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Établissement non trouvé</h2>
          <p className="text-xs text-slate-500 mt-2">
            L’adresse <span className="font-mono text-slate-700">/r/{slug}</span> ne correspond à aucun restaurant enregistré sur TouchBizz Menu.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-xs font-semibold hover:bg-cyan-700 transition"
            >
              Créer votre restaurant
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unpublished State
  if (isUnpublished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{restaurant?.name || 'Restaurant'}</h2>
          <span className="text-xs font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full inline-block my-2">
            Menu en cours de préparation
          </span>
          <p className="text-xs text-slate-500 mt-2">
            Cet établissement peaufine actuellement sa carte digitale. Revenez dans quelques instants !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`min-h-screen font-['Plus_Jakarta_Sans',sans-serif] ${currentTheme.bgClass} ${
        currentTheme.isDark ? 'text-slate-100' : 'text-slate-800'
      } pb-20`}
    >
      {/* Top Floating Bar: Language Switcher & Share */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 border-b border-slate-200/80 px-4 py-2.5 transition">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Active Languages Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {SUPPORTED_LANGUAGES.filter((l) => activeLanguages.includes(l.code)).map((l) => {
              const isActive = selectedLanguage === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setSelectedLanguage(l.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span className="text-[11px] uppercase tracking-wider">{l.code}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
            title="Partager le menu"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Partager</span>
          </button>
        </div>
      </header>

      {/* Hero Cover Banner */}
      <div className="relative">
        {restaurant?.cover_url ? (
          <div className="w-full h-44 sm:h-56 overflow-hidden bg-slate-900">
            <img
              src={restaurant.cover_url}
              alt="Couverture"
              className="w-full h-full object-cover opacity-90"
            />
          </div>
        ) : (
          <div className="w-full h-28 sm:h-36 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900" />
        )}
      </div>

      {/* Restaurant Profile Card */}
      <div className="max-w-3xl mx-auto px-4 -mt-12 relative z-10">
        <div
          className={`rounded-2xl p-5 sm:p-6 border shadow-lg backdrop-blur-md ${currentTheme.cardBg} ${currentTheme.borderColor}`}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white shrink-0 flex items-center justify-center">
              {restaurant?.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UtensilsCrossed className="w-10 h-10 text-cyan-600" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${currentTheme.titleFont}`}>
                {restaurant?.name}
              </h1>

              {restaurant?.description && (
                <p className={`text-xs sm:text-sm mt-1.5 opacity-80 leading-relaxed ${currentTheme.bodyFont}`}>
                  {restaurant.description}
                </p>
              )}

              {/* Badges / Contacts */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-3 pt-3 border-t border-slate-100/10 text-xs">
                {restaurant?.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full font-medium hover:opacity-80 transition"
                  >
                    <Phone className="w-3 h-3 text-cyan-600" />
                    <span>{restaurant.phone}</span>
                  </a>
                )}

                {restaurant?.address && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full font-medium">
                    <MapPin className="w-3 h-3 text-cyan-600 shrink-0" />
                    <span className="truncate max-w-xs">{restaurant.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder={
              selectedLanguage === 'ar'
                ? 'ابحث عن طبق أو مشروب...'
                : selectedLanguage === 'en'
                ? 'Search dishes, drinks...'
                : 'Rechercher un plat, une boisson...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs focus:outline-none transition shadow-2xs ${currentTheme.cardBg} ${currentTheme.borderColor}`}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Sticky Horizontal Bar */}
        <div className="sticky top-12 z-20 -mx-4 px-4 py-2 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-y border-slate-200/50">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveCategoryTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                activeCategoryTab === 'all'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {selectedLanguage === 'ar' ? 'الكل' : selectedLanguage === 'en' ? 'All' : 'Tout'}
            </button>

            {categories.map((cat) => {
              const isSelected = activeCategoryTab === cat.id;
              const catName = getLocalizedCategoryName(cat);

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryTab(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {catName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories & Items List */}
        {displayedCategories.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">
              {searchQuery
                ? 'Aucun plat ne correspond à votre recherche.'
                : 'Aucun plat disponible pour le moment.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {displayedCategories.map((cat) => {
              const catName = getLocalizedCategoryName(cat);
              const catDesc = getLocalizedCategoryDesc(cat);

              return (
                <section key={cat.id} className="space-y-3">
                  {/* Category Header */}
                  <div className="pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <h2
                      className={`text-lg sm:text-xl font-bold tracking-tight ${currentTheme.titleFont}`}
                      style={{ color: currentTheme.accentColor }}
                    >
                      {catName}
                    </h2>
                    {catDesc && (
                      <p className="text-xs opacity-70 mt-0.5">{catDesc}</p>
                    )}
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {cat.items.map((item) => {
                      const itemName = getLocalizedItemName(item);
                      const itemDesc = getLocalizedItemDesc(item);
                      const hasPromo = item.compare_at_price && item.compare_at_price > item.price;
                      const isOutOfStock = !item.is_available;

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`rounded-2xl p-3.5 border transition cursor-pointer flex items-center justify-between gap-3 shadow-xs hover:shadow-md ${
                            currentTheme.cardBg
                          } ${currentTheme.borderColor} ${
                            isOutOfStock ? 'opacity-65' : ''
                          }`}
                        >
                          {/* Text Left */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`font-bold text-sm truncate ${currentTheme.titleFont}`}
                              >
                                {itemName}
                              </h3>
                              {isOutOfStock && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full shrink-0">
                                  {selectedLanguage === 'ar'
                                    ? 'نفذ'
                                    : selectedLanguage === 'en'
                                    ? 'Out of stock'
                                    : 'Épuisé'}
                                </span>
                              )}
                            </div>

                            {itemDesc && (
                              <p className="text-xs opacity-75 line-clamp-2 mt-1 leading-snug">
                                {itemDesc}
                              </p>
                            )}

                            {/* Price */}
                            <div className="flex items-baseline gap-1.5 mt-2">
                              <span
                                className="text-sm font-black"
                                style={{ color: currentTheme.accentColor }}
                              >
                                {item.price} {restaurant?.currency || 'MAD'}
                              </span>
                              {hasPromo && (
                                <span className="text-xs opacity-40 line-through">
                                  {item.compare_at_price} {restaurant?.currency || 'MAD'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Image Right */}
                          {item.image_url && (
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-800">
                              <img
                                src={item.image_url}
                                alt={itemName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`rounded-2xl max-w-md w-full overflow-hidden border shadow-2xl relative ${currentTheme.cardBg} ${currentTheme.borderColor}`}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {selectedItem.image_url && (
              <div className="w-full h-56 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src={selectedItem.image_url}
                  alt={getLocalizedItemName(selectedItem)}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={`text-xl font-bold ${currentTheme.titleFont}`}>
                    {getLocalizedItemName(selectedItem)}
                  </h3>
                  {!selectedItem.is_available && (
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full inline-block mt-1">
                      {selectedLanguage === 'ar'
                        ? 'نفذ حالياً'
                        : selectedLanguage === 'en'
                        ? 'Currently unavailable'
                        : 'Actuellement indisponible'}
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className="text-lg font-black block"
                    style={{ color: currentTheme.accentColor }}
                  >
                    {selectedItem.price} {restaurant?.currency || 'MAD'}
                  </span>
                  {selectedItem.compare_at_price && (
                    <span className="text-xs opacity-40 line-through">
                      {selectedItem.compare_at_price} {restaurant?.currency || 'MAD'}
                    </span>
                  )}
                </div>
              </div>

              {selectedItem.description && (
                <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                  {getLocalizedItemDesc(selectedItem)}
                </p>
              )}

              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {selectedLanguage === 'ar'
                  ? 'إغلاق'
                  : selectedLanguage === 'en'
                  ? 'Close'
                  : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TouchBizz Branding Footer */}
      <footer className="mt-16 text-center py-6 border-t border-slate-200/50 text-xs opacity-60">
        <p>
          Menu digital propulsé par{' '}
          <span className="font-bold text-cyan-600">TouchBizz Menu</span>
        </p>
      </footer>
    </div>
  );
};
