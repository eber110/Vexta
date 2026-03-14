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
    
    this.hideThinkingCheck = document.getElementById('hideThinkingCheck');
    this.capChecks = document.querySelectorAll('.capabilities-grid input[type="checkbox"]');
    
    this.bindEvents();
    this.initThemeToggle();
    this.initCapabilityEvents();
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
  },

  initCapabilityEvents() {
    if (this.hideThinkingCheck) {
      this.hideThinkingCheck.addEventListener('change', () => this.saveCapabilities());
    }

    this.capChecks.forEach(check => {
      check.addEventListener('change', () => this.saveCapabilities());
    });
  },

  async loadCapabilities(session) {
    if (!session || !session.capabilities) {
      // Default: todo activo
      if (this.hideThinkingCheck) this.hideThinkingCheck.checked = false;
      this.capChecks.forEach(c => c.checked = true);
      return;
    }

    try {
      const caps = typeof session.capabilities === 'string' 
        ? JSON.parse(session.capabilities) 
        : session.capabilities;
      
      if (this.hideThinkingCheck) {
        this.hideThinkingCheck.checked = caps.hideThinking || false;
      }

      this.capChecks.forEach(check => {
        const toolName = check.id.replace('cap-', '');
        if (caps.tools && caps.tools[toolName] !== undefined) {
          check.checked = caps.tools[toolName];
        } else {
          check.checked = true;
        }
      });
    } catch (e) {
      console.error('Error cargando capacidades:', e);
    }
  },

  async saveCapabilities() {
    const chatComp = (await import('./chat.component.js')).chatComponent;
    const sessionId = chatComp.currentSessionId;
    
    // Si no hay sesión real, no persistimos nada
    if (!sessionId || sessionId === 'temp_new_session') return;

    const capabilities = {
      hideThinking: this.hideThinkingCheck ? this.hideThinkingCheck.checked : false,
      tools: {}
    };

    this.capChecks.forEach(check => {
      const toolName = check.id.replace('cap-', '');
      capabilities.tools[toolName] = check.checked;
    });

    try {
      await apiService.updateCapabilities(sessionId, capabilities);
      console.log('[Settings] Capacidades guardadas para sesión', sessionId);
      
      // Actualizar localmente si es necesario (ej: para ocultar pensamiento al vuelo)
      chatComp.hideThinking = capabilities.hideThinking;
    } catch (e) {
      console.error('Error guardando capacidades:', e);
    }
  }
  
};
