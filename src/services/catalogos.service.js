const pool = require('../db');

async function obtenerTiposIdentificacion() {
  const [rows] = await pool.query(`
    SELECT id, nombre
    FROM tipos_identificacion
    ORDER BY nombre ASC
  `);

  return rows;
}

async function obtenerTecnicos() {
  const [rows] = await pool.query(`
    SELECT id, nombre
    FROM tecnicos
    WHERE activo = 1
    ORDER BY nombre ASC
  `);

  return rows;
}

module.exports = {
  obtenerTiposIdentificacion,
  obtenerTecnicos
};