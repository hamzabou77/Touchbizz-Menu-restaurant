import React, { useState } from 'react';
import { AlertTriangle, Database, Key, Check, Copy, ExternalLink, Settings } from 'lucide-react';
import { supabaseUrl, supabaseAnonKey, setCustomSupabaseConfig, isSupabaseConfigured } from '../../lib/supabase';

export const ConfigMissingBanner: React.FC = () => {
  const isConfigured = isSupabaseConfigured();
  const [showModal, setShowModal] = useState(false);
  const [urlInput, setUrlInput] = useState(supabaseUrl || '');
  const [keyInput, setKeyInput] = useState(supabaseAnonKey || '');
  const [copied, setCopied] = useState(false);

  if (isConfigured) {
    return null;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) return;
    setCustomSupabaseConfig(urlInput.trim(), keyInput.trim());
  };

  const copySqlSnippet = () => {
    navigator.clipboard.writeText(`-- Exécutez le script dans /supabase/schema.sql dans votre console Supabase SQL Editor`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div id="supabase-config-warning" className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold">Configuration Supabase requise :</span> Les variables d'environnement <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-xs text-amber-800">VITE_SUPABASE_URL</code> et <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-xs text-amber-800">VITE_SUPABASE_ANON_KEY</code> ne sont pas encore définies.
            </div>
          </div>
          <button
            id="btn-open-supabase-config"
            onClick={() => setShowModal(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium text-xs transition shadow-sm cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            Connecter Supabase
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Configuration Supabase</h3>
                  <p className="text-xs text-slate-500">TouchBizz Menu fonctionne directement avec votre projet Supabase officiel.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Anon / Public Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                    required
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Trouvez ces clés dans votre projet Supabase &gt; Project Settings &gt; API.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center justify-between">
                  <span>Schéma SQL prêt à l'emploi</span>
                  <button
                    type="button"
                    onClick={copySqlSnippet}
                    className="text-cyan-700 hover:text-cyan-800 inline-flex items-center gap-1 font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copié !' : 'Consulter le fichier'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Le fichier complet <code className="bg-white px-1 py-0.5 rounded border border-slate-200">/supabase/schema.sql</code> contient toutes les tables, RLS et buckets de stockage requis.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 transition shadow-sm"
                >
                  Enregistrer et recharger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
