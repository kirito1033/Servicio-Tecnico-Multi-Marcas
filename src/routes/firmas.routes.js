const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PDF_ORIG_DIR } = require('../services/firmas.service');
const firmasController = require('../controllers/firmas.controller');

// Configuración de multer para guardar los PDFs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PDF_ORIG_DIR);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '_' + safeName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'));
    }
    cb(null, true);
  }
});

// Crear sesión
router.post(
  '/firmas/sesion-upload',
  upload.single('archivo'),
  firmasController.postSesionUpload
);

// Consultar sesión por token
router.get('/firmas/sesion/:token', firmasController.getSesion);

// Firmar documento
router.post('/firmas/firmar/:token', firmasController.postFirmarSesion);

// Descargar PDF firmado
router.get('/firmas/pdf-firmado/:token', firmasController.descargarPdfFirmado);

// Servir PDF original
router.get('/firmas/pdf-original/:token', firmasController.servirPdfOriginal);

module.exports = router;