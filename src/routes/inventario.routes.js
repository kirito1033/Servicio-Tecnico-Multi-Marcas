const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const requireAuth = require('../middlewares/requireAuth');
const inventarioController = require('../controllers/inventario.controller');

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `inventario_${Date.now()}${ext}`);
  }
});

const allowedMimes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream'
];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      return cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Tipo MIME no permitido'));
    }
    cb(null, true);
  }
});

router.post(
  '/inventario/importar',
  requireAuth,
  upload.single('archivo'),
  inventarioController.importarExcel
);

router.get(
  '/inventario/importaciones',
  requireAuth,
  inventarioController.listarImportaciones
);

router.get(
  '/inventario/cambios/:importacionId',
  requireAuth,
  inventarioController.obtenerCambios
);

router.get(
  '/inventario/exportar',
  requireAuth,
  inventarioController.exportarInventario
);

module.exports = router;