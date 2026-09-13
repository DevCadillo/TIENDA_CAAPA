const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const pool = require('../db');
const { uploadPlaceImage } = require('../services/storage');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

function apiAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  next();
}
function apiAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });
  next();
}
function numberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.post('/api/mobile/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email=$1 LIMIT 1', [email]);
    const user = rows[0];
    if (!user || !user.activo || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    req.session.user = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
});

router.get('/api/mobile/me', apiAuth, (req, res) => res.json({ user: req.session.user }));
router.post('/api/mobile/logout', apiAuth, (req, res) => req.session.destroy(() => res.json({ ok: true })));

router.get('/api/mobile/productos', apiAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { rows } = await pool.query(`
    SELECT p.id,p.numero,p.nombre,p.imagen_url,p.cantidad,p.stock_minimo,p.precio_mayor,p.precio_unitario,p.disponible,
           c.nombre categoria
    FROM productos p LEFT JOIN categorias c ON c.id=p.categoria_id
    WHERE ($1='' OR LOWER(p.nombre) LIKE LOWER('%'||$1||'%') OR LOWER(COALESCE(p.numero,'')) LIKE LOWER('%'||$1||'%'))
    ORDER BY p.nombre LIMIT 100
  `,[q]);
  res.json(rows);
});

router.get('/api/mobile/productos/buscar', apiAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  const { rows } = await pool.query(`
    SELECT id,numero,nombre,imagen_url FROM productos
    WHERE LOWER(nombre) LIKE LOWER('%'||$1||'%') OR LOWER(COALESCE(numero,'')) LIKE LOWER('%'||$1||'%')
    ORDER BY nombre LIMIT 20
  `,[q]);
  res.json(rows);
});

router.get('/api/mobile/proveedores', apiAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const lugar = ['Ceja','Ingavi'].includes(req.query.lugar) ? req.query.lugar : '';
  const { rows } = await pool.query(`
    SELECT pp.*,p.nombre producto,p.numero,p.imagen_url producto_imagen,c.nombre categoria,
           MIN(pp.precio_compra) OVER (PARTITION BY pp.producto_id) precio_minimo
    FROM proveedores_producto pp
    JOIN productos p ON p.id=pp.producto_id
    LEFT JOIN categorias c ON c.id=p.categoria_id
    WHERE ($1='' OR LOWER(p.nombre) LIKE LOWER('%'||$1||'%') OR LOWER(COALESCE(p.numero,'')) LIKE LOWER('%'||$1||'%') OR LOWER(COALESCE(pp.resena,'')) LIKE LOWER('%'||$1||'%'))
      AND ($2='' OR pp.lugar=$2)
    ORDER BY p.nombre,pp.lugar
  `,[q,lugar]);
  res.json(rows);
});

router.post('/api/mobile/proveedores', apiAdmin, upload.single('foto_lugar'), async (req, res) => {
  try {
    const productoId = Number.parseInt(req.body.producto_id,10);
    if (!Number.isInteger(productoId)) return res.status(400).json({ error:'Producto inválido' });
    if (!['Ceja','Ingavi'].includes(req.body.lugar)) return res.status(400).json({ error:'Lugar inválido' });
    const latitud = numberOrNull(req.body.latitud), longitud = numberOrNull(req.body.longitud);
    if ((latitud===null)!==(longitud===null)) return res.status(400).json({ error:'Ubicación incompleta' });
    const fotoUrl = await uploadPlaceImage(req.file);
    const { rows } = await pool.query(`
      INSERT INTO proveedores_producto(producto_id,lugar,precio_compra,resena,detalle_lugar,latitud,longitud,foto_lugar_url,usuario_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `,[productoId,req.body.lugar,Number(req.body.precio_compra||0),req.body.resena?.trim()||null,req.body.detalle_lugar?.trim()||null,latitud,longitud,fotoUrl,req.session.user.id]);
    res.status(201).json(rows[0]);
  } catch(e) {
    console.error(e);
    res.status(e.code==='23505'?409:500).json({ error:e.code==='23505'?'Ese producto ya tiene registro para ese lugar.':e.message });
  }
});

router.put('/api/mobile/proveedores/:id', apiAdmin, upload.single('foto_lugar'), async (req, res) => {
  try {
    const oldR = await pool.query('SELECT * FROM proveedores_producto WHERE id=$1',[req.params.id]);
    const old = oldR.rows[0];
    if (!old) return res.status(404).json({ error:'Registro no encontrado' });
    const productoId = Number.parseInt(req.body.producto_id,10);
    if (!Number.isInteger(productoId)) return res.status(400).json({ error:'Producto inválido' });
    if (!['Ceja','Ingavi'].includes(req.body.lugar)) return res.status(400).json({ error:'Lugar inválido' });
    const latitud = numberOrNull(req.body.latitud), longitud = numberOrNull(req.body.longitud);
    if ((latitud===null)!==(longitud===null)) return res.status(400).json({ error:'Ubicación incompleta' });
    let fotoUrl = old.foto_lugar_url;
    if (req.file) fotoUrl = await uploadPlaceImage(req.file);
    const { rows } = await pool.query(`
      UPDATE proveedores_producto SET producto_id=$1,lugar=$2,precio_compra=$3,resena=$4,detalle_lugar=$5,
      latitud=$6,longitud=$7,foto_lugar_url=$8,usuario_id=$9,actualizado_en=NOW() WHERE id=$10 RETURNING *
    `,[productoId,req.body.lugar,Number(req.body.precio_compra||0),req.body.resena?.trim()||null,req.body.detalle_lugar?.trim()||null,latitud,longitud,fotoUrl,req.session.user.id,req.params.id]);
    res.json(rows[0]);
  } catch(e) {
    console.error(e);
    res.status(e.code==='23505'?409:500).json({ error:e.code==='23505'?'Ese producto ya tiene registro para ese lugar.':e.message });
  }
});

router.delete('/api/mobile/proveedores/:id', apiAdmin, async (req,res)=>{
  await pool.query('DELETE FROM proveedores_producto WHERE id=$1',[req.params.id]);
  res.json({ok:true});
});

module.exports = router;
