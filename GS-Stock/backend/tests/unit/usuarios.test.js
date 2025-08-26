const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');

describe('CRUD de Usuarios', () => {
    let token;
    let createdUserId;
    const JWT_SECRET = process.env.JWT_SECRET || 'fba7a07f4174d84d67ad67aedf16422a';

    // Generar token antes de las pruebas
    beforeAll(() => {
        token = jwt.sign(
            { id: 1, rol: 'Administrador' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    // Prueba 1: Crear usuario
    it('debería crear un nuevo usuario', async () => {
        const newUser = {
            nombre: 'Test',
            apellido: 'User',
            email: `test${Date.now()}@example.com`,
            id_roles: 2,
            estado: true
        };

        const res = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send(newUser);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toMatchObject({
            nombre: newUser.nombre,
            apellido: newUser.apellido,
            email: newUser.email
        });
        
        createdUserId = res.body.data.id; // Guardar ID para otras pruebas
    });

    // Prueba 2: Obtener usuario por ID
    it('debería obtener un usuario por ID', async () => {
        if (!createdUserId) {
            return;
        }

        const res = await request(app)
            .get(`/api/usuarios/${createdUserId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe(createdUserId);
    });

    // Prueba 3: Actualizar usuario
    it('debería actualizar un usuario existente', async () => {
        if (!createdUserId) {
            return;
        }

        const updatedData = {
            nombre: 'Updated',
            apellido: 'User',
            email: `updated${Date.now()}@example.com`,
            id_roles: 3,
            estado: false
        };

        const res = await request(app)
            .put(`/api/usuarios/${createdUserId}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updatedData);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.nombre).toBe(updatedData.nombre);
        expect(res.body.data.estado).toBe(updatedData.estado);
    });

    // Prueba 4: Obtener usuarios por estado
    it('debería obtener usuarios por estado', async () => {
        const estado = 'false'; // Usuarios inactivos
        const res = await request(app)
            .get(`/api/usuarios/estado/${estado}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        // Verificar que el usuario creado está en la lista si existe
        if (createdUserId) {
            expect(res.body.data.some(user => user.id === createdUserId)).toBe(true);
        }
    });

    // Prueba 5: Desactivar usuario
    it('debería desactivar un usuario', async () => {
        if (!createdUserId) {
            return;
        }

        const res = await request(app)
            .put(`/api/usuarios/${createdUserId}/deactivate`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estado).toBe(false);
    });

    // Prueba 6: Eliminar usuario
    it('debería eliminar un usuario', async () => {
        if (!createdUserId) {
            return;
        }

        const res = await request(app)
            .delete(`/api/usuarios/${createdUserId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe(createdUserId);

        // Verificar que ya no existe
        const checkRes = await request(app)
            .get(`/api/usuarios/${createdUserId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(checkRes.statusCode).toBe(404);
    });

    // Prueba 7: Validar protección de endpoints
    it('debería rechazar peticiones sin token', async () => {
        const res = await request(app)
            .get('/api/usuarios');
            
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    // Prueba 8: Validar creación con datos incompletos
    it('debería fallar al crear usuario sin campos obligatorios', async () => {
        const invalidUser = {
            email: 'incomplete@example.com',
            estado: true
        };

        const res = await request(app)
            .post('/api/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send(invalidUser);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});