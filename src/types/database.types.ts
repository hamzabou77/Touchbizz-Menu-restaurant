export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      restaurants: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          address: string | null;
          phone: string | null;
          logo_url: string | null;
          cover_url: string | null;
          primary_color: string;
          theme: string;
          is_published: boolean;
          currency: string;
          default_language: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          address?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          primary_color?: string;
          theme?: string;
          is_published?: boolean;
          currency?: string;
          default_language?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          address?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          primary_color?: string;
          theme?: string;
          is_published?: boolean;
          currency?: string;
          default_language?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      restaurant_languages: {
        Row: {
          id: string;
          restaurant_id: string;
          language_code: string;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          language_code: string;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          language_code?: string;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      category_translations: {
        Row: {
          id: string;
          category_id: string;
          language_code: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          language_code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          language_code?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          image_url: string | null;
          is_visible: boolean;
          is_available: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          image_url?: string | null;
          is_visible?: boolean;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          image_url?: string | null;
          is_visible?: boolean;
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_item_translations: {
        Row: {
          id: string;
          menu_item_id: string;
          language_code: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          language_code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          language_code?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      qr_settings: {
        Row: {
          id: string;
          restaurant_id: string;
          foreground_color: string;
          background_color: string;
          style: string;
          with_logo: boolean;
          frame_type: string;
          frame_text: string;
          margin: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          foreground_color?: string;
          background_color?: string;
          style?: string;
          with_logo?: boolean;
          frame_type?: string;
          frame_text?: string;
          margin?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          foreground_color?: string;
          background_color?: string;
          style?: string;
          with_logo?: boolean;
          frame_type?: string;
          frame_text?: string;
          margin?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_scan_imports: {
        Row: {
          id: string;
          restaurant_id: string;
          image_url: string | null;
          status: string;
          raw_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          image_url?: string | null;
          status?: string;
          raw_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          image_url?: string | null;
          status?: string;
          raw_data?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}
