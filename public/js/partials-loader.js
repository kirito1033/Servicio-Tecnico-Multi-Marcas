document.addEventListener('DOMContentLoaded', async () => {
  const targets = document.querySelectorAll('[data-include]');

  for (const el of targets) {
    const url = el.getAttribute('data-include');

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`No se pudo cargar ${url}`);

      const html = await res.text();
      el.outerHTML = html;
    } catch (error) {
      console.error('Error cargando partial:', error);
    }
  }

  if (typeof window.initApp === 'function') {
    window.initApp();
  }
});