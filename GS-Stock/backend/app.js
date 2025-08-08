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
const facturasRoutes = require('./routes/facturas');
const clientesRoutes = require('./routes/clientes');
const sugerenciasFacturacionRoutes = require('./routes/sugerenciasFacturacion');
const crearFacturaRoutes = require('./routes/crearFactura');
const tallasRoutes = require('./routes/tallas');
const tiposCalzadoRoutes = require('./routes/tiposCalzado');
const tiposLineaProductoRoutes = require('./routes/tiposLineaProducto');
const envioNacionalRoutes = require('./routes/envioNacional');
const envioImportadoraRoutes = require('./routes/envioImportadora');

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

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/prueba', pruebaRoutes);
app.use('/api/agregarProducto', agregarProductoRoutes);
app.use('/api/eliminarProducto', eliminarProductoRoutes);
app.use('/api/modificarProducto', modificarProductoRoutes);
app.use('/api/usuarios', mostrarUsuariosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/sugerenciasFacturacion', sugerenciasFacturacionRoutes);
app.use('/api/crearFactura', crearFacturaRoutes);
app.use('/api/tallas', tallasRoutes);
app.use('/api/tipos-calzados', tiposCalzadoRoutes);
app.use('/api/tipos-linea-producto', tiposLineaProductoRoutes);
app.use('/api/envios/nacional', envioNacionalRoutes);
app.use('/api/envios/importadora', envioImportadoraRoutes);

// Ruta adicional para debug
app.get('/api/envios/test', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas de envío funcionando correctamente',
        rutas_disponibles: [
            '/api/envios/nacional',
            '/api/envios/nacionales', 
            '/api/envios/importadora'
        ]
    });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Database connection failed');
  }
});

module.exports = app;