const express = require('express');
const multer = require('multer');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadPlaceImage } = require('../services/storage');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

function numberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.get('/proveedores', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const lugar = ['Ceja', 'Ingavi'].includes(req.query.lugar) ? req.query.lugar : '';
  const orden = ['precio_asc', 'precio_desc', 'producto'].includes(req.query.orden) ? req.query.orden : 'producto';
  const orderSql = orden === 'precio_asc'
    ? 'pp.precio_compra ASC, p.nombre ASC'
    : orden === 'precio_desc'
      ? 'pp.precio_compra DESC, p.nombre ASC'
      : 'p.nombre ASC, pp.lugar ASC';

  const { rows } = await pool.query(`
    SELECT pp.*, p.nombre producto, p.numero, p.imagen_url producto_imagen,
           c.nombre categoria, u.nombre actualizado_por,
           MIN(pp.precio_compra) OVER (PARTITION BY pp.producto_id) AS precio_minimo
    FROM proveedores_producto pp
    JOIN productos p ON p.id = pp.producto_id
    LEFT JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN usuarios u ON u.id = pp.usuario_id
    WHERE ($1 = '' OR LOWER(p.nombre) LIKE LOWER('%' || $1 || '%')
                     OR LOWER(COALESCE(p.numero,'')) LIKE LOWER('%' || $1 || '%')
                     OR LOWER(COALESCE(pp.resena,'')) LIKE LOWER('%' || $1 || '%')
                     OR LOWER(COALESCE(pp.detalle_lugar,'')) LIKE LOWER('%' || $1 || '%'))
      AND ($2 = '' OR pp.lugar = $2)
    ORDER BY ${orderSql}
  `, [q, lugar]);

  res.render('providers/index', { title: 'Proveedores', providers: rows, q, lugar, orden });
});

// Búsqueda rápida para seleccionar un producto desde el CRUD sin duplicar sus datos.
router.get('/api/productos/buscar', requireAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 1) return res.json([]);
  const { rows } = await pool.query(`
    SELECT id, numero, nombre, imagen_url
    FROM productos
    WHERE LOWER(nombre) LIKE LOWER('%' || $1 || '%')
       OR LOWER(COALESCE(numero,'')) LIKE LOWER('%' || $1 || '%')
    ORDER BY nombre
    LIMIT 15
  `, [q]);
  res.json(rows);
});

router.get('/proveedores/nuevo', requireAdmin, async (req, res) => {
  let selectedProduct = null;
  if (req.query.producto_id) {
    const r = await pool.query('SELECT id, numero, nombre, imagen_url FROM productos WHERE id=$1', [req.query.producto_id]);
    selectedProduct = r.rows[0] || null;
  }
  res.render('providers/form', {
    title: 'Nuevo proveedor', provider: null, selectedProduct, error: null
  });
});

