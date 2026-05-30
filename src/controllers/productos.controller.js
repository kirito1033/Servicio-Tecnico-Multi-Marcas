const productosService = require('../services/productos.service');

exports.listarProductos = async (req, res) => {
  try {
    const resultado = await productosService.listarProductos(req.query);

    res.json({
      ok: true,
      data: resultado.data,
      pagination: resultado.pagination
    });
  } catch (error) {
    console.error('productos.listarProductos:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Error al listar productos'
    });
  }
};