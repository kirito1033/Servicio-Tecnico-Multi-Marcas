let ordenesIngresoCache = [];
let ingresosCache = [];
const hoy = new Date().toISOString().slice(0, 10);

// =========================
// INICIALIZAR FORM
// =========================
window.inicializarIngresosFactura = function () {
  const root = document.getElementById('view-ingresos-factura');
  if (!root) return;

  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  const form = document.getElementById('formIngresoFactura');
  const inputFiltro = document.getElementById('filtroMM');
  const selectMM = document.getElementById('selectMMIngreso');
  const inputOrdenId = document.getElementById('ordenServicioIdIngreso');

  const inputNombreRepuesto = document.getElementById('nombreRepuestoIngreso');
  const inputVendedor = document.getElementById('vendedorIngresoFactura');
  const inputPrecioCompra = document.getElementById('precioCompraIngresoFactura');
  const inputPrecioVenta = document.getElementById('precioVentaIngresoFactura');
  const btnLimpiar = document.getElementById('btnLimpiarIngresoFactura');

  async function cargarOrdenes() {
    try {
      const res = await fetch('/api/ordenes/para-ingresos');
      const data = await res.json();

      ordenesIngresoCache = Array.isArray(data) ? data : [];
      renderLista(ordenesIngresoCache);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    }
  }

  function renderLista(lista) {
    selectMM.innerHTML = lista
      .map(o => `<option value="${o.id}">${o.mm}</option>`)
      .join('');
  }

  inputFiltro?.addEventListener('input', (e) => {
    const valor = e.target.value.toLowerCase();
    const filtradas = ordenesIngresoCache.filter(o =>
      o.mm.toLowerCase().includes(valor)
    );
    renderLista(filtradas);
  });

  selectMM?.addEventListener('change', () => {
    inputOrdenId.value = selectMM.value;
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      orden_servicio_id: Number(inputOrdenId.value),
      nombre_repuesto: inputNombreRepuesto.value.trim(),
      vendedor: inputVendedor.value.trim(),
      precio_compra: Number(inputPrecioCompra.value),
      precio_venta: Number(inputPrecioVenta.value)
    };

    if (!payload.orden_servicio_id) {
      alert('Debes seleccionar una orden.');
      return;
    }

    try {
      const res = await fetch('/api/ingresos-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('Ingreso guardado');
      form.reset();
      inputOrdenId.value = '';

      cargarIngresosFactura(); // 🔥 refresca tabla

    } catch (error) {
      alert(error.message);
    }
  });

  btnLimpiar?.addEventListener('click', () => {
    form.reset();
    inputOrdenId.value = '';
  });

  cargarOrdenes();
};

// =========================
// INICIALIZAR TABLA
// =========================
window.inicializarTablaIngresosFactura = function () {
  const root = document.getElementById('view-ingresos-factura-tabla');
  if (!root) return;

  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  cargarIngresosFactura();
};

// =========================
// CARGAR DATOS
// =========================
async function cargarIngresosFactura() {
  try {
    const res = await fetch('/api/ingresos-factura');
    const data = await res.json();

    ingresosCache = Array.isArray(data) ? data : data.data || [];

    renderTablaIngresosFactura(ingresosCache);
  } catch (error) {
    console.error('Error cargando ingresos:', error);
  }
}

