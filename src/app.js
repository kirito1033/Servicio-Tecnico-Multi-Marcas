  require('dotenv').config();
  const express = require('express');
  const path = require('path');
  const cors = require('cors');
  const session = require('express-session');

  const casosRoutes = require('./routes/casos.routes');
  const catalogosRoutes = require('./routes/catalogos.routes');
  const ingresosFacturaRoutes = require('./routes/ingresosFactura.routes');
  const authRoutes = require('./routes/auth.routes');
  const clientesTiendaRoutes = require('./routes/clientesTienda.routes');
  const inventarioRoutes = require('./routes/inventario.routes');
  const productosRoutes = require('./routes/productos.routes');
  const solicitudesRoutes = require('./routes/solicitudes.routes');
  const firmasRoutes = require('./routes/firmas.routes');
  
  const app = express();

  app.use(cors({
    origin: 'http://127.0.0.1:5500', // cambia esto por el origen real de tu frontend
    credentials: true
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'super-clave-segura-cambiar',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  }));

  app.use('/api', clientesTiendaRoutes);
  app.use('/api', casosRoutes);
  app.use('/api', catalogosRoutes);
  app.use('/api', ingresosFacturaRoutes);
  app.use('/api', inventarioRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/productos', productosRoutes);
  app.use('/api/solicitudes', solicitudesRoutes);
  app.use('/api', firmasRoutes);

  app.use(express.static(path.join(__dirname, '../public')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
  });

  app.get('/firmar/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/view-firmar.html'));
});

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });