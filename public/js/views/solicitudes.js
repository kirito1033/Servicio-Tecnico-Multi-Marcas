(function () {
  const API_BASE = 'http://localhost:3000/api/solicitudes';

  function esperarElementos() {
    const elementos = {
      tbody: document.getElementById('solicitudesTableBody'),
      historialBody: document.getElementById('solicitudesHistorialBody'),
      btnRecargar: document.getElementById('btnRecargarSolicitudes'),
      filtroCodigo: document.getElementById('filtroSolicitudCodigo'),
      filtroNombre: document.getElementById('filtroSolicitudNombre'),
      filtroEstado: document.getElementById('filtroSolicitudEstado'),
      modalEditar: document.getElementById('modalEditarSolicitud'),
      btnCerrarModalEditar: document.getElementById('btnCerrarModalEditarSolicitud'),
      btnCancelarEditar: document.getElementById('btnCancelarEditarSolicitud'),
      btnGuardarEdicion: document.getElementById('btnGuardarEdicionSolicitud'),
      editarSolicitudId: document.getElementById('editarSolicitudId'),
      editarSolicitudProducto: document.getElementById('editarSolicitudProducto'),
      editarSolicitudDescripcion: document.getElementById('editarSolicitudDescripcion'),
      editarSolicitudRn: document.getElementById('editarSolicitudRn'),
      editarSolicitudEstado: document.getElementById('editarSolicitudEstado'),
      editarSolicitudFeedback: document.getElementById('editarSolicitudFeedback')
    };

    if (!elementos.tbody || !elementos.historialBody || !elementos.btnRecargar) {
      setTimeout(inicializarSolicitudes, 300);
      return null;
    }

    return elementos;
  }

  async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Error en la solicitud');
    }

    return data;
  }

  function formatearFecha(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function traducirEstado(estado) {
    const estados = {
      pendiente_aprobacion: 'Pendiente aprobación',
      entregado: 'Entregado',
      pendiente_devolucion: 'Pendiente devolución',
      devuelto: 'Devuelto'
    };

    return estados[estado] || estado || '';
  }

  function obtenerNombreVisual(solicitud) {
    const nombre = String(solicitud.nombre_producto || '').trim();
    const descripcion = String(solicitud.descripcion || '').trim();
    return nombre || descripcion || '';
  }

  function limpiarHistorial() {
    const historial = document.getElementById('solicitudesHistorialBody');
    if (historial) {
      historial.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;">
            Seleccione una solicitud para ver el historial
          </td>
        </tr>
      `;
    }
  }

  function abrirModalEditar(solicitud) {
    const editarSolicitudId = document.getElementById('editarSolicitudId');
    const editarSolicitudProducto = document.getElementById('editarSolicitudProducto');
    const editarSolicitudDescripcion = document.getElementById('editarSolicitudDescripcion');
    const editarSolicitudRn = document.getElementById('editarSolicitudRn');
    const editarSolicitudEstado = document.getElementById('editarSolicitudEstado');
    const editarSolicitudFeedback = document.getElementById('editarSolicitudFeedback');
    const modalEditar = document.getElementById('modalEditarSolicitud');

    if (!modalEditar) return;

    if (editarSolicitudId) editarSolicitudId.value = solicitud.id || '';
    if (editarSolicitudProducto) editarSolicitudProducto.value = obtenerNombreVisual(solicitud);
    if (editarSolicitudDescripcion) editarSolicitudDescripcion.value = solicitud.descripcion || '';
    if (editarSolicitudRn) editarSolicitudRn.value = solicitud.rn || '';
    if (editarSolicitudEstado) editarSolicitudEstado.value = solicitud.estado || 'pendiente_aprobacion';
    if (editarSolicitudFeedback) editarSolicitudFeedback.innerHTML = '';

    modalEditar.classList.remove('hidden');
  }

  function cerrarModalEditar() {
    const modalEditar = document.getElementById('modalEditarSolicitud');
    const editarSolicitudFeedback = document.getElementById('editarSolicitudFeedback');

    if (modalEditar) modalEditar.classList.add('hidden');
    if (editarSolicitudFeedback) editarSolicitudFeedback.innerHTML = '';
  }

  async function guardarEdicionSolicitud() {
    const editarSolicitudId = document.getElementById('editarSolicitudId');
    const editarSolicitudEstado = document.getElementById('editarSolicitudEstado');
    const editarSolicitudRn = document.getElementById('editarSolicitudRn');
    const editarSolicitudFeedback = document.getElementById('editarSolicitudFeedback');
    const btnGuardarEdicion = document.getElementById('btnGuardarEdicionSolicitud');

    const solicitudId = editarSolicitudId?.value;
    const estado = editarSolicitudEstado?.value;
    const rn = editarSolicitudRn?.value?.trim() || null;

    if (!solicitudId || !estado) return;

    try {
      if (btnGuardarEdicion) btnGuardarEdicion.disabled = true;
      if (editarSolicitudFeedback) {
        editarSolicitudFeedback.innerHTML = '<p>Guardando cambios...</p>';
      }

      await apiFetch(`${API_BASE}/${solicitudId}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado, rn })
      });

      if (editarSolicitudFeedback) {
        editarSolicitudFeedback.innerHTML = `
          <div class="success-box">Estado actualizado correctamente.</div>
        `;
      }

      await cargarSolicitudes();
      await verHistorialSolicitud(solicitudId);

      setTimeout(() => {
        cerrarModalEditar();
      }, 900);
    } catch (error) {
      if (editarSolicitudFeedback) {
        editarSolicitudFeedback.innerHTML = `
          <div class="error-box">${error.message}</div>
        `;
      }
    } finally {
      if (btnGuardarEdicion) btnGuardarEdicion.disabled = false;
    }
  }

  async function cargarSolicitudes() {
    const tbody = document.getElementById('solicitudesTableBody');
    if (!tbody) return;

    try {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align:center;">
            Cargando solicitudes...
          </td>
        </tr>
      `;

      const params = new URLSearchParams();

      const codigo = document.getElementById('filtroSolicitudCodigo')?.value?.trim();
      const nombre = document.getElementById('filtroSolicitudNombre')?.value?.trim();
      const estado = document.getElementById('filtroSolicitudEstado')?.value?.trim();

      if (codigo) params.append('codigo_item', codigo);
      if (nombre) params.append('nombre', nombre);
      if (estado) params.append('estado', estado);

      const url = `${API_BASE}?${params.toString()}`;
      const response = await apiFetch(url);

      const solicitudes = Array.isArray(response.data) ? response.data : [];

      if (!solicitudes.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12" style="text-align:center;">
              No se encontraron solicitudes
            </td>
          </tr>
        `;
        limpiarHistorial();
        return;
      }

      tbody.innerHTML = solicitudes.map(s => `
        <tr>
          <td>${s.id}</td>
          <td>${s.codigo_item || ''}</td>
          <td>${obtenerNombreVisual(s)}</td>
          <td>${Number(s.cantidad_mano ?? 0).toLocaleString('es-CO')}</td>
          <td>${Number(s.cantidad_disponible ?? 0).toLocaleString('es-CO')}</td>
          <td>${Number(s.cantidad_congelada ?? 0).toLocaleString('es-CO')}</td>
          <td>${s.cantidad ?? 1}</td>
          <td>${s.rn || '-'}</td>
          <td>
            <span class="badge badge-${s.estado}">
              ${traducirEstado(s.estado)}
            </span>
          </td>
          <td>${s.solicitado_por_nombre || ''}</td>
          <td>${formatearFecha(s.fecha_solicitud)}</td>
          <td>
            <div class="solicitudes-acciones">
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                onclick="window.verHistorialSolicitud(${s.id})"
              >
                Historial
              </button>
              <button
                type="button"
                class="btn btn-sm btn-primary"
                onclick='window.editarSolicitud(${JSON.stringify({
                  id: s.id,
                  codigo_item: s.codigo_item || '',
                  nombre_producto: s.nombre_producto || '',
                  descripcion: s.descripcion || '',
                  rn: s.rn || '',
                  estado: s.estado || 'pendiente_aprobacion'
                }).replace(/'/g, "&apos;")})'
              >
                Editar
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align:center; color:red;">
            ${error.message}
          </td>
        </tr>
      `;
    }
  }

  async function verHistorialSolicitud(id) {
    const historialBody = document.getElementById('solicitudesHistorialBody');
    if (!historialBody) return;

    try {
      historialBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;">
            Cargando historial...
          </td>
        </tr>
      `;

      const response = await apiFetch(`${API_BASE}/${id}/historial`);
      const historial = Array.isArray(response.data) ? response.data : [];

      if (!historial.length) {
        historialBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center;">
              No hay historial registrado
            </td>
          </tr>
        `;
        return;
      }

      historialBody.innerHTML = historial.map(h => `
        <tr>
          <td>${formatearFecha(h.fecha_cambio)}</td>
          <td>${h.usuario_nombre || ''}</td>
          <td>${traducirEstado(h.estado_anterior || '-')}</td>
          <td>${traducirEstado(h.estado_nuevo || '')}</td>
          <td>${h.rn || '-'}</td>
          <td>${h.observacion || ''}</td>
        </tr>
      `).join('');
    } catch (error) {
      historialBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; color:red;">
            ${error.message}
          </td>
        </tr>
      `;
    }
  }

  function inicializarSolicitudes() {
    const elementos = esperarElementos();
    if (!elementos) return;

    window.verHistorialSolicitud = verHistorialSolicitud;
    window.cargarSolicitudes = cargarSolicitudes;
    window.editarSolicitud = abrirModalEditar;

    elementos.btnRecargar.addEventListener('click', cargarSolicitudes);
    elementos.filtroCodigo?.addEventListener('input', cargarSolicitudes);
    elementos.filtroNombre?.addEventListener('input', cargarSolicitudes);
    elementos.filtroEstado?.addEventListener('change', cargarSolicitudes);

    elementos.btnCerrarModalEditar?.addEventListener('click', cerrarModalEditar);
    elementos.btnCancelarEditar?.addEventListener('click', cerrarModalEditar);
    elementos.btnGuardarEdicion?.addEventListener('click', guardarEdicionSolicitud);

    elementos.modalEditar?.addEventListener('click', (e) => {
      if (e.target === elementos.modalEditar) {
        cerrarModalEditar();
      }
    });

    limpiarHistorial();
    cargarSolicitudes();
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(inicializarSolicitudes, 500);
  });
})();