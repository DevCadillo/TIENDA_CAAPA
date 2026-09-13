const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

<<<<<<< HEAD
async function uploadImage(file, folder = '') {
=======
async function uploadProductImage(file) {
>>>>>>> fb5b3b6ce7b41d4879e6287e9c2b3b53e4ddcf05
  if (!file) return null;
  const supabase = getSupabase();
  if (!supabase) throw new Error('Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para subir imágenes.');

  const bucket = process.env.SUPABASE_BUCKET || 'product-images';
  const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
<<<<<<< HEAD
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = folder ? `${folder.replace(/^\/+|\/+$/g, '')}/${filename}` : filename;
=======
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
>>>>>>> fb5b3b6ce7b41d4879e6287e9c2b3b53e4ddcf05

  const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

<<<<<<< HEAD
async function uploadProductImage(file) {
  return uploadImage(file, 'productos');
}

async function uploadPlaceImage(file) {
  return uploadImage(file, 'lugares-compra');
}

module.exports = { uploadProductImage, uploadPlaceImage };
=======
module.exports = { uploadProductImage };
>>>>>>> fb5b3b6ce7b41d4879e6287e9c2b3b53e4ddcf05
