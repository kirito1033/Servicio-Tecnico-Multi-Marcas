const path = require('path');
const fs = require('fs');
const firmasService = require('../services/firmas.service');

function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

async function postSesionUpload(req, res) {
  try {
    const archivo = req.file;
    const { descripcion, page, xPercent, yPercent } = req.body;

    if (!archivo) {
      return res.status(400).json({ ok: false, error: 'No se recibió archivo PDF' });
    }

    if (archivo.mimetype !== 'application/pdf') {
      try {
        fs.unlinkSync(archivo.path);
      } catch (e) {
        console.error('Error eliminando archivo no-PDF:', e);
      }
      return res.status(400).json({ ok: false, error: 'El archivo debe ser un PDF' });
    }

    const pdfAbsolutePath = archivo.path;

    const { token } = await firmasService.crearSesion(
      descripcion,
      pdfAbsolutePath,
      Number(page) || 1,
      Number(xPercent) || 50,
      Number(yPercent) || 50
    );

    const baseUrl = getBaseUrl(req);
    const urlFirma = `${baseUrl}/firmar/${token}`;

    res.json({
      ok: true,
      token,
      urlFirma,
      descripcion: descripcion || archivo.originalname
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Error creando sesión de firma'
    });
  }
}

async function getSesion(req, res) {
  try {
    const { token } = req.params;
    const sesion = await firmasService.obtenerSesionPorToken(token);

    if (!sesion) {
      return res.status(404).json({ ok: false, error: 'Sesión no encontrada' });
    }

    if (sesion.estado !== 'pendiente') {
      return res.status(400).json({ ok: false, error: 'Sesión no disponible para firmar' });
    }

    res.json({
      ok: true,
      sesionId: sesion.id,
      descripcion: sesion.descripcion
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message || 'Error consultando sesión' });
  }
}

async function postFirmarSesion(req, res) {
  try {
    const { token } = req.params;
    const { firmaBase64 } = req.body;

    if (!firmaBase64 || !firmaBase64.startsWith('data:image')) {
      return res.status(400).json({ ok: false, error: 'Firma inválida' });
    }

    const sesion = await firmasService.obtenerSesionPorToken(token);

    if (!sesion) {
      return res.status(404).json({ ok: false, error: 'Sesión no encontrada' });
    }

    if (sesion.estado !== 'pendiente') {
      return res.status(400).json({ ok: false, error: 'La sesión ya no puede firmarse' });
    }

    const pagina = Number(sesion.pagina_firmada) || 1;
    const xPercent = Number(sesion.pos_x) || 50;
    const yPercent = Number(sesion.pos_y) || 50;

    const pdfFirmadoPath = await firmasService.generarPdfFirmado(
      sesion.pdf_original_path,
      firmaBase64,
      pagina,
      xPercent,
      yPercent
    );

    await firmasService.marcarSesionFirmada(token, {
      pagina,
      x: xPercent,
      y: yPercent,
      pdfFirmadoPath,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      ok: true,
      message: 'Documento firmado correctamente',
      pdfFirmadoPath
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message || 'Error guardando firma' });
  }
}

async function descargarPdfFirmado(req, res) {
  try {
    const { token } = req.params;
    const sesion = await firmasService.obtenerSesionPorToken(token);

    if (!sesion || !sesion.pdf_firmado_path) {
      return res.status(404).json({ ok: false, error: 'PDF firmado no disponible' });
    }

    const absolutePath = sesion.pdf_firmado_path;

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ ok: false, error: 'Archivo no encontrado en el servidor' });
    }

    res.download(absolutePath, path.basename(absolutePath));
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Error descargando PDF firmado'
    });
  }
}

async function servirPdfOriginal(req, res) {
  try {
    const { token } = req.params;
    const sesion = await firmasService.obtenerSesionPorToken(token);

    if (!sesion || !sesion.pdf_original_path) {
      return res.status(404).json({ ok: false, error: 'PDF original no disponible' });
    }

    const absolutePath = sesion.pdf_original_path;

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(absolutePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  postSesionUpload,
  getSesion,
  postFirmarSesion,
  descargarPdfFirmado,
  servirPdfOriginal
};