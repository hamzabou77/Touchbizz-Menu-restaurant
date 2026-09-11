import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, isSchemaMissingError, isValidUUID, generateUUID, isInvalidUUIDError } from '../lib/supabase';
import { localStore } from '../lib/localStore';
import { Profile, Restaurant } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  loading: boolean;
  isConfigured: boolean;
  isSchemaMissing: boolean;
  checkSchemaStatus: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, fullName: string, restaurantName: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshRestaurant: () => Promise<void>;
  createRestaurantForUser: (name: string) => Promise<{ restaurant: Restaurant | null; error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSchemaMissing, setIsSchemaMissing] = useState<boolean>(false);
  const isConfigured = isSupabaseConfigured();

  // Load current restaurant for authenticated user
  const fetchRestaurant = async (userId: string) => {
    if (!userId || !isValidUUID(userId)) {
      const localResto = localStore.getRestaurant(userId, user?.user_metadata?.restaurant_name);
      setRestaurant(localResto);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isSchemaMissingError(error) || isInvalidUUIDError(error)) {
          if (isSchemaMissingError(error)) {
            setIsSchemaMissing(true);
          }
          const localResto = localStore.getRestaurant(userId, user?.user_metadata?.restaurant_name);
          setRestaurant(localResto);
          return;
        }
        console.warn('Notice fetching restaurant:', error.message);
        const localResto = localStore.getRestaurant(userId, user?.user_metadata?.restaurant_name);
        setRestaurant(localResto);
        return;
      }

      if (data) {
        setRestaurant(data);
        localStore.updateRestaurant(data);
        setIsSchemaMissing(false);
      } else {
        // No restaurant exists yet in Supabase for this user: automatically create default restaurant
        const autoCreated = await createDefaultRestaurantInSupabase(userId);
        if (autoCreated) {
          setRestaurant(autoCreated);
          localStore.saveRestaurant(autoCreated);
          setIsSchemaMissing(false);
        } else {
          const localResto = localStore.getRestaurant(userId, user?.user_metadata?.restaurant_name);
          setRestaurant(localResto);
        }
      }
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        if (isSchemaMissingError(err)) {
          setIsSchemaMissing(true);
        }
        const localResto = localStore.getRestaurant(userId, user?.user_metadata?.restaurant_name);
        setRestaurant(localResto);
        return;
      }
      console.warn('Exception fetching restaurant:', err?.message || err);
      const localResto = localStore.getRestaurant(userId, user?.user_metadata?.restaurant_name);
      setRestaurant(localResto);
    }
  };

  // Seed starter menu categories and products into Supabase for a newly created restaurant
  const seedStarterMenuInSupabase = async (restaurantId: string) => {
    if (!isValidUUID(restaurantId)) return;
    try {
      const categoriesToInsert = [
        { name: 'Entrées & Tapas', description: 'Fraîcheur et mises en bouche savoureuses', sort_order: 0 },
        { name: 'Plats Signature', description: 'Nos créations du chef cuisinées minute', sort_order: 1 },
        { name: 'Desserts Maison', description: 'Douceurs sucrées artisanales', sort_order: 2 },
        { name: 'Boissons & Cocktails', description: 'Rafraîchissements, jus frais et créations', sort_order: 3 },
      ];

      for (let i = 0; i < categoriesToInsert.length; i++) {
        const catDef = categoriesToInsert[i];
        const { data: catData, error: catErr } = await (supabase
          .from('categories')
          .insert({
            restaurant_id: restaurantId,
            name: catDef.name,
            description: catDef.description,
            sort_order: catDef.sort_order,
            is_visible: true,
          } as any)
          .select()
          .single());

        if (catErr || !catData) continue;

        const categoryId = (catData as any).id;

        // Add sample item for each category
        let itemToInsert: any = null;
        if (i === 0) {
          itemToInsert = {
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: 'Burrata Crémeuse aux Tomates Confites',
            description: 'Burrata fraîche 150g, pesto de basilic maison, pignons de pin torréfiés et réduction balsamique.',
            price: 85,
            compare_at_price: 95,
            image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef2396e?w=600&auto=format&fit=crop&q=80',
            is_visible: true,
            is_available: true,
            sort_order: 0,
          };
        } else if (i === 1) {
          itemToInsert = {
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: 'Filet de Bœuf Grillé & Purée Truffée',
            description: 'Cœur de filet de bœuf 200g, jus réduit au romarin, purée maison à la truffe noire.',
            price: 160,
            compare_at_price: null,
            image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
            is_visible: true,
            is_available: true,
            sort_order: 0,
          };
        } else if (i === 2) {
          itemToInsert = {
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: 'Tiramisu Traditionnel au Café',
            description: 'Mascarpone aéré, biscuits cuillère imbibés d’espresso d’Éthiopie et cacao amer.',
            price: 55,
            compare_at_price: null,
            image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
            is_visible: true,
            is_available: true,
            sort_order: 0,
          };
        } else if (i === 3) {
          itemToInsert = {
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: 'Mojito Passion & Menthe Fraîche',
            description: 'Purée de fruit de la passion fraîche, menthe pilée, citron vert bio et eau pétillante.',
            price: 45,
            compare_at_price: null,
            image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
            is_visible: true,
            is_available: true,
            sort_order: 0,
          };
        }

        if (itemToInsert) {
          await (supabase.from('menu_items').insert(itemToInsert as any));
        }
      }
    } catch (seedErr) {
      console.warn('Notice seeding starter items into Supabase:', seedErr);
    }
  };

  // Automatically creates a default restaurant record in Supabase
  const createDefaultRestaurantInSupabase = async (userId: string): Promise<Restaurant | null> => {
    if (!isValidUUID(userId)) return null;

    try {
      // 1. Ensure profile exists in Supabase to satisfy foreign key (owner_id -> profiles.id)
      try {
        await (supabase.from('profiles').upsert({
          id: userId,
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || 'Chef Propriétaire',
          updated_at: new Date().toISOString()
        } as any, { onConflict: 'id' }));
      } catch (profErr) {
        console.warn('Profile sync notice during auto-creation:', profErr);
      }

      // 2. Generate clean name and unique slug
      const defaultName = user?.user_metadata?.restaurant_name?.trim() || 'Le Bistrot Gourmand';
      const cleanSlugBase = defaultName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'bistrot';

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const uniqueSlug = `${cleanSlugBase}-${randomSuffix}`;

      // 3. Insert default restaurant into Supabase
      const { data: newResto, error: insertError } = await (supabase
        .from('restaurants')
        .insert({
          owner_id: userId,
          name: defaultName,
          slug: uniqueSlug,
          description: 'Cuisine raffinée & saveurs fraîches préparées avec passion.',
          address: '12 Boulevard d’Anfa, Casablanca',
          phone: '+212 6 61 23 45 67',
          logo_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80',
          cover_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
          primary_color: '#0ea5e9',
          theme: 'minimal',
          is_published: true,
          currency: 'MAD',
          default_language: 'fr',
        } as any)
        .select()
        .single());

      if (insertError || !newResto) {
        if (isSchemaMissingError(insertError)) {
          setIsSchemaMissing(true);
        }
        console.warn('Auto-create restaurant in Supabase notice:', insertError?.message);
        return null;
      }

      const createdRestaurant = newResto as Restaurant;

      // 4. Seed languages in Supabase
      try {
        await (supabase.from('restaurant_languages').insert([
          { restaurant_id: createdRestaurant.id, language_code: 'fr', is_default: true, is_active: true },
          { restaurant_id: createdRestaurant.id, language_code: 'en', is_default: false, is_active: true },
          { restaurant_id: createdRestaurant.id, language_code: 'ar', is_default: false, is_active: true },
        ] as any));
      } catch (lErr) {
        console.warn('Languages seed notice:', lErr);
      }

      // 5. Seed QR settings in Supabase
      try {
        await (supabase.from('qr_settings').insert({
          restaurant_id: createdRestaurant.id,
          foreground_color: '#0f172a',
          background_color: '#ffffff',
          style: 'squares',
          with_logo: true,
          frame_type: 'badge',
          frame_text: 'Scannez le menu',
          margin: 3,
        } as any));
      } catch (qErr) {
        console.warn('QR settings seed notice:', qErr);
      }

      // 6. Seed starter categories and items into Supabase
      await seedStarterMenuInSupabase(createdRestaurant.id);

      return createdRestaurant;
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        setIsSchemaMissing(true);
      }
      console.warn('Auto-create restaurant exception:', err?.message || err);
      return null;
    }
  };


  // Load user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (isSchemaMissingError(error)) {
          setIsSchemaMissing(true);
          const localProf = localStore.getProfile(userId, user?.email, user?.user_metadata?.full_name);
          setProfile(localProf);
          return;
        }
        console.warn('Notice fetching profile:', error.message);
        const localProf = localStore.getProfile(userId, user?.email, user?.user_metadata?.full_name);
        setProfile(localProf);
        return;
      }

      if (data) {
        setProfile(data);
        localStore.setProfile(data);
        setIsSchemaMissing(false);
      } else {
        const localProf = localStore.getProfile(userId, user?.email, user?.user_metadata?.full_name);
        setProfile(localProf);
      }
    } catch (err: any) {
      if (isSchemaMissingError(err)) {
        setIsSchemaMissing(true);
        const localProf = localStore.getProfile(userId, user?.email, user?.user_metadata?.full_name);
        setProfile(localProf);
        return;
      }
      console.warn('Exception fetching profile:', err?.message || err);
      const localProf = localStore.getProfile(userId, user?.email, user?.user_metadata?.full_name);
      setProfile(localProf);
    }
  };

  const checkSchemaStatus = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('restaurants').select('id').limit(1);
      if (error && isSchemaMissingError(error)) {
        setIsSchemaMissing(true);
        return false;
      }
      setIsSchemaMissing(false);
      if (user) {
        await fetchProfile(user.id);
        await fetchRestaurant(user.id);
      }
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRestaurant(session.user.id);
      }
      setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
        await fetchRestaurant(session.user.id);
      } else {
        setProfile(null);
        setRestaurant(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const refreshRestaurant = async () => {
    if (user) {
      await fetchRestaurant(user.id);
    }
  };

  const createRestaurantForUser = async (name: string): Promise<{ restaurant: Restaurant | null; error: string | null }> => {
    if (!user) {
      return { restaurant: null, error: 'Utilisateur non connecté.' };
    }

    if (isSchemaMissing || !isValidUUID(user.id)) {
      const localResto = localStore.getRestaurant(user.id, name);
      localResto.name = name.trim();
      const updated = localStore.updateRestaurant(localResto);
      setRestaurant(updated);
      return { restaurant: updated, error: null };
    }

    const cleanSlug = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const finalSlug = cleanSlug || `resto-${Date.now().toString().slice(-4)}`;

    try {
      // 1. Ensure profile exists in Supabase to satisfy foreign key (owner_id -> profiles.id)
      try {
        await (supabase.from('profiles').upsert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || 'Chef Propriétaire',
          updated_at: new Date().toISOString()
        } as any, { onConflict: 'id' }));
      } catch (profErr) {
        console.warn('Profile ensure notice during restaurant creation:', profErr);
      }

      // 2. Check for slug collision
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      const uniqueSlug = existing ? `${finalSlug}-${Math.floor(Math.random() * 899 + 100)}` : finalSlug;

      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          slug: uniqueSlug,
          primary_color: '#0ea5e9',
          theme: 'minimal',
          is_published: false,
          currency: 'MAD'
        } as any)
        .select()
        .single();

      if (error) {
        if (isSchemaMissingError(error) || isInvalidUUIDError(error)) {
          if (isSchemaMissingError(error)) {
            setIsSchemaMissing(true);
          }
          const localResto = localStore.getRestaurant(user.id, name);
          setRestaurant(localResto);
          return { restaurant: localResto, error: null };
        }
        return { restaurant: null, error: error.message };
      }

      // Seed default language
      try {
        await (supabase.from('restaurant_languages').insert({
          restaurant_id: (data as any).id,
          language_code: 'fr',
          is_default: true,
          is_active: true,
        } as any));
      } catch {
        // ignore
      }

      // Seed QR settings
      try {
        await (supabase.from('qr_settings').insert({
          restaurant_id: (data as any).id,
          foreground_color: '#0f172a',
          background_color: '#ffffff',
          style: 'squares',
          with_logo: true,
          frame_type: 'badge',
          frame_text: 'Scannez le menu',
          margin: 3
        } as any));
      } catch {
        // ignore
      }

      // Seed starter categories and items
      await seedStarterMenuInSupabase((data as any).id);

      const createdRestaurant = data as any as Restaurant;
      localStore.saveRestaurant(createdRestaurant);
      setRestaurant(createdRestaurant);
      return { restaurant: createdRestaurant, error: null };
    } catch (err: any) {
      if (isSchemaMissingError(err) || isInvalidUUIDError(err)) {
        if (isSchemaMissingError(err)) {
          setIsSchemaMissing(true);
        }
        const localResto = localStore.getRestaurant(user.id, name);
        setRestaurant(localResto);
        return { restaurant: localResto, error: null };
      }
      return { restaurant: null, error: err.message || 'Erreur lors de la création de l’établissement.' };
    }
  };

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isConfigured) {
      return { error: 'Supabase n’est pas encore configuré avec vos identifiants réels.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message };
      }

      if (data.user) {
        await fetchProfile(data.user.id);
        await fetchRestaurant(data.user.id);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Erreur lors de la connexion.' };
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    restaurantName: string
  ): Promise<{ error: string | null }> => {
    if (!isConfigured) {
      return { error: 'Supabase n’est pas encore configuré. Veuillez renseigner votre URL et clé Anon.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            restaurant_name: restaurantName.trim(),
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Ensure profile exists
        try {
          await (supabase.from('profiles').upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
          } as any));
        } catch {
          // fallback to local
          localStore.getProfile(data.user.id, email, fullName);
        }

        // Create restaurant
        const { error: restoError } = await createRestaurantForUser(restaurantName);
        if (restoError) {
          console.warn('Restaurant creation notice:', restoError);
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Erreur lors de l’inscription.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setRestaurant(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      restaurant,
      loading,
      isConfigured,
      isSchemaMissing,
      checkSchemaStatus,
      login,
      register,
      logout,
      refreshRestaurant,
      createRestaurantForUser,
    }),
    [user, session, profile, restaurant, loading, isConfigured, isSchemaMissing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
