const BASE_URL = window.location.origin;
let casosCache = [];
let modoEdicionActivo = false;
let tiposIdentificacionCache = [];
let tecnicosCache = [];


const ESTADOS_CONFIG = {
  Ingresado: { clase: 'estado-ingresado', label: 'Ingresado' },
  'En diagnóstico': { clase: 'estado-diagnostico', label: 'En diagnóstico' },
  'Pendiente aprobación': { clase: 'estado-aprobacion', label: 'Pendiente aprobación' },
  'Aprobado para reparación': { clase: 'estado-aprobado', label: 'Aprobado para reparación' },
  'En reparación': { clase: 'estado-reparacion', label: 'En reparación' },
  'Pendiente repuesto': { clase: 'estado-repuesto', label: 'Pendiente repuesto' },
  'En prueba': { clase: 'estado-prueba', label: 'En prueba' },
  'Listo para entregar': { clase: 'estado-listo', label: 'Listo para entregar' },
  Entregado: { clase: 'estado-entregado', label: 'Entregado' },
  'Entregado y Facturado': {
    clase: 'estado-entregado-facturado',
    label: 'Entregado y Facturado'
  },
  'No reparable': { clase: 'estado-no-reparable', label: 'No reparable' },
  Garantía: { clase: 'estado-garantia', label: 'Garantía' },
  Cancelado: { clase: 'estado-cancelado', label: 'Cancelado' },
  Cerrado: { clase: 'estado-cerrado', label: 'Cerrado' }
};

function obtenerFiltros() {
  return {
    mm: document.getElementById('filtroMM')?.value.trim() || '',
    tecnico: document.getElementById('filtroTecnico')?.value.trim() || '',
    telefono: document.getElementById('filtroTelefono')?.value.trim() || '',
    identificacion: document.getElementById('filtroIdentificacion')?.value.trim() || ''
  };
}

function badgeEstado(estado) {
  const config = ESTADOS_CONFIG[estado] || {
    clase: 'estado-default',
    label: estado || 'Sin estado'
  };

  return `<span class="estado-badge ${config.clase}">${config.label}</span>`;
}

function renderTablaCasos(rows) {
  const tbody = document.getElementById('tbodyCasos');
  const emptyState = document.getElementById('emptyState');
  const resumen = document.getElementById('resumenResultados');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (!rows.length) {
    emptyState?.classList.remove('hidden');
    if (resumen) resumen.textContent = 'No se encontraron resultados.';
    actualizarStats([]);
    return;
  }

  emptyState?.classList.add('hidden');
  if (resumen) resumen.textContent = `${rows.length} caso(s) encontrados.`;

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${row.mm || ''}</td>
      <td>${row.tecnico || ''}</td>
      <td>${(row.nombre || '')} ${(row.apellido || '')}</td>
      <td>${row.numeroIdentificacion || ''}</td>
      <td>${row.telefono || ''}</td>
      <td>${row.modelo || ''}</td>
      <td>${row.falla || ''}</td>
      <td>${badgeEstado(row.estado)}</td>
      <td class="actions-cell">
        <div class="action-buttons">
          <button type="button" class="btn-action view" data-index="${index}" data-action="view">Ver</button>
          <button type="button" class="btn-action edit" data-index="${index}" data-action="edit">Editar</button>
          <button type="button" class="btn-action pdf" data-index="${index}" data-action="pdf">PDF</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  actualizarStats(rows);
}

function actualizarStats(rows) {
  const statTotal = document.getElementById('statTotal');
  const statIngresados = document.getElementById('statIngresados');
  const statProceso = document.getElementById('statProceso');
  const statCerrados = document.getElementById('statCerrados');

  if (statTotal) statTotal.textContent = rows.length;
  if (statIngresados) {
    statIngresados.textContent = rows.filter(r =>
      (r.estado || '').toLowerCase().includes('ingres')
    ).length;
  }

  if (statProceso) {
    statProceso.textContent = rows.filter(r => {
      const e = (r.estado || '').toLowerCase();
      return e.includes('proceso') || e.includes('diagn') || e.includes('repar');
    }).length;
  }

  if (statCerrados) {
  statCerrados.textContent = rows.filter(r => {
    const e = (r.estado || '').toLowerCase();
    return (
      e.includes('cerr') ||
      e.includes('entregado')   // incluye Entregado y Entregado y Facturado
    );
  }).length;
}
}

async function cargarCasos() {
  try {
    const filtros = obtenerFiltros();
    const rows = await window.api.obtenerCasos(filtros);
    casosCache = rows || [];
    renderTablaCasos(casosCache);
  } catch (error) {
    console.error(error);
    renderTablaCasos([]);
  }
}

