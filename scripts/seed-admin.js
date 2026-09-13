require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

(async () => {
  try {
    const nombre = process.env.ADMIN_NAME || 'Administrador';
    const email = (process.env.ADMIN_EMAIL || 'admin@tienda.com').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    const hash = await bcrypt.hash(password, 12);
    await pool.query(`INSERT INTO usuarios(nombre,email,password_hash,rol,activo)
      VALUES($1,$2,$3,'admin',TRUE)
      ON CONFLICT(email) DO UPDATE SET nombre=EXCLUDED.nombre,password_hash=EXCLUDED.password_hash,rol='admin',activo=TRUE`,
      [nombre,email,hash]);
    console.log(`Administrador listo: ${email}`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
