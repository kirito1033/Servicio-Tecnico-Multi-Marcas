const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

async function verificarSesion() {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('No hay sesión activa:', error);
  }
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.textContent = '';

  const payload = {
    login: document.getElementById('login').value.trim(),
    password: document.getElementById('password').value
  };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || 'No se pudo iniciar sesión');
    }

    window.location.href = '/';
  } catch (error) {
    console.error('Error login:', error);
    loginMessage.textContent = error.message || 'Error al iniciar sesión';
  }
});

verificarSesion();