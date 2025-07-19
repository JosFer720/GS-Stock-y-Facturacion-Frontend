import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import LoginView from '@/views/LoginView.vue';
import ModalMessage from '@/components/ModalMessage.vue';

// Mock del router de Vue
const mockRouter = {
  push: vi.fn()
};

// Mock de fetch global
global.fetch = vi.fn();

// Mock de localStorage
const mockLocalStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('LoginView.vue', () => {
  let wrapper;

  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    vi.clearAllMocks();
    
    wrapper = mount(LoginView, {
      global: {
        mocks: {
          $router: mockRouter
        },
        components: {
          ModalMessage
        }
      }
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renderiza el componente correctamente', () => {
    expect(wrapper.find('.login-container').exists()).toBe(true);
    expect(wrapper.find('h2').text()).toBe('Iniciar Sesión');
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('muestra el logo y los campos de entrada', () => {
    expect(wrapper.find('.logo-container img').exists()).toBe(true);
    expect(wrapper.find('#usuario').exists()).toBe(true);
    expect(wrapper.find('#contrasena').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toBe('Ingresar');
  });

  it('muestra el enlace de recuperar contraseña', () => {
    const recoverLink = wrapper.find('.recover-link a');
    expect(recoverLink.exists()).toBe(true);
    expect(recoverLink.text()).toBe('Recuperar contraseña');
  });

  it('actualiza los datos del formulario al escribir', async () => {
    const usuarioInput = wrapper.find('#usuario');
    const contrasenaInput = wrapper.find('#contrasena');

    await usuarioInput.setValue('testuser');
    await contrasenaInput.setValue('testpassword');

    expect(wrapper.vm.usuario).toBe('testuser');
    expect(wrapper.vm.contrasena).toBe('testpassword');
  });

  it('muestra error cuando los campos están vacíos', async () => {
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(wrapper.vm.showMessageModal).toBe(true);
    expect(wrapper.vm.messageTitle).toBe('Error');
    expect(wrapper.vm.messageContent).toBe('Por favor, complete todos los campos');
    expect(wrapper.vm.messageType).toBe('error');
  });

  it('muestra error cuando solo el usuario está lleno', async () => {
    await wrapper.find('#usuario').setValue('testuser');
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(wrapper.vm.showMessageModal).toBe(true);
    expect(wrapper.vm.messageTitle).toBe('Error');
    expect(wrapper.vm.messageContent).toBe('Por favor, complete todos los campos');
    expect(wrapper.vm.messageType).toBe('error');
  });

  it('realiza login exitoso y redirige al dashboard', async () => {
    const mockResponse = {
      token: 'fake-jwt-token',
      user: { id: 1, usuario: 'testuser', nombre: 'Test User' }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await wrapper.find('#usuario').setValue('testuser');
    await wrapper.find('#contrasena').setValue('testpassword');
    
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: 'testuser',
        contrasena: 'testpassword'
      }),
      mode: 'cors'
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('jwtToken', 'fake-jwt-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.user));
    
    expect(wrapper.vm.showMessageModal).toBe(true);
    expect(wrapper.vm.messageTitle).toBe('Éxito');
    expect(wrapper.vm.messageContent).toBe('Inicio de sesión exitoso');
    expect(wrapper.vm.messageType).toBe('success');
  });

  it('maneja errores de login del servidor', async () => {
    const mockErrorResponse = {
      error: 'Credenciales inválidas'
    };

    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockErrorResponse
    });

    await wrapper.find('#usuario').setValue('wronguser');
    await wrapper.find('#contrasena').setValue('wrongpassword');
    
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(wrapper.vm.showMessageModal).toBe(true);
    expect(wrapper.vm.messageTitle).toBe('Error');
    expect(wrapper.vm.messageContent).toBe('Credenciales inválidas');
    expect(wrapper.vm.messageType).toBe('error');
  });

  it('maneja errores de red', async () => {
    fetch.mockRejectedValueOnce(new Error('Error de conexión'));

    await wrapper.find('#usuario').setValue('testuser');
    await wrapper.find('#contrasena').setValue('testpassword');
    
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    expect(wrapper.vm.showMessageModal).toBe(true);
    expect(wrapper.vm.messageTitle).toBe('Error');
    expect(wrapper.vm.messageContent).toBe('Error de conexión');
    expect(wrapper.vm.messageType).toBe('error');
  });

  it('navega a la página de restablecer contraseña', async () => {
    const recoverLink = wrapper.find('.recover-link a');
    await recoverLink.trigger('click.prevent');

    expect(mockRouter.push).toHaveBeenCalledWith('/restablecer');
  });

  it('oculta el modal de mensaje correctamente', async () => {
    // Primero mostrar el modal
    wrapper.vm.showMessage('Test', 'Test message', 'info');
    expect(wrapper.vm.showMessageModal).toBe(true);

    // Luego ocultarlo
    wrapper.vm.hideMessage();
    expect(wrapper.vm.showMessageModal).toBe(false);
  });

  it('muestra el modal de mensaje con los parámetros correctos', () => {
    wrapper.vm.showMessage('Título de prueba', 'Mensaje de prueba', 'warning');

    expect(wrapper.vm.messageTitle).toBe('Título de prueba');
    expect(wrapper.vm.messageContent).toBe('Mensaje de prueba');
    expect(wrapper.vm.messageType).toBe('warning');
    expect(wrapper.vm.showMessageModal).toBe(true);
  });

  it('tiene valores iniciales correctos', () => {
    expect(wrapper.vm.usuario).toBe('');
    expect(wrapper.vm.contrasena).toBe('');
    expect(wrapper.vm.showMessageModal).toBe(false);
    expect(wrapper.vm.messageTitle).toBe('');
    expect(wrapper.vm.messageContent).toBe('');
    expect(wrapper.vm.messageType).toBe('info');
  });
});