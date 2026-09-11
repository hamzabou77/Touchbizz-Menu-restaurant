import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileImage,
  ArrowRight,
  Pencil,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  FolderTree
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { menuScannerService } from '../../lib/menuScannerService';
import { ScannedCategory, ScannedItem } from '../../types';

export const MenuScannerPage: React.FC = () => {
  const { restaurant } = useAuth();
  const navigate = useNavigate();

  // Workflow steps: 1 = Import, 2 = Vérification, 3 = Sauvegarde / Terminé
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // File & scanning state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Extracted data for verification
  const [categories, setCategories] = useState<ScannedCategory[]>([]);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<{ categoriesCount: number; productsCount: number } | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
      setScanError('Format non pris en charge. Veuillez fournir un fichier JPEG, PNG ou WebP.');
      return;
    }
    setFile(selectedFile);
    setFilePreview(URL.createObjectURL(selectedFile));
    setScanError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartScan = async () => {
    if (!file) return;
    setScanning(true);
    setScanError(null);

    const result = await menuScannerService.extractMenuFromImage(file);
    if (!result.success || result.categories.length === 0) {
      setScanError(result.error || 'Impossible d’extraire les éléments du menu. Veuillez réessayer.');
      setScanning(false);
    } else {
      setCategories(result.categories);
      setScanning(false);
      setStep(2); // Move to Verification step
    }
  };

  // Editing helpers during Verification step
  const handleCategoryNameChange = (catId: string, newName: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name: newName } : c))
    );
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  const handleItemChange = (
    catId: string,
    itemId: string,
    field: keyof ScannedItem,
    value: any
  ) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              [field]: field === 'price' ? Math.max(0, parseFloat(value) || 0) : value,
            };
          }),
        };
      })
    );
  };

  const handleDeleteItem = (catId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          items: cat.items.filter((item) => item.id !== itemId),
        };
      })
    );
  };

  const handleAddItemToCategory = (catId: string) => {
    const newItem: ScannedItem = {
      id: `item_manual_${Date.now()}`,
      name: 'Nouveau plat',
      description: '',
      price: 0,
      category: '',
    };
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, items: [...c.items, newItem] } : c))
    );
  };

  const handleAddCategory = () => {
    const newCat: ScannedCategory = {
      id: `cat_manual_${Date.now()}`,
      name: 'Nouvelle catégorie',
      items: [],
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const handleSaveConfirmedData = async () => {
    if (!restaurant) return;
    setSaving(true);
    try {
      const stats = await menuScannerService.saveScannedMenuToDatabase(
        restaurant.id,
        categories
      );
      setSaveSuccess(stats);
      setStep(3); // Step 3: Done
    } catch (err: any) {
      alert(`Erreur lors de l'enregistrement dans la base de données : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setFilePreview(null);
    setCategories([]);
    setStep(1);
    setSaveSuccess(null);
  };

  const totalItemsCount = categories.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-cyan-600" />
            Scanner le menu depuis une photo
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Numérisez votre carte papier en quelques secondes grâce à l'intelligence artificielle.
          </p>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`px-3 py-1.5 rounded-xl transition ${
              step === 1
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            1. Import
          </span>
          <span
            className={`px-3 py-1.5 rounded-xl transition ${
              step === 2
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            2. Vérification
          </span>
          <span
            className={`px-3 py-1.5 rounded-xl transition ${
              step === 3
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            3. Sauvegarde
          </span>
        </div>
      </div>

      {/* STEP 1: IMPORT */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900">Étape 1 : Choisissez votre photo de carte</h3>
            <p className="text-xs text-slate-500 mt-1">
              Prenez en photo une page de votre menu ou importez un visuel existant (JPEG, PNG, WebP).
            </p>
          </div>

          {/* Upload Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${
              filePreview
                ? 'border-cyan-500 bg-cyan-50/20'
                : 'border-slate-300 hover:border-cyan-500 bg-slate-50/50'
            }`}
          >
            {filePreview ? (
              <div className="space-y-4">
                <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <img
                    src={filePreview}
                    alt="Aperçu du menu"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {file?.name} ({(file?.size ? file.size / 1024 : 0).toFixed(0)} Ko)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFilePreview(null);
                  }}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Changer de photo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer">
                    Cliquez pour parcourir vos fichiers
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500 block mt-1">
                    ou glissez-déposez l'image directement ici
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Formats acceptés : JPEG, PNG, WebP (Max 5 Mo)
                </p>
              </div>
            )}
          </div>

          {scanError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          <div className="flex items-center justify-center">
            <button
              onClick={handleStartScan}
              disabled={!file || scanning}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition shadow-sm shadow-cyan-600/20 cursor-pointer"
            >
              {scanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyse intelligente de la photo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extraire le menu avec l'IA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: VÉRIFICATION */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-cyan-50 border border-cyan-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-cyan-900 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-cyan-600 shrink-0" />
              <div>
                <span className="font-bold">Extraction terminée :</span> {categories.length} catégories et {totalItemsCount} produits détectés. Vérifiez et ajustez les prix ou descriptions avant d'enregistrer dans votre carte.
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={resetAll}
                className="px-3 py-1.5 bg-white border border-cyan-200 rounded-xl text-cyan-800 hover:bg-cyan-100 font-medium transition"
              >
                Recommencer
              </button>
              <button
                onClick={handleAddCategory}
                className="px-3 py-1.5 bg-cyan-700 text-white rounded-xl hover:bg-cyan-800 font-medium transition"
              >
                + Ajouter catégorie
              </button>
            </div>
          </div>

          {/* Categories & Products Verification Cards */}
          <div className="space-y-5">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4"
              >
                {/* Category Header Bar */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <FolderTree className="w-4 h-4 text-cyan-600 shrink-0" />
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)}
                      placeholder="Nom de la catégorie"
                      className="font-bold text-slate-900 text-sm px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddItemToCategory(cat.id)}
                      className="text-xs text-cyan-600 hover:text-cyan-700 font-medium px-2 py-1 bg-cyan-50 rounded-lg"
                    >
                      + Ajouter un plat
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      title="Supprimer la catégorie"
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items in this category */}
                {cat.items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Aucun plat dans cette catégorie.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cat.items.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleItemChange(cat.id, item.id, 'name', e.target.value)
                            }
                            placeholder="Nom du plat"
                            className="text-xs font-semibold text-slate-800 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                          />
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) =>
                              handleItemChange(cat.id, item.id, 'description', e.target.value)
                            }
                            placeholder="Description / Ingrédients"
                            className="text-xs text-slate-600 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={item.price}
                              onChange={(e) =>
                                handleItemChange(cat.id, item.id, 'price', e.target.value)
                              }
                              placeholder="Prix"
                              className="text-xs font-bold text-slate-800 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white w-24"
                            />
                            <span className="text-xs text-slate-500">
                              {restaurant?.currency || 'MAD'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteItem(cat.id, item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg self-end sm:self-center transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-900">{categories.length} catégories</span> et{' '}
              <span className="font-bold text-slate-900">{totalItemsCount} produits</span> prêts à être importés dans Supabase.
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetAll}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveConfirmedData}
                disabled={saving || categories.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sauvegarde en cours...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Valider et importer le menu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SAUVEGARDE RÉUSSIE */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-10 border border-slate-200/80 shadow-xs max-w-lg mx-auto text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Menu importé avec succès !</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {saveSuccess?.categoriesCount} catégories et {saveSuccess?.productsCount} produits ont été enregistrés avec succès dans votre base de données.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/dashboard/products')}
              className="w-full sm:w-auto px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              Consulter les produits
            </button>
            <button
              onClick={resetAll}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Scanner une autre page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
