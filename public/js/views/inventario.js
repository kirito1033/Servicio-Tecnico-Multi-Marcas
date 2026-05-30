window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error('window.onerror =>', {
    msg,
    url,
    lineNo,
    columnNo,
    error
  });

  const resultado = document.getElementById('resultadoImportacion');
  if (resultado) {
    resultado.innerHTML = `
      <div style="color:#721c24; background:#f8d7da; padding:10px; border:1px solid #f5c6cb; border-radius:6px; margin-top:10px;">
        <strong>Error JS:</strong><br>
        ${msg || 'Error desconocido'}<br>
        Archivo: ${url || 'N/A'}<br>
        Línea: ${lineNo || 0}, Columna: ${columnNo || 0}
      </div>
    `;
  }

  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  console.error('unhandledrejection =>', event.reason);

  const resultado = document.getElementById('resultadoImportacion');
  if (resultado) {
    resultado.innerHTML = `
      <div style="color:#721c24; background:#f8d7da; padding:10px; border:1px solid #f5c6cb; border-radius:6px; margin-top:10px;">
        <strong>Error async:</strong><br>
        ${event.reason?.message || event.reason || 'Promesa rechazada sin detalle'}
      </div>
    `;
  }
});

window.initInventarioView = function () {
  const form = document.getElementById('formImportarInventario');
  const btnExportar = document.getElementById('btnExportarInventario');
  const btnCargarImportaciones = document.getElementById('btnCargarImportaciones');
  const btnVerCambios = document.getElementById('btnVerCambios');
  const inputImportacionId = document.getElementById('inputImportacionId');

  if (!form && !btnExportar && !btnCargarImportaciones && !btnVerCambios) {
    console.warn('Inventario view no encontrada todavía.');
    return;
  }

  async function fetchJsonDebug(url, options = {}) {
    const response = await fetch(url, options);
    const rawText = await response.text();

    console.log('FETCH DEBUG =>', {
      url,
      status: response.status,
      statusText: response.statusText,
      rawText
    });

    let data = null;

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (parseError) {
      throw new Error(`La respuesta no es JSON válido. Respuesta: ${rawText}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Error HTTP ${response.status}`);
    }

    return data;
  }

  async function cargarImportaciones() {
    const tablaImportaciones = document.getElementById('tablaImportaciones');
    if (!tablaImportaciones) return;

    tablaImportaciones.innerHTML = '<p>Cargando...</p>';

    try {
      const data = await fetchJsonDebug('/api/inventario/importaciones');

      if (!data.ok) {
        tablaImportaciones.innerHTML = `<p>Error: ${data.error}</p>`;
        return;
      }

      if (!data.data || !data.data.length) {
        tablaImportaciones.innerHTML = '<p>No hay importaciones registradas.</p>';
        return;
      }

      tablaImportaciones.innerHTML = `
        <table border="1" cellpadding="8" cellspacing="0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Archivo</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Nuevas</th>
              <th>Actualizadas</th>
              <th>Sin cambios</th>
              <th>Errores</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${data.data.map(row => `
              <tr>
                <td>${row.id}</td>
                <td>${row.nombre_archivo ?? ''}</td>
                <td>${row.fecha_importacion ?? ''}</td>
                <td>${row.total_filas ?? 0}</td>
                <td>${row.filas_nuevas ?? 0}</td>
                <td>${row.filas_actualizadas ?? 0}</td>
                <td>${row.filas_sin_cambios ?? 0}</td>
                <td>${row.filas_error ?? 0}</td>
                <td>${row.estado ?? ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
      console.error('Error en cargarImportaciones:', error);
      tablaImportaciones.innerHTML = `<p>Error inesperado: ${error.message}</p>`;
    }
  }

  async function verCambios(importacionId) {
    const tablaCambios = document.getElementById('tablaCambios');
    if (!tablaCambios) return;

    tablaCambios.innerHTML = '<p>Cargando cambios...</p>';

    try {
      const data = await fetchJsonDebug(`/api/inventario/cambios/${importacionId}`);

      if (!data.ok) {
        tablaCambios.innerHTML = `<p>Error: ${data.error}</p>`;
        return;
      }

      if (!data.data || !data.data.length) {
        tablaCambios.innerHTML = '<p>No hay cambios para esa importación.</p>';
        return;
      }

      tablaCambios.innerHTML = `
        <table border="1" cellpadding="8" cellspacing="0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Código item</th>
              <th>Tipo</th>
              <th>Campo</th>
              <th>Anterior</th>
              <th>Nuevo</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${data.data.map(row => `
              <tr>
                <td>${row.id}</td>
                <td>${row.codigo_item ?? ''}</td>
                <td>${row.tipo_cambio ?? ''}</td>
                <td>${row.campo ?? ''}</td>
                <td>${row.valor_anterior ?? ''}</td>
                <td>${row.valor_nuevo ?? ''}</td>
                <td>${row.fecha_cambio ?? ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
      console.error('Error en verCambios:', error);
      tablaCambios.innerHTML = `<p>Error inesperado: ${error.message}</p>`;
    }
  }

  if (form && !form.dataset.boundInventario) {
    form.dataset.boundInventario = 'true';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const resultado = document.getElementById('resultadoImportacion');
      const inputArchivo = document.getElementById('archivoInventario');

      try {
        if (!inputArchivo || !inputArchivo.files.length) {
          throw new Error('Debes seleccionar un archivo Excel');
        }

        const archivo = inputArchivo.files[0];

        console.log('Archivo seleccionado =>', {
          name: archivo.name,
          size: archivo.size,
          type: archivo.type
        });

        const formData = new FormData();
        formData.append('archivo', archivo);

        for (const pair of formData.entries()) {
          console.log('FormData =>', pair[0], pair[1]);
        }

        if (resultado) {
          resultado.innerHTML = `
            <div style="color:#0c5460; background:#d1ecf1; padding:10px; border:1px solid #bee5eb; border-radius:6px; margin-top:10px;">
              Procesando archivo...
            </div>
          `;
        }

        const data = await fetchJsonDebug('/api/inventario/importar', {
          method: 'POST',
          body: formData
        });

        if (!data.ok) {
          throw new Error(data.error || 'La importación no fue exitosa');
        }

        if (resultado) {
          resultado.innerHTML = `
            <div style="color:#155724; background:#d4edda; padding:10px; border:1px solid #c3e6cb; border-radius:6px; margin-top:10px;">
              <strong>Importación completada</strong><br>
              ID importación: ${data.importacionId}<br>
              Total filas: ${data.totalFilas}<br>
              Nuevas: ${data.filasNuevas}<br>
              Actualizadas: ${data.filasActualizadas}<br>
              Sin cambios: ${data.filasSinCambios}<br>
              Errores: ${data.filasError}
            </div>
          `;
        }

        if (inputImportacionId) {
          inputImportacionId.value = data.importacionId;
        }

        await cargarImportaciones();
        await verCambios(data.importacionId);
      } catch (error) {
        console.error('Error en submit inventario:', error);

        if (resultado) {
          resultado.innerHTML = `
            <div style="color:#721c24; background:#f8d7da; padding:10px; border:1px solid #f5c6cb; border-radius:6px; margin-top:10px;">
              <strong>Error al importar:</strong><br>
              ${error.message}
            </div>
          `;
        }

        window.alert('Error al importar Excel: ' + error.message);
      }
    });
  }

  if (btnExportar && !btnExportar.dataset.boundInventario) {
    btnExportar.dataset.boundInventario = 'true';

    btnExportar.addEventListener('click', () => {
      window.open('/api/inventario/exportar', '_blank');
    });
  }

  if (btnCargarImportaciones && !btnCargarImportaciones.dataset.boundInventario) {
    btnCargarImportaciones.dataset.boundInventario = 'true';
    btnCargarImportaciones.addEventListener('click', cargarImportaciones);
  }

  if (btnVerCambios && !btnVerCambios.dataset.boundInventario) {
    btnVerCambios.dataset.boundInventario = 'true';

    btnVerCambios.addEventListener('click', async () => {
      const id = inputImportacionId ? inputImportacionId.value.trim() : '';
      const tablaCambios = document.getElementById('tablaCambios');

      if (!id) {
        if (tablaCambios) {
          tablaCambios.innerHTML = '<p>Ingresa un ID de importación.</p>';
        }
        return;
      }

      await verCambios(id);
    });
  }

  cargarImportaciones();
};