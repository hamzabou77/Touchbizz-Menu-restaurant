// Full PostgreSQL migration script for TouchBizz Menu
export const FULL_SCHEMA_SQL = `-- ==============================================================================
-- TouchBizz Menu — PostgreSQL Database Schema with Row Level Security (RLS)
-- Supabase Migration Script
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    address TEXT,
    phone TEXT,
    logo_url TEXT,
    cover_url TEXT,
    primary_color TEXT DEFAULT '#0ea5e9' NOT NULL,
    theme TEXT DEFAULT 'minimal' NOT NULL,
    is_published BOOLEAN DEFAULT false NOT NULL,
    currency TEXT DEFAULT 'MAD' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants(owner_id);

-- 4. RESTAURANT LANGUAGES
CREATE TABLE IF NOT EXISTS public.restaurant_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL, -- 'fr', 'en', 'ar', 'es', 'pt', 'de', 'it'
    is_default BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(restaurant_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_rest_lang_rest_id ON public.restaurant_languages(restaurant_id);

-- 5. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_rest_id ON public.categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(restaurant_id, sort_order);

-- 6. CATEGORY TRANSLATIONS
CREATE TABLE IF NOT EXISTS public.category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(category_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_cat_trans_cat_id ON public.category_translations(category_id);

-- 7. MENU ITEMS (PRODUCTS) TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(10,2) CHECK (compare_at_price >= 0),
    image_url TEXT,
    is_visible BOOLEAN DEFAULT true NOT NULL,
    is_available BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_items_rest_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_cat_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON public.menu_items(category_id, sort_order);

-- 8. MENU ITEM TRANSLATIONS
CREATE TABLE IF NOT EXISTS public.menu_item_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(menu_item_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_item_trans_item_id ON public.menu_item_translations(menu_item_id);

-- 9. QR SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.qr_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
    foreground_color TEXT DEFAULT '#0f172a' NOT NULL,
    background_color TEXT DEFAULT '#ffffff' NOT NULL,
    style TEXT DEFAULT 'squares' NOT NULL,
    with_logo BOOLEAN DEFAULT true NOT NULL,
    frame_type TEXT DEFAULT 'badge' NOT NULL,
    frame_text TEXT DEFAULT 'Scannez le menu' NOT NULL,
    margin INTEGER DEFAULT 3 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. MENU SCAN IMPORTS TABLE
CREATE TABLE IF NOT EXISTS public.menu_scan_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    image_url TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- AUTOMATIC TIMESTAMP UPDATERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_restaurants_modtime ON public.restaurants;
CREATE TRIGGER update_restaurants_modtime BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_categories_modtime ON public.categories;
CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_menu_items_modtime ON public.menu_items;
CREATE TRIGGER update_menu_items_modtime BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_qr_settings_modtime ON public.qr_settings;
CREATE TRIGGER update_qr_settings_modtime BEFORE UPDATE ON public.qr_settings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- AUTOMATIC PROFILE CREATION ON USER SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_scan_imports ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Restaurants
DROP POLICY IF EXISTS "Public can view published restaurants" ON public.restaurants;
CREATE POLICY "Public can view published restaurants" ON public.restaurants FOR SELECT USING (is_published = true OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create their own restaurant" ON public.restaurants;
CREATE POLICY "Users can create their own restaurant" ON public.restaurants FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their restaurant" ON public.restaurants;
CREATE POLICY "Owners can update their restaurant" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their restaurant" ON public.restaurants;
CREATE POLICY "Owners can delete their restaurant" ON public.restaurants FOR DELETE USING (auth.uid() = owner_id);

-- 3. Restaurant Languages
DROP POLICY IF EXISTS "Languages readable if published or owner" ON public.restaurant_languages;
CREATE POLICY "Languages readable if published or owner" ON public.restaurant_languages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = restaurant_languages.restaurant_id
        AND (r.is_published = true OR r.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Owners can manage restaurant languages" ON public.restaurant_languages;
CREATE POLICY "Owners can manage restaurant languages" ON public.restaurant_languages FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = restaurant_languages.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

-- 4. Categories
DROP POLICY IF EXISTS "Categories readable if published or owner" ON public.categories;
CREATE POLICY "Categories readable if published or owner" ON public.categories FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = categories.restaurant_id
        AND (r.is_published = true OR r.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Owners can insert categories" ON public.categories;
CREATE POLICY "Owners can insert categories" ON public.categories FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = categories.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Owners can update categories" ON public.categories;
CREATE POLICY "Owners can update categories" ON public.categories FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = categories.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Owners can delete categories" ON public.categories;
CREATE POLICY "Owners can delete categories" ON public.categories FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = categories.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

-- 5. Category Translations
DROP POLICY IF EXISTS "Category translations readable if published or owner" ON public.category_translations;
CREATE POLICY "Category translations readable if published or owner" ON public.category_translations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.categories c
        JOIN public.restaurants r ON r.id = c.restaurant_id
        WHERE c.id = category_translations.category_id
        AND (r.is_published = true OR r.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Owners can manage category translations" ON public.category_translations;
CREATE POLICY "Owners can manage category translations" ON public.category_translations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.categories c
        JOIN public.restaurants r ON r.id = c.restaurant_id
        WHERE c.id = category_translations.category_id
        AND r.owner_id = auth.uid()
    )
);

-- 6. Menu Items
DROP POLICY IF EXISTS "Menu items readable if published or owner" ON public.menu_items;
CREATE POLICY "Menu items readable if published or owner" ON public.menu_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = menu_items.restaurant_id
        AND (r.is_published = true OR r.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Owners can insert menu items" ON public.menu_items;
CREATE POLICY "Owners can insert menu items" ON public.menu_items FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Owners can update menu items" ON public.menu_items;
CREATE POLICY "Owners can update menu items" ON public.menu_items FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Owners can delete menu items" ON public.menu_items;
CREATE POLICY "Owners can delete menu items" ON public.menu_items FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = menu_items.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

-- 7. Menu Item Translations
DROP POLICY IF EXISTS "Menu item translations readable if published or owner" ON public.menu_item_translations;
CREATE POLICY "Menu item translations readable if published or owner" ON public.menu_item_translations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.menu_items m
        JOIN public.restaurants r ON r.id = m.restaurant_id
        WHERE m.id = menu_item_translations.menu_item_id
        AND (r.is_published = true OR r.owner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Owners can manage menu item translations" ON public.menu_item_translations;
CREATE POLICY "Owners can manage menu item translations" ON public.menu_item_translations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.menu_items m
        JOIN public.restaurants r ON r.id = m.restaurant_id
        WHERE m.id = menu_item_translations.menu_item_id
        AND r.owner_id = auth.uid()
    )
);

-- 8. QR Settings
DROP POLICY IF EXISTS "Owners can manage QR settings" ON public.qr_settings;
CREATE POLICY "Owners can manage QR settings" ON public.qr_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = qr_settings.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

-- 9. Menu Scan Imports
DROP POLICY IF EXISTS "Owners can manage menu scan imports" ON public.menu_scan_imports;
CREATE POLICY "Owners can manage menu scan imports" ON public.menu_scan_imports FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = menu_scan_imports.restaurant_id
        AND r.owner_id = auth.uid()
    )
);

-- STORAGE BUCKETS & POLICIES SETUP
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('restaurant-assets', 'restaurant-assets', true),
    ('product-images', 'product-images', true),
    ('menu-scans', 'menu-scans', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read restaurant-assets" ON storage.objects;
CREATE POLICY "Public Read restaurant-assets"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('restaurant-assets', 'product-images'));

DROP POLICY IF EXISTS "Auth Users Upload Assets" ON storage.objects;
CREATE POLICY "Auth Users Upload Assets"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('restaurant-assets', 'product-images', 'menu-scans')
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Auth Users Update Assets" ON storage.objects;
CREATE POLICY "Auth Users Update Assets"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id IN ('restaurant-assets', 'product-images', 'menu-scans')
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Auth Users Delete Assets" ON storage.objects;
CREATE POLICY "Auth Users Delete Assets"
    ON storage.objects FOR DELETE
    USING (
        bucket_id IN ('restaurant-assets', 'product-images', 'menu-scans')
        AND auth.role() = 'authenticated'
    );
`;
