// backend/tests/inventory.test.js
const request = require('supertest');
const express = require('express');
const inventoryRouter = require('../../routes/inventory');

// Mock de middleware de roles para no bloquear el test
jest.mock('../middleware/roles', () => ({
  checkRole: () => (req, res, next) => next(),
  roles: {
    admin: ['admin'],
    secretaria: ['secretaria'],
    vendedor: ['vendedor'],
    inventario: ['inventario']
  }
}));

// Mock del pool de postgres para no depender de la DB real
jest.mock('pg', () => {
  const mClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn()
  };
  return { Pool: jest.fn(() => mClient) };
});

// Mock de SocketService
jest.mock('../services/socketService', () => {
  return jest.fn().mockImplementation(() => ({
    emitInventoryUpdate: jest.fn(),
    emitStockUpdate: jest.fn(),
    emitLowStockAlert: jest.fn(),
    emitNewProduct: jest.fn()
  }));
});

describe('Inventory Routes (smoke test)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/inventory', inventoryRouter);
  });

  it('GET /inventory debería responder con 200 y success:true', async () => {
    const res = await request(app).get('/inventory');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
