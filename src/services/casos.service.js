const pool = require('../db');

function generarMM() {
  const prefijo = 'MM';
  let numeros = '';
  for (let i = 0; i < 10; i++) {
    numeros += Math.floor(Math.random() * 10);
  }
  return prefijo + numeros;
}

async function obtenerCasos(filtros) {
  const { mm, tecnico, telefono, identificacion } = filtros;

  let sql = `
    SELECT
      os.id,
      os.numero_orden,
      os.mm,
      os.falla_reportada AS falla,
      os.descripcion_apariencia AS apariencia,
      os.fecha_ingreso AS fecha_ingreso,
      os.fecha_egreso AS fecha_egreso,
      os.precio AS precio,
      os.diagnostico AS diagnostico,
      eo.nombre AS estado,

      c.id AS cliente_id,
      c.nombre AS nombre,
      c.apellido AS apellido,
      c.telefono AS telefono,
      c.email AS email,
      c.numero_identificacion AS numero_identificacion,
      c.tipo_identificacion_id AS tipo_identificacion_id,

      ti.nombre AS tipo_identificacion,

      t.id AS tecnico_id,
      t.nombre AS tecnico,

      e.id AS equipo_id,
      e.modelo AS modelo,
      e.color AS color,
      e.serial_sn AS sn,
      e.contrasena AS contrasena
    FROM ordenes_servicio os
    LEFT JOIN clientes c ON os.cliente_id = c.id
    LEFT JOIN tipos_identificacion ti ON c.tipo_identificacion_id = ti.id
    LEFT JOIN tecnicos t ON os.tecnico_id = t.id
    LEFT JOIN equipos e ON os.equipo_id = e.id
    LEFT JOIN estados_orden eo ON os.estado_id = eo.id
    WHERE 1=1
  `;

  const params = [];

  if (mm && mm.trim() !== '') {
    sql += ' AND os.mm LIKE ?';
    params.push(`%${mm.trim()}%`);
  }

  if (tecnico && tecnico.trim() !== '') {
    sql += ' AND t.nombre = ?';
    params.push(tecnico.trim());
  }

  if (telefono && telefono.trim() !== '') {
    sql += ' AND c.telefono LIKE ?';
    params.push(`%${telefono.trim()}%`);
  }

  if (identificacion && identificacion.trim() !== '') {
    sql += ' AND c.numero_identificacion LIKE ?';
    params.push(`%${identificacion.trim()}%`);
  }

  sql += ' ORDER BY os.fecha_ingreso DESC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function crearIngreso(data) {
  const conn = await pool.getConnection();
  const mm = generarMM();

  try {
    await conn.beginTransaction();

    const sucursalNombre = data.sucursal || 'UNILAGO';
    const estadoNombre = 'Ingresado';

    const accesoriosSeleccionados = Array.isArray(data.accesoriosSeleccionados)
      ? data.accesoriosSeleccionados
      : [];

    const estadoGeneralSeleccionado = Array.isArray(data.estadoGeneralSeleccionado)
      ? data.estadoGeneralSeleccionado
      : [];

    const componentesSeleccionados = data.componentesSeleccionados || {};
    const accesorioOtroTexto = (data.accesorioOtroTexto || '').trim();

    const accesoriosResumen = [
      ...accesoriosSeleccionados.filter(a => a !== 'Otro'),
      ...(accesoriosSeleccionados.includes('Otro') && accesorioOtroTexto ? [`Otro: ${accesorioOtroTexto}`] : [])
    ].join(', ') || null;

    const estadoGeneralResumen = estadoGeneralSeleccionado.join(', ') || null;

    const componentesResumen = Object.entries(componentesSeleccionados)
      .filter(([, valor]) => valor)
      .map(([clave, valor]) => `${clave}: ${valor}`)
      .join(' | ') || null;

    let [rows] = await conn.query(
      'SELECT id FROM sucursales WHERE nombre = ? LIMIT 1',
      [sucursalNombre]
    );

    let sucursalId;
    if (rows.length) {
      sucursalId = rows[0].id;
    } else {
      const [result] = await conn.query(
        'INSERT INTO sucursales (nombre) VALUES (?)',
        [sucursalNombre]
      );
      sucursalId = result.insertId;
    }

    let tecnicoId = null;
    if (data.tecnico) {
      [rows] = await conn.query(
        'SELECT id FROM tecnicos WHERE nombre = ? LIMIT 1',
        [data.tecnico]
      );

      if (rows.length) {
        tecnicoId = rows[0].id;
      } else {
        const [result] = await conn.query(
          'INSERT INTO tecnicos (nombre, apellido) VALUES (?, ?)',
          [data.tecnico, '']
        );
        tecnicoId = result.insertId;
      }
    }

    const [clienteResult] = await conn.query(
      `INSERT INTO clientes (
        nombre, apellido, tipo_identificacion_id, numero_identificacion, telefono, email
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.nombre || '',
        data.apellido || '',
        data.tipo_identificacion_id || null,
        data.numero_identificacion || null,
        data.telefono || '',
        data.email || ''
      ]
    );

    const clienteId = clienteResult.insertId;

    const [equipoResult] = await conn.query(
      `INSERT INTO equipos (
        cliente_id, modelo, color, serial_sn, contrasena,
        accesorios_resumen, estado_general_resumen, componentes_resumen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clienteId,
        data.modelo || '',
        data.color || '',
        data.sn || '',
        data.contrasena || '',
        accesoriosResumen,
        estadoGeneralResumen,
        componentesResumen
      ]
    );

    const equipoId = equipoResult.insertId;

    [rows] = await conn.query(
      'SELECT id FROM estados_orden WHERE nombre = ? LIMIT 1',
      [estadoNombre]
    );

    let estadoId;
    if (rows.length) {
      estadoId = rows[0].id;
    } else {
      const [result] = await conn.query(
        'INSERT INTO estados_orden (nombre) VALUES (?)',
        [estadoNombre]
      );
      estadoId = result.insertId;
    }

    const garantiaServicio = estadoGeneralSeleccionado.includes('Garantía servicio técnico') ? 1 : 0;
    const evidenciaManipulacion = estadoGeneralSeleccionado.includes('Evidencia de manipulación') ? 1 : 0;
    const equipoMojado = estadoGeneralSeleccionado.includes('Equipo mojado') ? 1 : 0;

    const [ordenResult] = await conn.query(
      `INSERT INTO ordenes_servicio (
        numero_orden,
        sucursal_id,
        tecnico_id,
        cliente_id,
        equipo_id,
        falla_reportada,
        descripcion_apariencia,
        fecha_ingreso,
        precio,
        fecha_egreso,
        estado_id,
        mm,
        diagnostico,
        garantia_servicio,
        autorizacion_revision,
        evidencia_manipulacion,
        equipo_mojado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mm,
        sucursalId,
        tecnicoId,
        clienteId,
        equipoId,
        data.falla || '',
        data.apariencia || '',
        data.fechaIngreso || null,
        data.precio || null,
        data.fechaEgreso || null,
        estadoId,
        mm,
        data.diagnostico || '',
        garantiaServicio,
        0,
        evidenciaManipulacion,
        equipoMojado
      ]
    );

    const ordenId = ordenResult.insertId;

    for (const accesorio of accesoriosSeleccionados) {
      if (accesorio === 'Otro') continue;

      const [catalogoRows] = await conn.query(
        'SELECT id FROM catalogo_accesorios WHERE nombre = ? LIMIT 1',
        [accesorio]
      );

      if (catalogoRows.length) {
        await conn.query(
          `INSERT INTO orden_accesorios (orden_id, accesorio_id, marcado)
           VALUES (?, ?, 1)`,
          [ordenId, catalogoRows[0].id]
        );
      }
    }

    for (const item of estadoGeneralSeleccionado) {
      const [catalogoRows] = await conn.query(
        'SELECT id FROM catalogo_checks_estado WHERE nombre = ? LIMIT 1',
        [item]
      );

      if (catalogoRows.length) {
        await conn.query(
          `INSERT INTO orden_checks_estado (orden_id, check_id, marcado)
           VALUES (?, ?, 1)`,
          [ordenId, catalogoRows[0].id]
        );
      }
    }

    const mapaComponentes = {
      touch: 'Touch',
      visor: 'Visor/Cristal',
      carcasa: 'Carcasa',
      biometria: 'Biométrico',
      camaraFrontal: 'Cámara frontal',
      camaraTrasera: 'Cámara trasera',
      buzzer: 'Buzzer',
      altavoz: 'Altavoz',
      microfono: 'Micrófono'
    };

    for (const [clave, valor] of Object.entries(componentesSeleccionados)) {
      if (!valor) continue;

      const nombreComponente = mapaComponentes[clave];
      if (!nombreComponente) continue;

      const [catalogoRows] = await conn.query(
        `SELECT id
         FROM catalogo_checks_componentes
         WHERE componente = ? AND estado_opcion = ?
         LIMIT 1`,
        [nombreComponente, valor]
      );

      if (catalogoRows.length) {
        await conn.query(
          `INSERT INTO orden_checks_componentes (orden_id, check_componente_id, marcado)
           VALUES (?, ?, 1)`,
          [ordenId, catalogoRows[0].id]
        );
      }
    }

    await conn.commit();
    return { mm, ordenId, equipoId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function actualizarCaso(data) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const casoId = Number(data.id);
    if (!casoId) {
      throw new Error('ID del caso inválido');
    }

    const [ordenRows] = await conn.query(
      `SELECT id, cliente_id, equipo_id
       FROM ordenes_servicio
       WHERE id = ?
       LIMIT 1`,
      [casoId]
    );

    if (!ordenRows.length) {
      throw new Error('Caso no encontrado');
    }

    const orden = ordenRows[0];

    let tecnicoId = null;
    if (data.tecnico) {
      const [tecnicoRows] = await conn.query(
        'SELECT id FROM tecnicos WHERE nombre = ? LIMIT 1',
        [data.tecnico]
      );

      if (tecnicoRows.length) {
        tecnicoId = tecnicoRows[0].id;
      }
    }

    let estadoId = null;
    if (data.estado) {
      const [estadoRows] = await conn.query(
        'SELECT id FROM estados_orden WHERE nombre = ? LIMIT 1',
        [data.estado]
      );

      if (estadoRows.length) {
        estadoId = estadoRows[0].id;
      }
    }

    await conn.query(
      `UPDATE clientes
       SET nombre = ?,
           apellido = ?,
           tipo_identificacion_id = ?,
           numero_identificacion = ?,
           telefono = ?,
           email = ?
       WHERE id = ?`,
      [
        data.nombre || '',
        data.apellido || '',
        data.tipoIdentificacionId || null,
        data.numeroIdentificacion || null,
        data.telefono || '',
        data.email || '',
        orden.cliente_id
      ]
    );

    await conn.query(
      `UPDATE equipos
       SET modelo = ?,
           color = ?,
           serial_sn = ?,
           contrasena = ?
       WHERE id = ?`,
      [
        data.modelo || '',
        data.color || '',
        data.sn || '',
        data.contrasena || '',
        orden.equipo_id
      ]
    );

    await conn.query(
      `UPDATE ordenes_servicio
       SET tecnico_id = ?,
           falla_reportada = ?,
           descripcion_apariencia = ?,
           fecha_ingreso = ?,
           precio = ?,
           fecha_egreso = ?,
           estado_id = ?,
           diagnostico = ?
       WHERE id = ?`,
      [
        tecnicoId,
        data.falla || '',
        data.apariencia || '',
        data.fechaIngreso || null,
        data.precio || null,
        data.fechaEgreso || null,
        estadoId,
        data.diagnostico || '',
        casoId
      ]
    );

    await conn.commit();

    return {
      id: casoId,
      clienteId: orden.cliente_id,
      equipoId: orden.equipo_id
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function obtenerCasoPdf(id) {
  const [rows] = await pool.query(`
    SELECT
      os.id,
      os.numero_orden,
      os.mm,
      os.falla_reportada AS falla,
      os.descripcion_apariencia AS apariencia,
      os.fecha_ingreso AS fecha_ingreso,
      os.fecha_egreso AS fecha_egreso,
      os.precio AS precio,
      os.diagnostico AS diagnostico,
      eo.nombre AS estado,

      c.id AS cliente_id,
      c.nombre AS nombre,
      c.apellido AS apellido,
      c.telefono AS telefono,
      c.email AS email,
      c.numero_identificacion AS numero_identificacion,
      c.tipo_identificacion_id AS tipo_identificacion_id,
      ti.nombre AS tipo_identificacion,

      t.id AS tecnico_id,
      t.nombre AS tecnico,

      e.id AS equipo_id,
      e.modelo AS modelo,
      e.color AS color,
      e.serial_sn AS sn,
      e.contrasena AS contrasena

    FROM ordenes_servicio os
    LEFT JOIN clientes c ON os.cliente_id = c.id
    LEFT JOIN tipos_identificacion ti ON c.tipo_identificacion_id = ti.id
    LEFT JOIN tecnicos t ON os.tecnico_id = t.id
    LEFT JOIN equipos e ON os.equipo_id = e.id
    LEFT JOIN estados_orden eo ON os.estado_id = eo.id
    WHERE os.id = ?
    LIMIT 1
  `, [id]);

  if (!rows.length) return null;

  const caso = rows[0];

  const [accesoriosRows] = await pool.query(`
    SELECT ca.nombre
    FROM orden_accesorios oa
    INNER JOIN catalogo_accesorios ca
      ON ca.id = oa.accesorio_id
    WHERE oa.orden_id = ?
      AND oa.marcado = 1
  `, [id]);

  const [componentesRows] = await pool.query(`
    SELECT 
      ccc.componente,
      ccc.estado_opcion AS estado
    FROM orden_checks_componentes occ
    INNER JOIN catalogo_checks_componentes ccc
      ON ccc.id = occ.check_componente_id
    WHERE occ.orden_id = ?
      AND occ.marcado = 1
  `, [id]);

  return {
    ...caso,
    sucursal: 'UNILAGO',
    accesorios: accesoriosRows.map(a => a.nombre),
    estadoGeneral: caso.estado ? [caso.estado] : [],
    componentes: componentesRows.reduce((acc, item) => {
      if (!acc[item.componente]) {
        acc[item.componente] = [];
      }
      acc[item.componente].push(item.estado);
      return acc;
    }, {})
  };
}

module.exports = {
  obtenerCasos,
  crearIngreso,
  actualizarCaso,
  obtenerCasoPdf
};