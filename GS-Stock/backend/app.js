require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pruebaRoutes = require('./routes/prueba');
const agregarProductoRoutes = require('./routes/agregarProducto');
const eliminarProductoRoutes = require('./routes/eliminarProducto');
const modificarProductoRoutes = require('./routes/modificarProducto');
const mostrarUsuariosRoutes = require('./routes/usuarios');
const ventasRoutes = require('./routes/ventas');
const inventoryRoutes = require('./routes/inventory');
const facturasRouter = require('./routes/facturas');
const clientesRoutes = require('./routes/clientes');
const sugerenciasFacturacionRoutes = require('./routes/sugerenciasFacturacion');
const crearFacturaRoutes = require('./routes/crearFactura');
const { Pool } = require('pg');

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', pruebaRoutes);
app.use('/api', agregarProductoRoutes);
app.use('/api', eliminarProductoRoutes);
app.use('/api', modificarProductoRoutes);
app.use('/api', mostrarUsuariosRoutes);
app.use('/api', ventasRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', facturasRouter);
app.use('/api', clientesRoutes);
app.use('/api', sugerenciasFacturacionRoutes);
app.use('/api', crearFacturaRoutes);


app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Database connection failed');
  }
});

module.exports = app;
