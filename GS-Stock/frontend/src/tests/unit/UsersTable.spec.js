import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UsersTable from '@/components/UsersTable.vue';

describe('UsersTable.vue', () => {
  const mockUsers = [
    { id: 1, Id: 1, nombre: 'Juan', apellido: 'Pérez', email: 'juan.perez@example.com', id_roles: 1, estado: 'Activo' },
    { id: 2, Id: 2, nombre: 'María', apellido: 'García', email: 'maria.garcia@example.com', id_roles: 2, estado: 'Inactivo' },
    { id: 3, Id: 3, nombre: 'Carlos', apellido: 'López', email: 'carlos.lopez@example.com', id_roles: 1, estado: 'Activo' }
  ];

  const mockRoles = [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Usuario' }
  ];

  it('renderiza la tabla con el título correcto', () => {
    const wrapper = mount(UsersTable, {
      props: { users: mockUsers, roles: mockRoles }
    });
    expect(wrapper.find('h2').text()).toBe('Lista de usuarios');
    expect(wrapper.find('.users-table').exists()).toBe(true);
  });

  it('muestra todos los usuarios en la tabla', () => {
    const wrapper = mount(UsersTable, {
      props: { users: mockUsers, roles: mockRoles }
    });
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].text()).toContain('Juan');
    expect(rows[0].text()).toContain('Pérez');
    expect(rows[0].text()).toContain('juan.perez@example.com');
    expect(rows[0].text()).toContain('Activo');
  });

  it('muestra las columnas correctas en el encabezado', () => {
    const wrapper = mount(UsersTable, {
      props: { users: mockUsers, roles: mockRoles }
    });
    const headers = wrapper.findAll('th');
    expect(headers.length).toBe(6);
    expect(headers[0].text()).toBe('ID');
    expect(headers[1].text()).toBe('Nombre');
    expect(headers[2].text()).toBe('Apellido');
    expect(headers[3].text()).toBe('Email');
    expect(headers[4].text()).toBe('ID Rol');
    expect(headers[5].text()).toBe('Estado');
  });

  it('aplica las clases CSS correctas para el estado', () => {
    const wrapper = mount(UsersTable, {
      props: { users: mockUsers, roles: mockRoles }
    });
    const rows = wrapper.findAll('tbody tr');
    const activeStatusCell = rows[0].findAll('td')[5];
    const inactiveStatusCell = rows[1].findAll('td')[5];
    expect(activeStatusCell.classes()).toContain('active');
    expect(inactiveStatusCell.classes()).toContain('inactive');
  });

  it('muestra mensaje cuando no hay usuarios', () => {
    const wrapper = mount(UsersTable, {
      props: { users: [], roles: mockRoles }
    });
    const emptyRow = wrapper.find('.empty-table');
    expect(emptyRow.exists()).toBe(true);
    expect(emptyRow.text()).toBe('No hay usuarios disponibles');
  });

  it('selecciona un usuario al hacer clic', async () => {
    const wrapper = mount(UsersTable, {
      props: { users: mockUsers, roles: mockRoles }
    });
    const firstRow = wrapper.findAll('tbody tr')[0];
    await firstRow.trigger('click');
    expect(wrapper.emitted('user-selected')).toBeTruthy();
    expect(wrapper.emitted('user-selected')[0]).toEqual([mockUsers[0]]);
    expect(firstRow.classes()).toContain('selected');
  });


  it('muestra correctamente los IDs de los usuarios', () => {
    const wrapper = mount(UsersTable, {
      props: { users: mockUsers, roles: mockRoles }
    });
    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].findAll('td')[0].text()).toBe('1');
    expect(rows[1].findAll('td')[0].text()).toBe('2');
    expect(rows[2].findAll('td')[0].text()).toBe('3');
  });

  it('renderiza correctamente los roles', () => {
    const wrapper = mount(UsersTable, {
      props: { users: mockUsers, roles: mockRoles }
    });
    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].findAll('td')[4].text()).toBe('1');
    expect(rows[1].findAll('td')[4].text()).toBe('2');
    expect(rows[2].findAll('td')[4].text()).toBe('1');
  });

});