const express = require('express');
const router = express.Router();
const clientesTiendaController = require('../controllers/clientesTienda.controller');

router.post('/clientes-tienda', clientesTiendaController.crearClienteTienda);
router.get('/clientes-tienda', clientesTiendaController.listarClientesTienda);

module.exports = router;