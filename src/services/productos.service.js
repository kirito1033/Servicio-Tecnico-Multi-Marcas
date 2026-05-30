const pool = require('../db');

function normalizarTexto(valor) {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio === '' ? null : limpio;
}

function normalizarEntero(valor, porDefecto) {
  const n = Number.parseInt(valor, 10);
  return Number.isNaN(n) || n <= 0 ? porDefecto : n;
}

exports.listarProductos = async (filtros = {}) => {
  const page = normalizarEntero(filtros.page, 1);
  const limit = normalizarEntero(filtros.limit, 10);
  const offset = (page - 1) * limit;

  const nombre = normalizarTexto(filtros.nombre);
  const codigoItem = normalizarTexto(filtros.codigo_item);
  const createdFrom = normalizarTexto(filtros.created_from);
  const createdTo = normalizarTexto(filtros.created_to);
  const updatedFrom = normalizarTexto(filtros.updated_from);
  const updatedTo = normalizarTexto(filtros.updated_to);

  let where = 'WHERE 1 = 1';
  const params = [];
  const countParams = [];

  if (nombre) {
    where += ' AND COALESCE(ii.nombre_producto, \'\') LIKE CONCAT(\'%\', ?, \'%\')';
    params.push(nombre);
    countParams.push(nombre);
  }

  if (codigoItem) {
    where += ' AND ii.codigo_item LIKE CONCAT(\'%\', ?, \'%\')';
    params.push(codigoItem);
    countParams.push(codigoItem);
  }

  if (createdFrom) {
    where += ' AND DATE(ii.created_at) >= ?';
    params.push(createdFrom);
    countParams.push(createdFrom);
  }

  if (createdTo) {
    where += ' AND DATE(ii.created_at) <= ?';
    params.push(createdTo);
    countParams.push(createdTo);
  }

  if (updatedFrom) {
    where += ' AND DATE(ii.updated_at) >= ?';
    params.push(updatedFrom);
    countParams.push(updatedFrom);
  }

  if (updatedTo) {
    where += ' AND DATE(ii.updated_at) <= ?';
    params.push(updatedTo);
    countParams.push(updatedTo);
  }

  const sqlCount = `
    SELECT COUNT(*) AS total
    FROM inventario_items ii
    ${where}
  `;

  const sqlData = `
    SELECT
      ii.id,
      ii.codigo_item,
      ii.nombre_producto,
      ii.descripcion,
      COALESCE(SUM(s.cantidad_mano), 0) AS cantidad_mano,
      COALESCE(SUM(s.cantidad_disponible), 0) AS cantidad_disponible,
      COALESCE(SUM(s.cantidad_congelada), 0) AS cantidad_congelada
    FROM inventario_items ii
    LEFT JOIN inventario_stock s ON s.item_id = ii.id
    ${where}
    GROUP BY
      ii.id,
      ii.codigo_item,
      ii.nombre_producto,
      ii.descripcion
    ORDER BY ii.nombre_producto ASC, ii.id DESC
    LIMIT ? OFFSET ?
  `;

  const [countRows] = await pool.query(sqlCount, countParams);
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.query(sqlData, [...params, limit, offset]);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};