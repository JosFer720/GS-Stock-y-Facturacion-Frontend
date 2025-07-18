const request = require('supertest');
const app = require('../app');
const jwt = require('jsonwebtoken');

describe('POST /api/productos', () => {
  let token;

  // Genera un token JWT válido para autenticación antes de las pruebas
  beforeAll(() => {
    token = jwt.sign(
      { id: 1, nombre: 'Test', rol: 'admin' },
      process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a',
      { expiresIn: '1h' }
    );
  });

  // Verifica que se pueda agregar un producto correctamente cuando se envían datos válidos y token
  it('debería agregar un producto correctamente', async () => {
    const producto = {
      codigo: `TEST-${Date.now()}`,
      nombre: 'Zapato de Prueba',
      id_tipo_de_zapato: 1,
      estado: 'Disponible',
      tallas: [
        { id_talla: 1, stock: 10 },
        { id_talla: 2, stock: 5 }
      ]
    };

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send(producto);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('mensaje', 'Producto agregado exitosamente');
    expect(res.body.data).toMatchObject({
      codigo: producto.codigo,
      nombre: producto.nombre,
      id_tipo_de_zapato: producto.id_tipo_de_zapato,
      estado: producto.estado
    });
    expect(res.body.data.cantidad).toBe(15);
  });

  // Verifica que la petición sea rechazada si no se envía el token de autenticación
  it('debería rechazar si falta el token', async () => {
    const res = await request(app)
      .post('/api/productos')
      .send({});

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  // Verifica que la petición sea rechazada si faltan campos requeridos en el cuerpo
  it('debería rechazar si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Faltan campos' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
