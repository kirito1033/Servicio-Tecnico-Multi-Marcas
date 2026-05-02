function obtenerChecks(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map(el => el.value);
}

function obtenerRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function obtenerDatosIngreso() {
  return {
    sucursal: 'UNILAGO',
    tecnico: document.getElementById('tecnicoIngreso').value.trim(),
    nombre: document.getElementById('nombre').value.trim(),
    apellido: document.getElementById('apellido').value.trim(),
    tipo_identificacion_id: document.getElementById('tipoIdentificacion').value.trim(),
    numero_identificacion: document.getElementById('numeroIdentificacion').value.trim(),
    telefono: document.getElementById('telefonoIngreso').value.trim(),
    email: document.getElementById('email').value.trim(),
    modelo: document.getElementById('modeloIngreso').value.trim(),
    color: document.getElementById('colorIngreso').value.trim(),
    sn: document.getElementById('snIngreso').value.trim(),
    contrasena: document.getElementById('contrasenaIngreso').value.trim(),
    falla: document.getElementById('fallaIngreso').value.trim(),
    apariencia: document.getElementById('aparienciaIngreso').value.trim(),
    diagnostico: document.getElementById('diagnosticoIngreso').value.trim(),
    accesorioOtroTexto: document.getElementById('accesorioOtroTexto')?.value.trim() || '',
    fechaIngreso: document.getElementById('fechaIngreso').value,
    precio: document.getElementById('precioIngreso').value,
    fechaEgreso: document.getElementById('fechaEgreso').value,
    accesoriosSeleccionados: obtenerChecks('accesorios'),
    estadoGeneralSeleccionado: obtenerChecks('estadoGeneral'),
    componentesSeleccionados: {
      touch: obtenerRadio('touch'),
      visor: obtenerRadio('visor'),
      carcasa: obtenerRadio('carcasa'),
      biometria: obtenerRadio('biometria'),
      camaraFrontal: obtenerRadio('camaraFrontal'),
      camaraTrasera: obtenerRadio('camaraTrasera'),
      buzzer: obtenerRadio('buzzer'),
      altavoz: obtenerRadio('altavoz'),
      microfono: obtenerRadio('microfono')
    }
  };
}

function validarIngreso(data) {
  if (!data.nombre) return 'El nombre es obligatorio';
  if (!data.apellido) return 'El apellido es obligatorio';
  if (!data.telefono) return 'El teléfono es obligatorio';
  if (!data.modelo) return 'El modelo es obligatorio';
  if (!data.falla) return 'La falla reportada es obligatoria';
  return null;
}

function mostrarMensajeIngreso(tipo, mensaje) {
  let box = document.getElementById('mensajeIngreso');

  if (!box) {
    box = document.createElement('div');
    box.id = 'mensajeIngreso';
    const form = document.getElementById('formIngreso');
    form.prepend(box);
  }

  box.className = tipo === 'error' ? 'error-box' : 'success-box';
  box.textContent = mensaje;
}

async function guardarIngreso(event) {
  event.preventDefault();

  try {
    const data = obtenerDatosIngreso();
    const error = validarIngreso(data);

    if (error) {
      mostrarMensajeIngreso('error', error);
      return;
    }

    const result = await window.api.crearIngreso(data);

    mostrarMensajeIngreso('success', `Ingreso creado correctamente. MM: ${result.mm}`);
    document.getElementById('formIngreso').reset();

    if (typeof cargarCasos === 'function') {
      cargarCasos();
    }
  } catch (error) {
    console.error(error);
    mostrarMensajeIngreso('error', error.message || 'No se pudo guardar el ingreso');
  }
}

function limpiarFormularioIngreso() {
  document.getElementById('formIngreso').reset();

  const box = document.getElementById('mensajeIngreso');
  if (box) box.remove();
}

function inicializarAccesorioOtro() {
  const check = document.getElementById('accesorioOtroCheck');
  const input = document.getElementById('accesorioOtroTexto');

  if (!check || !input) return;

  const sync = () => {
    if (check.checked) {
      input.disabled = false;
      input.focus();
    } else {
      input.value = '';
      input.disabled = true;
    }
  };

  check.addEventListener('change', sync);
  sync();
}

async function cargarTiposIdentificacion() {
  const select = document.getElementById('tipoIdentificacion');
  if (!select) return;

  try {
    const tipos = await window.api.obtenerTiposIdentificacion();

    select.innerHTML = '<option value="">Seleccione una opción</option>';

    tipos.forEach(tipo => {
      const option = document.createElement('option');
      option.value = tipo.id;
      option.textContent = tipo.nombre;
      select.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}

async function cargarTecnicos() {
  const select = document.getElementById('tecnicoIngreso');
  if (!select) return;

  try {
    const tecnicos = await window.api.obtenerTecnicos();

    select.innerHTML = '<option value="">Seleccione un técnico</option>';

    tecnicos.forEach(tecnico => {
      const option = document.createElement('option');
      option.value = tecnico.nombre;
      option.textContent = tecnico.nombre;
      select.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}
function bloquearCamposModal() {
  modoEdicionActivo = false;

  document.querySelectorAll('#modalCaso .lockable').forEach(el => {
    el.readOnly = true;
    el.closest('.field')?.classList.remove('is-editable');
  });

  document.querySelectorAll('#modalCaso .lockable-date').forEach(el => {
    el.disabled = true;
    el.closest('.field')?.classList.remove('is-editable');
  });

  document.querySelectorAll('#modalCaso .lockable-select').forEach(el => {
    el.disabled = true;
    el.closest('.field')?.classList.remove('is-editable');
  });

  document.querySelectorAll('#modalCaso .always-editable').forEach(el => {
    el.readOnly = false;
    el.closest('.field')?.classList.add('is-editable');
  });

  document.querySelectorAll('#modalCaso .always-editable-date').forEach(el => {
    el.disabled = false;
    el.closest('.field')?.classList.add('is-editable');
  });

  document.querySelectorAll('#modalCaso .always-editable-select').forEach(el => {
    el.disabled = false;
    el.closest('.field')?.classList.add('is-editable');
  });
}

function habilitarEdicionModal() {
  modoEdicionActivo = true;

  document.querySelectorAll('#modalCaso .lockable').forEach(el => {
    el.readOnly = false;
    el.closest('.field')?.classList.add('is-editable');
  });

  document.querySelectorAll('#modalCaso .lockable-date').forEach(el => {
    el.disabled = false;
    el.closest('.field')?.classList.add('is-editable');
  });

  document.querySelectorAll('#modalCaso .lockable-select').forEach(el => {
    el.disabled = false;
    el.closest('.field')?.classList.add('is-editable');
  });

  document.querySelectorAll('#modalCaso .always-editable').forEach(el => {
    el.readOnly = false;
    el.closest('.field')?.classList.add('is-editable');
  });

  document.querySelectorAll('#modalCaso .always-editable-date').forEach(el => {
    el.disabled = false;
    el.closest('.field')?.classList.add('is-editable');
  });

  document.querySelectorAll('#modalCaso .always-editable-select').forEach(el => {
    el.disabled = false;
    el.closest('.field')?.classList.add('is-editable');
  });
}