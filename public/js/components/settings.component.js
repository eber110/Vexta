import { apiService } from '../services/api.service.js';

export const settingsComponent = {
  
  init() {
    this.modal = document.getElementById('settingsModal');
    this.openBtn = document.getElementById('settingsBtn');
    this.closeBtn = document.getElementById('closeSettingsBtn');
    
    this.tabs = document.querySelectorAll('.settings-tabs .tab');
    this.panels = document.querySelectorAll('.settings-panels .panel');
    
    this.ollamaUrlInput = document.getElementById('ollamaUrlInput');
    this.testOllamaBtn = document.getElementById('testOllamaBtn');
    this.testStatusMsg = document.getElementById('ollamaTestStatus');
    
    this.themeToggleBtn = document.getElementById('themeToggleBtnSettings');
    
    this.bindEvents();
    this.initThemeToggle();
  },
  
  bindEvents() {
    // Abrir/Cerrar Modal
    this.openBtn.addEventListener('click', () => {
      this.modal.classList.remove('hidden');
      this.loadCurrentConfig();
    });
    
    this.closeBtn.addEventListener('click', () => {
      this.modal.classList.add('hidden');
      this.testStatusMsg.textContent = '';
    });
    
    // Cerrar al clickear fuera (overlay)
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeBtn.click();
      }
    });
    
    // Cambiar de Pestañas (Tabs)
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remover activo de todo
        this.tabs.forEach(t => t.classList.remove('active'));
        this.panels.forEach(p => p.classList.remove('active'));
        
        // Agregar activo al seleccionado
        tab.classList.add('active');
        const targetPanel = document.getElementById(`panel-${tab.dataset.tab}`);
        if(targetPanel) targetPanel.classList.add('active');
      });
    });
    
    // Guardar URL Ollama
    this.testOllamaBtn.addEventListener('click', async () => {
      const url = this.ollamaUrlInput.value.trim();
      if (!url) return;
      
      this.testOllamaBtn.disabled = true;
      this.testStatusMsg.textContent = 'Probando conexión y guardando...';
      this.testStatusMsg.className = 'test-status';
      
      try {
        await apiService.saveConfig(url);
        this.testStatusMsg.textContent = 'Guardado con éxito. Refrescando plataforma...';
        this.testStatusMsg.classList.add('success');
        
        // Refrescamos toda la app para aplicar la nueva URL de Ollama base
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        this.testStatusMsg.textContent = 'Se guardó la URL, pero Ollama podría no estar respondiendo.';
        this.testStatusMsg.classList.add('error');
      } finally {
        this.testOllamaBtn.disabled = false;
      }
    });
  },
  
  async loadCurrentConfig() {
    try {
      const data = await apiService.fetchConfig();
      if (data && data.ollamaUrl) {
        this.ollamaUrlInput.value = data.ollamaUrl;
      }
    } catch (err) {
      console.error('No se pudo cargar config de Ollama', err);
    }
  },
  
  initThemeToggle() {
    if (!this.themeToggleBtn) return;
    
    // Determinar modo actual del localStorage
    let isLight = document.documentElement.getAttribute('data-theme') === 'light';
    this.themeToggleBtn.textContent = isLight ? 'Activar Modo Oscuro' : 'Activar Modo Claro';
    
    this.themeToggleBtn.addEventListener('click', () => {
      isLight = document.documentElement.getAttribute('data-theme') === 'light';
      
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('app_theme', 'dark');
        this.themeToggleBtn.textContent = 'Activar Modo Claro';
        // También actualizamos el del header si sigue existiendo
        const mainHeaderToggle = document.getElementById('themeToggleBtn');
        if(mainHeaderToggle) mainHeaderToggle.textContent = '🌓';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('app_theme', 'light');
        this.themeToggleBtn.textContent = 'Activar Modo Oscuro';
        const mainHeaderToggle = document.getElementById('themeToggleBtn');
        if(mainHeaderToggle) mainHeaderToggle.textContent = '🌙';
      }
    });
  }
  
};
