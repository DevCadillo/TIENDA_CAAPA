const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

async function uploadImage(file, folder = '') {
  if (!file) return null;

  const supabase = getSupabase();

  if (!supabase) {
    throw new Error(
      'Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para subir imágenes.'
    );
  }

  const bucket = process.env.SUPABASE_BUCKET || 'product-images';

  const ext = (
    file.originalname.split('.').pop() || 'jpg'
  ).toLowerCase();

  const filename =
    `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const cleanFolder = folder
    ? folder.replace(/^\/+|\/+$/g, '')
    : '';

  const filePath = cleanFolder
    ? `${cleanFolder}/${filename}`
    : filename;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

async function uploadProductImage(file) {
  return uploadImage(file, 'productos');
}

async function uploadPlaceImage(file) {
  return uploadImage(file, 'lugares-compra');
}

module.exports = {
  uploadProductImage,
  uploadPlaceImage
};