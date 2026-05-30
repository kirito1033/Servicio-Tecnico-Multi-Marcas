const inventarioService = require('../services/inventario.service');

exports.importarExcel = async (req, res) => {
  try {
    const resultado = await inventarioService.importarExcel(req);
    return res.json({
      ok: true,
      message: 'Archivo importado correctamente',
      ...resultado
    });
  } catch (error) {
    console.error('inventario.importarExcel:', error);

    const erroresValidacion = [
      'No se recibió ningún archivo',
      'El archivo Excel no contiene filas de datos',
      'Faltan columnas requeridas',
      'El archivo contiene códigos de ítem duplicados'
    ];

    const esErrorValidacion = erroresValidacion.some(msg =>
      error.message?.includes(msg)
    );

    return res.status(esErrorValidacion ? 400 : 500).json({
      ok: false,
      error: error.message || 'Error al importar el Excel'
    });
  }
};

exports.listarImportaciones = async (req, res) => {
  try {
    const data = await inventarioService.listarImportaciones();
    return res.json({ ok: true, data });
  } catch (error) {
    console.error('inventario.listarImportaciones:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al listar importaciones'
    });
  }
};

exports.obtenerCambios = async (req, res) => {
  try {
    const { importacionId } = req.params;
    const data = await inventarioService.obtenerCambios(importacionId);
    return res.json({ ok: true, data });
  } catch (error) {
    console.error('inventario.obtenerCambios:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al consultar cambios'
    });
  }
};

exports.exportarInventario = async (req, res) => {
  try {
    const filePath = await inventarioService.exportarInventario();

    return res.download(filePath, 'inventario_export.xlsx', (err) => {
      if (err) {
        console.error('inventario.exportarInventario:', err);
      }
    });
  } catch (error) {
    console.error('inventario.exportarInventario:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al exportar inventario'
    });
  }
};