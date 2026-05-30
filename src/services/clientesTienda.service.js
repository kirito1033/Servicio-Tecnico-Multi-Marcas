const pool = require('../db');

async function listarClientesTienda() {
  const [rows] = await pool.query(`
    SELECT id, nombre, apellido, telefono, correo, descripcion_falla, fecha_registro
    FROM clientes_tienda
    ORDER BY id DESC
  `);

  return rows;
}

async function crearClienteTienda(data) {
  const [result] = await pool.query(`
    INSERT INTO clientes_tienda (
      nombre,
      apellido,
      telefono,
      correo,
      descripcion_falla
    ) VALUES (?, ?, ?, ?, ?)
  `, [
    data.nombre,
    data.apellido,
    data.telefono,
    data.correo || null,
    data.descripcion_falla || null
  ]);

  return result;
}

module.exports = {
  listarClientesTienda,
  crearClienteTienda
};