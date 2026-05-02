const fs = require('fs');
const casosService = require('../services/casos.service');
const pdfService = require('../services/pdfService');

async function getCasos(req, res) {
  try {
    const rows = await casosService.obtenerCasos(req.query);

    const mapped = rows.map(r => ({
      id: r.id,
      mm: r.mm,
      tecnico: r.tecnico,
      nombre: r.nombre,
      apellido: r.apellido,
      tipoIdentificacionId: r.tipo_identificacion_id,
      numeroIdentificacion: r.numero_identificacion,
      telefono: r.telefono,
      email: r.email,
      modelo: r.modelo,
      color: r.color,
      sn: r.sn,
      contrasena: r.contrasena,
      falla: r.falla,
      apariencia: r.apariencia,
      diagnostico: r.diagnostico,
      fechaIngreso: r.fecha_ingreso ? r.fecha_ingreso.toISOString().slice(0, 10) : '',
      fechaEgreso: r.fecha_egreso ? r.fecha_egreso.toISOString().slice(0, 10) : '',
      precio: r.precio,
      estado: r.estado
    }));

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error consultando casos' });
  }
}

async function postIngreso(req, res) {
  try {
    const result = await casosService.crearIngreso(req.body);
    res.status(201).json({
      ok: true,
      mm: result.mm
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: 'Error creando ingreso'
    });
  }
}

async function updateCaso(req, res) {
  try {
    const data = {
      ...req.body,
      id: req.params.id
    };

    const result = await casosService.actualizarCaso(data);

    res.json({
      ok: true,
      message: 'Caso actualizado correctamente',
      result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message || 'Error actualizando caso' });
  }
}

async function descargarPdfIngreso(req, res) {
  try {
    const { id } = req.params;

    const caso = await casosService.obtenerCasoPdf(id);

    if (!caso) {
      return res.status(404).json({
        ok: false,
        error: 'No se encontró el caso para generar el PDF'
      });
    }

    const pdfPath = await pdfService.generarOrdenServicioPdf(caso);

    return res.download(pdfPath, `Orden_${caso.mm}.pdf`, (err) => {
      if (err) {
        console.error('Error enviando PDF:', err);
      }

      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlink(pdfPath, unlinkErr => {
          if (unlinkErr) {
            console.error('Error eliminando PDF temporal:', unlinkErr);
          }
        });
      }
    });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'No se pudo generar el PDF'
    });
  }
}

module.exports = {
  getCasos,
  postIngreso,
  updateCaso,
  descargarPdfIngreso
};