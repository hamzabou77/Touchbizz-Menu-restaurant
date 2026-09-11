import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  Radio,
  Copy,
  Check,
  Eye,
  Sparkles,
  Smartphone,
  Info,
  Layers,
  Palette
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const QrCodePage: React.FC = () => {
  const { restaurant } = useAuth();
  const [qrColor, setQrColor] = useState('#0f172a');
  const [qrBg, setQrBg] = useState('#ffffff');
  const [includeTitle, setIncludeTitle] = useState(true);
  const [customTitle, setCustomTitle] = useState('Scannez pour découvrir notre menu');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Full public URL for the QR code
  const currentHost = window.location.origin;
  const publicMenuUrl = restaurant?.slug
    ? `${currentHost}/r/${restaurant.slug}`
    : `${currentHost}/r/mon-etablissement`;

  useEffect(() => {
    generateQr();
  }, [publicMenuUrl, qrColor, qrBg]);

  const generateQr = async () => {
    try {
      const url = await QRCode.toDataURL(publicMenuUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: qrColor,
          light: qrBg,
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode_${restaurant?.slug || 'menu'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicMenuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintTableCard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Code QR & Programmation NFC
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Générez votre code QR pour vos tables et configurez vos étiquettes NFC sans contact.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Lien copié !' : 'Copier l’URL'}</span>
          </button>
          <a
            href={publicMenuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Tester l'accès</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Customization & Preview (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customization Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-600" />
              Personnalisation visuelle du QR code
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Couleur des pixels
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="w-10 h-10 p-0.5 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Couleur d'arrière-plan
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={qrBg}
                    onChange={(e) => setQrBg(e.target.value)}
                    className="w-10 h-10 p-0.5 rounded-xl border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={qrBg}
                    onChange={(e) => setQrBg(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Texte d'accompagnement (Chevalet / Affiche)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Scannez pour découvrir notre menu"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger en HD (PNG)</span>
              </button>

              <button
                onClick={handlePrintTableCard}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le chevalet de table</span>
              </button>
            </div>
          </div>

          {/* NFC Information Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-600" />
              Programmation des puces NFC (Chevalets / Stickers)
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pour permettre à vos clients d'accéder au menu d'un simple effleurement de smartphone, programmez vos pastilles NFC (NTAG213 ou NTAG215) avec l'URL permanente ci-dessous :
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-cyan-800 flex items-center justify-between break-all">
              <span>{publicMenuUrl}</span>
              <button
                onClick={handleCopyUrl}
                className="ml-2 p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 bg-cyan-50/70 border border-cyan-100 rounded-xl text-xs text-cyan-900 space-y-1">
              <span className="font-bold block">Guide de programmation en 30 secondes :</span>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-cyan-800">
                <li>Téléchargez l'application gratuite <span className="font-semibold">NFC Tools</span> (iOS ou Android).</li>
                <li>Sélectionnez <span className="font-semibold">Écrire &gt; Ajouter un enregistrement &gt; URL / URI</span>.</li>
                <li>Collez l'URL de votre menu ci-dessus et approchez la pastille de votre téléphone.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right Column: Printable Table Card Mockup (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Aperçu Chevalet de Table
              </h3>
              <span className="text-[10px] text-slate-400">Format prêt à poser</span>
            </div>

            {/* Simulated Table Card Printable Area */}
            <div
              id="printable-card"
              className="bg-gradient-to-b from-white to-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-center shadow-lg shadow-slate-200/50 flex flex-col items-center justify-between space-y-4"
            >
              {/* Restaurant Logo / Name */}
              <div>
                {restaurant?.logo_url ? (
                  <img
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    className="w-14 h-14 rounded-2xl object-cover mx-auto mb-2 border border-slate-100 shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-bold text-lg mx-auto mb-2">
                    {restaurant?.name?.charAt(0) || 'M'}
                  </div>
                )}
                <h4 className="font-bold text-base text-slate-900">
                  {restaurant?.name || 'Mon Établissement'}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {customTitle}
                </p>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Menu QR"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-xl" />
                )}
              </div>

              {/* NFC and Scan Prompt */}
              <div className="space-y-1.5 w-full">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 border border-cyan-200 rounded-full text-cyan-800 text-[10px] font-bold uppercase tracking-wider">
                  <Radio className="w-3 h-3" />
                  <span>Compatible QR Code & Sans Contact NFC</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Pointez votre appareil photo ou approchez votre téléphone
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
