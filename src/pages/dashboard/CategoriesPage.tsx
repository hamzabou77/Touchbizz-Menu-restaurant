import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Languages,
  Check,
  AlertCircle,
  X,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSchemaMissingError, isValidUUID, generateUUID, isInvalidUUIDError } from '../../lib/supabase';
import { localStore } from '../../lib/localStore';
import { Category, SUPPORTED_LANGUAGES } from '../../types';

interface CategoryWithCounts extends Category {
  items_count?: number;
  translations?: Record<string, { name: string; description?: string }>;
}

export const CategoriesPage: React.FC = () => {
  const { restaurant, isSchemaMissing } = useAuth();
  const [categories, setCategories] = useState<CategoryWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCounts | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fr');

  // Form Fields
  const [nameFr, setNameFr] = useState('');
  const [descFr, setDescFr] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [translations, setTranslations] = useState<Record<string, { name: string; description: string }>>({});
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    if (!restaurant) return;
    setLoading(true);
    setError(null);

    if (isSchemaMissing || !isValidUUID(restaurant.id)) {
      const localCats = localStore.getCategories(restaurant.id);
      setCategories(localCats);
      setLoading(false);
      return;
    }

    try {
      // Fetch categories with items count and translations
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select(`
          *,
          menu_items (id),
          category_translations (*)
        `)
        .eq('restaurant_id', restaurant.id)
        .order('sort_order', { ascending: true });

      if (catError) {
        if (isSchemaMissingError(catError) || isInvalidUUIDError(catError)) {
          const localCats = localStore.getCategories(restaurant.id);
          setCategories(localCats);
        } else {
          setError(catError.message);
        }
      } else if (catData) {
        const formatted: CategoryWithCounts[] = (catData as any[]).map((cat) => {
          const transMap: Record<string, { name: string; description?: string }> = {};
          if (cat.category_translations) {
            cat.category_translations.forEach((t: any) => {
              transMap[t.language_code] = {
                name: t.name,
                description: t.description,
              };
            });
          }

          return {
            ...cat,
            items_count: cat.menu_items?.length || 0,
            translations: transMap,
          };
        });

        setCategories(formatted);
      }
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        const localCats = localStore.getCategories(restaurant.id);
        setCategories(localCats);
      } else {
        setError(err.message || 'Erreur lors du chargement des catégories.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [restaurant, isSchemaMissing]);

  const openAddModal = () => {
    setEditingCategory(null);
    setNameFr('');
    setDescFr('');
    setIsVisible(true);
    const emptyTrans: Record<string, { name: string; description: string }> = {};
    SUPPORTED_LANGUAGES.forEach((lang) => {
      if (lang.code !== 'fr') {
        emptyTrans[lang.code] = { name: '', description: '' };
      }
    });
    setTranslations(emptyTrans);
    setActiveTab('fr');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryWithCounts) => {
    setEditingCategory(cat);
    setNameFr(cat.name);
    setDescFr(cat.description || '');
    setIsVisible(cat.is_visible);

    const initialTrans: Record<string, { name: string; description: string }> = {};
    SUPPORTED_LANGUAGES.forEach((lang) => {
      if (lang.code !== 'fr') {
        initialTrans[lang.code] = {
          name: cat.translations?.[lang.code]?.name || '',
          description: cat.translations?.[lang.code]?.description || '',
        };
      }
    });
    setTranslations(initialTrans);
    setActiveTab('fr');
    setIsModalOpen(true);
  };

  const handleToggleVisibility = async (cat: CategoryWithCounts) => {
    if (isSchemaMissing) {
      const updated = categories.map((c) =>
        c.id === cat.id ? { ...c, is_visible: !c.is_visible } : c
      );
      localStore.saveCategories(restaurant!.id, updated);
      setCategories(updated);
      return;
    }

    try {
      const newStatus = !cat.is_visible;
      const { error } = await (supabase
        .from('categories')
        .update({ is_visible: newStatus } as any)
        .eq('id', cat.id));

      if (error) {
        if (isSchemaMissingError(error)) {
          const updated = categories.map((c) =>
            c.id === cat.id ? { ...c, is_visible: !c.is_visible } : c
          );
          localStore.saveCategories(restaurant!.id, updated);
          setCategories(updated);
        } else {
          alert(`Erreur: ${error.message}`);
        }
      } else {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, is_visible: newStatus } : c))
        );
      }
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        const updated = categories.map((c) =>
          c.id === cat.id ? { ...c, is_visible: !c.is_visible } : c
        );
        localStore.saveCategories(restaurant!.id, updated);
        setCategories(updated);
      } else {
        alert(`Erreur: ${err.message}`);
      }
    }
  };

  const handleDelete = async (catId: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${name}" ? Ses plats associés seront également supprimés.`)) {
      return;
    }

    if (isSchemaMissing) {
      const filtered = categories.filter((c) => c.id !== catId);
      localStore.saveCategories(restaurant!.id, filtered);
      setCategories(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', catId);

      if (error) {
        if (isSchemaMissingError(error)) {
          const filtered = categories.filter((c) => c.id !== catId);
          localStore.saveCategories(restaurant!.id, filtered);
          setCategories(filtered);
        } else {
          alert(`Erreur lors de la suppression: ${error.message}`);
        }
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== catId));
      }
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        const filtered = categories.filter((c) => c.id !== catId);
        localStore.saveCategories(restaurant!.id, filtered);
        setCategories(filtered);
      } else {
        alert(`Erreur: ${err.message}`);
      }
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newCategories = [...categories];
    const current = newCategories[index];
    const target = newCategories[targetIndex];

    // Swap positions
    newCategories[index] = target;
    newCategories[targetIndex] = current;

    const reordered = newCategories.map((c, i) => ({ ...c, sort_order: i }));
    setCategories(reordered);

    if (isSchemaMissing) {
      localStore.saveCategories(restaurant!.id, reordered);
      return;
    }

    try {
      // Update sort order in database
      await (supabase
        .from('categories')
        .update({ sort_order: targetIndex } as any)
        .eq('id', current.id));

      await (supabase
        .from('categories')
        .update({ sort_order: index } as any)
        .eq('id', target.id));
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        localStore.saveCategories(restaurant!.id, reordered);
      } else {
        console.warn('Error reordering categories:', err);
      }
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    if (!nameFr.trim()) {
      alert('Le nom de la catégorie en français est obligatoire.');
      return;
    }

    setSaving(true);

    if (isSchemaMissing) {
      let updatedList: CategoryWithCounts[] = [];
      const cleanTrans: Record<string, { name: string; description?: string }> = {};
      Object.entries(translations).forEach(([l, val]) => {
        const v = val as { name?: string; description?: string };
        if (v.name?.trim()) {
          cleanTrans[l] = { name: v.name.trim(), description: v.description?.trim() };
        }
      });

      if (editingCategory) {
        updatedList = categories.map((c) => {
          if (c.id === editingCategory.id) {
            return {
              ...c,
              name: nameFr.trim(),
              description: descFr.trim() || undefined,
              is_visible: isVisible,
              translations: cleanTrans,
            };
          }
          return c;
        });
      } else {
        const newCat: CategoryWithCounts = {
          id: generateUUID(),
          restaurant_id: restaurant.id,
          name: nameFr.trim(),
          description: descFr.trim() || undefined,
          sort_order: categories.length,
          is_visible: isVisible,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items_count: 0,
          translations: cleanTrans,
        };
        updatedList = [...categories, newCat];
      }

      localStore.saveCategories(restaurant.id, updatedList);
      setCategories(updatedList);
      setIsModalOpen(false);
      setSaving(false);
      return;
    }

    try {
      let categoryId = editingCategory?.id;

      if (editingCategory) {
        // Update category
        const { error } = await (supabase
          .from('categories')
          .update({
            name: nameFr.trim(),
            description: descFr.trim() || null,
            is_visible: isVisible,
          } as any)
          .eq('id', editingCategory.id));

        if (error) throw error;
      } else {
        // Create category
        const newSortOrder = categories.length;
        const { data, error } = await (supabase
          .from('categories')
          .insert({
            restaurant_id: restaurant.id,
            name: nameFr.trim(),
            description: descFr.trim() || null,
            is_visible: isVisible,
            sort_order: newSortOrder,
          } as any)
          .select()
          .single());

        if (error) throw error;
        categoryId = (data as any).id;
      }

      // Save Translations
      if (categoryId) {
        for (const [langCode, trans] of Object.entries(translations)) {
          const t = trans as { name: string; description?: string };
          if (t.name.trim()) {
            await (supabase
              .from('category_translations')
              .upsert(
                {
                  category_id: categoryId,
                  language_code: langCode,
                  name: t.name.trim(),
                  description: t.description?.trim() || null,
                } as any,
                { onConflict: 'category_id,language_code' }
              ));
          } else {
            // If empty, clean up any existing translation
            await supabase
              .from('category_translations')
              .delete()
              .eq('category_id', categoryId)
              .eq('language_code', langCode);
          }
        }
      }

      setIsModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        const cleanTrans: Record<string, { name: string; description?: string }> = {};
        Object.entries(translations).forEach(([l, val]) => {
          const v = val as { name?: string; description?: string };
          if (v.name?.trim()) {
            cleanTrans[l] = { name: v.name.trim(), description: v.description?.trim() };
          }
        });
        const fallbackList = [...categories];
        if (editingCategory) {
          const idx = fallbackList.findIndex(c => c.id === editingCategory.id);
          if (idx >= 0) {
            fallbackList[idx] = {
              ...fallbackList[idx],
              name: nameFr.trim(),
              description: descFr.trim() || undefined,
              is_visible: isVisible,
              translations: cleanTrans
            };
          }
        } else {
          fallbackList.push({
            id: generateUUID(),
            restaurant_id: restaurant.id,
            name: nameFr.trim(),
            description: descFr.trim() || undefined,
            sort_order: categories.length,
            is_visible: isVisible,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            items_count: 0,
            translations: cleanTrans
          });
        }
        localStore.saveCategories(restaurant.id, fallbackList);
        setCategories(fallbackList);
        setIsModalOpen(false);
      } else {
        alert(`Erreur lors de l'enregistrement: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Catégories du Menu
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organisez vos plats par sections (Entrées, Plats chauds, Desserts, Boissons...)
          </p>
        </div>

        <button
          id="btn-add-category"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold transition shadow-sm shadow-cyan-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle catégorie</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List / Empty State */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Chargement de vos catégories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4">
            <FolderTree className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucune catégorie pour le moment</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Créez votre première catégorie pour structurer les plats de votre carte digitale.
          </p>
          <button
            onClick={openAddModal}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold hover:bg-cyan-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une catégorie</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {categories.map((cat, index) => {
              const transCount = Object.keys(cat.translations || {}).length;

              return (
                <div
                  key={cat.id}
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition ${
                    !cat.is_visible ? 'bg-slate-50/70 opacity-65' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Left: Reorder & Info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="flex flex-col gap-0.5 shrink-0 text-slate-400">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        title="Monter"
                        className="p-1 hover:text-cyan-600 disabled:opacity-25 transition"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === categories.length - 1}
                        title="Descendre"
                        className="p-1 hover:text-cyan-600 disabled:opacity-25 transition"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {cat.name}
                        </h4>
                        {!cat.is_visible && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">
                            Masqué
                          </span>
                        )}
                        {transCount > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full border border-cyan-100">
                            <Languages className="w-3 h-3" />
                            +{transCount} {transCount === 1 ? 'langue' : 'langues'}
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {cat.description}
                        </p>
                      )}
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        {cat.items_count} {cat.items_count === 1 ? 'produit' : 'produits'}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleVisibility(cat)}
                      title={cat.is_visible ? 'Masquer sur le menu' : 'Rendre visible'}
                      className={`p-2 rounded-xl text-xs font-medium transition ${
                        cat.is_visible
                          ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      }`}
                    >
                      {cat.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => openEditModal(cat)}
                      title="Modifier la catégorie et traductions"
                      className="p-2 text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-xl transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      title="Supprimer"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Creation / Edit Modal with Translations */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto py-3 border-b border-slate-100 text-xs no-scrollbar">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isCurrent = activeTab === lang.code;
                const hasTranslation =
                  lang.code === 'fr'
                    ? Boolean(nameFr.trim())
                    : Boolean(translations[lang.code]?.name.trim());

                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveTab(lang.code)}
                    className={`px-3 py-1.5 rounded-lg font-medium shrink-0 flex items-center gap-1.5 transition ${
                      isCurrent
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {hasTranslation && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-emerald-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* French (Default / Main) Tab */}
              {activeTab === 'fr' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nom de la catégorie (Français) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nameFr}
                      onChange={(e) => setNameFr(e.target.value)}
                      placeholder="Ex: Entrées froides, Desserts, Cafés"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description optionnelle
                    </label>
                    <textarea
                      rows={2}
                      value={descFr}
                      onChange={(e) => setDescFr(e.target.value)}
                      placeholder="Ex: Servies avec notre pain artisanal chaud."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Visible sur le menu public</span>
                      <span className="text-[11px] text-slate-400">Désactiver pour masquer temporairement</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => setIsVisible(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                  </div>
                </>
              )}

              {/* Other Language Tabs */}
              {activeTab !== 'fr' && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                    Traduisez le nom de la catégorie pour vos clients anglophones ou internationaux. Ces champs sont optionnels.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nom de la catégorie ({SUPPORTED_LANGUAGES.find((l) => l.code === activeTab)?.name})
                    </label>
                    <input
                      type="text"
                      dir={activeTab === 'ar' ? 'rtl' : 'ltr'}
                      value={translations[activeTab]?.name || ''}
                      onChange={(e) =>
                        setTranslations({
                          ...translations,
                          [activeTab]: {
                            ...translations[activeTab],
                            name: e.target.value,
                            description: translations[activeTab]?.description || '',
                          },
                        })
                      }
                      placeholder={activeTab === 'en' ? 'Ex: Starters, Hot Drinks' : activeTab === 'ar' ? 'مثال: المشروبات الساخنة' : 'Traduction...'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description traduite
                    </label>
                    <textarea
                      rows={2}
                      dir={activeTab === 'ar' ? 'rtl' : 'ltr'}
                      value={translations[activeTab]?.description || ''}
                      onChange={(e) =>
                        setTranslations({
                          ...translations,
                          [activeTab]: {
                            ...translations[activeTab],
                            description: e.target.value,
                            name: translations[activeTab]?.name || '',
                          },
                        })
                      }
                      placeholder="Description traduite..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
                >
                  {saving ? 'Enregistrement...' : editingCategory ? 'Mettre à jour' : 'Créer la catégorie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
