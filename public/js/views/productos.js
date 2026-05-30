window.initProductosView = function () {
  const inputNombre = document.getElementById('filtroProductoNombre');
  const inputCodigo = document.getElementById('filtroProductoCodigo');
  const inputCreatedFrom = document.getElementById('filtroCreatedFrom');
  const inputCreatedTo = document.getElementById('filtroCreatedTo');
  const inputUpdatedFrom = document.getElementById('filtroUpdatedFrom');
  const inputUpdatedTo = document.getElementById('filtroUpdatedTo');

  const btnLimpiar = document.getElementById('btnLimpiarFiltrosProductos');
  const btnRecargar = document.getElementById('btnRecargarProductos');
  const btnPrev = document.getElementById('btnProductosPrev');
  const btnNext = document.getElementById('btnProductosNext');

  const tbody = document.getElementById('productosTableBody');
  const resumen = document.getElementById('productosResumen');
  const paginacionTexto = document.getElementById('productosPaginacionTexto');

  const modalSolicitar = document.getElementById('modalSolicitar');
  const btnCerrarModal = document.getElementById('btnCerrarModalSolicitar');
  const btnCancelarSolicitar = document.getElementById('btnCancelarSolicitar');
  const btnGuardarSolicitud = document.getElementById('btnGuardarSolicitud');
  const formSolicitar = document.getElementById('formSolicitar');
  const solicitarItemId = document.getElementById('solicitarItemId');
  const solicitarNombreProducto = document.getElementById('solicitarNombreProducto');
  const solicitarCantidad = document.getElementById('solicitarCantidad');
  const solicitarObservacion = document.getElementById('solicitarObservacion');
  const solicitarFeedback = document.getElementById('solicitarFeedback');

  const solicitarRn = document.getElementById('solicitarRn');

  if (!tbody || !resumen || !paginacionTexto) return;

  if (window.__productosViewInitialized) return;
  window.__productosViewInitialized = true;

  let currentPage = 1;
  const limit = 10;
  let totalPages = 1;
  let debounceTimer = null;

  function formatearFecha(valor) {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return fecha.toLocaleString('es-CO');
  }

    function abrirModal(itemId, nombreProducto, descripcion) {
    if (!modalSolicitar) return;

    const textoProducto = String(nombreProducto || '').trim() || String(descripcion || '').trim();

    if (solicitarItemId) solicitarItemId.value = itemId;
    if (solicitarNombreProducto) solicitarNombreProducto.value = textoProducto;
    if (solicitarCantidad) solicitarCantidad.value = 1;
    if (solicitarRn) solicitarRn.value = '';
    if (solicitarFeedback) solicitarFeedback.innerHTML = '';

    modalSolicitar.classList.remove('hidden');
    }

  function cerrarModal() {
    if (!modalSolicitar) return;
    modalSolicitar.classList.add('hidden');
    if (solicitarFeedback) solicitarFeedback.innerHTML = '';
    formSolicitar?.reset();
    if (solicitarRn) solicitarRn.value = '';
    }

  btnCerrarModal?.addEventListener('click', cerrarModal);
  btnCancelarSolicitar?.addEventListener('click', cerrarModal);

  modalSolicitar?.addEventListener('click', (e) => {
    if (e.target === modalSolicitar) cerrarModal();
  });

 btnGuardarSolicitud?.addEventListener('click', async () => {
  const itemId = solicitarItemId?.value;
  const cantidad = parseInt(solicitarCantidad?.value || '1', 10);
  const rn = solicitarRn?.value?.trim() || null;

  if (!itemId) {
    if (solicitarFeedback) {
      solicitarFeedback.innerHTML = `<div class="error-box">Producto no válido.</div>`;
    }
    return;
  }

  if (!cantidad || cantidad < 1) {
    if (solicitarFeedback) {
      solicitarFeedback.innerHTML = `<div class="error-box">La cantidad debe ser mayor a 0.</div>`;
    }
    return;
  }

  if (!rn) {
    if (solicitarFeedback) {
      solicitarFeedback.innerHTML = `<div class="error-box">El RN es obligatorio.</div>`;
    }
    return;
  }

  try {
    if (btnGuardarSolicitud) btnGuardarSolicitud.disabled = true;
    if (solicitarFeedback) solicitarFeedback.innerHTML = '<p>Guardando solicitud...</p>';

    const res = await fetch('/api/solicitudes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        item_id: Number(itemId),
        cantidad,
        rn
      })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || data.message || 'No se pudo crear la solicitud');
    }

    if (solicitarFeedback) {
      solicitarFeedback.innerHTML = `
        <div class="success-box">
          Solicitud #${data.solicitudId} creada correctamente.
        </div>
      `;
    }

    setTimeout(() => cerrarModal(), 1500);
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    if (solicitarFeedback) {
      solicitarFeedback.innerHTML = `<div class="error-box">${error.message}</div>`;
    }
  } finally {
    if (btnGuardarSolicitud) btnGuardarSolicitud.disabled = false;
  }
});

  function renderTabla(rows) {
  if (!rows || !rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <h4>Sin resultados</h4>
            <p>No se encontraron productos con los filtros aplicados.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

    tbody.innerHTML = rows.map(row => `
    <tr>
        <td>${row.id ?? ''}</td>
        <td>${row.codigo_item ?? ''}</td>
        <td>${row.nombre_producto ?? ''}</td>
        <td>${row.descripcion ?? ''}</td>
        <td>${Number(row.cantidad_mano ?? 0).toLocaleString('es-CO')}</td>
        <td>${Number(row.cantidad_disponible ?? 0).toLocaleString('es-CO')}</td>
        <td>${Number(row.cantidad_congelada ?? 0).toLocaleString('es-CO')}</td>
        <td>
        <button
            class="btn btn-primary btn-solicitar"
            data-id="${row.id}"
            data-nombre="${(row.nombre_producto ?? '').replace(/"/g, '&quot;')}"
            data-descripcion="${(row.descripcion ?? '').replace(/"/g, '&quot;')}"
        >
            Solicitar
        </button>
        </td>
    </tr>
    `).join('');

    tbody.querySelectorAll('.btn-solicitar').forEach(btn => {
    btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        const nombre = btn.dataset.nombre;
        const descripcion = btn.dataset.descripcion;
        abrirModal(itemId, nombre, descripcion);
    });
    });
}

  function actualizarPaginacion(pagination) {
    currentPage = pagination.page || 1;
    totalPages = pagination.totalPages || 1;

    const total = pagination.total || 0;
    const desde = total === 0 ? 0 : ((currentPage - 1) * limit) + 1;
    const hasta = Math.min(currentPage * limit, total);

    resumen.textContent = `Mostrando ${desde} a ${hasta} de ${total} productos`;
    paginacionTexto.textContent = `Página ${currentPage} de ${totalPages}`;

    if (btnPrev) btnPrev.disabled = currentPage <= 1;
    if (btnNext) btnNext.disabled = currentPage >= totalPages;
  }

  async function cargarProductos(page = 1) {
    try {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">Cargando productos...</td>
        </tr>
      `;
      resumen.textContent = 'Consultando productos...';

      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);

      if (inputNombre?.value.trim()) params.set('nombre', inputNombre.value.trim());
      if (inputCodigo?.value.trim()) params.set('codigo_item', inputCodigo.value.trim());
      if (inputCreatedFrom?.value) params.set('created_from', inputCreatedFrom.value);
      if (inputCreatedTo?.value) params.set('created_to', inputCreatedTo.value);
      if (inputUpdatedFrom?.value) params.set('updated_from', inputUpdatedFrom.value);
      if (inputUpdatedTo?.value) params.set('updated_to', inputUpdatedTo.value);

      const res = await fetch(`/api/productos?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || 'No se pudo cargar el listado');
      }

      renderTabla(data.data || []);
      actualizarPaginacion(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      console.error('Error cargando productos:', error);
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <h4>Error al cargar</h4>
              <p>${error.message}</p>
            </div>
          </td>
        </tr>
      `;
      resumen.textContent = 'Ocurrió un error al consultar productos';
      paginacionTexto.textContent = 'Página 1 de 1';
    }
  }

  function recargarConDebounce() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      cargarProductos(1);
    }, 300);
  }

  inputNombre?.addEventListener('input', recargarConDebounce);
  inputCodigo?.addEventListener('input', recargarConDebounce);
  inputCreatedFrom?.addEventListener('change', () => cargarProductos(1));
  inputCreatedTo?.addEventListener('change', () => cargarProductos(1));
  inputUpdatedFrom?.addEventListener('change', () => cargarProductos(1));
  inputUpdatedTo?.addEventListener('change', () => cargarProductos(1));

  btnLimpiar?.addEventListener('click', () => {
    if (inputNombre) inputNombre.value = '';
    if (inputCodigo) inputCodigo.value = '';
    if (inputCreatedFrom) inputCreatedFrom.value = '';
    if (inputCreatedTo) inputCreatedTo.value = '';
    if (inputUpdatedFrom) inputUpdatedFrom.value = '';
    if (inputUpdatedTo) inputUpdatedTo.value = '';
    cargarProductos(1);
  });

  btnRecargar?.addEventListener('click', () => {
    cargarProductos(1);
  });

  btnPrev?.addEventListener('click', () => {
    if (currentPage > 1) {
      cargarProductos(currentPage - 1);
    }
  });

  btnNext?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      cargarProductos(currentPage + 1);
    }
  });

  cargarProductos(1);
};