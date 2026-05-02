const authService = require('../services/auth.service');

async function registrarUsuario(req, res) {
  try {
    const { nombre, email, username, password, rol } = req.body;

    if (!nombre || !email || !username || !password || !rol) {
      return res.status(400).json({
        message: 'Todos los campos son obligatorios, incluido el rol'
      });
    }

    const nuevoUsuario = await authService.crearUsuario({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password: password.trim(),
      rol: rol.trim().toLowerCase()
    });

    return res.status(201).json({
      message: 'Usuario creado correctamente',
      data: nuevoUsuario
    });
  } catch (error) {
    console.error('❌ Error en registrarUsuario:', error);

    return res.status(500).json({
      message: error.message || 'Error al crear el usuario'
    });
  }
}

async function login(req, res) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        message: 'Usuario/correo y contraseña son obligatorios'
      });
    }

    const usuario = await authService.validarCredenciales(login.trim(), password);

    req.session.user = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      username: usuario.username,
      rol_id: usuario.rol_id,
      rol: usuario.rol
    };

    return res.status(200).json({
      message: 'Login correcto',
      user: req.session.user
    });
  } catch (error) {
    console.error('❌ Error en login:', error);

    return res.status(401).json({
      message: error.message || 'No se pudo iniciar sesión'
    });
  }
}

async function me(req, res) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        message: 'No autenticado'
      });
    }

    return res.status(200).json({
      user: req.session.user
    });
  } catch (error) {
    console.error('❌ Error en me:', error);

    return res.status(500).json({
      message: 'Error al consultar sesión'
    });
  }
}

async function logout(req, res) {
  try {
    if (!req.session) {
      return res.status(200).json({
        message: 'Sesión cerrada'
      });
    }

    req.session.destroy((error) => {
      if (error) {
        console.error('❌ Error en logout:', error);
        return res.status(500).json({
          message: 'No se pudo cerrar sesión'
        });
      }

      res.clearCookie('connect.sid');

      return res.status(200).json({
        message: 'Sesión cerrada correctamente'
      });
    });
  } catch (error) {
    console.error('❌ Error en logout:', error);

    return res.status(500).json({
      message: 'Error al cerrar sesión'
    });
  }
}

module.exports = {
  registrarUsuario,
  login,
  me,
  logout
};