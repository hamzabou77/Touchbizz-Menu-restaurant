import { supabase } from './supabase';

export type StorageBucket = 'restaurant-assets' | 'product-images' | 'menu-scans';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  url: string | null;
  error: string | null;
}

export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  pathPrefix: string
): Promise<UploadResult> {
  try {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        url: null,
        error: 'Format de fichier non pris en charge. Veuillez utiliser JPEG, PNG ou WebP.',
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        url: null,
        error: 'La taille du fichier dépasse la limite de 5 Mo.',
      };
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${pathPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        url: null,
        error: uploadError.message || 'Erreur lors du téléchargement de l’image.',
      };
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      url: publicData.publicUrl,
      error: null,
    };
  } catch (err: any) {
    console.error('Error in uploadImage:', err);
    return {
      url: null,
      error: err.message || 'Une erreur inattendue est survenue.',
    };
  }
}
