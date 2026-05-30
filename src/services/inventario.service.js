const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pool = require('../db');

function normalizarTexto(valor) {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio === '' ? null : limpio;
}

function normalizarNumero(valor) {
  if (valor === undefined || valor === null || valor === '') return 0;
  const numero = Number(String(valor).toString().replace(/,/g, '').trim());
  return Number.isNaN(numero) ? 0 : numero;
}

function normalizarBooleano(valor) {
  const v = normalizarTexto(valor);
  if (!v) return 0;
  const map = ['si', 'sí', 'yes', 'true', '1', 'x'];
  return map.includes(v.toLowerCase()) ? 1 : 0;
}

function obtenerValorFila(row, posiblesNombres = []) {
  for (const nombre of posiblesNombres) {
    if (Object.prototype.hasOwnProperty.call(row, nombre)) {
      return row[nombre];
    }
  }
  return null;
}

function validarEncabezados(rows) {
  if (!rows.length) {
    throw new Error('El archivo Excel no contiene filas de datos');
  }

  const encabezadosRequeridos = [
    'Código de ítem',
    'Descripción'
  ];

  const columnas = Object.keys(rows[0]);
  const faltantes = encabezadosRequeridos.filter(col => !columnas.includes(col));

  if (faltantes.length) {
    throw new Error(`Faltan columnas requeridas: ${faltantes.join(', ')}`);
  }
}

function validarCodigosDuplicados(rows) {
  const vistos = new Map();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const codigoOriginal = obtenerValorFila(row, ['Código de ítem']);
    const codigoNormalizado = normalizarTexto(codigoOriginal);

    if (!codigoNormalizado) continue;

    const clave = codigoNormalizado.toUpperCase();

    if (vistos.has(clave)) {
      const primeraAparicion = vistos.get(clave);

      throw new Error(
        `El archivo contiene códigos de ítem duplicados. Código "${codigoNormalizado}" repetido en fila ${index + 2} (primera aparición en fila ${primeraAparicion})`
      );
    }

    vistos.set(clave, index + 2);
  }
}

