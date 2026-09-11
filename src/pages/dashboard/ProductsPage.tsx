import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  X,
  Upload,
  Image as ImageIcon,
  Search,
  Filter,
  CheckCircle2,
  Languages,
  DollarSign,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSchemaMissingError, isValidUUID, generateUUID, isInvalidUUIDError } from '../../lib/supabase';
import { localStore } from '../../lib/localStore';
import { uploadImage } from '../../lib/storage';
import { Category, MenuItem, SUPPORTED_LANGUAGES } from '../../types';

interface ProductWithExtras extends MenuItem {
  category_name?: string;
  translations?: Record<string, { name: string; description?: string }>;
}

export const ProductsPage: React.FC = () => {
  const { restaurant, isSchemaMissing } = useAuth();
  const [products, setProducts] = useState<ProductWithExtras[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithExtras | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fr');

  // Form Fields
  const [categoryId, setCategoryId] = useState<string>('');
  const [nameFr, setNameFr] = useState('');
  const [descFr, setDescFr] = useState('');
  const [price, setPrice] = useState<string>('');
  const [compareAtPrice, setCompareAtPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [translations, setTranslations] = useState<Record<string, { name: string; description: string }>>({});

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!restaurant) return;
    setLoading(true);
    setError(null);

    if (isSchemaMissing || !isValidUUID(restaurant.id)) {
      const localCats = localStore.getCategories(restaurant.id);
      const localProds = localStore.getProducts(restaurant.id);
      setCategories(localCats);
      const catMap = new Map(localCats.map((c) => [c.id, c.name]));
      const formatted: ProductWithExtras[] = localProds.map((prod) => ({
        ...prod,
        category_name: catMap.get(prod.category_id) || 'Sans catégorie',
      }));
      setProducts(formatted);
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('sort_order', { ascending: true });

      if (catError) {
        if (isSchemaMissingError(catError) || isInvalidUUIDError(catError)) {
          const localCats = localStore.getCategories(restaurant.id);
          const localProds = localStore.getProducts(restaurant.id);
          setCategories(localCats);
          const catMap = new Map(localCats.map((c) => [c.id, c.name]));
          setProducts(localProds.map((p) => ({ ...p, category_name: catMap.get(p.category_id) || 'Sans catégorie' })));
          setLoading(false);
          return;
        }
        throw catError;
      }
      setCategories(catData || []);

      // 2. Fetch products with translations
      const { data: prodData, error: prodError } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_item_translations (*)
        `)
        .eq('restaurant_id', restaurant.id)
        .order('sort_order', { ascending: true });

      if (prodError) {
        if (isSchemaMissingError(prodError) || isInvalidUUIDError(prodError)) {
          const localCats = localStore.getCategories(restaurant.id);
          const localProds = localStore.getProducts(restaurant.id);
          setCategories(localCats);
          const catMap = new Map(localCats.map((c) => [c.id, c.name]));
          setProducts(localProds.map((p) => ({ ...p, category_name: catMap.get(p.category_id) || 'Sans catégorie' })));
          setLoading(false);
          return;
        }
        throw prodError;
      }

      const catMap = new Map((catData as Category[] || []).map((c: Category) => [c.id, c.name]));

      const formatted: ProductWithExtras[] = (prodData as any[]).map((prod) => {
        const transMap: Record<string, { name: string; description?: string }> = {};
        if (prod.menu_item_translations) {
          prod.menu_item_translations.forEach((t: any) => {
            transMap[t.language_code] = {
              name: t.name,
              description: t.description,
            };
          });
        }

        return {
          ...prod,
          category_name: catMap.get(prod.category_id) || 'Sans catégorie',
          translations: transMap,
        };
      });

      setProducts(formatted);
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        const localCats = localStore.getCategories(restaurant.id);
        const localProds = localStore.getProducts(restaurant.id);
        setCategories(localCats);
        const catMap = new Map(localCats.map((c) => [c.id, c.name]));
        setProducts(localProds.map((p) => ({ ...p, category_name: catMap.get(p.category_id) || 'Sans catégorie' })));
      } else {
        setError(err.message || 'Erreur lors du chargement des produits.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurant, isSchemaMissing]);

  const openAddModal = () => {
    if (categories.length === 0) {
      alert('Veuillez d’abord créer au moins une catégorie dans l’onglet "Catégories".');
      return;
    }

    setEditingProduct(null);
    setCategoryId(categories[0]?.id || '');
    setNameFr('');
    setDescFr('');
    setPrice('');
    setCompareAtPrice('');
    setImageUrl(null);
    setIsVisible(true);
    setIsAvailable(true);

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

  const openEditModal = (prod: ProductWithExtras) => {
    setEditingProduct(prod);
    setCategoryId(prod.category_id);
    setNameFr(prod.name);
    setDescFr(prod.description || '');
    setPrice(prod.price.toString());
    setCompareAtPrice(prod.compare_at_price ? prod.compare_at_price.toString() : '');
    setImageUrl(prod.image_url || null);
    setIsVisible(prod.is_visible);
    setIsAvailable(prod.is_available);

    const initialTrans: Record<string, { name: string; description: string }> = {};
    SUPPORTED_LANGUAGES.forEach((lang) => {
      if (lang.code !== 'fr') {
        initialTrans[lang.code] = {
          name: prod.translations?.[lang.code]?.name || '',
          description: prod.translations?.[lang.code]?.description || '',
        };
      }
    });
    setTranslations(initialTrans);
    setActiveTab('fr');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (prod: ProductWithExtras) => {
    if (!restaurant) return;

    if (isSchemaMissing || !isValidUUID(restaurant.id) || !isValidUUID(prod.category_id)) {
      const copyId = generateUUID();
      const copy: ProductWithExtras = {
        ...prod,
        id: copyId,
        name: `${prod.name} (Copie)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [copy, ...products];
      localStore.saveProducts(restaurant.id, updated);
      setProducts(updated);
      return;
    }

    try {
      const { data, error } = await (supabase
        .from('menu_items')
        .insert({
          restaurant_id: restaurant.id,
          category_id: prod.category_id,
          name: `${prod.name} (Copie)`,
          description: prod.description,
          price: prod.price,
          compare_at_price: prod.compare_at_price,
          image_url: prod.image_url,
          is_visible: prod.is_visible,
          is_available: prod.is_available,
          sort_order: products.length,
        } as any)
        .select()
        .single());

      if (error) {
        if (isSchemaMissingError(error) || isInvalidUUIDError(error)) {
          const copyId = generateUUID();
          const copy: ProductWithExtras = {
            ...prod,
            id: copyId,
            name: `${prod.name} (Copie)`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const updated = [copy, ...products];
          localStore.saveProducts(restaurant.id, updated);
          setProducts(updated);
          return;
        }
        throw error;
      }

      // Duplicate translations if any
      if (prod.translations && data) {
        for (const [langCode, trans] of Object.entries(prod.translations)) {
          if (trans.name) {
            await (supabase.from('menu_item_translations').insert({
              menu_item_id: (data as any).id,
              language_code: langCode,
              name: `${trans.name} (Copy)`,
              description: trans.description,
            } as any));
          }
        }
      }

      await fetchData();
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        const copy: ProductWithExtras = {
          ...prod,
          id: generateUUID(),
          name: `${prod.name} (Copie)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updated = [copy, ...products];
        localStore.saveProducts(restaurant.id, updated);
        setProducts(updated);
      } else {
        alert(`Erreur lors de la duplication : ${err.message}`);
      }
    }
  };

  const handleToggleStock = async (prod: ProductWithExtras) => {
    if (isSchemaMissing) {
      const updated = products.map((p) =>
        p.id === prod.id ? { ...p, is_available: !p.is_available } : p
      );
      localStore.saveProducts(restaurant!.id, updated);
      setProducts(updated);
      return;
    }

    try {
      const newStatus = !prod.is_available;
      const { error } = await (supabase
        .from('menu_items')
        .update({ is_available: newStatus } as any)
        .eq('id', prod.id));

      if (error) {
        if (isSchemaMissingError(error)) {
          const updated = products.map((p) =>
            p.id === prod.id ? { ...p, is_available: !p.is_available } : p
          );
          localStore.saveProducts(restaurant!.id, updated);
          setProducts(updated);
        } else {
          alert(`Erreur : ${error.message}`);
        }
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, is_available: newStatus } : p))
        );
      }
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        const updated = products.map((p) =>
          p.id === prod.id ? { ...p, is_available: !p.is_available } : p
        );
        localStore.saveProducts(restaurant!.id, updated);
        setProducts(updated);
      } else {
        alert(`Erreur : ${err.message}`);
      }
    }
  };

  const handleToggleVisibility = async (prod: ProductWithExtras) => {
    if (isSchemaMissing) {
      const updated = products.map((p) =>
        p.id === prod.id ? { ...p, is_visible: !p.is_visible } : p
      );
      localStore.saveProducts(restaurant!.id, updated);
      setProducts(updated);
      return;
    }

    try {
      const newStatus = !prod.is_visible;
      const { error } = await (supabase
        .from('menu_items')
        .update({ is_visible: newStatus } as any)
        .eq('id', prod.id));

      if (error) {
        if (isSchemaMissingError(error)) {
          const updated = products.map((p) =>
            p.id === prod.id ? { ...p, is_visible: !p.is_visible } : p
          );
          localStore.saveProducts(restaurant!.id, updated);
          setProducts(updated);
        } else {
          alert(`Erreur : ${error.message}`);
        }
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, is_visible: newStatus } : p))
        );
      }
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        const updated = products.map((p) =>
          p.id === prod.id ? { ...p, is_visible: !p.is_visible } : p
        );
        localStore.saveProducts(restaurant!.id, updated);
        setProducts(updated);
      } else {
        alert(`Erreur : ${err.message}`);
      }
    }
  };

  const handleDelete = async (prodId: string, name: string) => {
    if (!window.confirm(`Voulez-vous supprimer le produit "${name}" ?`)) return;

    if (isSchemaMissing) {
      const filtered = products.filter((p) => p.id !== prodId);
      localStore.saveProducts(restaurant!.id, filtered);
      setProducts(filtered);
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', prodId);

      if (error) {
        if (isSchemaMissingError(error)) {
          const filtered = products.filter((p) => p.id !== prodId);
          localStore.saveProducts(restaurant!.id, filtered);
          setProducts(filtered);
          return;
        }
        throw error;
      }
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        const filtered = products.filter((p) => p.id !== prodId);
        localStore.saveProducts(restaurant!.id, filtered);
        setProducts(filtered);
      } else {
        alert(`Erreur : ${err.message}`);
      }
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadImage(file, 'product-images', `prod_${Date.now()}`);
      if (res.error) {
        // Fallback to local Data URL for seamless client demo
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImageUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      } else if (res.url) {
        setImageUrl(res.url);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    if (!nameFr.trim()) {
      alert('Le nom du produit est obligatoire.');
      return;
    }

    if (!categoryId) {
      alert('Veuillez sélectionner une catégorie.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      alert('Le prix doit être un nombre positif ou nul.');
      return;
    }

    const numericCompareAt = compareAtPrice.trim() ? parseFloat(compareAtPrice) : null;
    if (numericCompareAt !== null && (isNaN(numericCompareAt) || numericCompareAt < 0)) {
      alert('Le prix barré doit être un nombre positif.');
      return;
    }

    setSaving(true);

    if (isSchemaMissing || !isValidUUID(restaurant.id) || !isValidUUID(categoryId)) {
      const catObj = categories.find((c) => c.id === categoryId);
      const catName = catObj?.name || 'Sans catégorie';
      const cleanTrans: Record<string, { name: string; description?: string }> = {};
      Object.entries(translations).forEach(([l, val]) => {
        const v = val as { name?: string; description?: string };
        if (v.name?.trim()) {
          cleanTrans[l] = { name: v.name.trim(), description: v.description?.trim() };
        }
      });

      let updatedList: ProductWithExtras[] = [];
      if (editingProduct) {
        updatedList = products.map((p) => {
          if (p.id === editingProduct.id) {
            return {
              ...p,
              category_id: categoryId,
              category_name: catName,
              name: nameFr.trim(),
              description: descFr.trim() || undefined,
              price: numericPrice,
              compare_at_price: numericCompareAt || undefined,
              image_url: imageUrl || undefined,
              is_visible: isVisible,
              is_available: isAvailable,
              translations: cleanTrans,
              updated_at: new Date().toISOString(),
            };
          }
          return p;
        });
      } else {
        const newProd: ProductWithExtras = {
          id: generateUUID(),
          restaurant_id: restaurant.id,
          category_id: categoryId,
          category_name: catName,
          name: nameFr.trim(),
          description: descFr.trim() || undefined,
          price: numericPrice,
          compare_at_price: numericCompareAt || undefined,
          image_url: imageUrl || undefined,
          is_visible: isVisible,
          is_available: isAvailable,
          sort_order: products.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          translations: cleanTrans,
        };
        updatedList = [newProd, ...products];
      }

      localStore.saveProducts(restaurant.id, updatedList);
      setProducts(updatedList);
      setIsModalOpen(false);
      setSaving(false);
      return;
    }

    try {
      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await (supabase
          .from('menu_items')
          .update({
            category_id: categoryId,
            name: nameFr.trim(),
            description: descFr.trim() || null,
            price: numericPrice,
            compare_at_price: numericCompareAt,
            image_url: imageUrl,
            is_visible: isVisible,
            is_available: isAvailable,
          } as any)
          .eq('id', editingProduct.id));

        if (error) throw error;
      } else {
        const { data, error } = await (supabase
          .from('menu_items')
          .insert({
            restaurant_id: restaurant.id,
            category_id: categoryId,
            name: nameFr.trim(),
            description: descFr.trim() || null,
            price: numericPrice,
            compare_at_price: numericCompareAt,
            image_url: imageUrl,
            is_visible: isVisible,
            is_available: isAvailable,
            sort_order: products.length,
          } as any)
          .select()
          .single());

        if (error) throw error;
        productId = (data as any).id;
      }

      // Save Translations
      if (productId) {
        for (const [langCode, trans] of Object.entries(translations)) {
          const t = trans as { name: string; description?: string };
          if (t.name.trim()) {
            await (supabase
              .from('menu_item_translations')
              .upsert(
                {
                  menu_item_id: productId,
                  language_code: langCode,
                  name: t.name.trim(),
                  description: t.description?.trim() || null,
                } as any,
                { onConflict: 'menu_item_id,language_code' }
              ));
          } else {
            await supabase
              .from('menu_item_translations')
              .delete()
              .eq('menu_item_id', productId)
              .eq('language_code', langCode);
          }
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        const catObj = categories.find((c) => c.id === categoryId);
        const catName = catObj?.name || 'Sans catégorie';
        const cleanTrans: Record<string, { name: string; description?: string }> = {};
        Object.entries(translations).forEach(([l, val]) => {
          const v = val as { name?: string; description?: string };
          if (v.name?.trim()) {
            cleanTrans[l] = { name: v.name.trim(), description: v.description?.trim() };
          }
        });

        const fallbackList = [...products];
        if (editingProduct) {
          const idx = fallbackList.findIndex((p) => p.id === editingProduct.id);
          if (idx >= 0) {
            fallbackList[idx] = {
              ...fallbackList[idx],
              category_id: categoryId,
              category_name: catName,
              name: nameFr.trim(),
              description: descFr.trim() || undefined,
              price: numericPrice,
              compare_at_price: numericCompareAt || undefined,
              image_url: imageUrl || undefined,
              is_visible: isVisible,
              is_available: isAvailable,
              translations: cleanTrans,
            };
          }
        } else {
          fallbackList.unshift({
            id: generateUUID(),
            restaurant_id: restaurant.id,
            category_id: categoryId,
            category_name: catName,
            name: nameFr.trim(),
            description: descFr.trim() || undefined,
            price: numericPrice,
            compare_at_price: numericCompareAt || undefined,
            image_url: imageUrl || undefined,
            is_visible: isVisible,
            is_available: isAvailable,
            sort_order: products.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            translations: cleanTrans,
          });
        }
        localStore.saveProducts(restaurant.id, fallbackList);
        setProducts(fallbackList);
        setIsModalOpen(false);
      } else {
        alert(`Erreur d'enregistrement : ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Filtered products
  const filteredProducts = products.filter((prod) => {
    const matchesCat =
      selectedCategoryFilter === 'all' || prod.category_id === selectedCategoryFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Produits & Plats
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gérez vos plats, tarifs, promotions, disponibilités et traductions.
          </p>
        </div>

        <button
          id="btn-add-product"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold transition shadow-sm shadow-cyan-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau produit</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher un plat par nom ou ingrédient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
          >
            <option value="all">Toutes les catégories ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Chargement de votre carte...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucun produit trouvé</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Aucun plat ne correspond à vos critères de recherche.'
              : 'Commencez à ajouter vos spécialités, boissons ou menus à la carte.'}
          </p>
          <button
            onClick={openAddModal}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold hover:bg-cyan-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un premier produit</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const transCount = Object.keys(prod.translations || {}).length;
            const hasPromo = prod.compare_at_price && prod.compare_at_price > prod.price;

            return (
              <div
                key={prod.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition flex flex-col justify-between gap-3 ${
                  !prod.is_visible
                    ? 'border-slate-200 opacity-60 bg-slate-50/50'
                    : 'border-slate-200/80 hover:border-cyan-500/40 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top image & Category Badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-100 flex items-center justify-center shrink-0">
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md inline-block mb-1">
                        {prod.category_name}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm truncate leading-snug">
                        {prod.name}
                      </h4>
                      {prod.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {prod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price & Badges */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-slate-900">
                        {prod.price} {restaurant?.currency || 'MAD'}
                      </span>
                      {hasPromo && (
                        <span className="text-xs text-slate-400 line-through">
                          {prod.compare_at_price} {restaurant?.currency || 'MAD'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* In Stock toggle */}
                      <button
                        onClick={() => handleToggleStock(prod)}
                        title={prod.is_available ? 'Marquer comme épuisé' : 'Marquer comme en stock'}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                          prod.is_available
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {prod.is_available ? 'En stock' : 'Épuisé'}
                      </button>

                      {!prod.is_visible && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                          Masqué
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-400">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    {transCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">
                        <Languages className="w-3 h-3" />
                        +{transCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleVisibility(prod)}
                      title={prod.is_visible ? 'Masquer' : 'Afficher'}
                      className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    >
                      {prod.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDuplicate(prod)}
                      title="Dupliquer le plat"
                      className="p-1.5 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(prod)}
                      title="Modifier"
                      className="p-1.5 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id, prod.name)}
                      title="Supprimer"
                      className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Modal with Translations */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit à la carte'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto py-2.5 border-b border-slate-100 text-xs no-scrollbar">
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
              {/* French Tab - Main Product Information */}
              {activeTab === 'fr' && (
                <>
                  {/* Status switches: Visible sur le menu public & En stock */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700">Visible sur le menu</span>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => setIsVisible(e.target.checked)}
                        className="rounded text-cyan-600 focus:ring-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer border-l border-slate-200 pl-4">
                      <span className="text-xs font-semibold text-slate-700">En stock</span>
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={(e) => setIsAvailable(e.target.checked)}
                        className="rounded text-cyan-600 focus:ring-cyan-500"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Nom du plat <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={nameFr}
                        onChange={(e) => setNameFr(e.target.value)}
                        placeholder="Ex: Burger Gourmet Truffe"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Catégorie <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Prix ({restaurant?.currency || 'MAD'}) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="65.00"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Prix barré (Optionnel)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={compareAtPrice}
                        onChange={(e) => setCompareAtPrice(e.target.value)}
                        placeholder="75.00"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description / Ingrédients
                    </label>
                    <textarea
                      rows={2}
                      value={descFr}
                      onChange={(e) => setDescFr(e.target.value)}
                      placeholder="Steak haché de bœuf Black Angus, cheddar affiné 12 mois, roquette et mayonnaise à la truffe d'été."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Photo du produit
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt="Produit" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingImage ? 'Téléchargement...' : imageUrl ? 'Changer la photo' : 'Ajouter une photo'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleProductImageUpload}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                        {imageUrl && (
                          <button
                            type="button"
                            onClick={() => setImageUrl(null)}
                            className="ml-2 text-xs text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Other Language Tabs */}
              {activeTab !== 'fr' && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                    Traduisez le nom et la composition de ce plat pour les clients sélectionnant la langue{' '}
                    <span className="font-semibold">{SUPPORTED_LANGUAGES.find((l) => l.code === activeTab)?.name}</span>.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nom du produit ({SUPPORTED_LANGUAGES.find((l) => l.code === activeTab)?.name})
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
                      placeholder={activeTab === 'en' ? 'Ex: Truffle Burger' : activeTab === 'ar' ? 'برغر الكمأة الفاخر' : 'Nom traduit...'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description traduite
                    </label>
                    <textarea
                      rows={3}
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
                      placeholder="Description des ingrédients..."
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
                  {saving ? 'Enregistrement...' : editingProduct ? 'Mettre à jour' : 'Ajouter au menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
