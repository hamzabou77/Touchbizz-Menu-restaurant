import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  FolderTree,
  UtensilsCrossed,
  ScanLine,
  Palette,
  QrCode,
  Settings,
  LogOut,
  ExternalLink,
  Menu as MenuIcon,
  X,
  Globe,
  ShoppingBag,
  CalendarDays,
  BarChart3,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConfigMissingBanner } from '../common/ConfigMissingBanner';
import { SchemaSetupBanner } from '../common/SchemaSetupBanner';
import { supabase, isSchemaMissingError } from '../../lib/supabase';
import { localStore } from '../../lib/localStore';

export const DashboardLayout: React.FC = () => {
  const { user, restaurant, logout, refreshRestaurant, isSchemaMissing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleTogglePublish = async () => {
    if (!restaurant) return;
    setIsPublishing(true);
    try {
      const newStatus = !restaurant.is_published;
      if (isSchemaMissing) {
        localStore.updateRestaurant({ ...restaurant, is_published: newStatus });
        await refreshRestaurant();
        return;
      }

      const { error } = await (supabase
        .from('restaurants')
        .update({ is_published: newStatus } as any)
        .eq('id', restaurant.id));

      if (error) {
        if (isSchemaMissingError(error)) {
          localStore.updateRestaurant({ ...restaurant, is_published: newStatus });
          await refreshRestaurant();
        } else {
          alert(`Erreur lors de la publication : ${error.message}`);
        }
      } else {
        await refreshRestaurant();
      }
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        localStore.updateRestaurant({ ...restaurant, is_published: !restaurant.is_published });
        await refreshRestaurant();
      } else {
        alert(`Erreur inattendue : ${err.message}`);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const publicUrl = restaurant ? `/r/${restaurant.slug}` : '#';

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 w-64 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-cyan-500/20 font-bold text-lg">
            TB
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight tracking-tight text-base">TouchBizz</h1>
            <p className="text-[11px] font-medium text-cyan-600 tracking-wide uppercase">Menu Digital</p>
          </div>
        </div>
        {mobileMenuOpen && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {/* Section 1: Dashboard */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tableau de bord
          </div>
          <NavLink
            to="/dashboard"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={navItemClass}
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-600" />
            <span>Vue d'ensemble</span>
          </NavLink>
        </div>

        {/* Section 2: Mon Menu */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Mon Menu
          </div>
          <div className="space-y-1">
            <NavLink
              to="/dashboard/establishment"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass}
            >
              <Store className="w-4 h-4 text-slate-500" />
              <span>Mon établissement</span>
            </NavLink>
            <NavLink
              to="/dashboard/categories"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass}
            >
              <FolderTree className="w-4 h-4 text-slate-500" />
              <span>Catégories</span>
            </NavLink>
            <NavLink
              to="/dashboard/products"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass}
            >
              <UtensilsCrossed className="w-4 h-4 text-slate-500" />
              <span>Produits</span>
            </NavLink>
            <NavLink
              to="/dashboard/scanner"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass}
            >
              <div className="relative">
                <ScanLine className="w-4 h-4 text-slate-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full animate-ping" />
              </div>
              <span className="flex-1">Scanner le menu</span>
              <span className="text-[10px] font-semibold bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">AI</span>
            </NavLink>
            <NavLink
              to="/dashboard/themes"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass}
            >
              <Palette className="w-4 h-4 text-slate-500" />
              <span>Modèle</span>
            </NavLink>
          </div>
        </div>

        {/* Section 3: Partager */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Partager
          </div>
          <div className="space-y-1">
            <NavLink
              to="/dashboard/qr-code"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass}
            >
              <QrCode className="w-4 h-4 text-slate-500" />
              <span>QR Code & NFC</span>
            </NavLink>
          </div>
        </div>

        {/* Section 4: Modules futurs (Inactifs en V1) */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Extensions (Bientôt)
          </div>
          <div className="space-y-1 opacity-55">
            <div className="flex items-center justify-between px-3.5 py-2 text-xs text-slate-500 rounded-xl cursor-not-allowed">
              <span className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" /> Commandes
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 bg-slate-200 text-slate-600 rounded">V2</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2 text-xs text-slate-500 rounded-xl cursor-not-allowed">
              <span className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4" /> Réservations
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 bg-slate-200 text-slate-600 rounded">V2</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2 text-xs text-slate-500 rounded-xl cursor-not-allowed">
              <span className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4" /> Analytics
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 bg-slate-200 text-slate-600 rounded">V2</span>
            </div>
          </div>
        </div>

        {/* Section 5: Compte */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Compte
          </div>
          <NavLink
            to="/dashboard/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={navItemClass}
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Paramètres</span>
          </NavLink>
        </div>
      </div>

      {/* Footer User Profile */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.email?.slice(0, 2).toUpperCase() || 'TB'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {restaurant?.name || 'Mon Restaurant'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            id="btn-logout-sidebar"
            onClick={handleLogout}
            title="Se déconnecter"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Warning Banner if Supabase is not connected */}
      <ConfigMissingBanner />

      {/* Schema Migration / PGRST205 setup notification banner */}
      <SchemaSetupBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block shrink-0">
          {sidebarContent}
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-64 shadow-2xl h-full">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Navbar */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                id="btn-mobile-menu"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  {new Date().getHours() < 17 ? 'Bonjour' : 'Bon après-midi'}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                  {restaurant?.name || 'Mon Établissement'}
                </h2>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Online Preview Button */}
              {restaurant?.slug && (
                <a
                  id="btn-preview-online-header"
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="hidden sm:inline">Aperçu en ligne</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}

              {/* Publish Toggle Button */}
              {restaurant && (
                <button
                  id="btn-toggle-publish-header"
                  onClick={handleTogglePublish}
                  disabled={isPublishing}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer ${
                    restaurant.is_published
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm shadow-cyan-600/20'
                  }`}
                >
                  {restaurant.is_published ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Menu publié</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Publier le menu</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </header>

          {/* Subview Content */}
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
