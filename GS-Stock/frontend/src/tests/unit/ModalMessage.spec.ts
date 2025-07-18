import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ModalMessage from '@/components/ModalMessage.vue';

describe('ModalMessage.vue', () => {
  it('muestra el mensaje correctamente cuando show=true', () => {
    const wrapper = mount(ModalMessage, {
      props: {
        show: true,
        title: 'Título de prueba',
        message: 'Este es un mensaje de prueba',
        type: 'success',
      },
    });
    
    expect(wrapper.text()).toContain('Título de prueba');
    expect(wrapper.text()).toContain('Este es un mensaje de prueba');
    expect(wrapper.find('.modal-message').classes()).toContain('success');
  });

  it('no muestra el modal si show=false', () => {
    const wrapper = mount(ModalMessage, {
      props: {
        show: false,
        message: 'Mensaje oculto',
      },
    });

    expect(wrapper.find('.modal-message-overlay').exists()).toBe(false);
  });

  it('emite "close" al hacer clic en el botón', async () => {
    const wrapper = mount(ModalMessage, {
      props: {
        show: true,
        message: 'Mensaje para cerrar',
      },
    });

    await wrapper.find('.confirm-button').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('close');
  });
});
