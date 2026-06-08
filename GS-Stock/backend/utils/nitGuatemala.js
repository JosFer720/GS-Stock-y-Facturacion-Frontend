// Utilidades puras para validar y formatear el NIT guatemalteco.
// No dependen de la base de datos ni de Express: son testeables en aislamiento.

/**
 * Valida un NIT guatemalteco.
 * - Vacío => válido (NIT opcional).
 * - "CF" => Consumidor Final.
 * - Alfanumérico (1-20) => válido.
 * - Numérico de 8-9 dígitos => se verifica el dígito verificador.
 * @param {string} nit
 * @returns {{ valid: boolean, message: string }}
 */
const validateGuatemalanNIT = (nit) => {
  if (!nit) return { valid: true, message: '' };

  const nitClean = nit.replace(/[\s-]/g, '').toUpperCase();

  if (nitClean === 'CF') {
    return {
      valid: true,
      message: 'Consumidor Final válido',
    };
  }

  // Validar que sea alfanumérico (solo letras y números)
  if (!/^[A-Z0-9]{1,20}$/.test(nitClean)) {
    return {
      valid: false,
      message: 'El NIT debe ser alfanumérico (letras y números), o "CF" para Consumidor Final',
    };
  }

  // Si es solo dígitos, realizar validación de dígito verificador
  if (/^[0-9]{8,9}$/.test(nitClean)) {
    const nitPadded = nitClean.length === 8 ? '0' + nitClean : nitClean;
    const nitDigits = nitPadded.substring(0, 8);
    const checkDigit = parseInt(nitPadded.substring(8, 9));

    let sum = 0;
    let multiplier = 2;

    for (let i = 7; i >= 0; i--) {
      sum += parseInt(nitDigits[i]) * multiplier;
      multiplier++;
    }

    let calculatedDigit = 11 - (sum % 11);

    if (calculatedDigit === 11) {
      calculatedDigit = 0;
    } else if (calculatedDigit === 10) {
      return {
        valid: false,
        message: 'NIT inválido - dígito verificador incorrecto',
      };
    }

    if (calculatedDigit !== checkDigit) {
      return {
        valid: false,
        message: 'Dígito verificador incorrecto',
      };
    }
  }

  return {
    valid: true,
    message: 'NIT válido',
  };
};

/**
 * Normaliza el formato del NIT guatemalteco.
 * - Vacío => "".
 * - "CF" => "CF".
 * - Alfanumérico no numérico => tal cual (mayúsculas, sin espacios/guiones).
 * - Numérico de 8/9 dígitos => con guión antes del dígito verificador.
 * @param {string} nit
 * @returns {string}
 */
const formatGuatemalanNIT = (nit) => {
  if (!nit) return '';

  const nitClean = nit.replace(/[\s-]/g, '').toUpperCase();

  if (nitClean === 'CF') {
    return 'CF';
  }

  // Para NITs alfanuméricos puros (no numéricos), retornar como está
  if (!/^[0-9]+$/.test(nitClean)) {
    return nitClean;
  }

  // Para NITs numéricos, aplicar formato con guión
  if (nitClean.length === 8) {
    return `${nitClean.substring(0, 7)}-${nitClean.substring(7)}`;
  } else if (nitClean.length === 9) {
    return `${nitClean.substring(0, 8)}-${nitClean.substring(8)}`;
  }

  return nitClean;
};

module.exports = {
  validateGuatemalanNIT,
  formatGuatemalanNIT,
};