// =========================
// RENDER TABLA
// =========================
function renderTablaIngresosFactura(items = []) {
  const tbody = document.getElementById('tbodyIngresosFactura');
  const resumen = document.getElementById('resumenIngresosFactura');
  const emptyState = document.getElementById('emptyStateIngresosFactura');

  if (!tbody || !resumen || !emptyState) return;

  if (!items.length) {
    tbody.innerHTML = '';
    resumen.textContent = 'Sin ingresos cargados.';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  resumen.textContent = `${items.length} ingreso(s) encontrados.`;

  tbody.innerHTML = items.map(item => `
    <tr>
      <td>${item.mm || '-'}</td>
      <td>${item.nombre_repuesto || '-'}</td>
      <td>${item.vendedor || '-'}</td>
      <td>$${formatearMoneda(item.precio_compra)}</td>
      <td>$${formatearMoneda(item.precio_venta)}</td>
      <td>${formatearFecha(item.created_at)}</td>
      <td>
        <span class="estado-badge ${getEstadoClass(item.estado)}">
          ${item.estado || '-'}
        </span>
      </td>
      <td class="actions-cell">
        <div class="action-buttons">
          <button class="btn-action view" data-id="${item.id}" data-action="view">Ver</button>
          <button class="btn-action edit" data-id="${item.id}" data-action="edit">Editar</button>
        </div>
      </td>
    </tr>
  `).join('');

  inicializarEventosTabla();
}

// =========================
// EVENTOS TABLA (SOLO 1 VEZ)
// =========================
function inicializarEventosTabla() {
  const tbody = document.getElementById('tbodyIngresosFactura');
  if (!tbody || tbody.dataset.eventAdded === 'true') return;

  tbody.dataset.eventAdded = 'true';

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-action');
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'view') abrirModalIngreso(id, false);
    if (action === 'edit') abrirModalIngreso(id, true);
  });
}

// =========================
// MODAL
// =========================
function abrirModalIngreso(id, editable = false) {
  const item = ingresosCache.find(i => i.id == id);
  if (!item) return;

  document.getElementById('editIngresoId').value = item.id;
  document.getElementById('editMMIngreso').value = item.mm;
  document.getElementById('editRepuesto').value = item.nombre_repuesto;
  document.getElementById('editVendedor').value = item.vendedor;
  document.getElementById('editCompra').value = item.precio_compra;
  document.getElementById('editVenta').value = item.precio_venta;

  const inputs = document.querySelectorAll('#modalIngreso input');
  inputs.forEach(input => input.readOnly = !editable);

  document.getElementById('modalIngreso').classList.remove('hidden');
}

window.cerrarModalIngreso = function () {
  document.getElementById('modalIngreso').classList.add('hidden');
};

// =========================
// EDITAR
// =========================
window.guardarEdicionIngreso = async function () {
  const id = document.getElementById('editIngresoId').value;

  const payload = {
    nombre_repuesto: document.getElementById('editRepuesto').value,
    vendedor: document.getElementById('editVendedor').value,
    precio_compra: Number(document.getElementById('editCompra').value),
    precio_venta: Number(document.getElementById('editVenta').value)
  };

  try {
    const res = await fetch(`/api/ingresos-factura/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Error al actualizar');

    alert('Actualizado correctamente');

    cerrarModalIngreso();
    cargarIngresosFactura();

  } catch (error) {
    alert(error.message);
  }
};

// =========================
// UTILS
// =========================
function formatearMoneda(valor) {
  return Number(valor || 0).toLocaleString('es-CO');
}

function formatearFecha(fecha) {
  return fecha ? new Date(fecha).toLocaleDateString('es-CO') : '-';
}

function getEstadoClass(estado) {
  if (!estado) return 'estado-default';

  const e = estado.toLowerCase();

  if (e.includes('ingresado')) return 'estado-ingresado';
  if (e.includes('diagnostico')) return 'estado-diagnostico';
  if (e.includes('aprobacion')) return 'estado-aprobacion';
  if (e.includes('aprobado')) return 'estado-aprobado';
  if (e.includes('reparacion')) return 'estado-reparacion';
  if (e.includes('repuesto')) return 'estado-repuesto';
  if (e.includes('prueba')) return 'estado-prueba';
  if (e.includes('listo')) return 'estado-listo';
  if (e.includes('entregado')) return 'estado-entregado';
  if (e.includes('no reparable')) return 'estado-no-reparable';
  if (e.includes('garantia')) return 'estado-garantia';
  if (e.includes('cancelado')) return 'estado-cancelado';
  if (e.includes('cerrado')) return 'estado-cerrado';

  return 'estado-default';
}

async function descargarPdfListaIngresos() {
  try {
    const response = await fetch('/api/ingresos-factura/pdf/lista');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error backend:', response.status, errorText);
      throw new Error('No se pudo generar el PDF de ingresos');
    }

    const blob = await response.blob();
    const fileUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = fileUrl;
    a.download = `ingresos_pendientes_${hoy}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(fileUrl);
  } catch (error) {
    console.error(error);
    alert(error.message || 'No se pudo descargar el PDF');
  }
}