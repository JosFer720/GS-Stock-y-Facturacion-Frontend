const { validateGuatemalanNIT, formatGuatemalanNIT } = require('../../utils/nitGuatemala');

describe('validateGuatemalanNIT', () => {
  it('considera válido un NIT vacío (opcional)', () => {
    expect(validateGuatemalanNIT('')).toEqual({ valid: true, message: '' });
    expect(validateGuatemalanNIT(null)).toEqual({ valid: true, message: '' });
    expect(validateGuatemalanNIT(undefined)).toEqual({ valid: true, message: '' });
  });

  it('reconoce CF (Consumidor Final), insensible a mayúsculas y espacios', () => {
    expect(validateGuatemalanNIT('CF')).toEqual({ valid: true, message: 'Consumidor Final válido' });
    expect(validateGuatemalanNIT('cf')).toEqual({ valid: true, message: 'Consumidor Final válido' });
    expect(validateGuatemalanNIT(' c f ')).toEqual({
      valid: true,
      message: 'Consumidor Final válido',
    });
  });

  it('acepta NITs alfanuméricos no numéricos', () => {
    expect(validateGuatemalanNIT('ABC123')).toEqual({ valid: true, message: 'NIT válido' });
  });

  it('rechaza caracteres no permitidos', () => {
    expect(validateGuatemalanNIT('AB!23')).toEqual({
      valid: false,
      message: 'El NIT debe ser alfanumérico (letras y números), o "CF" para Consumidor Final',
    });
  });

  it('valida el dígito verificador de un NIT numérico correcto', () => {
    // 01234567 -> dígito verificador calculado = 9
    expect(validateGuatemalanNIT('012345679')).toEqual({ valid: true, message: 'NIT válido' });
  });

  it('rechaza un NIT numérico con dígito verificador incorrecto', () => {
    expect(validateGuatemalanNIT('012345670')).toEqual({
      valid: false,
      message: 'Dígito verificador incorrecto',
    });
  });
});

describe('formatGuatemalanNIT', () => {
  it('devuelve cadena vacía para valores vacíos', () => {
    expect(formatGuatemalanNIT('')).toBe('');
    expect(formatGuatemalanNIT(null)).toBe('');
  });

  it('normaliza CF', () => {
    expect(formatGuatemalanNIT('cf')).toBe('CF');
    expect(formatGuatemalanNIT(' C F ')).toBe('CF');
  });

  it('deja los alfanuméricos no numéricos en mayúsculas sin separadores', () => {
    expect(formatGuatemalanNIT('abc-123')).toBe('ABC123');
  });

  it('agrega el guión del dígito verificador en NITs numéricos', () => {
    expect(formatGuatemalanNIT('12345678')).toBe('1234567-8');
    expect(formatGuatemalanNIT('123456789')).toBe('12345678-9');
    expect(formatGuatemalanNIT('1234-5678')).toBe('1234567-8');
  });
});