router.post('/proveedores', requireAdmin, upload.single('foto_lugar'), async (req, res) => {
  try {
    const productoId = Number.parseInt(req.body.producto_id, 10);
    if (!Number.isInteger(productoId)) throw new Error('Selecciona un producto válido desde el buscador.');
    if (!['Ceja', 'Ingavi'].includes(req.body.lugar)) throw new Error('Selecciona Ceja o Ingavi.');

    const productR = await pool.query('SELECT id FROM productos WHERE id=$1', [productoId]);
    if (!productR.rows[0]) throw new Error('El producto seleccionado ya no existe.');

    const latitud = numberOrNull(req.body.latitud);
    const longitud = numberOrNull(req.body.longitud);
    if ((latitud === null) !== (longitud === null)) throw new Error('La ubicación debe incluir latitud y longitud.');

    const fotoUrl = await uploadPlaceImage(req.file);
    await pool.query(`
      INSERT INTO proveedores_producto
      (producto_id,lugar,precio_compra,resena,detalle_lugar,latitud,longitud,foto_lugar_url,usuario_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      productoId,
      req.body.lugar,
      Number(req.body.precio_compra || 0),
      req.body.resena?.trim() || null,
      req.body.detalle_lugar?.trim() || null,
      latitud,
      longitud,
      fotoUrl,
      req.session.user.id
    ]);
    res.redirect('/proveedores');
  } catch (e) {
    console.error(e);
    let selectedProduct = null;
    if (req.body.producto_id) {
      const r = await pool.query('SELECT id, numero, nombre, imagen_url FROM productos WHERE id=$1', [req.body.producto_id]);
      selectedProduct = r.rows[0] || null;
    }
    const message = e.code === '23505'
      ? `Este producto ya tiene un registro para ${req.body.lugar}. Edítalo en lugar de crear otro.`
      : e.message;
    res.status(400).render('providers/form', {
      title: 'Nuevo proveedor', provider: req.body, selectedProduct, error: message
    });
  }
});

router.get('/proveedores/:id/editar', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT pp.*, p.nombre producto, p.numero, p.imagen_url producto_imagen
    FROM proveedores_producto pp
    JOIN productos p ON p.id=pp.producto_id
    WHERE pp.id=$1
  `, [req.params.id]);
  const provider = rows[0];
  if (!provider) return res.status(404).render('error', { title: 'No encontrado', message: 'Registro de proveedor no encontrado.' });
  res.render('providers/form', {
    title: 'Editar proveedor',
    provider,
    selectedProduct: { id: provider.producto_id, numero: provider.numero, nombre: provider.producto, imagen_url: provider.producto_imagen },
    error: null
  });
});

router.put('/proveedores/:id', requireAdmin, upload.single('foto_lugar'), async (req, res) => {
  try {
    const oldR = await pool.query('SELECT * FROM proveedores_producto WHERE id=$1', [req.params.id]);
    const old = oldR.rows[0];
    if (!old) throw new Error('Registro de proveedor no encontrado.');

    const productoId = Number.parseInt(req.body.producto_id, 10);
    if (!Number.isInteger(productoId)) throw new Error('Selecciona un producto válido desde el buscador.');
    if (!['Ceja', 'Ingavi'].includes(req.body.lugar)) throw new Error('Selecciona Ceja o Ingavi.');

    const latitud = numberOrNull(req.body.latitud);
    const longitud = numberOrNull(req.body.longitud);
    if ((latitud === null) !== (longitud === null)) throw new Error('La ubicación debe incluir latitud y longitud.');

    let fotoUrl = old.foto_lugar_url;
    if (req.file) fotoUrl = await uploadPlaceImage(req.file);

    await pool.query(`
      UPDATE proveedores_producto SET
        producto_id=$1,lugar=$2,precio_compra=$3,resena=$4,detalle_lugar=$5,
        latitud=$6,longitud=$7,foto_lugar_url=$8,usuario_id=$9,actualizado_en=NOW()
      WHERE id=$10
    `, [
      productoId,
      req.body.lugar,
      Number(req.body.precio_compra || 0),
      req.body.resena?.trim() || null,
      req.body.detalle_lugar?.trim() || null,
      latitud,
      longitud,
      fotoUrl,
      req.session.user.id,
      req.params.id
    ]);
    res.redirect('/proveedores');
  } catch (e) {
    console.error(e);
    const message = e.code === '23505'
      ? `Este producto ya tiene un registro para ${req.body.lugar}. Solo se permite uno por lugar.`
      : e.message;
    let selectedProduct = null;
    if (req.body.producto_id) {
      const r = await pool.query('SELECT id, numero, nombre, imagen_url FROM productos WHERE id=$1', [req.body.producto_id]);
      selectedProduct = r.rows[0] || null;
    }
    res.status(400).render('providers/form', {
      title: 'Editar proveedor', provider: { ...req.body, id: req.params.id }, selectedProduct, error: message
    });
  }
});

router.delete('/proveedores/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM proveedores_producto WHERE id=$1', [req.params.id]);
  res.redirect('/proveedores');
});

module.exports = router;
