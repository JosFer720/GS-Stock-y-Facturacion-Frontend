require('dotenv').config();
const { Pool } = require('pg');

// Pool de conexiones único y compartido por toda la aplicación.
// Las credenciales provienen exclusivamente de variables de entorno
// (ver .env.example); no se definen valores por defecto sensibles.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  client_encoding: 'utf8',
});

pool.on('connect', () => {
  console.log('Conectado a la base de datos PostgreSQL');
});

// Evita que un error en un cliente inactivo derribe el proceso.
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = pool;
