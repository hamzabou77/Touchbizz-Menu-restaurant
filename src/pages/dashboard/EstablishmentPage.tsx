import React, { useState, useEffect } from 'react';
import {
  Store,
  Save,
  Globe,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Link as LinkIcon,
  Phone,
  MapPin,
  Palette,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSchemaMissingError, isValidUUID, isInvalidUUIDError } from '../../lib/supabase';
import { localStore } from '../../lib/localStore';
import { uploadImage } from '../../lib/storage';
import { THEMES } from '../../lib/themes';
import { Restaurant } from '../../types';

export const EstablishmentPage: React.FC = () => {
  const { restaurant, refreshRestaurant, isSchemaMissing } = useAuth();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0ea5e9');
  const [theme, setTheme] = useState('minimal');
  const [currency, setCurrency] = useState('MAD');
  const [isPublished, setIsPublished] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setSlug(restaurant.slug || '');
      setDescription(restaurant.description || '');
      setAddress(restaurant.address || '');
      setPhone(restaurant.phone || '');
      setPrimaryColor(restaurant.primary_color || '#0ea5e9');
      setTheme(restaurant.theme || 'minimal');
      setCurrency(restaurant.currency || 'MAD');
      setIsPublished(Boolean(restaurant.is_published));
      setLogoUrl(restaurant.logo_url || null);
      setCoverUrl(restaurant.cover_url || null);
    }
  }, [restaurant]);

  const sanitizeSlug = (input: string) => {
    return input
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    // If slug hasn't been manually diverged or is empty, auto-suggest
    if (!slug || slug === sanitizeSlug(name)) {
      setSlug(sanitizeSlug(val));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setErrorMessage(null);

    try {
      const res = await uploadImage(file, 'restaurant-assets', `logo_${slug || 'resto'}`);
      if (res.error) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setLogoUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      } else if (res.url) {
        setLogoUrl(res.url);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setErrorMessage(null);

    try {
      const res = await uploadImage(file, 'restaurant-assets', `cover_${slug || 'resto'}`);
      if (res.error) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setCoverUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      } else if (res.url) {
        setCoverUrl(res.url);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const cleanSlug = sanitizeSlug(slug);

    if (!name.trim()) {
      setErrorMessage('Le nom de l’établissement est requis.');
      setLoading(false);
      return;
    }

    if (!cleanSlug) {
      setErrorMessage('L’identifiant URL (slug) est invalide.');
      setLoading(false);
      return;
    }

    if (isSchemaMissing || !isValidUUID(restaurant.id)) {
      const updatedRest: Restaurant = {
        ...restaurant,
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        primary_color: primaryColor,
        theme,
        currency,
        is_published: isPublished,
        logo_url: logoUrl || undefined,
        cover_url: coverUrl || undefined,
      };
      localStore.saveRestaurant(updatedRest);
      setSuccessMessage('Informations enregistrées en local avec succès.');
      setLoading(false);
      await refreshRestaurant();
      return;
    }

    try {
      // Check slug uniqueness if changed
      if (cleanSlug !== restaurant.slug) {
        const { data: existing } = await supabase
          .from('restaurants')
          .select('id')
          .eq('slug', cleanSlug)
          .neq('id', restaurant.id)
          .maybeSingle();

        if (existing) {
          setErrorMessage(`L’identifiant URL "${cleanSlug}" est déjà réservé par un autre établissement. Veuillez en choisir un autre.`);
          setLoading(false);
          return;
        }
      }

      const { error } = await (supabase
        .from('restaurants')
        .update({
          name: name.trim(),
          slug: cleanSlug,
          description: description.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          primary_color: primaryColor,
          theme,
          currency,
          is_published: isPublished,
          logo_url: logoUrl,
          cover_url: coverUrl,
        } as any)
        .eq('id', restaurant.id));

      if (error) {
        if (isSchemaMissingError(error) || isInvalidUUIDError(error)) {
          const updatedRest: Restaurant = {
            ...restaurant,
            name: name.trim(),
            slug: cleanSlug,
            description: description.trim() || undefined,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
            primary_color: primaryColor,
            theme,
            currency,
            is_published: isPublished,
            logo_url: logoUrl || undefined,
            cover_url: coverUrl || undefined,
          };
          localStore.saveRestaurant(updatedRest);
          setSuccessMessage('Informations enregistrées en local avec succès.');
          await refreshRestaurant();
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setSuccessMessage('Informations enregistrées avec succès.');
        await refreshRestaurant();
      }
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        const updatedRest: Restaurant = {
          ...restaurant,
          name: name.trim(),
          slug: cleanSlug,
          description: description.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          primary_color: primaryColor,
          theme,
          currency,
          is_published: isPublished,
          logo_url: logoUrl || undefined,
          cover_url: coverUrl || undefined,
        };
        localStore.saveRestaurant(updatedRest);
        setSuccessMessage('Informations enregistrées en local avec succès.');
        await refreshRestaurant();
      } else {
        setErrorMessage(err.message || 'Une erreur est survenue lors de l’enregistrement.');
      }
    } finally {
      setLoading(false);
    }
  };

  const publicUrl = slug ? `/r/${slug}` : '#';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Mon Établissement
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configurez l'identité de marque, les coordonnées et les visuels de votre restaurant.
          </p>
        </div>

        {slug && (
          <a
            id="btn-visit-public-menu"
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Eye className="w-4 h-4 text-cyan-600" />
            <span>Voir le menu public</span>
          </a>
        )}
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Branding & Identité */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-cyan-600" />
            Identité générale
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nom de l'établissement <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Café Nakhil"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Identifiant URL Public (Slug) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
                  placeholder="cafe-nakhil"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                />
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Lien permanent : <span className="font-mono text-cyan-700">/r/{slug || 'votre-slug'}</span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Slogan
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Spécialités de café torréfié maison, brunchs gourmands et pâtisseries fraîches au cœur de la ville."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Numéro de téléphone
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 5 22 00 00 00"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Adresse physique
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="14 Avenue Hassan II, Casablanca"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Visuels (Logo & Couverture) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-cyan-600" />
            Visuels & Images de marque
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Logo de l'établissement
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingLogo ? 'Téléchargement...' : 'Changer le logo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format carré conseillé (PNG, JPG, WebP). Max 5 Mo.
                  </p>
                </div>
              </div>
            </div>

            {/* Cover Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Photo de couverture (Bannière)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-28 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingCover ? 'Téléchargement...' : 'Changer la bannière'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format paysage recommandé (1200x400px).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Thème & Monnaie */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-600" />
            Ambiance & Paramètres de vente
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Couleur d'accentuation
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 p-0.5 rounded-xl border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Modèle de thème
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {Object.values(THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.badge ? `(${t.badge})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Devise d'affichage
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="MAD">MAD (Dirham Marocain)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="CHF">CHF (Franc Suisse)</option>
                <option value="CAD">CAD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Visibility switch */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Visibilité du menu en ligne</h4>
              <p className="text-xs text-slate-500">
                Lorsque désactivé, le lien public affichera une page d'indisponibilité temporaire.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-sm shadow-cyan-600/20 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Enregistrer les modifications</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
