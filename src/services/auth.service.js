const bcrypt = require('bcrypt');
const db = require('../db');

async function query(sql, params = []) {
  try {
    const [rows] = await db.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('❌ Error en query auth:', error);
    throw error;
  }
}

async function buscarRolPorNombre(nombre) {
  const sql = `
    SELECT id, nombre
    FROM roles
    WHERE nombre = ?
    LIMIT 1
  `;

  const rows = await query(sql, [nombre]);
  return rows[0] || null;
}

async function crearUsuario(data) {
  try {
    if (!data.rol) {
      throw new Error('El rol es obligatorio');
    }

    const rol = await buscarRolPorNombre(data.rol);

    if (!rol) {
      throw new Error('El rol enviado no existe');
    }

    const validarSql = `
      SELECT id
      FROM usuarios
      WHERE email = ? OR username = ?
      LIMIT 1
    `;

    const existe = await query(validarSql, [data.email, data.username]);

    if (existe.length > 0) {
      throw new Error('El email o el username ya están registrados');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const sql = `
      INSERT INTO usuarios (
        nombre,
        email,
        username,
        password_hash,
        rol_id,
        activo
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.nombre,
      data.email,
      data.username,
      passwordHash,
      rol.id,
      1
    ];

    const result = await query(sql, params);

    return {
      id: result.insertId,
      nombre: data.nombre,
      email: data.email,
      username: data.username,
      rol_id: rol.id,
      rol: rol.nombre,
      activo: 1
    };
  } catch (error) {
    console.error('❌ Error en crearUsuario:', error);
    throw error;
  }
}

async function buscarUsuarioPorLogin(login) {
  try {
    const sql = `
      SELECT
        u.id,
        u.nombre,
        u.email,
        u.username,
        u.password_hash,
        u.activo,
        u.rol_id,
        r.nombre AS rol
      FROM usuarios u
      LEFT JOIN roles r ON r.id = u.rol_id
      WHERE u.email = ? OR u.username = ?
      LIMIT 1
    `;

    const rows = await query(sql, [login, login]);
    return rows[0] || null;
  } catch (error) {
    console.error('❌ Error en buscarUsuarioPorLogin:', error);
    throw error;
  }
}

async function validarCredenciales(login, password) {
  try {
    const usuario = await buscarUsuarioPorLogin(login);

    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new Error('El usuario está inactivo');
    }

    if (!usuario.rol_id || !usuario.rol) {
      throw new Error('El usuario no tiene rol asignado');
    }

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordOk) {
      throw new Error('Credenciales inválidas');
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      username: usuario.username,
      rol_id: usuario.rol_id,
      rol: usuario.rol,
      activo: usuario.activo
    };
  } catch (error) {
    console.error('❌ Error en validarCredenciales:', error);
    throw error;
  }
}

module.exports = {
  buscarRolPorNombre,
  crearUsuario,
  buscarUsuarioPorLogin,
  validarCredenciales
};