function limpiarFiltros() {
  const mm = document.getElementById('filtroMM');
  const tecnico = document.getElementById('filtroTecnico');
  const telefono = document.getElementById('filtroTelefono');
  const identificacion = document.getElementById('filtroIdentificacion');

  if (mm) mm.value = '';
  if (tecnico) tecnico.value = '';
  if (telefono) telefono.value = '';
  if (identificacion) identificacion.value = '';

  cargarCasos();
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

  document.querySelectorAll('#modalCaso .always-locked').forEach(el => {
    el.readOnly = true;
    el.closest('.field')?.classList.remove('is-editable');
  });

  document.getElementById('btnGuardarEdicion')?.classList.add('hidden');
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

  document.querySelectorAll('#modalCaso .always-locked').forEach(el => {
    el.readOnly = true;
    el.closest('.field')?.classList.remove('is-editable');
  });

  document.getElementById('btnGuardarEdicion')?.classList.remove('hidden');
}

function normalizarFechaInput(valor) {
  if (!valor) return '';
  return String(valor).slice(0, 10);
}

async function abrirModalCaso(modo, caso) {
  const modal = document.getElementById('modalCaso');
  if (!modal || !caso) return;

  await cargarTiposIdentificacionModal();
  await cargarTecnicosModal();
  cargarEstadosModal();

  document.getElementById('editCasoId').value = caso.id ?? '';
  document.getElementById('editMM').value = caso.mm ?? '';
  document.getElementById('editNombre').value = caso.nombre ?? '';
  document.getElementById('editApellido').value = caso.apellido ?? '';
  document.getElementById('editNumeroIdentificacion').value = caso.numeroIdentificacion ?? '';
  document.getElementById('editTelefono').value = caso.telefono ?? '';
  document.getElementById('editEmail').value = caso.email ?? '';
  document.getElementById('editModelo').value = caso.modelo ?? '';
  document.getElementById('editColor').value = caso.color ?? '';
  document.getElementById('editSn').value = caso.sn ?? '';
  document.getElementById('editContrasena').value = caso.contrasena ?? '';
  document.getElementById('editFechaIngreso').value = normalizarFechaInput(caso.fechaIngreso);
  document.getElementById('editPrecio').value = caso.precio ?? '';
  document.getElementById('editFechaEgreso').value = normalizarFechaInput(caso.fechaEgreso);
  document.getElementById('editFalla').value = caso.falla ?? '';
  document.getElementById('editApariencia').value = caso.apariencia ?? '';
  document.getElementById('editDiagnosticoFinal').value = caso.diagnostico ?? '';

  document.getElementById('editTipoIdentificacion').value = String(caso.tipoIdentificacionId ?? '');
  document.getElementById('editTecnico').value = caso.tecnico ?? '';
  document.getElementById('editEstado').value = caso.estado ?? '';

  bloquearCamposModal();

  document.getElementById('modalTitulo').textContent =
    modo === 'view' ? 'Ver caso' : 'Editar caso';

  if (modo === 'edit') {
    habilitarEdicionModal();
  }

  modal.classList.remove('hidden');
}

function cerrarModalCaso() {
  document.getElementById('modalCaso')?.classList.add('hidden');
  bloquearCamposModal();
}

async function guardarEdicionCaso(event) {
  event.preventDefault();

  const payload = {
    id: document.getElementById('editCasoId').value,
    nombre: document.getElementById('editNombre').value.trim(),
    apellido: document.getElementById('editApellido').value.trim(),
    tipoIdentificacionId: document.getElementById('editTipoIdentificacion').value,
    numeroIdentificacion: document.getElementById('editNumeroIdentificacion').value.trim(),
    telefono: document.getElementById('editTelefono').value.trim(),
    email: document.getElementById('editEmail').value.trim(),
    tecnico: document.getElementById('editTecnico').value,
    modelo: document.getElementById('editModelo').value.trim(),
    color: document.getElementById('editColor').value.trim(),
    sn: document.getElementById('editSn').value.trim(),
    contrasena: document.getElementById('editContrasena').value.trim(),
    fechaIngreso: document.getElementById('editFechaIngreso').value,
    precio: document.getElementById('editPrecio').value.trim(),
    fechaEgreso: document.getElementById('editFechaEgreso').value,
    estado: document.getElementById('editEstado').value,
    falla: document.getElementById('editFalla').value.trim(),
    apariencia: document.getElementById('editApariencia').value.trim(),
    diagnostico: document.getElementById('editDiagnosticoFinal').value.trim()
  };

  if (!payload.id) {
    alert('No se encontró el ID del caso.');
    return;
  }

  try {
    const result = await window.api.actualizarCaso(payload);
    alert(result?.message || 'Caso actualizado correctamente');
    cerrarModalCaso();
    await cargarCasos();
  } catch (error) {
    console.error(error);
    alert(error.message || 'No se pudo actualizar el caso');
  }
}

