function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.rol !== 'admin') {
    return res.status(403).render('error', {
      title: 'Acceso denegado',
      message: 'No tienes permiso para realizar esta acción.'
    });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
