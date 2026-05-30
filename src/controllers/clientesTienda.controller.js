const clientesTiendaService = require('../services/clientesTienda.service');

async function listarClientesTienda(req, res) {
  try {
    const rows = await clientesTiendaService.listarClientesTienda();
    res.json(rows);
  } catch (error) {
    console.error('Error al listar clientes tienda:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function crearClienteTienda(req, res) {
  try {
    const { nombre, apellido, telefono, correo, descripcion_falla } = req.body;

    if (!nombre || !apellido || !telefono) {
      return res.status(400).json({
        message: 'Nombre, apellido y teléfono son obligatorios'
      });
    }

    await clientesTiendaService.crearClienteTienda({
      nombre,
      apellido,
      telefono,
      correo,
      descripcion_falla
    });

    res.status(201).json({
      message: 'Cliente registrado correctamente'
    });
  } catch (error) {
    console.error('Error al crear cliente tienda:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

module.exports = {
  listarClientesTienda,
  crearClienteTienda
};