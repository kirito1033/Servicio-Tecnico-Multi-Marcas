const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogos.controller');

router.get('/tipos-identificacion', catalogosController.getTiposIdentificacion);
router.get('/tecnicos', catalogosController.getTecnicos);

module.exports = router;