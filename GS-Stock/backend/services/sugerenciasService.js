// Servicio de Sugerencias de facturación.
const repo = require('../repositories/sugerenciasRepository');

async function getSugerencias() {
  const [clientes, metodosPago, productos] = await Promise.all([
    repo.findClientesParaSugerencias(),
    repo.findMetodosPago(),
    repo.findProductosDisponibles(),
  ]);
  return { clientes, metodosPago, productos };
}

async function buscarClienteEmpresa(empresa) {
  return repo.findClientesByEmpresa(empresa);
}

module.exports = {
  getSugerencias,
  buscarClienteEmpresa,
};
