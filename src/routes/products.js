const express = require('express');
const multer = require('multer');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadProductImage } = require('../services/storage');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

router.get('/productos', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const sql = `SELECT p.*, c.nombre categoria FROM productos p
               LEFT JOIN categorias c ON c.id=p.categoria_id
               WHERE ($1='' OR LOWER(p.nombre) LIKE LOWER('%' || $1 || '%') OR LOWER(COALESCE(p.numero,'')) LIKE LOWER('%' || $1 || '%'))
               ORDER BY p.nombre`;
  const { rows } = await pool.query(sql, [q]);
  res.render('products/index', { title: 'Productos', products: rows, q });
});

router.get('/productos/nuevo', requireAdmin, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM categorias ORDER BY nombre');
  res.render('products/form', { title: 'Nuevo producto', product: null, categories: rows, error: null });
});

router.post('/productos', requireAdmin, upload.single('imagen'), async (req, res) => {
  try {
    const imagenUrl = await uploadProductImage(req.file);
    const { numero, nombre, categoria_id, cantidad, stock_minimo, precio_mayor, precio_unitario } = req.body;
    const disponible = req.body.disponible === 'on';
    await pool.query(`INSERT INTO productos
      (numero,nombre,categoria_id,cantidad,stock_minimo,precio_mayor,precio_unitario,imagen_url,disponible)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [numero || null, nombre, categoria_id || null, Number(cantidad||0), Number(stock_minimo||0), Number(precio_mayor||0), Number(precio_unitario||0), imagenUrl, disponible]);
    res.redirect('/productos');
  } catch (e) {
    console.error(e);
    const { rows } = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    res.status(400).render('products/form', { title: 'Nuevo producto', product: req.body, categories: rows, error: e.message });
  }
});

router.get('/productos/:id/editar', requireAdmin, async (req, res) => {
  const [p, c] = await Promise.all([
    pool.query('SELECT * FROM productos WHERE id=$1', [req.params.id]),
    pool.query('SELECT * FROM categorias ORDER BY nombre')
  ]);
  if (!p.rows[0]) return res.status(404).render('error', { title: 'No encontrado', message: 'Producto no encontrado.' });
  res.render('products/form', { title: 'Editar producto', product: p.rows[0], categories: c.rows, error: null });
});

router.put('/productos/:id', requireAdmin, upload.single('imagen'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oldR = await client.query('SELECT * FROM productos WHERE id=$1 FOR UPDATE', [req.params.id]);
    const old = oldR.rows[0];
    if (!old) throw new Error('Producto no encontrado.');

    let imagenUrl = old.imagen_url;
    if (req.file) imagenUrl = await uploadProductImage(req.file);
    const precioMayor = Number(req.body.precio_mayor || 0);
    const precioUnitario = Number(req.body.precio_unitario || 0);

    await client.query(`UPDATE productos SET numero=$1,nombre=$2,categoria_id=$3,stock_minimo=$4,
      precio_mayor=$5,precio_unitario=$6,imagen_url=$7,disponible=$8,actualizado_en=NOW() WHERE id=$9`,
      [req.body.numero || null, req.body.nombre, req.body.categoria_id || null, Number(req.body.stock_minimo||0),
       precioMayor, precioUnitario, imagenUrl, req.body.disponible==='on', req.params.id]);

    if (Number(old.precio_mayor) !== precioMayor || Number(old.precio_unitario) !== precioUnitario) {
      await client.query(`INSERT INTO historial_precios
        (producto_id,usuario_id,precio_mayor_anterior,precio_mayor_nuevo,precio_unitario_anterior,precio_unitario_nuevo)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [old.id, req.session.user.id, old.precio_mayor, precioMayor, old.precio_unitario, precioUnitario]);
    }
    await client.query('COMMIT');
    res.redirect('/productos');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(400).render('error', { title: 'Error', message: e.message });
  } finally { client.release(); }
});

router.post('/productos/:id/stock', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pR = await client.query('SELECT * FROM productos WHERE id=$1 FOR UPDATE', [req.params.id]);
    const p = pR.rows[0];
    if (!p) throw new Error('Producto no encontrado.');
    const cantidad = Number.parseInt(req.body.cantidad, 10);
    const tipo = req.body.tipo;
    if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('La cantidad debe ser mayor que cero.');
    if (!['entrada','salida'].includes(tipo)) throw new Error('Tipo de movimiento inválido.');
    const nuevo = tipo === 'entrada' ? p.cantidad + cantidad : p.cantidad - cantidad;
    if (nuevo < 0) throw new Error('No hay stock suficiente para realizar la salida.');

    await client.query('UPDATE productos SET cantidad=$1, disponible=$2, actualizado_en=NOW() WHERE id=$3', [nuevo, nuevo > 0, p.id]);
    await client.query(`INSERT INTO movimientos_stock
      (producto_id,usuario_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [p.id, req.session.user.id, tipo, cantidad, p.cantidad, nuevo, req.body.motivo || null]);
    await client.query('COMMIT');
    res.redirect('/productos');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(400).render('error', { title: 'Movimiento no realizado', message: e.message });
  } finally { client.release(); }
});

router.get('/productos/:id/historial', requireAdmin, async (req, res) => {
  const [p, m, h] = await Promise.all([
    pool.query('SELECT * FROM productos WHERE id=$1', [req.params.id]),
    pool.query(`SELECT m.*,u.nombre usuario FROM movimientos_stock m LEFT JOIN usuarios u ON u.id=m.usuario_id WHERE producto_id=$1 ORDER BY creado_en DESC`, [req.params.id]),
    pool.query(`SELECT h.*,u.nombre usuario FROM historial_precios h LEFT JOIN usuarios u ON u.id=h.usuario_id WHERE producto_id=$1 ORDER BY creado_en DESC`, [req.params.id])
  ]);
  if (!p.rows[0]) return res.status(404).render('error', { title: 'No encontrado', message: 'Producto no encontrado.' });
  res.render('products/history', { title: 'Historial', product: p.rows[0], movements: m.rows, prices: h.rows });
});

router.delete('/productos/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM productos WHERE id=$1', [req.params.id]);
  res.redirect('/productos');
});

module.exports = router;
