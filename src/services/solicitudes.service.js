const pool = require('../db');

exports.crearSolicitud = async ({
  item_id,
  stock_id,
  solicitado_por_usuario_id,
  cantidad,
  rn
}) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    let stockIdUsar = stock_id || null;

    if (!stockIdUsar) {
      const [stockRows] = await conn.query(
        `
        SELECT id
        FROM inventario_stock
        WHERE item_id = ?
        ORDER BY cantidad_disponible DESC, id ASC
        LIMIT 1
        `,
        [item_id]
      );

      if (stockRows.length) {
        stockIdUsar = stockRows[0].id;
      }
    }

    const [result] = await conn.query(
      `
      INSERT INTO solicitudes (
        item_id,
        stock_id,
        solicitado_por_usuario_id,
        cantidad,
        rn,
        observacion,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente_aprobacion')
      `,
      [
        item_id,
        stockIdUsar || null,
        solicitado_por_usuario_id,
        cantidad || 1,
        rn || null,
        null
      ]
    );

    const solicitudId = result.insertId;

    await conn.query(
      `
      INSERT INTO solicitudes_historial (
        solicitud_id,
        estado_anterior,
        estado_nuevo,
        rn,
        observacion,
        usuario_id
      ) VALUES (?, NULL, 'pendiente_aprobacion', ?, ?, ?)
      `,
      [
        solicitudId,
        rn || null,
        null,
        solicitado_por_usuario_id
      ]
    );

    await conn.commit();

    return { solicitudId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

exports.listarSolicitudes = async (filtros = {}) => {
  let sql = `
    SELECT
      s.id,
      s.item_id,
      s.stock_id,
      s.solicitado_por_usuario_id,
      s.aprobado_por_usuario_id,
      s.recibido_por_usuario_id,
      s.cantidad,
      s.rn,
      s.observacion,
      s.estado,
      s.fecha_solicitud,
      ii.codigo_item,
      ii.nombre_producto,
      ii.descripcion,
      ist.cantidad_mano,
      ist.cantidad_disponible,
      ist.cantidad_congelada,
      us.nombre AS solicitado_por_nombre,
      ua.nombre AS aprobado_por_nombre,
      ur.nombre AS recibido_por_nombre
    FROM solicitudes s
    LEFT JOIN inventario_items ii ON ii.id = s.item_id
    LEFT JOIN inventario_stock ist ON ist.id = s.stock_id
    LEFT JOIN usuarios us ON us.id = s.solicitado_por_usuario_id
    LEFT JOIN usuarios ua ON ua.id = s.aprobado_por_usuario_id
    LEFT JOIN usuarios ur ON ur.id = s.recibido_por_usuario_id
    WHERE 1 = 1
  `;

  const params = [];

  if (filtros.estado && String(filtros.estado).trim() !== '') {
    sql += ` AND s.estado = ?`;
    params.push(String(filtros.estado).trim());
  }

  if (filtros.codigo_item && String(filtros.codigo_item).trim() !== '') {
    sql += ` AND ii.codigo_item LIKE ?`;
    params.push(`%${String(filtros.codigo_item).trim()}%`);
  }

  if (filtros.nombre && String(filtros.nombre).trim() !== '') {
    sql += ` AND (
      COALESCE(ii.nombre_producto, '') LIKE ?
      OR COALESCE(ii.descripcion, '') LIKE ?
    )`;
    params.push(`%${String(filtros.nombre).trim()}%`);
    params.push(`%${String(filtros.nombre).trim()}%`);
  }

  sql += ` ORDER BY s.fecha_solicitud DESC, s.id DESC`;

  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.obtenerHistorial = async (solicitudId) => {
  const [rows] = await pool.query(
    `
    SELECT
      sh.id,
      sh.solicitud_id,
      sh.estado_anterior,
      sh.estado_nuevo,
      sh.rn,
      sh.observacion,
      sh.usuario_id,
      sh.fecha_cambio,
      u.nombre AS usuario_nombre
    FROM solicitudes_historial sh
    LEFT JOIN usuarios u ON u.id = sh.usuario_id
    WHERE sh.solicitud_id = ?
    ORDER BY sh.id DESC
    `,
    [solicitudId]
  );

  return rows;
};

exports.actualizarEstadoSolicitud = async ({ solicitudId, nuevoEstado, rn, usuarioId }) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `
      SELECT id, estado
      FROM solicitudes
      WHERE id = ?
      LIMIT 1
      `,
      [solicitudId]
    );

    if (!rows.length) {
      throw new Error('Solicitud no encontrada');
    }

    const solicitud = rows[0];
    const estadoAnterior = solicitud.estado;

    await conn.query(
      `
      UPDATE solicitudes
      SET
        estado = ?,
        rn = ?,
        observacion = NULL,
        aprobado_por_usuario_id = CASE
          WHEN ? = 'entregado' THEN ?
          ELSE aprobado_por_usuario_id
        END,
        recibido_por_usuario_id = CASE
          WHEN ? = 'devuelto' THEN ?
          ELSE recibido_por_usuario_id
        END
      WHERE id = ?
      `,
      [nuevoEstado, rn || null, nuevoEstado, usuarioId, nuevoEstado, usuarioId, solicitudId]
    );

    await conn.query(
      `
      INSERT INTO solicitudes_historial (
        solicitud_id,
        estado_anterior,
        estado_nuevo,
        rn,
        observacion,
        usuario_id
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [solicitudId, estadoAnterior, nuevoEstado, rn || null, null, usuarioId]
    );

    await conn.commit();

    return {
      solicitudId,
      estadoAnterior,
      estadoNuevo: nuevoEstado
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};