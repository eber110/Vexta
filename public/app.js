import { chatComponent } from './js/components/chat.component.js?v=2';
import { modelSelectorComponent } from './js/components/modelSelector.component.js?v=2';
import { sidebarComponent } from './js/components/sidebar.component.js?v=2';
import { settingsComponent } from './js/components/settings.component.js?v=2';

window.onload = async () => {
  
  // -- Lógica de Temas (Dark/Light) --
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('app_theme') || 'dark';
  
  // Como el tema ya se aplicó en el <head> para evitar FOUC,
  // solo seteamos el icono inicial correcto.
  if (savedTheme === 'light') {
    themeToggleBtn.textContent = '🌙';
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
  
  
  // Inicializamos Preferencias/Ajustes
  settingsComponent.init();
  
  // Inicializamos la UI de chat
  chatComponent.init();
  
  // Inicializar Modelos por defecto primero
  await modelSelectorComponent.init();
  
  // Iniciar la barra lateral (esta se encargará de pedir el historial de la sesion que seleccione por default)
  sidebarComponent.init();
  
};
