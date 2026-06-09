// Validadores de formato reutilizables (funciones puras).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Usuario: solo letras, números y guiones bajos.
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const isValidEmail = (email) => EMAIL_REGEX.test(email);
const isValidUsername = (usuario) => USERNAME_REGEX.test(usuario);

module.exports = {
  isValidEmail,
  isValidUsername,
};