async function descargarPdfCaso() {
  const casoId = document.getElementById('editCasoId')?.value;
  const mm = document.getElementById('editMM')?.value || 'orden_servicio';

  if (!casoId) {
    alert('No se encontró el ID del caso para generar el PDF.');
    return;
  }

  try {
    const url = `/api/ingresos/pdf/${casoId}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error backend:', response.status, errorText);
      throw new Error(`No se pudo generar el PDF. Estado HTTP: ${response.status}`);
    }

    const blob = await response.blob();
    const fileUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = fileUrl;
    a.download = `Orden_${mm}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(fileUrl);
  } catch (error) {
    console.error('Error al descargar PDF:', error);
    alert(error.message || 'No se pudo descargar el PDF');
  }
}

async function cargarTiposIdentificacionModal() {
  const select = document.getElementById('editTipoIdentificacion');
  if (!select) return;

  try {
    const tipos = await window.api.obtenerTiposIdentificacion();
    tiposIdentificacionCache = tipos || [];

    select.innerHTML = '<option value="">Seleccione una opción</option>';

    tiposIdentificacionCache.forEach(tipo => {
      const option = document.createElement('option');
      option.value = String(tipo.id);
      option.textContent = tipo.nombre;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando tipos de identificación del modal:', error);
  }
}

async function cargarTecnicosModal() {
  const select = document.getElementById('editTecnico');
  if (!select) return;

  try {
    const tecnicos = await window.api.obtenerTecnicos();
    tecnicosCache = tecnicos || [];

    select.innerHTML = '<option value="">Seleccione un técnico</option>';

    tecnicosCache.forEach(tecnico => {
      const option = document.createElement('option');
      option.value = tecnico.nombre;
      option.textContent = tecnico.nombre;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando técnicos del modal:', error);
  }
}

function cargarEstadosModal() {
  const select = document.getElementById('editEstado');
  if (!select) return;

  select.innerHTML = '<option value="">Seleccione un estado</option>';

  Object.keys(ESTADOS_CONFIG).forEach(estado => {
    const option = document.createElement('option');
    option.value = estado;
    option.textContent = estado;
    select.appendChild(option);
  });
}

// Función para descargar PDF directamente desde la tabla
async function descargarPdfDirecto(casoId, mm) {
  if (!casoId) {
    alert('No se encontró el ID del caso para generar el PDF.');
    return;
  }

  try {
    const url = `${BASE_URL}/api/ingresos/pdf/${casoId}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error backend:', response.status, errorText);
      throw new Error(`No se pudo generar el PDF. Estado HTTP: ${response.status}`);
    }

    const blob = await response.blob();
    const fileUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = fileUrl;
    a.download = `Orden_${mm || 'servicio'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(fileUrl);
    
  } catch (error) {
    console.error('Error al descargar PDF:', error);
    alert(error.message || 'No se pudo descargar el PDF');
  }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const index = Number(button.dataset.index);
  const action = button.dataset.action;
  const caso = casosCache[index];

  if (!caso) return;

  if (action === 'view') {
    await abrirModalCaso('view', caso);
  }

  if (action === 'edit') {
    await abrirModalCaso('edit', caso);
  }

  if (action === 'pdf') {
    await descargarPdfDirecto(caso.id, caso.mm);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnCerrarModal')?.addEventListener('click', cerrarModalCaso);
  document.getElementById('btnCancelarModal')?.addEventListener('click', cerrarModalCaso);
  document.getElementById('modalBackdrop')?.addEventListener('click', cerrarModalCaso);
  document.getElementById('btnHabilitarEdicion')?.addEventListener('click', habilitarEdicionModal);
  document.getElementById('formEditarCaso')?.addEventListener('submit', guardarEdicionCaso);
  document.getElementById('btnDescargarPdf')?.addEventListener('click', descargarPdfCaso);
  document.getElementById('btnBuscar')?.addEventListener('click', cargarCasos);
  document.getElementById('btnLimpiar')?.addEventListener('click', limpiarFiltros);
  document.getElementById('btnRecargar')?.addEventListener('click', cargarCasos);
});