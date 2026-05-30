const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productos.controller');
const requireAuth = require('../middlewares/requireAuth');

router.get('/', requireAuth, productosController.listarProductos);

module.exports = router;