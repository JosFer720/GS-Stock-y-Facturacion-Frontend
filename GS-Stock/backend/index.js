require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app'); // ← Cargamos la instancia de Express ya configurada
const { Pool } = require('pg');

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Crear el servidor HTTP con Socket.IO
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

// Hacer io accesible desde app
app.set('socketio', io);

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

// Configuración de eventos Socket.IO
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  socket.join('inventory');
  socket.join('sales');

  socket.on('request_inventory_status', () => {
    socket.emit('inventory_status', { message: 'Estado del inventario solicitado' });
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar servidor después de probar la conexión
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
