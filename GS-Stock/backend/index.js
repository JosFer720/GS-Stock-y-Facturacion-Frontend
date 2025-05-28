require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pruebaRoutes = require('./routes/prueba');
const agregarProductoRoutes = require('./routes/agregarProducto');
const eliminarProductoRoutes = require('./routes/eliminarProducto');
const modificarProductoRoutes = require('./routes/modificarProducto');
const mostrarUsuariosRoutes = require('./routes/usuarios');
const ventasRoutes = require('./routes/ventas');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Hacer io disponible globalmente
app.set('socketio', io);

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', pruebaRoutes);
app.use('/api', agregarProductoRoutes);
app.use('/api', eliminarProductoRoutes);
app.use('/api', modificarProductoRoutes);
app.use('/api', mostrarUsuariosRoutes);
app.use('/api', ventasRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', salesRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Database connection failed');
  }
});

// Función para probar la conexión a la DB
async function testDbConnection() {
  let retries = 5;
  while (retries) {
    try {
      await pool.query('SELECT NOW()');
      console.log('Conexión a PostgreSQL establecida');
      break;
    } catch (err) {
      retries -= 1;
      console.error(`Error de conexión a PostgreSQL, reintentos restantes: ${retries}`, err);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  if (retries === 0) {
    throw new Error('No se pudo conectar a PostgreSQL después de varios intentos');
  }
}

// Socket.IO: Gestión de conexiones
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Unir cliente a sala de inventario y ventas
  socket.join('inventory');
  console.log(`Cliente ${socket.id} unido a sala de inventario`);

  socket.join('sales');
  console.log(`Cliente ${socket.id} unido a sala de ventas`);

  // Evento de inventario solicitado
  socket.on('request_inventory_status', () => {
    socket.emit('inventory_status', { message: 'Estado del inventario solicitado' });
  });

  // Manejo de desconexión
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar servidor
testDbConnection()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
      console.log('Socket.IO configurado y listo');
    });
  })
  .catch(err => {
    console.error('Error al iniciar la aplicación:', err);
    process.exit(1);
  });

module.exports = { app, io };
