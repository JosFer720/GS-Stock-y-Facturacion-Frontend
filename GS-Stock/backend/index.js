require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pruebaRoutes = require('./routes/prueba'); // Importamos nuestro nuevo módulo

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', pruebaRoutes); // Usamos la nueva ruta de prueba

// Health check mejorado
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

// Iniciar servidor después de verificar la conexión a DB
testDbConnection()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al iniciar la aplicación:', err);
    process.exit(1);
  });