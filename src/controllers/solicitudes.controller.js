const solicitudesService = require('../services/solicitudes.service');

exports.crearSolicitud = async (req, res) => {
  try {
    const { item_id, stock_id, cantidad, rn } = req.body;

    if (!item_id) {
      return res.status(400).json({
        ok: false,
        error: 'El campo item_id es requerido'
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        ok: false,
        error: 'Usuario no autenticado'
      });
    }

    const resultado = await solicitudesService.crearSolicitud({
      item_id,
      stock_id: stock_id || null,
      solicitado_por_usuario_id: req.user.id,
      cantidad: cantidad || 1,
      rn: rn || null
    });

    return res.status(201).json({
      ok: true,
      message: 'Solicitud creada correctamente',
      solicitudId: resultado.solicitudId
    });
  } catch (error) {
    console.error('solicitudes.crearSolicitud:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al crear la solicitud'
    });
  }
};

exports.listarSolicitudes = async (req, res) => {
  try {
    const rows = await solicitudesService.listarSolicitudes(req.query);
    return res.json({
      ok: true,
      data: rows
    });
  } catch (error) {
    console.error('solicitudes.listarSolicitudes:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al listar solicitudes'
    });
  }
};

exports.obtenerHistorial = async (req, res) => {
  try {
    const solicitudId = Number(req.params.id);

    if (!solicitudId) {
      return res.status(400).json({
        ok: false,
        error: 'ID de solicitud inválido'
      });
    }

    const rows = await solicitudesService.obtenerHistorial(solicitudId);

    return res.json({
      ok: true,
      data: rows
    });
  } catch (error) {
    console.error('solicitudes.obtenerHistorial:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al consultar historial'
    });
  }
};

exports.actualizarEstado = async (req, res) => {
  try {
    const solicitudId = Number(req.params.id);
    const { estado, rn } = req.body;

    if (!solicitudId) {
      return res.status(400).json({
        ok: false,
        error: 'ID de solicitud inválido'
      });
    }

    if (!estado) {
      return res.status(400).json({
        ok: false,
        error: 'El estado es obligatorio'
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        ok: false,
        error: 'Usuario no autenticado'
      });
    }

    const resultado = await solicitudesService.actualizarEstadoSolicitud({
      solicitudId,
      nuevoEstado: estado,
      rn: rn || null,
      usuarioId: req.user.id
    });

    return res.json({
      ok: true,
      message: 'Estado actualizado correctamente',
      data: resultado
    });
  } catch (error) {
    console.error('solicitudes.actualizarEstado:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error al actualizar estado'
    });
  }
};