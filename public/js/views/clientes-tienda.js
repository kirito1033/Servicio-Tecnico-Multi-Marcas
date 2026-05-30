const tbodyClientesTienda = document.getElementById('tbodyClientesTienda');
const resumenClientesTienda = document.getElementById('resumenClientesTienda');
const emptyClientesTienda = document.getElementById('emptyClientesTienda');
const btnRecargarClientesTienda = document.getElementById('btnRecargarClientesTienda');

async function cargarClientesTienda() {
  const tbodyClientesTienda = document.getElementById('tbodyClientesTienda');
  const resumenClientesTienda = document.getElementById('resumenClientesTienda');
  const emptyClientesTienda = document.getElementById('emptyClientesTienda');

  if (!tbodyClientesTienda || !resumenClientesTienda || !emptyClientesTienda) {
    console.warn('La vista clientes tienda no está lista todavía.');
    return;
  }

  try {
    const res = await fetch('/api/clientes-tienda', {
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      resumenClientesTienda.textContent = `Error ${res.status} al cargar los registros`;
      emptyClientesTienda.classList.remove('hidden');
      tbodyClientesTienda.innerHTML = '';
      return;
    }

    const data = await res.json();

    tbodyClientesTienda.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      resumenClientesTienda.textContent = 'No hay registros disponibles.';
      emptyClientesTienda.classList.remove('hidden');
      return;
    }

    emptyClientesTienda.classList.add('hidden');
    resumenClientesTienda.textContent = `${data.length} registro(s) encontrados.`;

    data.forEach((cliente) => {
      const tr = document.createElement('tr');

      const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
      const telefono = cliente.telefono || '';
      const correo = cliente.correo || '';
      const falla = cliente.descripcion_falla || '';
      const fecha = formatearFecha(cliente.fecha_registro);
      const textoCopiar = `Nombre: ${nombreCompleto}\nTeléfono: ${telefono}\nCorreo: ${correo}\nFalla: ${falla}`;

      tr.innerHTML = `
        <td>${cliente.id ?? ''}</td>
        <td>${nombreCompleto}</td>
        <td>${telefono}</td>
        <td>${correo}</td>
        <td>${falla}</td>
        <td>${fecha}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-copiar" data-copy="${escapeHtml(textoCopiar)}">
            Copiar todo
          </button>
        </td>
      `;

      tbodyClientesTienda.appendChild(tr);
    });

    document.querySelectorAll('.btn-copiar').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy || '');
          const textoOriginal = btn.textContent;
          btn.textContent = 'Copiado';
          setTimeout(() => {
            btn.textContent = textoOriginal;
          }, 1200);
        } catch (error) {
          console.error('Error al copiar:', error);
        }
      });
    });
  } catch (error) {
    console.error('Error al cargar clientes tienda:', error);
    resumenClientesTienda.textContent = 'Error al cargar clientes tienda.';
    emptyClientesTienda.classList.remove('hidden');
  }
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? fecha : d.toLocaleString('es-CO');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

window.cargarClientesTienda = cargarClientesTienda;