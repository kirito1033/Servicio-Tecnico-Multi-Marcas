const REGLAS_COTIZACION = [
  { id: 1, min: 1, max: 100000, factor: 2.0 },
  { id: 2, min: 100001, max: 200000, factor: 1.9 },
  { id: 3, min: 200001, max: 300000, factor: 1.8 },
  { id: 4, min: 300001, max: 600000, factor: 1.7 },
  { id: 5, min: 600001, max: 899999, factor: 1.6 },
  { id: 6, min: 900000, max: Infinity, factor: 1.5 }
];

const MANO_OBRA = {
  celular: 50000,
  pc: 70000
};

function formatearCOP(valor) {
  if (isNaN(valor)) return '';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(valor);
}

function buscarReglaPorValorRepuesto(valor) {
  return REGLAS_COTIZACION.find(r => valor >= r.min && valor <= r.max) || null;
}

function obtenerTipoEquipoSeleccionado(name) {
  const seleccionado = document.querySelector(`input[name="${name}"]:checked`);
  return seleccionado ? seleccionado.value : 'celular';
}

function obtenerManoObra(tipo) {
  return MANO_OBRA[tipo] || 0;
}

function inicializarCalculadora() {
  const root = document.getElementById('view-calculadora');
  if (!root) return;

  if (root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  const inputValorRepuesto = document.getElementById('calcValorRepuesto');
  const checkDescuento = document.getElementById('calcTieneDescuento');
  const inputDescuento = document.getElementById('calcDescuento');
  const contenedorDescuento = document.getElementById('calcDescuentoWrap');

  const inputFactorAplicado = document.getElementById('calcFactorAplicado');
  const inputManoObra = document.getElementById('calcManoObra');
  const inputSubtotalRepuesto = document.getElementById('calcSubtotalRepuesto');
  const inputTotalBase = document.getElementById('calcTotalBase');
  const inputValorDescuento = document.getElementById('calcValorDescuento');
  const inputResultadoCotizacion = document.getElementById('calcResultadoCotizacion');

  const btnCalcDesdeRepuesto = document.getElementById('btnCalcDesdeRepuesto');
  const btnCalcLimpiarDirecto = document.getElementById('btnCalcLimpiarDirecto');

  function actualizarEstadoDescuento() {
    const activo = checkDescuento.checked;
    contenedorDescuento.classList.toggle('hidden', !activo);

    if (!activo) {
      inputDescuento.value = '0';
    }
  }

  checkDescuento?.addEventListener('change', actualizarEstadoDescuento);
  actualizarEstadoDescuento();

  btnCalcDesdeRepuesto?.addEventListener('click', () => {
    const tipo = obtenerTipoEquipoSeleccionado('calcTipoEquipo');
    const valor = Number(inputValorRepuesto.value);
    const tieneDescuento = checkDescuento.checked;
    const descuento = Number(inputDescuento.value || 0);

    if (!valor || valor <= 0) {
      alert('Ingresa un valor de repuesto válido.');
      return;
    }

    if (tieneDescuento && (descuento < 0 || descuento > 100)) {
      alert('El porcentaje de descuento debe estar entre 0 y 100.');
      return;
    }

    const regla = buscarReglaPorValorRepuesto(valor);

    if (!regla) {
      alert('No se encontró un rango para ese valor de repuesto.');
      return;
    }

    const manoObra = obtenerManoObra(tipo);
    const subtotalRepuesto = valor * regla.factor;
    const totalBase = manoObra + subtotalRepuesto;
    const valorDescuento = tieneDescuento ? (totalBase * descuento) / 100 : 0;
    const totalFinal = totalBase - valorDescuento;

    inputFactorAplicado.value = regla.factor.toString().replace('.', ',');
    inputManoObra.value = formatearCOP(manoObra);
    inputSubtotalRepuesto.value = formatearCOP(subtotalRepuesto);
    inputTotalBase.value = formatearCOP(totalBase);
    inputValorDescuento.value = formatearCOP(valorDescuento);
    inputResultadoCotizacion.value = formatearCOP(totalFinal);
  });

  btnCalcLimpiarDirecto?.addEventListener('click', () => {
    const radioCelular = document.getElementById('calcTipoEquipoCelular');
    if (radioCelular) radioCelular.checked = true;

    inputValorRepuesto.value = '';
    checkDescuento.checked = false;
    inputDescuento.value = '0';

    inputFactorAplicado.value = '';
    inputManoObra.value = '';
    inputSubtotalRepuesto.value = '';
    inputTotalBase.value = '';
    inputValorDescuento.value = '';
    inputResultadoCotizacion.value = '';

    actualizarEstadoDescuento();
  });
}