exports.importarExcel = async (req) => {
  if (!req.file) {
    throw new Error('No se recibió ningún archivo');
  }

  const filePath = req.file.path;
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null });

  console.log('Hojas detectadas:', workbook.SheetNames);
  console.log('Primera hoja:', workbook.SheetNames[0]);
  console.log('Rango !ref:', firstSheet['!ref']);
  console.log('Encabezados:', Object.keys(rows[0] || {}));
  console.log('Primeras 5 filas:', rows.slice(0, 5));

  validarEncabezados(rows);
  validarCodigosDuplicados(rows);
  const conn = await pool.getConnection();

  let importacionId = null;
  let filasNuevas = 0;
  let filasActualizadas = 0;
  let filasSinCambios = 0;
  let filasError = 0;
  const detalleErrores = [];

  try {
    await conn.beginTransaction();

    const [importResult] = await conn.query(
      `
      INSERT INTO inventario_importaciones
      (nombre_archivo, total_filas, estado)
      VALUES (?, ?, 'procesando')
      `,
      [req.file.originalname, rows.length]
    );

    importacionId = importResult.insertId;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      try {
        const codigoItem = normalizarTexto(obtenerValorFila(row, ['Código de ítem'])) || null;
        const descripcion = normalizarTexto(obtenerValorFila(row, ['Descripción'])) || null;
        const modeloProducto = normalizarTexto(obtenerValorFila(row, ['Modelo de producto'])) || null;
        const devolucionBuenEstado = normalizarBooleano(
          obtenerValorFila(row, ['Devolución de piezas en buen estado permitida o no'])
        );
        const nombreProducto = normalizarTexto(obtenerValorFila(row, ['Nombre del producto'])) || null;
        const clasificacionMaterialServicio = normalizarTexto(
          obtenerValorFila(row, ['Clasificaiton de Material de Servicio', 'Clasificación de Material de Servicio'])
        ) || null;
        const tipoMaterial = normalizarTexto(obtenerValorFila(row, ['Tipo de material'])) || null;
        const organizacion = normalizarTexto(obtenerValorFila(row, ['Organización'])) || null;
        const nombreCliente = normalizarTexto(obtenerValorFila(row, ['Nombre del cliente'])) || null;
        const cantidadMano = normalizarNumero(obtenerValorFila(row, ['Cantidad en la mano']));
        const cantidadDisponible = normalizarNumero(obtenerValorFila(row, ['Cantidad disponible']));
        const cantidadCongelada = normalizarNumero(obtenerValorFila(row, ['Cantidad congelada']));
        const unidad = normalizarTexto(obtenerValorFila(row, ['Unidad'])) || null;
        const precio = normalizarNumero(obtenerValorFila(row, ['Precio']));
        const moneda = normalizarTexto(obtenerValorFila(row, ['Moneda'])) || null;
        const subalmacen = normalizarTexto(obtenerValorFila(row, ['Subalmacén'])) || null;
        const localizador = normalizarTexto(obtenerValorFila(row, ['Localizador'])) || null;
        const indicadorDevolucionVirtual = normalizarBooleano(
          obtenerValorFila(row, ['Indicador de devolución virtual'])
        );
        const color = normalizarTexto(obtenerValorFila(row, ['Color'])) || null;
        const ram = normalizarTexto(obtenerValorFila(row, ['RAM'])) || null;
        const rom = normalizarTexto(obtenerValorFila(row, ['ROM'])) || null;
        const infoTarjetaSim = normalizarTexto(obtenerValorFila(row, ['Información de tarjeta SIM'])) || null;
        const versionProducto = normalizarTexto(obtenerValorFila(row, ['Versión'])) || null;
        const region = normalizarTexto(obtenerValorFila(row, ['Región'])) || null;
        const oficinaRepresentante = normalizarTexto(obtenerValorFila(row, ['Oficina del representante'])) || null;
        const paisRegion = normalizarTexto(obtenerValorFila(row, ['País/Región'])) || null;
        const observaciones = normalizarTexto(obtenerValorFila(row, ['Observaciones'])) || null;
        const seriesProductos = normalizarTexto(obtenerValorFila(row, ['Todas las series de productos'])) || null;
        const nombresMarketing = normalizarTexto(obtenerValorFila(row, ['Todos los nombres de marketing'])) || null;
        const modelosProductosRelacionados = normalizarTexto(obtenerValorFila(row, ['Todos los modelos de productos'])) || null;

        if (!codigoItem) {
          throw new Error('Código de ítem vacío o no reconocido');
        }

        if (!descripcion) {
          throw new Error('Descripción vacía o no reconocida');
        }

        await conn.query(
          `
          INSERT INTO inventario_staging (
            importacion_id, codigo_item, descripcion, modelo_producto,
            devolucion_buen_estado, nombre_producto,
            clasificacion_material_servicio, tipo_material, organizacion,
            nombre_cliente, cantidad_mano, cantidad_disponible,
            cantidad_congelada, unidad, precio, moneda, subalmacen,
            localizador, indicador_devolucion_virtual, color, ram, rom,
            info_tarjeta_sim, version_producto, region,
            oficina_representante, pais_region, observaciones,
            series_productos, nombres_marketing, modelos_productos_relacionados
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            importacionId, codigoItem, descripcion, modeloProducto,
            devolucionBuenEstado, nombreProducto,
            clasificacionMaterialServicio, tipoMaterial, organizacion,
            nombreCliente, cantidadMano, cantidadDisponible,
            cantidadCongelada, unidad, precio, moneda, subalmacen,
            localizador, indicadorDevolucionVirtual, color, ram, rom,
            infoTarjetaSim, versionProducto, region,
            oficinaRepresentante, paisRegion, observaciones,
            seriesProductos, nombresMarketing, modelosProductosRelacionados
          ]
        );

        await conn.query(
          `
          INSERT INTO inventario_items (
            codigo_item, nombre_producto, descripcion, modelo_producto,
            clasificacion_material_servicio, tipo_material, color, ram, rom,
            info_tarjeta_sim, version_producto, series_productos,
            nombres_marketing, modelos_productos_relacionados
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nombre_producto = VALUES(nombre_producto),
            descripcion = VALUES(descripcion),
            modelo_producto = VALUES(modelo_producto),
            clasificacion_material_servicio = VALUES(clasificacion_material_servicio),
            tipo_material = VALUES(tipo_material),
            color = VALUES(color),
            ram = VALUES(ram),
            rom = VALUES(rom),
            info_tarjeta_sim = VALUES(info_tarjeta_sim),
            version_producto = VALUES(version_producto),
            series_productos = VALUES(series_productos),
            nombres_marketing = VALUES(nombres_marketing),
            modelos_productos_relacionados = VALUES(modelos_productos_relacionados)
          `,
          [
            codigoItem, nombreProducto, descripcion, modeloProducto,
            clasificacionMaterialServicio, tipoMaterial, color, ram, rom,
            infoTarjetaSim, versionProducto, seriesProductos,
            nombresMarketing, modelosProductosRelacionados
          ]
        );

        const [items] = await conn.query(
          `SELECT id FROM inventario_items WHERE codigo_item = ? LIMIT 1`,
          [codigoItem]
        );

        if (!items.length) {
          throw new Error(`No se pudo resolver item para código ${codigoItem}`);
        }

        const itemId = items[0].id;

        const [stockRows] = await conn.query(
          `
          SELECT *
          FROM inventario_stock
          WHERE item_id = ?
            AND organizacion <=> ?
            AND nombre_cliente_excel <=> ?
            AND subalmacen <=> ?
            AND localizador <=> ?
          LIMIT 1
          `,
          [itemId, organizacion, nombreCliente, subalmacen, localizador]
        );

        if (!stockRows.length) {
          const [insertStock] = await conn.query(
            `
            INSERT INTO inventario_stock (
              item_id, organizacion, nombre_cliente_excel,
              cantidad_mano, cantidad_disponible, cantidad_congelada,
              unidad, precio, moneda, subalmacen, localizador,
              indicador_devolucion_virtual, devolucion_buen_estado,
              region, oficina_representante, pais_region, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              itemId, organizacion, nombreCliente,
              cantidadMano, cantidadDisponible, cantidadCongelada,
              unidad, precio, moneda, subalmacen, localizador,
              indicadorDevolucionVirtual, devolucionBuenEstado,
              region, oficinaRepresentante, paisRegion, observaciones
            ]
          );

          await conn.query(
            `
            INSERT INTO inventario_cambios (
              importacion_id, stock_id, codigo_item, tipo_cambio
            ) VALUES (?, ?, ?, 'INSERT')
            `,
            [importacionId, insertStock.insertId, codigoItem]
          );

          filasNuevas++;
        } else {
          const actual = stockRows[0];

          const camposComparables = {
            organizacion,
            nombre_cliente_excel: nombreCliente,
            cantidad_mano: cantidadMano,
            cantidad_disponible: cantidadDisponible,
            cantidad_congelada: cantidadCongelada,
            unidad,
            precio,
            moneda,
            subalmacen,
            localizador,
            indicador_devolucion_virtual: indicadorDevolucionVirtual,
            devolucion_buen_estado: devolucionBuenEstado,
            region,
            oficina_representante: oficinaRepresentante,
            pais_region: paisRegion,
            observaciones
          };

          let huboCambios = false;

          for (const [campo, nuevoValor] of Object.entries(camposComparables)) {
            const actualValor = actual[campo];

            const a = actualValor === null || actualValor === undefined ? null : String(actualValor);
            const b = nuevoValor === null || nuevoValor === undefined ? null : String(nuevoValor);

            if (a !== b) {
              huboCambios = true;

              await conn.query(
                `
                INSERT INTO inventario_cambios (
                  importacion_id, stock_id, codigo_item, tipo_cambio,
                  campo, valor_anterior, valor_nuevo
                ) VALUES (?, ?, ?, 'UPDATE', ?, ?, ?)
                `,
                [importacionId, actual.id, codigoItem, campo, a, b]
              );
            }
          }

          if (huboCambios) {
            await conn.query(
              `
              UPDATE inventario_stock
              SET organizacion = ?,
                  nombre_cliente_excel = ?,
                  cantidad_mano = ?,
                  cantidad_disponible = ?,
                  cantidad_congelada = ?,
                  unidad = ?,
                  precio = ?,
                  moneda = ?,
                  subalmacen = ?,
                  localizador = ?,
                  indicador_devolucion_virtual = ?,
                  devolucion_buen_estado = ?,
                  region = ?,
                  oficina_representante = ?,
                  pais_region = ?,
                  observaciones = ?
              WHERE id = ?
              `,
              [
                organizacion,
                nombreCliente,
                cantidadMano,
                cantidadDisponible,
                cantidadCongelada,
                unidad,
                precio,
                moneda,
                subalmacen,
                localizador,
                indicadorDevolucionVirtual,
                devolucionBuenEstado,
                region,
                oficinaRepresentante,
                paisRegion,
                observaciones,
                actual.id
              ]
            );

            filasActualizadas++;
          } else {
            await conn.query(
              `
              INSERT INTO inventario_cambios (
                importacion_id, stock_id, codigo_item, tipo_cambio
              ) VALUES (?, ?, ?, 'SIN_CAMBIO')
              `,
              [importacionId, actual.id, codigoItem]
            );

            filasSinCambios++;
          }
        }
      } catch (rowError) {
        filasError++;

        detalleErrores.push({
          filaExcel: index + 2,
          codigo_item: row?.['Código de ítem'] ?? null,
          descripcion: row?.['Descripción'] ?? null,
          error: rowError.message
        });

        console.error('Error fila Excel:', {
          filaExcel: index + 2,
          row,
          error: rowError.message
        });
      }
    }

    await conn.query(
      `
      UPDATE inventario_importaciones
      SET filas_nuevas = ?,
          filas_actualizadas = ?,
          filas_sin_cambios = ?,
          filas_error = ?,
          estado = 'completado'
      WHERE id = ?
      `,
      [filasNuevas, filasActualizadas, filasSinCambios, filasError, importacionId]
    );

    await conn.commit();

    return {
      importacionId,
      totalFilas: rows.length,
      filasNuevas,
      filasActualizadas,
      filasSinCambios,
      filasError,
      primerosErrores: detalleErrores.slice(0, 20)
    };
  } catch (error) {
    await conn.rollback();

    if (importacionId) {
      await conn.query(
        `UPDATE inventario_importaciones SET estado = 'error' WHERE id = ?`,
        [importacionId]
      );
    }

    throw error;
  } finally {
    conn.release();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

exports.listarImportaciones = async () => {
  const [rows] = await pool.query(`
    SELECT
      id,
      nombre_archivo,
      fecha_importacion,
      total_filas,
      filas_nuevas,
      filas_actualizadas,
      filas_sin_cambios,
      filas_error,
      estado
    FROM inventario_importaciones
    ORDER BY id DESC
  `);

  return rows;
};

exports.obtenerCambios = async (importacionId) => {
  const [rows] = await pool.query(`
    SELECT
      id,
      stock_id,
      codigo_item,
      tipo_cambio,
      campo,
      valor_anterior,
      valor_nuevo,
      fecha_cambio
    FROM inventario_cambios
    WHERE importacion_id = ?
    ORDER BY id ASC
  `, [importacionId]);

  return rows;
};

exports.exportarInventario = async () => {
  const [rows] = await pool.query(`
    SELECT
      ii.codigo_item AS 'Código de ítem',
      ii.descripcion AS 'Descripción',
      ii.modelo_producto AS 'Modelo de producto',
      s.devolucion_buen_estado AS 'Devolución de piezas en buen estado permitida o no',
      ii.nombre_producto AS 'Nombre del producto',
      ii.clasificacion_material_servicio AS 'Clasificaiton de Material de Servicio',
      ii.tipo_material AS 'Tipo de material',
      s.organizacion AS 'Organización',
      s.nombre_cliente_excel AS 'Nombre del cliente',
      s.cantidad_mano AS 'Cantidad en la mano',
      s.cantidad_disponible AS 'Cantidad disponible',
      s.cantidad_congelada AS 'Cantidad congelada',
      s.unidad AS 'Unidad',
      s.precio AS 'Precio',
      s.moneda AS 'Moneda',
      s.subalmacen AS 'Subalmacén',
      s.localizador AS 'Localizador',
      s.indicador_devolucion_virtual AS 'Indicador de devolución virtual',
      ii.color AS 'Color',
      ii.ram AS 'RAM',
      ii.rom AS 'ROM',
      ii.info_tarjeta_sim AS 'Información de tarjeta SIM',
      ii.version_producto AS 'Versión',
      s.region AS 'Región',
      s.oficina_representante AS 'Oficina del representante',
      s.pais_region AS 'País/Región',
      s.observaciones AS 'Observaciones',
      ii.series_productos AS 'Todas las series de productos',
      ii.nombres_marketing AS 'Todos los nombres de marketing',
      ii.modelos_productos_relacionados AS 'Todos los modelos de productos'
    FROM inventario_stock s
    INNER JOIN inventario_items ii ON ii.id = s.item_id
    ORDER BY ii.codigo_item ASC
  `);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const filePath = path.join(tmpDir, `inventario_export_${Date.now()}.xlsx`);
  XLSX.writeFile(workbook, filePath);

  return filePath;
};