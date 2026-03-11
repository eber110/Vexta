import { apiService } from '../services/api.service.js';
import { chatComponent } from './chat.component.js';
import { modelSelectorComponent } from './modelSelector.component.js';

export const sidebarComponent = {
  
  sidebar: null,
  toggleBtn: null,
  newChatBtn: null,
  sessionList: null,
  activeSessionId: null,
  
  init() {
    
    this.sidebar = document.getElementById('sidebar');
    this.toggleBtn = document.getElementById('toggleSidebarBtn');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.sessionList = document.getElementById('sessionList');
    
    this.toggleBtn.addEventListener('click', () => {
      this.sidebar.classList.toggle('closed');
    });
    
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
          if (confirm('¿Estás seguro de que deseas eliminar este chat?')) {
            
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
      
      // Si no tenemos sesion activa, seleccionar la mas reciente
      if (!this.activeSessionId && sessions.length > 0) {
        
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
    
  }
  
};
