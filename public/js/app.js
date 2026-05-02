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

    // ocultar todas
    if (vistaCasos) vistaCasos.classList.add('hidden');
    if (vistaIngresos) vistaIngresos.classList.add('hidden');
    if (vistaCalculadora) vistaCalculadora.classList.add('hidden');
    if (vistaIngresosFactura) vistaIngresosFactura.classList.add('hidden');
    if (vistaIngresosFacturaTabla) vistaIngresosFacturaTabla.classList.add('hidden');

    // mostrar activa
    const vistaActiva = document.getElementById(`view-${view}`);
    if (vistaActiva) vistaActiva.classList.remove('hidden');

    // activar botón
    navLinks.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // inicializaciones por vista
    if (view === 'casos' && typeof cargarCasos === 'function') {
      cargarCasos();
    }

    if (view === 'calculadora' && typeof window.inicializarCalculadora === 'function') {
      window.inicializarCalculadora();
    }

    if (view === 'ingresos-factura' && typeof window.inicializarIngresosFactura === 'function') {
      window.inicializarIngresosFactura();
    }

    if (view === 'ingresos-factura-tabla' && typeof window.inicializarTablaIngresosFactura === 'function') {
      window.inicializarTablaIngresosFactura();
    }
  }

  // navegación
  navLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      cambiarVista(btn.dataset.view);
    });
  });

  // eventos generales
  btnBuscar?.addEventListener('click', cargarCasos);
  btnLimpiar?.addEventListener('click', limpiarFiltros);
  btnRecargar?.addEventListener('click', cargarCasos);
  formIngreso?.addEventListener('submit', guardarIngreso);
  btnResetIngreso?.addEventListener('click', limpiarFormularioIngreso);

  // enter en filtros
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

  // inicializaciones globales
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