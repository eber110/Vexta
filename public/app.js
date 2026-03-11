import { chatComponent } from './js/components/chat.component.js';
import { modelSelectorComponent } from './js/components/modelSelector.component.js';
import { sidebarComponent } from './js/components/sidebar.component.js';

window.onload = async () => {
  
  // Inicializamos la UI
  chatComponent.init();
  
  // Inicializar Modelos por defecto primero
  await modelSelectorComponent.init();
  
  // Iniciar la barra lateral (esta se encargará de pedir el historial de la sesion que seleccione por default)
  sidebarComponent.init();
  
};
