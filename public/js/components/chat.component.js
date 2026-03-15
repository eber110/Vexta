import { formatMessage } from '../utils/markdown.util.js';
import { apiService } from '../services/api.service.js';
import { sidebarComponent } from './sidebar.component.js';

export const chatComponent = {
  
  chatBox: null,
  userInput: null,
  sendBtn: null,
  agentModeBtn: null,
  projectPathContainer: null,
  rootPathInput: null,
  selectFolderBtn: null,
  savePathBtn: null,
  currentSessionId: null,
  currentModel: null,
  onMessageSent: null,
  agentModeActive: false,
  webSearchActive: true,
  hideThinking: false,
  thoughtContainer: null,
  thoughtContent: null,
  
  init() {
    
    this.chatBox = document.getElementById('chatBox');
    this.mainContainer = document.querySelector('main');
    this.userInput = document.getElementById('userInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.stopBtn = document.getElementById('stopBtn');
    
    this.sendBtn.addEventListener('click', () => this.handleSend());
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => this.stopResponse());
    }
    this.userInput.addEventListener('keydown', (e) => {
      // Si se presiona Enter sin la tecla Shift, se envía el mensaje
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Evitamos el salto de línea por defecto
        this.handleSend();
      }
    });
    
    // Auto redimensionar el textarea al escribir
    this.userInput.addEventListener('input', () => {
      this.userInput.style.height = 'auto'; // Reiniciamos temporalmente
      this.userInput.style.height = (this.userInput.scrollHeight) + 'px';
    });

    this.agentModeBtn = document.getElementById('agentModeBtn');
    if (this.agentModeBtn) {
      this.agentModeBtn.addEventListener('click', () => this.toggleAgentMode());
    }

    // Botón de búsqueda web
    this.webSearchToggleBtn = document.getElementById('webSearchToggleBtn');
    if (this.webSearchToggleBtn) {
      this.webSearchToggleBtn.addEventListener('click', () => this.toggleWebSearch());
    }

    // Configuración de proyecto
    this.projectPathContainer = document.getElementById('projectPathContainer');
    this.rootPathInput = document.getElementById('rootPathInput');
    this.selectFolderBtn = document.getElementById('selectFolderBtn');
    this.savePathBtn = document.getElementById('savePathBtn');

    if (this.selectFolderBtn) {
      this.selectFolderBtn.addEventListener('click', () => this.handleSelectFolder());
    }

    if (this.savePathBtn) {
      this.savePathBtn.addEventListener('click', () => this.saveProjectRootPath());
    }

    // Modal de pantalla completa para tablas
    this.fullscreenTableModal = document.getElementById('fullscreenTableModal');
    const closeFullscreenBtn = document.getElementById('closeFullscreenTableBtn');

    if (closeFullscreenBtn) {
      closeFullscreenBtn.addEventListener('click', () => {
        if (this.fullscreenTableModal) this.fullscreenTableModal.classList.add('hidden');
      });
    }

    if (this.fullscreenTableModal) {
      this.fullscreenTableModal.addEventListener('click', (e) => {
        if (e.target === this.fullscreenTableModal) {
          this.fullscreenTableModal.classList.add('hidden');
        }
      });
    }
    
  },
  
  clearChat() {
    if (this.chatBox) {
      this.chatBox.innerHTML = '';
    }
  },

  toggleAgentMode() {

    this.agentModeActive = !this.agentModeActive;

    if (this.agentModeBtn) {
      this.agentModeBtn.classList.toggle('active', this.agentModeActive);
      this.agentModeBtn.title = this.agentModeActive ? 'Desactivar Modo Agente' : 'Activar Modo Agente';
    }

  },

  toggleWebSearch() {
    this.webSearchActive = !this.webSearchActive;
    this.updateWebSearchUI();
    
    // Guardar preferencia si hay una sesión activa
    if (this.currentSessionId && this.currentSessionId !== 'temp_new_session') {
      apiService.updateWebSearchStatus(this.currentSessionId, this.webSearchActive)
        .catch(err => console.error('Error guardando preferencia de búsqueda:', err));
    }
  },

  setHideThinking(hide) {
    this.hideThinking = hide;
    if (this.chatBox) {
      this.chatBox.classList.toggle('hide-thoughts', hide);
    }
  },

  updateWebSearchUI() {
    if (this.webSearchToggleBtn) {
      this.webSearchToggleBtn.classList.toggle('active', this.webSearchActive);
      this.webSearchToggleBtn.title = this.webSearchActive ? 'Desactivar Búsqueda Web' : 'Activar Búsqueda Web';
    }
  },

  setProjectMode(rootPath) {
    if (!this.projectPathContainer) return;

    if (rootPath !== null && rootPath !== undefined) {
      this.projectPathContainer.classList.remove('hidden');
      this.rootPathInput.value = rootPath;
    } else {
      this.projectPathContainer.classList.add('hidden');
    }
  },

  async handleSelectFolder() {
    try {
      this.selectFolderBtn.disabled = true;
      const result = await apiService.selectFolder();
      
      if (result && result.path) {
        this.rootPathInput.value = result.path;
      }
    } catch (e) {
      console.error('Error seleccionando carpeta:', e);
    } finally {
      this.selectFolderBtn.disabled = false;
    }
  },

  async saveProjectRootPath() {
    const path = this.rootPathInput.value.trim();
    if (!this.currentSessionId || this.currentSessionId === 'temp_new_session') return;

    try {
      this.savePathBtn.disabled = true;
      await apiService.updateSessionRootPath(this.currentSessionId, path);
      
      // Feedback visual rápido
      const originalColor = this.savePathBtn.style.color;
      this.savePathBtn.style.color = '#fff';
      setTimeout(() => this.savePathBtn.style.color = originalColor, 1000);

    } catch (e) {
      console.error('Error guardando ruta:', e);
      alert('Error al guardar la ruta raíz');
    } finally {
      this.savePathBtn.disabled = false;
    }
  },

  appendMessage(text, sender, isThinking = false) {
    const div = document.createElement('div');
    div.classList.add('message', sender);

    // Contenedor principal para el contenido (para no interferir con botones absolutos)
    const innerDiv = document.createElement('div');
    innerDiv.classList.add('message-inner');

    // Botón de edición para mensajes de usuario (ahora hijo de innerDiv para posicionamiento preciso)
    if (sender === 'user') {
      const editBtn = document.createElement('button');
      editBtn.classList.add('edit-msg-btn');
      editBtn.title = 'Editar consulta';
      editBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      `;
      editBtn.addEventListener('click', () => this.editMessage(text));
      innerDiv.appendChild(editBtn);
    }
    
    // Contenedor para el texto del mensaje
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');

    if (isThinking && sender === 'agent') {
      div.classList.add('thinking');
      // Animación de carga (dots)
      const dots = document.createElement('div');
      dots.classList.add('thinking-dots');
      dots.innerHTML = '<span></span><span></span><span></span>';
      innerDiv.appendChild(dots);
    } else {
      textDiv.textContent = text;
      innerDiv.appendChild(textDiv);
    }

    div.appendChild(innerDiv);
    this.chatBox.appendChild(div);
    this.mainContainer.scrollTop = this.mainContainer.scrollHeight;
    
    // Resetear contenedores de pensamiento para la nueva respuesta
    if (sender === 'agent' && isThinking) {
      this.thoughtContainer = null;
      this.thoughtContent = null;
    }

    return div;
  },
  
  appendThoughtContainer(parentDiv) {
    if (this.thoughtContainer) return this.thoughtContainer;

    const container = document.createElement('div');
    container.classList.add('thought-container');
    
    container.innerHTML = `
      <div class="thought-header">
        <div class="thought-title">
          <svg class="thought-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span>Proceso de Pensamiento <span class="thought-status">(razonando...)</span></span>
        </div>
      </div>
      <div class="thought-content"></div>
    `;

    // Toggle colapsar/expandir
    const header = container.querySelector('.thought-header');
    header.addEventListener('click', () => {
      container.classList.toggle('collapsed');
    });

    // Insertar debajo de los puntos de carga (si existen) o al principio del innerDiv
    const innerDiv = parentDiv.querySelector('.message-inner');
    const dots = innerDiv.querySelector('.thinking-dots');
    if (dots) {
      dots.after(container);
    } else {
      innerDiv.prepend(container);
    }

    this.thoughtContainer = container;
    this.thoughtContent = container.querySelector('.thought-content');
    
    return container;
  },

  updateThought(parentDiv, text) {
    if (this.hideThinking) return;
    
    const container = this.appendThoughtContainer(parentDiv);
    const content = this.thoughtContent;
    
    content.textContent += text;
    this.mainContainer.scrollTop = this.mainContainer.scrollHeight;
  },

  finalizeThought() {
    if (this.thoughtContainer) {
      const status = this.thoughtContainer.querySelector('.thought-status');
      if (status) status.textContent = '(finalizado)';
    }
  },
  
  updateAgentMessage(div, newText) {
    div.classList.remove('thinking');
    const innerDiv = div.querySelector('.message-inner');
    
    // Eliminar puntos de carga si existen
    const dots = innerDiv.querySelector('.thinking-dots');
    if (dots) dots.remove();

    // Buscar o crear el contenedor de texto real
    let textDiv = innerDiv.querySelector('.message-text');
    if (!textDiv) {
      textDiv = document.createElement('div');
      textDiv.classList.add('message-text');
      innerDiv.appendChild(textDiv);
    }

    textDiv.innerHTML = '';
    const formattedContent = formatMessage(newText);
    while (formattedContent.firstChild) {
      textDiv.appendChild(formattedContent.firstChild);
    }
    this.mainContainer.scrollTop = this.mainContainer.scrollHeight;
  },
  
  handleTokenMetrics(metrics) {
    if (!this.currentModel || !this.currentModel.endsWith('-cloud')) return;
    
    const usedNow = (metrics.eval_count || 0) + (metrics.prompt_eval_count || 0);
    
    // Usar una clave de almacenamiento específica por modelo
    const safeModelName = this.currentModel.replace(/[:.]/g, '_');
    const storageKey = `vexta_cloud_tokens_${safeModelName}`;
    let totalUsed = parseInt(localStorage.getItem(storageKey) || '0', 10);
    totalUsed += usedNow;
    
    localStorage.setItem(storageKey, totalUsed);
    
    this.updateTokenGauge();
  },
  
  updateTokenGauge() {
    const gaugeContainer = document.getElementById('tokenGaugeContainer');
    if (!gaugeContainer) return;
    
    const gaugeText = document.getElementById('tokenGaugeText');
    const gaugePath = document.getElementById('tokenGaugePath');
    
    if (!this.currentModel || !this.currentModel.endsWith('-cloud')) {
      gaugeContainer.classList.add('hidden');
      return;
    }
    
    gaugeContainer.classList.remove('hidden');
    
    // Usar una clave de almacenamiento específica por modelo
    const safeModelName = this.currentModel.replace(/[:.]/g, '_');
    const storageKey = `vexta_cloud_tokens_${safeModelName}`;
    const totalUsed = parseInt(localStorage.getItem(storageKey) || '0', 10);
    
    // Límite de ejemplo (100,000 tokens)
    const LIMIT = 100000; 
    let percentage = (totalUsed / LIMIT) * 100;
    if (percentage > 100) percentage = 100;
    
    let displayValue = totalUsed;
    if (totalUsed >= 1000) {
      displayValue = (totalUsed / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    gaugeText.textContent = displayValue;
    
    // Force a small reflow if needed, or just set it:
    gaugePath.style.transition = 'none';
    gaugePath.setAttribute('stroke-dasharray', `0, 100`);
    
    // Allow the browser to register the 0 state before animating to the new percentage
    setTimeout(() => {
      gaugePath.style.transition = 'stroke-dasharray 0.8s ease-out, stroke 0.4s ease';
      gaugePath.setAttribute('stroke-dasharray', `${percentage}, 100`);
      
      gaugePath.classList.remove('warning', 'danger');
      if (percentage > 85) gaugePath.classList.add('danger');
      else if (percentage > 60) gaugePath.classList.add('warning');
    }, 50);
  },
  
  appendToolCallNotice(toolName, toolResult) {

    const div = document.createElement('div');
    div.classList.add('tool-call-notice');

    // Abreviar el resultado para el preview (máx 120 caracteres)
    const preview = toolResult.length > 120
      ? toolResult.slice(0, 120) + '…'
      : toolResult;

    div.innerHTML = `
      <div class="tool-call-header">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
        </svg>
        <span>Herramienta: <strong>${toolName}</strong></span>
      </div>
      <pre class="tool-call-result">${preview}</pre>
    `;

    this.chatBox.appendChild(div);
    this.mainContainer.scrollTop = this.mainContainer.scrollHeight;

  },

  stopResponse() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.sendBtn.classList.remove('hidden');
    if (this.stopBtn) this.stopBtn.classList.add('hidden');
    this.finalizeThought();
  },

  editMessage(text) {
    this.userInput.value = text;
    this.userInput.focus();
    // Ajustar altura del textarea
    this.userInput.style.height = 'auto';
    this.userInput.style.height = (this.userInput.scrollHeight) + 'px';
  },

  async handleSend() {
    
    const text = this.userInput.value.trim();
    let sessionId = this.currentSessionId;
    
    if (text !== '') {
      
      if (!sessionId) {
        this.appendMessage('Por favor selecciona o crea un nuevo chat en el menú lateral antes de escribir.', 'agent');
        return;
      }
      
      // Si estamos en un chat temporal vacío, creamos la sesión real en la DB ahora mismo
      if (sessionId === 'temp_new_session') {
        try {
          const newSession = await apiService.createSession();
          sessionId = newSession.id;
          
          // Actualizamos los estados en ambos componentes principales
          this.currentSessionId = sessionId;
          sidebarComponent.activeSessionId = sessionId;
          
          // Forzamos actualización visual del menú lateral y la caché local
          localStorage.setItem('active_session_id', sessionId);
          await sidebarComponent.loadSessions();
          
        } catch (err) {
          console.error('Error al generar la sesión real en base al chat temporal:', err);
          this.appendMessage('No se pudo establecer conexión para guardar este nuevo chat.', 'agent');
          return;
        }
      }
      
      this.appendMessage(text, 'user');
      this.userInput.value = '';
      this.userInput.style.height = 'auto'; // Restauramos a altura default (1 línea)
      
      // Mostrar botón Stop, ocultar Send
      this.sendBtn.classList.add('hidden');
      if (this.stopBtn) this.stopBtn.classList.remove('hidden');

      // Crear AbortController para permitir cancelar
      this.currentAbortController = new AbortController();

      // Inyectar estado de "pensando..."
      const agentDiv = this.appendMessage('', 'agent', true);
      let fullResponse = '';
      
      try {
        
        await apiService.sendMessageStream(
          sessionId, 
          text, 
          // onChunk callback
          (chunk, thought) => {
            if (thought !== undefined && thought !== null) {
              this.updateThought(agentDiv, thought);
              return;
            }
            
            // Si el backend no detectó el pensamiento pero viene en el contenido (tags <thought>)
            if (chunk && chunk.includes('<thought>')) {
              this.isProcessingThoughtTag = true;
              const parts = chunk.split('<thought>');
              if (parts[0]) {
                fullResponse += parts[0];
                this.updateAgentMessage(agentDiv, fullResponse);
              }
              if (parts[1]) {
                this.updateThought(agentDiv, parts[1]);
              }
              return;
            }

            if (this.isProcessingThoughtTag) {
              if (chunk && chunk.includes('</thought>')) {
                const parts = chunk.split('</thought>');
                if (parts[0]) {
                  this.updateThought(agentDiv, parts[0]);
                }
                this.isProcessingThoughtTag = false;
                this.finalizeThought();
                if (parts[1]) {
                  fullResponse += parts[1];
                  this.updateAgentMessage(agentDiv, fullResponse);
                }
              } else {
                this.updateThought(agentDiv, chunk);
              }
              return;
            }

            // Si es un chunk de contenido (incluso si está vacío), finalizamos el pensamiento
            this.finalizeThought();
            
            // Forzamos la actualización del mensaje para quitar los puntos de carga al primer signo de vida
            fullResponse += chunk || '';
            this.updateAgentMessage(agentDiv, fullResponse);
          },
          // onDone callback
          (metrics) => {
            this.finalizeThought();
            if (metrics) {
              this.handleTokenMetrics(metrics);
            }
            if (this.onMessageSent) this.onMessageSent(); 
            this.stopResponse(); // Limpiar controlador y restaurar botones
          },
          // onError callback
          (error) => {
            if (error.name === 'AbortError') {
              console.log('Generación cancelada por el usuario');
              return;
            }
            if (!fullResponse) {
              this.updateAgentMessage(agentDiv, 'Error: ' + error.message);
            }
            this.stopResponse();
          },
          // useAgent flag
          this.agentModeActive,
          // onToolCall callback — muestra qué herramienta ejecutó el agente
          (toolCall) => {
            this.appendToolCallNotice(toolCall.name, toolCall.result);
          },
          this.currentAbortController.signal
        );
        
      } catch (error) {
        
        console.error('Error de red:', error);
        if (!fullResponse) {
           this.updateAgentMessage(agentDiv, 'No se pudo conectar con el servidor local.');
        }
        
      }
      
    }
    
  }
  
};
