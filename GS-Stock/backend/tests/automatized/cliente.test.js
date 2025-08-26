const request = require('supertest');
const express = require('express');
const clientesRouter = require('../../routes/clientes');

// Mock de middleware auth
jest.mock('../middleware/auth', () => (req, res, next) => next());

// Mock de pg.Pool (si no quieres conectar a la DB en smoke test)
jest.mock('pg', () => {
  const mClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
    connect: jest.fn().mockResolvedValue(this),
  };
  return { Pool: jest.fn(() => mClient) };
});

const app = express();
app.use(express.json());
app.use('/clientes', clientesRouter);

describe('Smoke Test - Clientes', () => {
  it('GET /clientes responde con JSON y status 200 o 500', async () => {
    const res = await request(app).get('/clientes');
    expect([200, 500]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
