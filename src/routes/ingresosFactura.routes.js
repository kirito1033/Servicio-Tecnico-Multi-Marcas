const express = require('express');
const router = express.Router();
const controller = require('../controllers/ingresosFactura.controller');

router.get('/ordenes/buscar-mm', controller.buscarOrdenesPorMM);
router.get('/ordenes/para-ingresos', controller.listarOrdenesParaIngresos);
router.get('/ingresos-factura', controller.obtenerIngresosFactura);
router.post('/ingresos-factura', controller.crearIngresoFactura);
router.put('/ingresos-factura/:id', controller.actualizarIngresoFactura);
router.get('/ingresos-factura/pdf/lista', controller.descargarPdfIngresos);


module.exports = router;