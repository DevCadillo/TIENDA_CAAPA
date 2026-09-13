const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Iniciar sesión', error: null });
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email=$1 LIMIT 1', [email]);
    const user = rows[0];

    if (!user || !user.activo || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).render('login', { title: 'Iniciar sesión', error: 'Correo o contraseña incorrectos.' });
    }

    req.session.user = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e);
    res.status(500).render('login', { title: 'Iniciar sesión', error: 'No se pudo iniciar sesión.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
