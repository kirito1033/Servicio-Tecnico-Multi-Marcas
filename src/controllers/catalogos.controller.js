const catalogosService = require('../services/catalogos.service');

async function getTiposIdentificacion(req, res) {
  try {
    const rows = await catalogosService.obtenerTiposIdentificacion();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error cargando tipos de identificación' });
  }
}

async function getTecnicos(req, res) {
  try {
    const rows = await catalogosService.obtenerTecnicos();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error cargando técnicos' });
  }
}

module.exports = {
  getTiposIdentificacion,
  getTecnicos
};