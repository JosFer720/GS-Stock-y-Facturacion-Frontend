// Error de negocio con un status HTTP y un cuerpo de respuesta asociado.
// El servicio lo lanza para casos esperados (400/404/...) y el controlador
// lo traduce a `res.status(status).json(body)`.
class ServiceError extends Error {
  /**
   * @param {number} status  Código HTTP (p. ej. 400, 404).
   * @param {object} body    Cuerpo JSON tal cual debe responderse.
   */
  constructor(status, body) {
    super(body && body.error ? body.error : `ServiceError ${status}`);
    this.name = 'ServiceError';
    this.status = status;
    this.body = body;
  }
}

module.exports = ServiceError;
