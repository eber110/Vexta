import { apiService } from '../services/api.service.js';
import { chatComponent } from './chat.component.js';
import { modelSelectorComponent } from './modelSelector.component.js';

export const sidebarComponent = {
  
  sidebar: null,
  overlay: null,
  toggleBtn: null,
  mobileToggleBtn: null,
  newChatBtn: null,
  newProjectBtn: null,
  sessionList: null,
  activeSessionId: null,
  webSearchActive: true,
  
  init() {
    
    this.sidebar = document.getElementById('sidebar');
    this.overlay = document.getElementById('sidebarOverlay');
    this.toggleBtn = document.getElementById('toggleSidebarBtn');
    this.mobileToggleBtn = document.getElementById('mobileToggleSidebarBtn');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.newProjectBtn = document.getElementById('newProjectBtn');
    this.sessionList = document.getElementById('sessionList');
    
    this.toggleBtn.addEventListener('click', () => {
      this.sidebar.classList.toggle('closed');
      
      // Controlar el overlay oscuro (solo se ve en mobile gracias al CSS)
      if (!this.sidebar.classList.contains('closed')) {
        this.overlay.classList.add('active');
      } else {
        this.overlay.classList.remove('active');
      }
    });

    // Cerrar sidebar al hacer clic fuera (en móvil)
    this.overlay.addEventListener('click', () => {
      this.sidebar.classList.add('closed');
      this.overlay.classList.remove('active');
    });
    
    // Botón de menú en el header (solo móvil)
    if (this.mobileToggleBtn) {
      this.mobileToggleBtn.addEventListener('click', () => {
        this.sidebar.classList.remove('closed');
        this.overlay.classList.add('active');
      });
    }
    
    this.newChatBtn.addEventListener('click', () => this.createNewSession());
    if (this.newProjectBtn) {
      this.newProjectBtn.addEventListener('click', () => this.createNewProjectSession());
    }
    
    // Wire up chat event
    chatComponent.onMessageSent = () => this.loadSessions();
    
    this.loadSessions();
    
  },
  
  async loadSessions() {
    
    try {
      
      const sessions = await apiService.getSessions();
      this.sessionList.innerHTML = '';
      
      if (sessions.length === 0) {
        
        await this.createNewSession();
        return;
        
      }
      
      sessions.forEach(session => {
        
        const item = document.createElement('div');
        item.className = 'session-item';
        if (session.id === this.activeSessionId) {
          
          item.classList.add('active');
          
        }
        
        const isProject = session.root_path !== null && session.root_path !== undefined;
        
        const typeIcon = document.createElement('span');
        typeIcon.className = 'session-type-icon';
        typeIcon.innerHTML = isProject 
          ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'session-title';
        titleSpan.textContent = session.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-session-btn';
        deleteBtn.innerHTML = '✖';
        deleteBtn.title = 'Eliminar chat';
        
        // Cargar chat al hacer click
        item.addEventListener('click', (e) => {
          
          if (e.target !== deleteBtn) {
            
            this.switchSession(session.id);
            
          }
          
        });
        
        // Eliminar chat
        deleteBtn.addEventListener('click', async (e) => {
          
          e.stopPropagation();
          const confirmDelete = await this.showDeleteConfirmModal();
          
          if (confirmDelete) {
            
            await apiService.deleteSession(session.id);
            if (this.activeSessionId === session.id) {
              
              this.activeSessionId = null;
              chatComponent.clearChat();
              
            }
            this.loadSessions();
            
          }
          
        });
        
        item.appendChild(typeIcon);
        item.appendChild(titleSpan);
        item.appendChild(deleteBtn);
        this.sessionList.appendChild(item);
        
      });
      
      // Lógica de Persistencia de Sesión
      const savedSessionId = localStorage.getItem('active_session_id');
      
      // Chequeo 1: Si ya tenemos una activa en memoria (después de crear una nueva, por ejemplo)
      if (this.activeSessionId) {
        // No hacemos nada, switchSession ya se debió haber llamado
      } 
      // Chequeo 2: Si el usuario recargó la página y hay un ID guardado en localStorage
      else if (savedSessionId) {
        
        if (savedSessionId === 'temp_new_session') {
          // El usuario estaba en un chat temporal y refrescó la página.
          // Lo mantenemos en su chat temporal para que no pierda ese estado.
          await this.createNewSession();
        } else {
          // Verificamos si ese ID guardado todavía existe en la base de datos de verdad
          const sessionExists = sessions.some(s => s.id === parseInt(savedSessionId));
        
          if (sessionExists) {
            
            this.switchSession(parseInt(savedSessionId));
            
          } else {
            
            // El chat guardado ya no existe (quizás lo borró), abrimos el primero
            localStorage.removeItem('active_session_id');
            this.switchSession(sessions[0].id);
            
          }
        }
        
      }
      // Chequeo 3: Ningún ID activo ni guardado, cargar el primero disponible por defecto
      else if (sessions.length > 0) {
        
        this.switchSession(sessions[0].id);
        
      }
      
    } catch (e) {
      
      console.error('Error cargando la lista de sesiones:', e);
      
    }
    
  },
  
  async createNewSession() {
    
    // Si ya estamos en una nueva sesión en blanco, no hacer nada.
    if (this.activeSessionId === 'temp_new_session') {
      return;
    }
    
    try {
      
      // Asignar ID temporal para el cliente
      this.activeSessionId = 'temp_new_session';
      chatComponent.currentSessionId = 'temp_new_session';
      
      chatComponent.clearChat();
      chatComponent.setProjectMode(null); // No es modo proyecto
      chatComponent.appendMessage('Hola Eber, soy un nuevo chat vacío. ¿En qué te ayudo?', 'agent');
      
      // Limpiar clase .active visual del menú
      document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
      
    } catch (e) {
      
      console.error('Error preparando nueva sesión local:', e);
      
    }
    
  },

  async createNewProjectSession() {
    
    try {
      const session = await apiService.createProjectSession();
      this.activeSessionId = session.id;
      chatComponent.currentSessionId = session.id;
      
      await this.loadSessions();
      this.switchSession(session.id);
      
    } catch (e) {
      console.error('Error creando proyecto:', e);
    }

  },
  
  async switchSession(sessionId) {
    
    this.activeSessionId = sessionId;
    chatComponent.currentSessionId = sessionId;
    
    // Guardar en el navegador para que persista al recargar la página F5
    localStorage.setItem('active_session_id', sessionId);
    
    // Quitar y poner clase active visualmente
    document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
    const items = [...this.sessionList.children];
    // Re-render completo es mas facil
    this.loadSessions();
    
    // Limpiar el DOM del chat
    chatComponent.clearChat();
    
    try {
      
      const data = await apiService.fetchHistory(sessionId);
      
      // Recargar modelo en UI usando activeModel de la respuesta
      await modelSelectorComponent.init(data.activeModel);
      
      if (data.history && data.history.length > 0) {
        
        data.history.forEach(msg => {
          chatComponent.appendMessage(msg.content, msg.role, false, msg.thought);
        });
        
      } else {
        
        chatComponent.appendMessage('Chat histórico vacío.', 'agent');
        
      }

      // Configurar modo proyecto y estado de búsqueda web
      const session = (await apiService.getSessions()).find(s => s.id === sessionId);
      if (session) {
        if (session.root_path !== null && session.root_path !== undefined) {
          chatComponent.setProjectMode(session.root_path);
        } else {
          chatComponent.setProjectMode(null);
        }
        
        // Actualizar estado de búsqueda web desde la sesión
        chatComponent.webSearchActive = session.web_search_enabled === 1;
        chatComponent.updateWebSearchUI();
      }
      
    } catch (error) {
      
      console.error('Error cambiando el historial:', error);
      chatComponent.appendMessage('Hubo un problema cargando este historial.', 'agent');
      
    }
    
  },
  
  showDeleteConfirmModal() {
    return new Promise((resolve) => {
      const modal = document.getElementById('deleteModal');
      const btnConfirm = document.getElementById('confirmDeleteBtn');
      const btnCancel = document.getElementById('cancelDeleteBtn');
      
      if (!modal || !btnConfirm || !btnCancel) {
        // Fallback robusto si falta el HTML
        resolve(confirm('¿Estás seguro de que deseas eliminar este chat?'));
        return;
      }
      
      // Mostrar modal
      modal.classList.remove('hidden');
      
      const cleanupAndResolve = (result) => {
        modal.classList.add('hidden');
        btnConfirm.removeEventListener('click', onConfirm);
        btnCancel.removeEventListener('click', onCancel);
        resolve(result);
      };
      
      const onConfirm = () => cleanupAndResolve(true);
      const onCancel = () => cleanupAndResolve(false);
      
      btnConfirm.addEventListener('click', onConfirm);
      btnCancel.addEventListener('click', onCancel);
    });
  }
  
};
