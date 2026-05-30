async function verificarSesionApp() {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      window.location.href = '/login.html';
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Sesión inválida:', error);
    window.location.href = '/login.html';
    return null;
  }
}

window.initApp = async function () {
  const sessionData = await verificarSesionApp();
  if (!sessionData) return;

  const btnBuscar = document.getElementById('btnBuscar');
  const btnLimpiar = document.getElementById('btnLimpiar');
  const btnRecargar = document.getElementById('btnRecargar');
  const formIngreso = document.getElementById('formIngreso');
  const btnResetIngreso = document.getElementById('btnResetIngreso');
  const navLinks = document.querySelectorAll('.nav-link');

  function cambiarVista(view) {
    const vistaCasos = document.getElementById('view-casos');
    const vistaIngresos = document.getElementById('view-ingresos');
    const vistaCalculadora = document.getElementById('view-calculadora');
    const vistaIngresosFactura = document.getElementById('view-ingresos-factura');
    const vistaIngresosFacturaTabla = document.getElementById('view-ingresos-factura-tabla');
    const vistaClientesTienda = document.getElementById('view-clientes-tienda');
    const vistaInventario = document.getElementById('view-inventario');
    const vistaProductos = document.getElementById('view-productos');
    if (vistaProductos) vistaProductos.classList.add('hidden');
    if (vistaCasos) vistaCasos.classList.add('hidden');
    if (vistaIngresos) vistaIngresos.classList.add('hidden');
    if (vistaCalculadora) vistaCalculadora.classList.add('hidden');
    if (vistaIngresosFactura) vistaIngresosFactura.classList.add('hidden');
    if (vistaIngresosFacturaTabla) vistaIngresosFacturaTabla.classList.add('hidden');
    if (vistaClientesTienda) vistaClientesTienda.classList.add('hidden');
    if (vistaInventario) vistaInventario.classList.add('hidden');

    const vistaActiva = document.getElementById(`view-${view}`);
    if (vistaActiva) vistaActiva.classList.remove('hidden');

    navLinks.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'casos' && typeof cargarCasos === 'function') {
      cargarCasos();
    }

    if (view === 'calculadora' && typeof window.inicializarCalculadora === 'function') {
      window.inicializarCalculadora();
    }
    
    if (view === 'productos' && typeof window.initProductosView === 'function') {
      window.initProductosView();
    }

    if (view === 'ingresos-factura' && typeof window.inicializarIngresosFactura === 'function') {
      window.inicializarIngresosFactura();
    }

    if (view === 'ingresos-factura-tabla' && typeof window.inicializarTablaIngresosFactura === 'function') {
      window.inicializarTablaIngresosFactura();
    }

    if (view === 'clientes-tienda' && typeof window.cargarClientesTienda === 'function') {
      window.cargarClientesTienda();
    }

    if (view === 'inventario' && typeof window.initInventarioView === 'function') {
      window.initInventarioView();
    }
  }

  navLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      cambiarVista(btn.dataset.view);
    });
  });

  btnBuscar?.addEventListener('click', cargarCasos);
  btnLimpiar?.addEventListener('click', limpiarFiltros);
  btnRecargar?.addEventListener('click', cargarCasos);
  formIngreso?.addEventListener('submit', guardarIngreso);
  btnResetIngreso?.addEventListener('click', limpiarFormularioIngreso);

  document.getElementById('filtroMM')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') cargarCasos();
  });

  document.getElementById('filtroTecnico')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') cargarCasos();
  });

  document.getElementById('filtroTelefono')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') cargarCasos();
  });

  document.getElementById('filtroIdentificacion')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') cargarCasos();
  });

  if (typeof inicializarAccesorioOtro === 'function') {
    inicializarAccesorioOtro();
  }

  if (typeof cargarTiposIdentificacion === 'function') {
    cargarTiposIdentificacion();
  }

  if (typeof cargarTecnicos === 'function') {
    cargarTecnicos();
  }

  if (typeof window.inicializarCalculadora === 'function') {
    window.inicializarCalculadora();
  }

  cambiarVista('casos');

  if (typeof cargarCasos === 'function') {
    cargarCasos();
  }
};