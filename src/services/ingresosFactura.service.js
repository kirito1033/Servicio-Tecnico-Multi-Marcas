const db = require('../db');


async function query(sql, params = []) {
  try {
    const [rows] = await db.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('❌ Error en query:', error);
    throw error;
  }
}


async function buscarOrdenesPorMM(mm) {
  const sql = `
    SELECT 
      id,
      mm
    FROM ordenes_servicio
    WHERE mm LIKE ?
    ORDER BY id DESC
    LIMIT 20
  `;

  const results = await query(sql, [`%${mm}%`]);

  return results.map(row => ({
    id: row.id,
    mm: row.mm
  }));
}

// 💾 CREAR INGRESO FACTURA
async function crearIngresoFactura(data) {
  try {

    const validarSql = `
      SELECT id
      FROM ordenes_servicio
      WHERE id = ?
      LIMIT 1
    `;

    const orden = await query(validarSql, [data.orden_servicio_id]);


    if (!orden.length) {
      throw new Error('La orden de servicio no existe');
    }


    const sql = `
      INSERT INTO ingresos_factura (
        orden_servicio_id,
        nombre_repuesto,
        vendedor,
        precio_compra,
        precio_venta
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      data.orden_servicio_id,
      data.nombre_repuesto,
      data.vendedor,
      data.precio_compra,
      data.precio_venta
    ];

    const result = await query(sql, params);


    return {
      id: result.insertId,
      ...data
    };

  } catch (error) {
    console.error('❌ Error en crearIngresoFactura:', error);
    throw error;
  }
}

async function listarOrdenesParaIngresos() {
  const sql = `
    SELECT os.id, os.numero_orden AS mm
    FROM ordenes_servicio os
    INNER JOIN estados_orden eo ON eo.id = os.estado_id
    WHERE eo.nombre IN ('Listo para entregar', 'Entregado')
    ORDER BY os.id DESC
  `;

  const results = await query(sql);

  return results.map(row => ({
    id: row.id,
    mm: row.mm
  }));
}

async function listarIngresosFactura() {
  const sql = `
    SELECT
      ir.id,
      os.numero_orden AS mm,
      eo.nombre AS estado,
      ir.nombre_repuesto,
      ir.vendedor,
      ir.precio_compra,
      ir.precio_venta,
      ir.created_at
    FROM ingresos_factura ir
    INNER JOIN ordenes_servicio os
      ON os.id = ir.orden_servicio_id
    INNER JOIN estados_orden eo
      ON eo.id = os.estado_id
    ORDER BY ir.created_at DESC
  `;

  return await query(sql);
}

async function actualizarIngresoFactura(id, data) {
  const sql = `
    UPDATE ingresos_factura
    SET nombre_repuesto = ?, vendedor = ?, precio_compra = ?, precio_venta = ?
    WHERE id = ?
  `;

  await query(sql, [
    data.nombre_repuesto,
    data.vendedor,
    data.precio_compra,
    data.precio_venta,
    id
  ]);
}

async function listarIngresosFacturaParaPdf() {
  const sql = `
    SELECT
      ir.id,
      os.numero_orden AS mm,
      eo.nombre AS estado,
      ir.nombre_repuesto,
      ir.vendedor,
      ir.precio_compra,
      ir.precio_venta,
      ir.created_at
    FROM ingresos_factura ir
    INNER JOIN ordenes_servicio os
      ON os.id = ir.orden_servicio_id
    INNER JOIN estados_orden eo
      ON eo.id = os.estado_id
    WHERE LOWER(eo.nombre) <> LOWER('Entregado y Facturado')
    ORDER BY ir.created_at DESC
  `;

  return await query(sql);
}

module.exports = {
  buscarOrdenesPorMM,
  crearIngresoFactura,
  listarOrdenesParaIngresos,
  listarIngresosFactura,
  actualizarIngresoFactura,
  listarIngresosFacturaParaPdf

};