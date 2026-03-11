import { chatComponent } from './js/components/chat.component.js';
import { modelSelectorComponent } from './js/components/modelSelector.component.js';
import { sidebarComponent } from './js/components/sidebar.component.js';

window.onload = async () => {
  
  // -- Lógica de Temas (Dark/Light) --
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('app_theme') || 'dark';
  
  // Aplicar tema guardado al cargar
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggleBtn.textContent = '🌙';
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  // Evento de click para alternar
  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('app_theme', 'dark');
      themeToggleBtn.textContent = '🌓';
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('app_theme', 'light');
      themeToggleBtn.textContent = '🌙';
    }
  });
  
  
  // Inicializamos la UI de chat
  chatComponent.init();
  
  // Inicializar Modelos por defecto primero
  await modelSelectorComponent.init();
  
  // Iniciar la barra lateral (esta se encargará de pedir el historial de la sesion que seleccione por default)
  sidebarComponent.init();
  
};
