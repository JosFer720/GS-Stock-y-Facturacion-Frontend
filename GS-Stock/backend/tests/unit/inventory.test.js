const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const inventoryRouter = require('../../routes/inventory');

// Mock de la base de datos
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn()
  };
  return {
    Pool: jest.fn(() => mockPool)
  };
});

// Mock del servicio de sockets
jest.mock('../../services/socketService', () => {
  return jest.fn().mockImplementation(() => ({
    emitInventoryUpdate: jest.fn(),
    emitNewProduct: jest.fn(),
    emitStockUpdate: jest.fn(),
    emitLowStockAlert: jest.fn()
  }));
});

describe('Inventory Routes', () => {
  let app;
  let token;
  let mockPool;

  beforeAll(() => {
    // Genera un token JWT válido para autenticación
    token = jwt.sign(
      { id: 1, nombre: 'Test', rol: 'admin' },
      process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a',
      { expiresIn: '1h' }
    );

    // Mockear console.error para evitar logs en las pruebas
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Configurar la aplicación de prueba
    app = express();
    app.use(express.json());
    
    // Mock del socket.io
    app.set('socketio', {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    });
    
    app.use('/api/inventory', inventoryRouter);

    // Obtener referencia al pool mockeado
    const { Pool } = require('pg');
    mockPool = new Pool();
  });

  describe('POST /api/inventory/add', () => {
    it('debería agregar un producto correctamente', async () => {
      const nuevoProducto = {
        nombre: 'Producto Test',
        descripcion: 'Descripción de prueba',
        stock: 20,
        precio: 100.00,
        minimum_stock: 5
      };

      // Mock de la respuesta de la base de datos
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 1,
          ...nuevoProducto,
          created_at: new Date()
        }]
      });

      const res = await request(app)
        .post('/api/inventory/add')
        .set('Authorization', `Bearer ${token}`)
        .send(nuevoProducto);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Producto agregado correctamente');
      expect(res.body.data).toMatchObject({
        nombre: nuevoProducto.nombre,
        stock: nuevoProducto.stock,
        precio: nuevoProducto.precio
      });
    });

    it('debería manejar errores al agregar producto', async () => {
      // Mock de error en la base de datos
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/inventory/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Producto Error' });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error al agregar producto');
    });
  });

  describe('PUT /api/inventory/update/:id', () => {
    it('debería actualizar el inventario correctamente', async () => {
      const productId = '1';
      const updateData = { stock: 15, precio: 150.00 };

      // Mock para obtener stock anterior
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ stock: 10 }] }) // Stock anterior
        .mockResolvedValueOnce({ // Producto actualizado
          rows: [{
            id: 1,
            nombre: 'Producto Test',
            stock: 15,
            precio: 150.00,
            minimum_stock: 5
          }]
        });

      const res = await request(app)
        .put(`/api/inventory/update/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Inventario actualizado correctamente');
      expect(res.body.data.stock).toBe(15);
    });

    it('debería manejar errores al actualizar inventario', async () => {
      // Mock de error en la base de datos
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/inventory/update/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ stock: 20 });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Error al actualizar inventario');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restaurar console.error
    console.error.mockRestore();
  });
});