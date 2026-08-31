const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function uploadProductImage(file) {
  if (!file) return null;
  const supabase = getSupabase();
  if (!supabase) throw new Error('Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para subir imágenes.');

  const bucket = process.env.SUPABASE_BUCKET || 'product-images';
  const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

module.exports = { uploadProductImage };
