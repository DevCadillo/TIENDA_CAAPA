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

function mobileAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Sesión no iniciada. Vuelve a ingresar.' });
  }
  next();
}

function mobileAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Sesión no iniciada. Vuelve a ingresar.' });
  }
  if (req.session.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Esta acción requiere permisos de administrador.' });
  }
  next();
}

function numberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.get('/api/mobile/status', (_req, res) => {
  res.json({ ok: true, app: 'TIENDA CAAPA', api: 'mobile', version: 1 });
});

router.post('/api/mobile/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Ingresa correo y contraseña.' });
    }

    const { rows } = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE LOWER(email)=LOWER($1) LIMIT 1',
      [email]
    );
    const user = rows[0];

    if (!user || !user.activo || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    req.session.user = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };

    // Guardamos la sesión antes de responder para que el Set-Cookie llegue al celular.
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'No se pudo iniciar la sesión.' });
      }
      res.json({ ok: true, user: req.session.user });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
});

router.post('/api/mobile/logout', mobileAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
    res.json({ ok: true });
  });
});

router.get('/api/mobile/me', mobileAuth, (req, res) => {
  res.json({ user: req.session.user });
});

router.get('/api/mobile/productos', mobileAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const { rows } = await pool.query(`
      SELECT p.id, p.numero, p.nombre, p.cantidad, p.stock_minimo,
             p.precio_mayor, p.precio_unitario, p.imagen_url, p.disponible,
             c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE ($1 = '' OR LOWER(p.nombre) LIKE LOWER('%' || $1 || '%')
                      OR LOWER(COALESCE(p.numero,'')) LIKE LOWER('%' || $1 || '%'))
      ORDER BY p.nombre ASC
      LIMIT 300
    `, [q]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron cargar los productos.' });
  }
});

router.get('/api/mobile/productos/buscar', mobileAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const { rows } = await pool.query(`
      SELECT id, numero, nombre, imagen_url, precio_unitario, precio_mayor, cantidad
      FROM productos
      WHERE LOWER(nombre) LIKE LOWER('%' || $1 || '%')
         OR LOWER(COALESCE(numero,'')) LIKE LOWER('%' || $1 || '%')
      ORDER BY nombre ASC
      LIMIT 20
    `, [q]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo buscar el producto.' });
  }
});

router.get('/api/mobile/proveedores', mobileAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const lugar = ['Ceja', 'Ingavi'].includes(req.query.lugar) ? req.query.lugar : '';
    const { rows } = await pool.query(`
      SELECT pp.*, p.nombre AS producto, p.numero, p.imagen_url AS producto_imagen,
             c.nombre AS categoria,
             MIN(pp.precio_compra) OVER (PARTITION BY pp.producto_id) AS precio_minimo
      FROM proveedores_producto pp
      JOIN productos p ON p.id = pp.producto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE ($1 = '' OR LOWER(p.nombre) LIKE LOWER('%' || $1 || '%')
                      OR LOWER(COALESCE(p.numero,'')) LIKE LOWER('%' || $1 || '%')
                      OR LOWER(COALESCE(pp.resena,'')) LIKE LOWER('%' || $1 || '%')
                      OR LOWER(COALESCE(pp.detalle_lugar,'')) LIKE LOWER('%' || $1 || '%'))
        AND ($2 = '' OR pp.lugar = $2)
      ORDER BY p.nombre ASC, pp.lugar ASC
    `, [q, lugar]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron cargar los proveedores.' });
  }
});

