// generarToken.js
const jwt = require('jsonwebtoken');

const payload = {
  id: 1,
  nombre: "UsuarioDePrueba"
};

const secret = "fba7a07f4174d84d67ad67aedf16422a"; // debe ser igual al JWT_SECRET

const token = jwt.sign(payload, secret, { expiresIn: "1h" });

console.log("TOKEN:", token);
