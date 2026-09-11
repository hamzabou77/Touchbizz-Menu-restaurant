import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Share2,
  DollarSign,
  Languages,
  Check,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  MessageCircle,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSchemaMissingError, isValidUUID, isInvalidUUIDError } from '../../lib/supabase';
import { localStore } from '../../lib/localStore';
import { SUPPORTED_LANGUAGES, RestaurantLanguage, Restaurant } from '../../types';

export const SettingsPage: React.FC = () => {
  const { restaurant, user, refreshRestaurant, isSchemaMissing } = useAuth();

  // Currency & basic settings
  const [currency, setCurrency] = useState('MAD');
  const [defaultLang, setDefaultLang] = useState('fr');
  const [activeLanguages, setActiveLanguages] = useState<string[]>(['fr']);

  // Social & contact
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [googleMaps, setGoogleMaps] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Form states
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setCurrency(restaurant.currency || 'MAD');
      setDefaultLang(restaurant.default_language || 'fr');

      // Fetch active languages
      const fetchLanguages = async () => {
        if (isSchemaMissing || !isValidUUID(restaurant.id)) {
          const langs = localStore.getLanguages(restaurant.id);
          setActiveLanguages(langs.length > 0 ? langs : ['fr']);
          return;
        }

        try {
          const { data, error } = await supabase
            .from('restaurant_languages')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .eq('is_active', true);

          if (error) {
            if (isSchemaMissingError(error) || isInvalidUUIDError(error)) {
              const langs = localStore.getLanguages(restaurant.id);
              setActiveLanguages(langs.length > 0 ? langs : ['fr']);
            }
            return;
          }

          if (data && data.length > 0) {
            setActiveLanguages(data.map((l: any) => l.language_code));
          } else {
            setActiveLanguages(['fr']);
          }
        } catch (err: any) {
          if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
            const langs = localStore.getLanguages(restaurant.id);
            setActiveLanguages(langs.length > 0 ? langs : ['fr']);
          }
        }
      };

      fetchLanguages();
    }
  }, [restaurant]);

  const toggleLanguage = (code: string) => {
    if (code === 'fr') return; // French is always active as base
    if (activeLanguages.includes(code)) {
      setActiveLanguages((prev) => prev.filter((c) => c !== code));
    } else {
      setActiveLanguages((prev) => [...prev, code]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setSavingSettings(true);
    setSettingsSuccess(null);
    setSettingsError(null);

    if (isSchemaMissing || !isValidUUID(restaurant.id)) {
      const updatedRest: Restaurant = {
        ...restaurant,
        currency,
        default_language: defaultLang,
      };
      localStore.saveRestaurant(updatedRest);
      localStore.saveLanguages(restaurant.id, activeLanguages);
      setSettingsSuccess('Paramètres enregistrés en local avec succès.');
      setSavingSettings(false);
      await refreshRestaurant();
      return;
    }

    try {
      // 1. Update restaurant base settings
      const { error: restError } = await (supabase
        .from('restaurants')
        .update({
          currency,
          default_language: defaultLang,
        } as any)
        .eq('id', restaurant.id));

      if (restError) throw restError;

      // 2. Sync restaurant languages in database
      // Deactivate all, then activate selected
      await supabase
        .from('restaurant_languages')
        .delete()
        .eq('restaurant_id', restaurant.id);

      const langInserts = activeLanguages.map((code) => ({
        restaurant_id: restaurant.id,
        language_code: code,
        is_active: true,
      }));

      const { error: langError } = await (supabase
        .from('restaurant_languages')
        .insert(langInserts as any));

      if (langError) throw langError;

      setSettingsSuccess('Paramètres enregistrés avec succès.');
      await refreshRestaurant();
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        const updatedRest: Restaurant = {
          ...restaurant,
          currency,
          default_language: defaultLang,
        };
        localStore.saveRestaurant(updatedRest);
        localStore.saveLanguages(restaurant.id, activeLanguages);
        setSettingsSuccess('Paramètres enregistrés en local avec succès.');
        await refreshRestaurant();
      } else {
        setSettingsError(err.message || 'Erreur lors de l’enregistrement.');
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess('Votre mot de passe a été mis à jour avec succès.');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/80">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Paramètres Généraux
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configurez les devises, les langues du menu digital et la sécurité de votre compte.
        </p>
      </div>

      {settingsSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{settingsSuccess}</span>
        </div>
      )}

      {settingsError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{settingsError}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Card 1: Multi-language & Currency */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-600" />
            Langues & Devises
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Devise du menu
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="MAD">MAD - Dirham Marocain</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="USD">USD - Dollar US ($)</option>
                <option value="CHF">CHF - Franc Suisse</option>
                <option value="CAD">CAD - Dollar Canadien</option>
                <option value="GBP">GBP - Livre Sterling (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Langue par défaut
              </label>
              <select
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Langues activées sur le sélecteur client
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Cochez les langues dans lesquelles vos clients pourront afficher la carte digitale :
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = activeLanguages.includes(lang.code);
                const isBase = lang.code === 'fr';

                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      isActive
                        ? 'border-cyan-600 bg-cyan-50/50 text-cyan-950 font-semibold'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{lang.flag}</span>
                      <span className="text-xs">{lang.name}</span>
                    </div>
                    {isActive ? (
                      <Check className="w-4 h-4 text-cyan-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Enregistrement...' : 'Sauvegarder les langues'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Security & Password Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-600" />
          Sécurité & Mot de passe
        </h3>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Compte connecté
            </label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le mot de passe"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={updatingPassword}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{updatingPassword ? 'Mise à jour...' : 'Changer le mot de passe'}</span>
          </button>
        </form>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 block mb-0.5">Architecture Sécurisée Supabase & RLS</span>
          Vos données de restaurant et vos articles sont strictement protégés par les politiques de sécurité au niveau des lignes (Row Level Security). Seul votre compte authentifié possède les droits d'écriture.
        </div>
      </div>
    </div>
  );
};
