const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/usuarios', requireAdmin, async (_req, res) => {
  const { rows } = await pool.query('SELECT id,nombre,email,rol,activo,creado_en FROM usuarios ORDER BY nombre');
  res.render('users/index', { title: 'Empleados', users: rows, error: null });
});

router.post('/usuarios', requireAdmin, async (req, res) => {
  try {
    const hash = await bcrypt.hash(String(req.body.password), 12);
    await pool.query('INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES($1,$2,$3,$4)',
      [req.body.nombre, String(req.body.email).toLowerCase(), hash, req.body.rol === 'admin' ? 'admin' : 'empleado']);
    res.redirect('/usuarios');
  } catch (e) {
    const { rows } = await pool.query('SELECT id,nombre,email,rol,activo,creado_en FROM usuarios ORDER BY nombre');
    res.status(400).render('users/index', { title: 'Empleados', users: rows, error: 'No se pudo crear el usuario. Verifica que el correo no esté repetido.' });
  }
});

router.post('/usuarios/:id/toggle', requireAdmin, async (req, res) => {
  if (String(req.params.id) === String(req.session.user.id)) return res.redirect('/usuarios');
  await pool.query('UPDATE usuarios SET activo=NOT activo WHERE id=$1', [req.params.id]);
  res.redirect('/usuarios');
});

module.exports = router;
