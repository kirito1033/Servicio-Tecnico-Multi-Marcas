const express = require('express');
const router = express.Router();
const casosController = require('../controllers/casos.controller');

router.get('/casos', casosController.getCasos);
router.post('/ingresos', casosController.postIngreso);
router.put('/casos/:id', casosController.updateCaso);
router.get('/ingresos/pdf/:id', casosController.descargarPdfIngreso);

module.exports = router;