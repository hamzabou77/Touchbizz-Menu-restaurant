import React, { useState } from 'react';
import { Palette, Check, Eye, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSchemaMissingError, isValidUUID, isInvalidUUIDError } from '../../lib/supabase';
import { localStore } from '../../lib/localStore';
import { THEMES, ThemeDefinition } from '../../lib/themes';

export const ThemesPage: React.FC = () => {
  const { restaurant, refreshRestaurant, isSchemaMissing } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState<string>(restaurant?.theme || 'minimal');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSelectTheme = async (themeId: string) => {
    setSelectedTheme(themeId);
    if (!restaurant) return;

    setSaving(true);
    setSuccess(false);

    if (isSchemaMissing || !isValidUUID(restaurant.id)) {
      localStore.saveRestaurant({ ...restaurant, theme: themeId });
      await refreshRestaurant();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setSaving(false);
      return;
    }

    try {
      const { error } = await (supabase
        .from('restaurants')
        .update({ theme: themeId } as any)
        .eq('id', restaurant.id));

      if (error) {
        if (isSchemaMissingError(error) || isInvalidUUIDError(error)) {
          localStore.saveRestaurant({ ...restaurant, theme: themeId });
          await refreshRestaurant();
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          alert(`Erreur: ${error.message}`);
        }
      } else {
        await refreshRestaurant();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        localStore.saveRestaurant({ ...restaurant, theme: themeId });
        await refreshRestaurant();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert(`Erreur: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = restaurant ? `/r/${restaurant.slug}` : '#';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Modèles de présentation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Choisissez l'ambiance visuelle et le design de votre menu digital pour vos clients.
          </p>
        </div>

        {restaurant?.slug && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Eye className="w-4 h-4 text-cyan-600" />
            <span>Tester en direct</span>
          </a>
        )}
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Thème appliqué avec succès à votre menu public !</span>
        </div>
      )}

      {/* Themes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(THEMES).map((th: ThemeDefinition) => {
          const isActive = (restaurant?.theme || 'minimal') === th.id;
          const isSelected = selectedTheme === th.id;

          return (
            <div
              key={th.id}
              onClick={() => handleSelectTheme(th.id)}
              className={`rounded-2xl border-2 transition overflow-hidden cursor-pointer flex flex-col justify-between shadow-xs ${
                isActive
                  ? 'border-cyan-600 ring-2 ring-cyan-500/20 shadow-md'
                  : 'border-slate-200 hover:border-cyan-400 bg-white'
              }`}
            >
              {/* Visual Mockup Header */}
              <div
                className={`p-6 relative overflow-hidden transition ${th.headerBg} ${
                  th.isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: th.accentColor,
                      color: th.isDark ? '#000' : '#fff',
                    }}
                  >
                    {th.badge || 'Standard'}
                  </span>

                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-500 text-white rounded-full shadow-xs">
                      <Check className="w-3 h-3" />
                      Actif
                    </span>
                  )}
                </div>

                <h4 className={`text-lg font-bold mb-1 ${th.titleFont}`}>
                  {th.name}
                </h4>
                <p className={`text-xs opacity-80 ${th.bodyFont}`}>
                  {th.description}
                </p>

                {/* Simulated Mini Card */}
                <div
                  className={`mt-4 p-3 rounded-xl border ${th.cardBg} ${th.borderColor} shadow-xs`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="w-20 h-2.5 rounded-sm bg-current opacity-40 mb-1" />
                      <div className="w-12 h-2 rounded-sm bg-current opacity-20" />
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: th.accentColor }}
                    >
                      55 MAD
                    </span>
                  </div>
                </div>
              </div>

              {/* Specs & Select Button */}
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: th.accentColor }}
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    {th.isDark ? 'Mode sombre' : 'Mode clair'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-cyan-600 text-white hover:bg-cyan-700'
                  }`}
                >
                  {isActive ? 'Sélectionné' : 'Appliquer'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
