const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function uploadImage(file, folder = '') {
  if (!file) return null;
  const supabase = getSupabase();
  if (!supabase) throw new Error('Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para subir imágenes.');

  const bucket = process.env.SUPABASE_BUCKET || 'product-images';
  const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = folder ? `${folder.replace(/^\/+|\/+$/g, '')}/${filename}` : filename;

  const { error } = await supabase.storage.from(bucket).upload(storagePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

// Conserva el comportamiento original de las imágenes de productos.
async function uploadProductImage(file) {
  return uploadImage(file);
}

// Las fotos nuevas de lugares se organizan aparte dentro del mismo bucket.
async function uploadPlaceImage(file) {
  return uploadImage(file, 'lugares-compra');
}

module.exports = { uploadProductImage, uploadPlaceImage };
