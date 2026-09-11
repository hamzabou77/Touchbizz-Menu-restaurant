import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine,
  Eye,
  Globe,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  UtensilsCrossed,
  QrCode,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon,
  Palette,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSchemaMissingError, isValidUUID, isInvalidUUIDError } from '../../lib/supabase';
import { localStore } from '../../lib/localStore';
import { MenuQualityScore } from '../../types';

export const DashboardHomePage: React.FC = () => {
  const { restaurant, refreshRestaurant, isSchemaMissing } = useAuth();
  const [categoriesCount, setCategoriesCount] = useState<number>(0);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [productsWithPhotoCount, setProductsWithPhotoCount] = useState<number>(0);
  const [languagesCount, setLanguagesCount] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  useEffect(() => {
    if (!restaurant) return;

    const loadMetrics = async () => {
      setLoading(true);

      if (isSchemaMissing || !isValidUUID(restaurant.id)) {
        const cats = localStore.getCategories(restaurant.id);
        const prods = localStore.getProducts(restaurant.id);
        setCategoriesCount(cats.length);
        setProductsCount(prods.length);
        setProductsWithPhotoCount(prods.filter((p) => Boolean(p.image_url)).length);
        setLanguagesCount(localStore.getLanguages(restaurant.id).length);
        setLoading(false);
        return;
      }

      try {
        // Categories count
        const { count: catCount, error: catErr } = await supabase
          .from('categories')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id);

        if (catErr && (isSchemaMissingError(catErr) || isInvalidUUIDError(catErr))) {
          const cats = localStore.getCategories(restaurant.id);
          const prods = localStore.getProducts(restaurant.id);
          setCategoriesCount(cats.length);
          setProductsCount(prods.length);
          setProductsWithPhotoCount(prods.filter((p) => Boolean(p.image_url)).length);
          setLanguagesCount(localStore.getLanguages(restaurant.id).length);
          setLoading(false);
          return;
        }

        // Products count
        const { count: prodCount } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id);

        // Products with image count
        const { count: prodPhotoCount } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .not('image_url', 'is', null);

        // Languages count
        const { count: langCount } = await supabase
          .from('restaurant_languages')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true);

        setCategoriesCount(catCount || 0);
        setProductsCount(prodCount || 0);
        setProductsWithPhotoCount(prodPhotoCount || 0);
        setLanguagesCount(langCount || 1);
      } catch (err: any) {
        if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
          const cats = localStore.getCategories(restaurant.id);
          const prods = localStore.getProducts(restaurant.id);
          setCategoriesCount(cats.length);
          setProductsCount(prods.length);
          setProductsWithPhotoCount(prods.filter((p) => Boolean(p.image_url)).length);
          setLanguagesCount(localStore.getLanguages(restaurant.id).length);
        } else {
          console.warn('Dashboard stats notice:', err?.message || err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [restaurant, isSchemaMissing]);

  // Calculate real menu quality score
  const calculateQualityScore = (): MenuQualityScore => {
    if (!restaurant) {
      return {
        total: 0,
        maxScore: 100,
        percentage: 0,
        checks: {
          hasDescription: false,
          hasLogo: false,
          hasCover: false,
          hasPhone: false,
          hasAddress: false,
          hasCategories: false,
          hasProducts: false,
          hasProductImages: false,
          hasMultipleLanguages: false,
        },
        recommendations: [],
      };
    }

    const hasDescription = Boolean(restaurant.description && restaurant.description.length > 10);
    const hasLogo = Boolean(restaurant.logo_url);
    const hasCover = Boolean(restaurant.cover_url);
    const hasPhone = Boolean(restaurant.phone);
    const hasAddress = Boolean(restaurant.address);
    const hasCategories = categoriesCount > 0;
    const hasProducts = productsCount >= 3;
    const hasProductImages = productsWithPhotoCount > 0;
    const hasMultipleLanguages = languagesCount > 1;

    let points = 0;
    const recommendations: string[] = [];

    if (hasLogo) points += 15;
    else recommendations.push('Ajoutez le logo officiel de votre établissement');

    if (hasCover) points += 10;
    else recommendations.push('Ajoutez une photo de couverture attrayante');

    if (hasDescription) points += 10;
    else recommendations.push('Renseignez une courte présentation pour vos clients');

    if (hasAddress || hasPhone) points += 10;
    else recommendations.push('Indiquez vos coordonnées ou adresse pour rassurer vos clients');

    if (hasCategories) points += 15;
    else recommendations.push('Créez au moins une catégorie (ex: Boissons, Plats)');

    if (hasProducts) points += 20;
    else recommendations.push('Ajoutez au moins 3 produits à la carte');

    if (hasProductImages) points += 10;
    else recommendations.push('Ajoutez des photos appétissantes sur vos plats');

    if (hasMultipleLanguages) points += 10;
    else recommendations.push('Activez une seconde langue (Anglais ou Arabe)');

    return {
      total: points,
      maxScore: 100,
      percentage: points,
      checks: {
        hasDescription,
        hasLogo,
        hasCover,
        hasPhone,
        hasAddress,
        hasCategories,
        hasProducts,
        hasProductImages,
        hasMultipleLanguages,
      },
      recommendations,
    };
  };

  const quality = calculateQualityScore();

  // Onboarding 3 steps dynamic calculation:
  // Step 1: Scannez votre menu (Done if productsCount > 0 or categoriesCount > 0)
  // Step 2: Jetez un coup d'œil (Done if verified categories & products > 0)
  // Step 3: Passez en ligne (Done if is_published is true)
  const step1Done = productsCount > 0 || categoriesCount > 0;
  const step2Done = step1Done && (Boolean(restaurant?.logo_url) || productsCount >= 3);
  const step3Done = Boolean(restaurant?.is_published);

  const stepsCompleted = [step1Done, step2Done, step3Done].filter(Boolean).length;

  const handleTogglePublish = async () => {
    if (!restaurant) return;
    setIsPublishing(true);
    try {
      const newStatus = !restaurant.is_published;
      const { error } = await (supabase
        .from('restaurants')
        .update({ is_published: newStatus } as any)
        .eq('id', restaurant.id));

      if (error) {
        alert(`Erreur: ${error.message}`);
      } else {
        await refreshRestaurant();
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const publicUrl = restaurant ? `/r/${restaurant.slug}` : '#';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="space-y-6">
      {/* Welcome Top Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full inline-block mb-2">
            {greeting}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {restaurant?.name || 'Mon Établissement'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gérez votre carte digitale, vos catégories et votre code QR en temps réel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {restaurant?.slug && (
            <a
              id="btn-home-preview"
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Eye className="w-4 h-4 text-cyan-600" />
              <span>Aperçu en ligne</span>
            </a>
          )}

          {restaurant && (
            <button
              id="btn-home-publish"
              onClick={handleTogglePublish}
              disabled={isPublishing}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer ${
                restaurant.is_published
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-600/20'
              }`}
            >
              {restaurant.is_published ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Menu publié</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Publier le menu</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Onboarding Guide Card: "Par où commencer" */}
      <div className="bg-gradient-to-br from-cyan-900 to-slate-900 rounded-2xl p-6 sm:p-7 text-white shadow-lg shadow-cyan-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-cyan-800/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <h3 className="text-lg font-bold">Par où commencer</h3>
            </div>
            <p className="text-xs text-cyan-100/80">
              Configurez votre menu digital en 3 étapes simples pour accueillir vos premiers clients.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-cyan-300">
              {stepsCompleted}/3
            </span>
            <span className="text-xs text-cyan-200/80 font-medium">étapes terminées</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Step 1 */}
          <Link
            to="/dashboard/scanner"
            className={`p-4 rounded-xl border transition group ${
              step1Done
                ? 'bg-cyan-950/40 border-emerald-500/40'
                : 'bg-cyan-950/20 border-cyan-700/40 hover:border-cyan-400/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400">Étape 1</span>
              {step1Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <ScanLine className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition" />
              )}
            </div>
            <h4 className="font-semibold text-sm text-white mb-1">Scannez votre menu</h4>
            <p className="text-xs text-cyan-100/70">
              Importez une photo de votre carte papier ou ajoutez vos plats manuellement.
            </p>
          </Link>

          {/* Step 2 */}
          <Link
            to="/dashboard/establishment"
            className={`p-4 rounded-xl border transition group ${
              step2Done
                ? 'bg-cyan-950/40 border-emerald-500/40'
                : 'bg-cyan-950/20 border-cyan-700/40 hover:border-cyan-400/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400">Étape 2</span>
              {step2Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Palette className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition" />
              )}
            </div>
            <h4 className="font-semibold text-sm text-white mb-1">Jetez un coup d'œil</h4>
            <p className="text-xs text-cyan-100/70">
              Personnalisez votre logo, couverture et choisissez un modèle de présentation.
            </p>
          </Link>

          {/* Step 3 */}
          <div
            onClick={!step3Done ? handleTogglePublish : undefined}
            className={`p-4 rounded-xl border transition cursor-pointer group ${
              step3Done
                ? 'bg-cyan-950/40 border-emerald-500/40'
                : 'bg-cyan-950/20 border-cyan-700/40 hover:border-cyan-400/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400">Étape 3</span>
              {step3Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Globe className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition" />
              )}
            </div>
            <h4 className="font-semibold text-sm text-white mb-1">Passez en ligne</h4>
            <p className="text-xs text-cyan-100/70">
              Rendez votre carte visible au public et imprimez votre QR code officiel.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Catégories</span>
            <FolderTree className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{categoriesCount}</p>
          <Link to="/dashboard/categories" className="text-xs text-cyan-600 font-medium hover:underline mt-1 inline-block">
            Gérer les catégories &rarr;
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Produits / Plats</span>
            <UtensilsCrossed className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{productsCount}</p>
          <Link to="/dashboard/products" className="text-xs text-cyan-600 font-medium hover:underline mt-1 inline-block">
            Gérer les produits &rarr;
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Photos de plats</span>
            <ImageIcon className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{productsWithPhotoCount}</p>
          <span className="text-xs text-slate-400 mt-1 inline-block">
            {productsCount > 0 ? `${Math.round((productsWithPhotoCount / productsCount) * 100)}% illustrés` : '0 illustré'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Langues actives</span>
            <Globe className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{languagesCount}</p>
          <Link to="/dashboard/settings" className="text-xs text-cyan-600 font-medium hover:underline mt-1 inline-block">
            Configurer langues &rarr;
          </Link>
        </div>
      </div>

      {/* Menu Quality Section - Based on real restaurant data */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-cyan-600" />
              <h3 className="text-base font-bold text-slate-900">Score de qualité du menu</h3>
            </div>
            <p className="text-xs text-slate-500">
              Calculé à partir de la complétude réelle de vos données et visuels.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  quality.percentage >= 80
                    ? 'bg-emerald-500'
                    : quality.percentage >= 50
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${quality.percentage}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-800">{quality.percentage}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Checklist */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-semibold text-slate-700 uppercase tracking-wider mb-2">Points de contrôle vérifiés</h4>
            <div className="flex items-center gap-2.5">
              {quality.checks.hasLogo ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={quality.checks.hasLogo ? 'text-slate-800 font-medium' : 'text-slate-400'}>Logo officiel importé</span>
            </div>
            <div className="flex items-center gap-2.5">
              {quality.checks.hasCover ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={quality.checks.hasCover ? 'text-slate-800 font-medium' : 'text-slate-400'}>Photo de couverture configurée</span>
            </div>
            <div className="flex items-center gap-2.5">
              {quality.checks.hasDescription ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={quality.checks.hasDescription ? 'text-slate-800 font-medium' : 'text-slate-400'}>Description de l'établissement</span>
            </div>
            <div className="flex items-center gap-2.5">
              {quality.checks.hasCategories ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={quality.checks.hasCategories ? 'text-slate-800 font-medium' : 'text-slate-400'}>Structure de catégories organisée</span>
            </div>
            <div className="flex items-center gap-2.5">
              {quality.checks.hasProducts ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={quality.checks.hasProducts ? 'text-slate-800 font-medium' : 'text-slate-400'}>Plats avec prix définis (&gt;= 3)</span>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider mb-2">Recommandations pour optimiser</h4>
            {quality.recommendations.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Votre menu est complet et optimisé pour vos clients !</span>
              </div>
            ) : (
              <ul className="space-y-2 text-xs text-slate-600">
                {quality.recommendations.slice(0, 4).map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0 mt-1.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/dashboard/scanner"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-cyan-500/50 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <ScanLine className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center justify-between">
            <span>Scanner le menu</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500">
            Convertissez une photo de votre carte papier en articles structurés grâce à notre IA.
          </p>
        </Link>

        <Link
          to="/dashboard/qr-code"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-cyan-500/50 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <QrCode className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center justify-between">
            <span>Code QR & NFC</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500">
            Personnalisez et téléchargez votre QR code pour chevalets de table et étiquettes NFC.
          </p>
        </Link>

        <Link
          to="/dashboard/themes"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-cyan-500/50 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <Palette className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center justify-between">
            <span>Modèles de présentation</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
          </h4>
          <p className="text-xs text-slate-500">
            Personnalisez l'ambiance visuelle du menu public : Minimal, Maison, Luxury, etc.
          </p>
        </Link>
      </div>
    </div>
  );
};
