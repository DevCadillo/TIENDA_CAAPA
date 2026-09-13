const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [stats, low, cats, recent] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total,
        COUNT(*) FILTER (WHERE cantidad > 0)::int disponibles,
        COUNT(*) FILTER (WHERE cantidad = 0)::int sin_stock,
        COUNT(*) FILTER (WHERE cantidad > 0 AND cantidad <= stock_minimo)::int poco_stock
        FROM productos`),
      pool.query(`SELECT id,nombre,cantidad,stock_minimo FROM productos
                  WHERE cantidad <= stock_minimo ORDER BY cantidad ASC, nombre LIMIT 8`),
      pool.query(`SELECT COALESCE(c.nombre,'Sin categoría') categoria, COALESCE(SUM(p.cantidad),0)::int stock
                  FROM productos p LEFT JOIN categorias c ON c.id=p.categoria_id
                  GROUP BY c.nombre ORDER BY stock DESC`),
      pool.query(`SELECT m.*, p.nombre producto, u.nombre usuario
                  FROM movimientos_stock m
                  JOIN productos p ON p.id=m.producto_id
                  LEFT JOIN usuarios u ON u.id=m.usuario_id
                  ORDER BY m.creado_en DESC LIMIT 8`)
    ]);

    res.render('dashboard', {
      title: 'Dashboard',
      stats: stats.rows[0],
      lowStock: low.rows,
      categoryData: cats.rows,
      recent: recent.rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).render('error', { title: 'Error', message: 'No se pudo cargar el dashboard.' });
  }
});

module.exports = router;
