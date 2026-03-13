import { apiService } from '../services/api.service.js';
import { chatComponent } from './chat.component.js';
import { modelSelectorComponent } from './modelSelector.component.js';

export const sidebarComponent = {
  
  sidebar: null,
  overlay: null,
  toggleBtn: null,
  mobileToggleBtn: null,
  newChatBtn: null,
  sessionList: null,
  activeSessionId: null,
  
  init() {
    
    this.sidebar = document.getElementById('sidebar');
    this.overlay = document.getElementById('sidebarOverlay');
    this.toggleBtn = document.getElementById('toggleSidebarBtn');
    this.mobileToggleBtn = document.getElementById('mobileToggleSidebarBtn');
    this.newChatBtn = document.getElementById('newChatBtn');
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
      // Chequeo 3: Ningún ID activo ni guardado, cargar el primero disponible por defecto
      else if (sessions.length > 0) {
        
        this.switchSession(sessions[0].id);
        
      }
      
    } catch (e) {
      
      console.error('Error cargando la lista de sesiones:', e);
      
    }
    
  },
  
  async createNewSession() {
    
    try {
      
      const newSession = await apiService.createSession();
      this.activeSessionId = newSession.id;
      chatComponent.currentSessionId = newSession.id;
      
      chatComponent.clearChat();
      chatComponent.appendMessage('Hola Eber, soy un nuevo chat vacío. ¿En qué te ayudo?', 'agent');
      await this.loadSessions(); // Re-renderizar lista
      await modelSelectorComponent.init(); // Recargar modelos selectores con el nuevo state
      
    } catch (e) {
      
      console.error('Error creando nueva sesión:', e);
      
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
          chatComponent.appendMessage(msg.content, msg.role);
        });
        
      } else {
        
        chatComponent.appendMessage('Chat histórico vacío.', 'agent');
        
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