router.post('/api/mobile/proveedores', mobileAdmin, upload.single('foto_lugar'), async (req, res) => {
  try {
    const productoId = Number.parseInt(req.body.producto_id, 10);
    const lugar = String(req.body.lugar || '');
    const precio = Number(req.body.precio_compra);
    if (!Number.isInteger(productoId)) return res.status(400).json({ error: 'Selecciona un producto válido.' });
    if (!['Ceja', 'Ingavi'].includes(lugar)) return res.status(400).json({ error: 'Selecciona Ceja o Ingavi.' });
    if (!Number.isFinite(precio) || precio < 0) return res.status(400).json({ error: 'Ingresa un precio válido.' });

    const latitud = numberOrNull(req.body.latitud);
    const longitud = numberOrNull(req.body.longitud);
    if ((latitud === null) !== (longitud === null)) {
      return res.status(400).json({ error: 'La ubicación debe tener latitud y longitud.' });
    }

    const exists = await pool.query('SELECT id FROM productos WHERE id=$1', [productoId]);
    if (!exists.rows[0]) return res.status(404).json({ error: 'El producto seleccionado no existe.' });

    const fotoUrl = await uploadPlaceImage(req.file);
    const { rows } = await pool.query(`
      INSERT INTO proveedores_producto
        (producto_id,lugar,precio_compra,resena,detalle_lugar,latitud,longitud,foto_lugar_url,usuario_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      productoId, lugar, precio,
      String(req.body.resena || '').trim() || null,
      String(req.body.detalle_lugar || '').trim() || null,
      latitud, longitud, fotoUrl, req.session.user.id
    ]);
    res.status(201).json({ ok: true, provider: rows[0] });
  } catch (e) {
    console.error(e);
    if (e.code === '23505') {
      return res.status(409).json({ error: `Este producto ya tiene un registro para ${req.body.lugar}. Edítalo en lugar de crear otro.` });
    }
    res.status(500).json({ error: e.message || 'No se pudo guardar el proveedor.' });
  }
});

router.put('/api/mobile/proveedores/:id', mobileAdmin, upload.single('foto_lugar'), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const productoId = Number.parseInt(req.body.producto_id, 10);
    const lugar = String(req.body.lugar || '');
    const precio = Number(req.body.precio_compra);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Registro inválido.' });
    if (!Number.isInteger(productoId)) return res.status(400).json({ error: 'Selecciona un producto válido.' });
    if (!['Ceja', 'Ingavi'].includes(lugar)) return res.status(400).json({ error: 'Selecciona Ceja o Ingavi.' });
    if (!Number.isFinite(precio) || precio < 0) return res.status(400).json({ error: 'Ingresa un precio válido.' });

    const oldR = await pool.query('SELECT * FROM proveedores_producto WHERE id=$1', [id]);
    const old = oldR.rows[0];
    if (!old) return res.status(404).json({ error: 'Registro de proveedor no encontrado.' });

    const latitud = numberOrNull(req.body.latitud);
    const longitud = numberOrNull(req.body.longitud);
    if ((latitud === null) !== (longitud === null)) {
      return res.status(400).json({ error: 'La ubicación debe tener latitud y longitud.' });
    }

    let fotoUrl = old.foto_lugar_url;
    if (req.file) fotoUrl = await uploadPlaceImage(req.file);

    const { rows } = await pool.query(`
      UPDATE proveedores_producto SET
        producto_id=$1, lugar=$2, precio_compra=$3, resena=$4, detalle_lugar=$5,
        latitud=$6, longitud=$7, foto_lugar_url=$8, usuario_id=$9, actualizado_en=NOW()
      WHERE id=$10
      RETURNING *
    `, [
      productoId, lugar, precio,
      String(req.body.resena || '').trim() || null,
      String(req.body.detalle_lugar || '').trim() || null,
      latitud, longitud, fotoUrl, req.session.user.id, id
    ]);
    res.json({ ok: true, provider: rows[0] });
  } catch (e) {
    console.error(e);
    if (e.code === '23505') {
      return res.status(409).json({ error: `Este producto ya tiene un registro para ${req.body.lugar}.` });
    }
    res.status(500).json({ error: e.message || 'No se pudo actualizar el proveedor.' });
  }
});

router.delete('/api/mobile/proveedores/:id', mobileAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM proveedores_producto WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Registro no encontrado.' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo eliminar el proveedor.' });
  }
});

module.exports = router;
