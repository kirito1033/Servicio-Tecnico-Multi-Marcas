const BASE_URL_FIRMAS = window.location.origin;
let ultimoTokenFirmaModulo = null;

let firmaXAdmin = null;
let firmaYAdmin = null;
let firmaPageAdmin = 1;

function inicializarVistaFirmas() {
  const form = document.getElementById('formCrearSesionFirma');
  const btnLimpiar = document.getElementById('btnLimpiarFirma');
  const panelResultado = document.getElementById('panelResultadoFirma');
  const resultadoDescripcion = document.getElementById('resultadoDescripcionFirma');
  const resultadoLink = document.getElementById('resultadoLinkFirma');
  const qrImg = document.getElementById('qrFirmaImg');
  const inputDescripcion = document.getElementById('descripcionFirma');
  const inputArchivo = document.getElementById('archivoPdfFirma');
  const btnDescargarPdfFirmado = document.getElementById('btnDescargarPdfFirmado');

  const pdfCanvas = document.getElementById('pdfCanvasFirmaAdmin');
  const pdfPreviewWrapper = document.getElementById('pdfPreviewWrapperAdmin');
  const signatureBox = document.getElementById('signatureBoxAdmin');
  const positionCoords = document.getElementById('positionCoordsAdmin');
  const pdfLoading = document.getElementById('pdfLoadingAdmin');

  if (!form) {
    console.warn('[firmas] Formulario no encontrado al inicializar vista');
    return;
  }

  console.log('[firmas] Inicializando manejadores en vista-firmas');

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  async function cargarPreviewPDF(file) {
  try {
    if (!window.pdfjsLib) {
      throw new Error('pdf.js no está cargado en la aplicación');
    }

    if (!file) return;

    pdfLoading.style.display = 'block';
    pdfLoading.textContent = 'Cargando vista previa...';
    signatureBox.style.display = 'none';
    positionCoords.textContent = 'No seleccionada';
    firmaXAdmin = null;
    firmaYAdmin = null;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.4 });

    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;

    const renderContext = {
      canvasContext: pdfCanvas.getContext('2d'),
      viewport
    };

    await page.render(renderContext).promise;

    pdfLoading.style.display = 'none';
    signatureBox.style.display = 'block';

    const boxWidth = 140;
    const boxHeight = 60;

    signatureBox.style.width = `${boxWidth}px`;
    signatureBox.style.height = `${boxHeight}px`;
    signatureBox.style.left = `${Math.max(0, (pdfCanvas.width / 2) - (boxWidth / 2))}px`;
    signatureBox.style.top = `${Math.max(0, (pdfCanvas.height / 2) - (boxHeight / 2))}px`;

    calcularPosicionFirmaAdmin();
  } catch (err) {
    console.error('[firmas] Error cargando preview PDF:', err);
    pdfLoading.style.display = 'block';
    pdfLoading.textContent = err.message || 'No se pudo cargar la vista previa del PDF';
    signatureBox.style.display = 'none';
  }
}

  function calcularPosicionFirmaAdmin() {
    const left = parseFloat(signatureBox.style.left) || 0;
    const top = parseFloat(signatureBox.style.top) || 0;

    const centerX = left + (signatureBox.offsetWidth / 2);
    const centerY = top + (signatureBox.offsetHeight / 2);

    firmaXAdmin = (centerX / pdfCanvas.width) * 100;
    firmaYAdmin = (centerY / pdfCanvas.height) * 100;

    positionCoords.textContent = `${Math.round(firmaXAdmin)}%, ${Math.round(firmaYAdmin)}%`;
  }

  function moverCaja(x, y) {
    const boxWidth = signatureBox.offsetWidth || 140;
    const boxHeight = signatureBox.offsetHeight || 60;

    const maxLeft = Math.max(0, pdfCanvas.width - boxWidth);
    const maxTop = Math.max(0, pdfCanvas.height - boxHeight);

    const left = Math.max(0, Math.min(x - boxWidth / 2, maxLeft));
    const top = Math.max(0, Math.min(y - boxHeight / 2, maxTop));

    signatureBox.style.left = `${left}px`;
    signatureBox.style.top = `${top}px`;

    calcularPosicionFirmaAdmin();
  }

  if (inputArchivo && !inputArchivo.dataset.previewInit) {
    inputArchivo.dataset.previewInit = 'true';

    inputArchivo.addEventListener('change', async () => {
      const file = inputArchivo.files && inputArchivo.files[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        alert('El archivo debe ser un PDF.');
        inputArchivo.value = '';
        return;
      }

      await cargarPreviewPDF(file);
    });
  }

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let boxStartLeft = 0;
  let boxStartTop = 0;

  if (signatureBox && !signatureBox.dataset.dragInit) {
    signatureBox.dataset.dragInit = 'true';

    const startDrag = (e) => {
      isDragging = true;
      const point = e.touches ? e.touches[0] : e;

      dragStartX = point.clientX;
      dragStartY = point.clientY;
      boxStartLeft = parseFloat(signatureBox.style.left) || 0;
      boxStartTop = parseFloat(signatureBox.style.top) || 0;

      e.preventDefault();
    };

    const doDrag = (e) => {
      if (!isDragging) return;

      const point = e.touches ? e.touches[0] : e;
      const deltaX = point.clientX - dragStartX;
      const deltaY = point.clientY - dragStartY;

      const boxWidth = signatureBox.offsetWidth || 140;
      const boxHeight = signatureBox.offsetHeight || 60;

      const maxLeft = Math.max(0, pdfCanvas.width - boxWidth);
      const maxTop = Math.max(0, pdfCanvas.height - boxHeight);

      const newLeft = Math.max(0, Math.min(boxStartLeft + deltaX, maxLeft));
      const newTop = Math.max(0, Math.min(boxStartTop + deltaY, maxTop));

      signatureBox.style.left = `${newLeft}px`;
      signatureBox.style.top = `${newTop}px`;

      calcularPosicionFirmaAdmin();
      e.preventDefault();
    };

    const stopDrag = () => {
      isDragging = false;
    };

    signatureBox.addEventListener('mousedown', startDrag);
    signatureBox.addEventListener('touchstart', startDrag, { passive: false });

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('touchmove', doDrag, { passive: false });

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
  }

  if (pdfCanvas && !pdfCanvas.dataset.clickInit) {
    pdfCanvas.dataset.clickInit = 'true';

    pdfCanvas.addEventListener('click', (e) => {
      if (!pdfCanvas.width || !pdfCanvas.height) return;

      const rect = pdfCanvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * pdfCanvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * pdfCanvas.height;

      moverCaja(x, y);
    });
  }

  if (!form.dataset.firmasInit) {
    form.dataset.firmasInit = 'true';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('[firmas] submit formulario');

      if (!inputArchivo.files || !inputArchivo.files[0]) {
        alert('Selecciona un archivo PDF primero.');
        return;
      }

      const file = inputArchivo.files[0];
      if (file.type !== 'application/pdf') {
        alert('El archivo debe ser un PDF.');
        return;
      }

      if (firmaXAdmin === null || firmaYAdmin === null) {
        alert('Debes seleccionar la ubicación de la firma sobre la vista previa.');
        return;
      }

      const descripcion = inputDescripcion.value.trim();

      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('descripcion', descripcion);
      formData.append('page', firmaPageAdmin);
      formData.append('xPercent', firmaXAdmin);
      formData.append('yPercent', firmaYAdmin);

      try {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        const resp = await fetch('/api/firmas/sesion-upload', {
          method: 'POST',
          body: formData
        });

        const data = await resp.json().catch(() => null);
        console.log('[firmas] Respuesta', resp.status, data);

        if (!resp.ok || !data?.ok) {
          throw new Error(data?.error || 'No se pudo crear la sesión de firma');
        }

        const { urlFirma, descripcion: descFinal, token } = data;
        ultimoTokenFirmaModulo = token;

        resultadoDescripcion.textContent = descFinal || descripcion || file.name;
        resultadoLink.textContent = urlFirma;
        resultadoLink.href = urlFirma;

        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(urlFirma)}`;

        panelResultado.classList.remove('hidden');
      } catch (err) {
        console.error('[firmas] Error', err);
        alert(err.message || 'Error creando sesión de firma');
      } finally {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (btnLimpiar && !btnLimpiar.dataset.firmasInit) {
    btnLimpiar.dataset.firmasInit = 'true';
    btnLimpiar.addEventListener('click', () => {
      inputDescripcion.value = '';
      inputArchivo.value = '';
      panelResultado.classList.add('hidden');
      resultadoDescripcion.textContent = '-';
      resultadoLink.textContent = '-';
      resultadoLink.href = '#';
      qrImg.src = '';
      ultimoTokenFirmaModulo = null;
      firmaXAdmin = null;
      firmaYAdmin = null;
      pdfCanvas.width = 0;
      pdfCanvas.height = 0;
      signatureBox.style.display = 'none';
      pdfLoading.style.display = 'block';
      pdfLoading.textContent = 'Selecciona un PDF para previsualizarlo';
      positionCoords.textContent = 'No seleccionada';
    });
  }

  if (btnDescargarPdfFirmado && !btnDescargarPdfFirmado.dataset.firmasInit) {
    btnDescargarPdfFirmado.dataset.firmasInit = 'true';
    btnDescargarPdfFirmado.addEventListener('click', () => {
      if (!ultimoTokenFirmaModulo) {
        alert('Primero crea una sesión de firma y firma el documento.');
        return;
      }

      const url = `${BASE_URL_FIRMAS}/api/firmas/pdf-firmado/${ultimoTokenFirmaModulo}`;
      window.open(url, '_blank');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[firmas] DOMContentLoaded');

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-link');
    if (!btn) return;

    const view = btn.dataset.view;
    if (view === 'firmas') {
      setTimeout(() => {
        inicializarVistaFirmas();
      }, 100);
    }
  });

  const viewFirmas = document.getElementById('view-firmas');
  if (viewFirmas && !viewFirmas.classList.contains('hidden')) {
    setTimeout(() => {
      inicializarVistaFirmas();
    }, 100);
  }
});