const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const solicitudesController = require('../controllers/solicitudes.controller');

router.post('/', requireAuth, solicitudesController.crearSolicitud);
router.get('/', requireAuth, solicitudesController.listarSolicitudes);
router.get('/:id/historial', requireAuth, solicitudesController.obtenerHistorial);
router.put('/:id/estado', requireAuth, solicitudesController.actualizarEstado);

module.exports = router;