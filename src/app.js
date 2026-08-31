require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const methodOverride = require('method-override');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'cambia-esto',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));
app.use(require('./routes/auth'));
app.use(require('./routes/dashboard'));
app.use(require('./routes/products'));
app.use(require('./routes/users'));

app.use((_req, res) => res.status(404).render('error', { title: '404', message: 'Página no encontrada.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: 'Ocurrió un error inesperado.' });
});

app.listen(PORT, () => console.log(`Sistema iniciado en http://localhost:${PORT}`));
