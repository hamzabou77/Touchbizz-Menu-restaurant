import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Download,
  CheckCircle2,
  Terminal,
  Info,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabaseUrl, extractSupabaseProjectRef } from '../../lib/supabase';
import { FULL_SCHEMA_SQL } from '../../lib/schemaSql';

export const SchemaSetupBanner: React.FC = () => {
  const { isSchemaMissing, checkSchemaStatus } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (!isSchemaMissing || dismissed) {
    return null;
  }

  const projectRef = extractSupabaseProjectRef(supabaseUrl);
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : 'https://supabase.com/dashboard';

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(FULL_SCHEMA_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = FULL_SCHEMA_SQL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadSql = () => {
    const blob = new Blob([FULL_SCHEMA_SQL], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'touchbizz_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifySuccess(null);
    try {
      const ok = await checkSchemaStatus();
      if (ok) {
        setVerifySuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setVerifySuccess(false);
      }
    } catch {
      setVerifySuccess(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      {/* Top Warning Notification Bar */}
      <div
        id="schema-setup-banner"
        className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border-b border-amber-300/80 px-4 py-3 text-amber-950 shadow-xs"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-amber-900">Base de données Supabase à initialiser</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-800 font-bold">
                  PGRST205 Résolu via Démo Locale
                </span>
              </div>
              <p className="text-amber-800/90 text-xs mt-0.5">
                Vos identifiants Supabase sont valides, mais le script SQL d’initialisation des tables n’a pas encore été exécuté. Le mode démo local est actif.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              id="btn-open-schema-modal"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Initialiser le schéma SQL (1 clic)</span>
            </button>

            <button
              id="btn-verify-schema"
              onClick={handleVerify}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl font-semibold text-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Test en cours...' : 'Vérifier'}</span>
            </button>

            <button
              onClick={() => setDismissed(true)}
              title="Masquer"
              className="p-1.5 text-amber-700 hover:text-amber-900 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 shadow-xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Initialisation du Schéma Supabase
                  </h3>
                  <p className="text-xs text-slate-500">
                    Projet : <span className="font-mono text-cyan-700 font-semibold">{projectRef || 'Supabase'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 py-4 space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <p>
                    L’erreur <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-900">PGRST205</code> se produit lorsque PostgREST ne trouve pas les tables (restaurants, profiles, etc.) dans votre base Supabase.
                    Pour créer toutes les tables et sécurités RLS, il suffit d’exécuter notre script SQL en 3 étapes :
                  </p>
                </div>
              </div>

              {/* Steps Guide */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Copiez le script SQL complet</p>
                    <p className="text-slate-500 mt-0.5 text-[11px]">
                      Contient les tables, index, RLS et configurations de stockage.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold text-xs transition shadow-xs cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Script SQL copié !' : 'Copier le script SQL (427 lignes)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSql}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Télécharger .sql</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Ouvrez votre console Supabase SQL Editor</p>
                    <p className="text-slate-500 mt-0.5 text-[11px]">
                      Collez le code dans l'éditeur et cliquez sur le bouton vert <strong>RUN</strong>.
                    </p>
                    <div className="mt-2">
                      <a
                        href={sqlEditorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir Supabase SQL Editor</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Vérifiez la connexion</p>
                    <p className="text-slate-500 mt-0.5 text-[11px]">
                      Dès que le script est exécuté, cliquez ci-dessous pour reconnecter instantanément l'application à votre base Postgres live.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerify}
                        disabled={verifying}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition shadow-xs cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                        <span>{verifying ? 'Vérification en cours...' : 'Tester et reconnecter'}</span>
                      </button>

                      {verifySuccess === true && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Connexion réussie ! Rechargement...
                        </span>
                      )}

                      {verifySuccess === false && (
                        <span className="text-red-600 text-xs font-medium">
                          Les tables ne sont pas encore détectées. Assurez-vous d’avoir cliqué sur « Run » dans Supabase.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Mode démo local actif — Aucune donnée n'est perdue
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
