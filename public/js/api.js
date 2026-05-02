window.api = {
  async obtenerCasos(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.mm) params.append('mm', filtros.mm);
    if (filtros.tecnico) params.append('tecnico', filtros.tecnico);
    if (filtros.telefono) params.append('telefono', filtros.telefono);
    if (filtros.identificacion) params.append('identificacion', filtros.identificacion);

    const response = await fetch(`/api/casos?${params.toString()}`);

    if (!response.ok) {
      throw new Error('No se pudieron consultar los casos');
    }

    return response.json();
  },

  async crearIngreso(data) {
    const response = await fetch('/api/ingresos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'No se pudo crear el ingreso');
    }

    return result;
  },

  async obtenerTiposIdentificacion() {
    const response = await fetch('/api/tipos-identificacion');

    if (!response.ok) {
      throw new Error('No se pudieron cargar los tipos de identificación');
    }

    return response.json();
  },

  async obtenerTecnicos() {
    const response = await fetch('/api/tecnicos');

    if (!response.ok) {
      throw new Error('No se pudieron cargar los técnicos');
    }

    return response.json();
  }
  

};
async function actualizarCaso(data) {
  const response = await fetch(`/api/casos/${data.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  let result = {};
  if (contentType.includes('application/json')) {
    result = JSON.parse(rawText);
  } else {
    throw new Error(`La ruta no devolvió JSON. Respuesta: ${rawText.slice(0, 120)}`);
  }

  if (!response.ok) {
    throw new Error(result.error || 'Error actualizando caso');
  }

  return result;
}

window.api = {
  ...window.api,
  actualizarCaso
};