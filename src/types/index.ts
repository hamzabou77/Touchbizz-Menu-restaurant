import { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type RestaurantLanguage = Database['public']['Tables']['restaurant_languages']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryTranslation = Database['public']['Tables']['category_translations']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type MenuItemTranslation = Database['public']['Tables']['menu_item_translations']['Row'];
export type QrSettings = Database['public']['Tables']['qr_settings']['Row'];
export type MenuScanImport = Database['public']['Tables']['menu_scan_imports']['Row'];

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'fr', name: 'Français', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabe', nativeName: 'العربية', dir: 'rtl', flag: '🇲🇦' },
  { code: 'es', name: 'Espagnol', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'pt', name: 'Portugais', nativeName: 'Português', dir: 'ltr', flag: '🇵🇹' },
  { code: 'de', name: 'Allemand', nativeName: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'it', name: 'Italien', nativeName: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
];

export interface CategoryWithTranslations extends Category {
  translations?: Record<string, { name: string; description?: string }>;
  items?: MenuItemWithTranslations[];
}

export interface MenuItemWithTranslations extends MenuItem {
  translations?: Record<string, { name: string; description?: string }>;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  badge?: 'PRO' | 'GRATUIT';
  fontFamily: string;
  headingFont: string;
  cardRadius: string;
  cardBg: string;
  cardBorder: string;
  pageBg: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  headerStyle: 'hero-banner' | 'centered-minimal' | 'compact-card' | 'editorial';
  productCardStyle: 'horizontal-dense' | 'grid-card' | 'minimal-line' | 'photo-focus';
  bgClass?: string;
  isDark?: boolean;
  borderColor?: string;
  headerBg?: string;
  titleFont?: string;
  bodyFont?: string;
}

export type ThemeDefinition = ThemeConfig;

export interface ScannedItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
}

export interface ScannedCategory {
  id: string;
  name: string;
  items: ScannedItem[];
}

export interface MenuQualityScore {
  total: number;
  maxScore: number;
  percentage: number;
  checks: {
    hasDescription: boolean;
    hasLogo: boolean;
    hasCover: boolean;
    hasPhone: boolean;
    hasAddress: boolean;
    hasCategories: boolean;
    hasProducts: boolean;
    hasProductImages: boolean;
    hasMultipleLanguages: boolean;
  };
  recommendations: string[];
}
