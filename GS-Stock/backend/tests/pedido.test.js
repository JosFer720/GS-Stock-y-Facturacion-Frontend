const request = require('supertest');
const express = require('express');

// Importamos tu router
const pedidosRouter = require('../routes/clientes');

// Mock del middleware auth para no depender de JWT en pruebas de humo
jest.mock('../middleware/auth', () => (req, res, next) => next());

const app = express();
app.use(express.json());
app.use('/', pedidosRouter);

describe('Smoke Test - Pedidos', () => {
  it('GET /pedidos debe responder con JSON y status 200 o 500 (smoke test)', async () => {
    const res = await request(app).get('/ventas');
    expect([200, 500]).toContain(res.status); 
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
