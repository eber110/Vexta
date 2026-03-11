import { formatMessage } from '../utils/markdown.util.js';
import { apiService } from '../services/api.service.js';

export const chatComponent = {
  
  chatBox: null,
  userInput: null,
  sendBtn: null,
  currentSessionId: null,
  onMessageSent: null,
  
  init() {
    
    this.chatBox = document.getElementById('chatBox');
    this.userInput = document.getElementById('userInput');
    this.sendBtn = document.getElementById('sendBtn');
    
    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSend();
      }
    });
    
  },
  
  clearChat() {
    if (this.chatBox) {
      this.chatBox.innerHTML = '';
    }
  },
  
  appendMessage(text, sender, isThinking = false) {
    
    const div = document.createElement('div');
    div.classList.add('message', sender);
    
    if (isThinking) {
      
      div.classList.add('thinking');
      div.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div>';
      
    } else if (sender === 'agent') {
      
      const formattedContent = formatMessage(text);
      while (formattedContent.firstChild) {
        div.appendChild(formattedContent.firstChild);
      }
      
    } else {
      
      div.textContent = text;
      
    }
    
    this.chatBox.appendChild(div);
    this.chatBox.scrollTop = this.chatBox.scrollHeight;
    
    return div;
  },
  
  updateAgentMessage(div, newText) {
    
    div.classList.remove('thinking');
    div.innerHTML = '';
    const formattedContent = formatMessage(newText);
    while (formattedContent.firstChild) {
      div.appendChild(formattedContent.firstChild);
    }
    this.chatBox.scrollTop = this.chatBox.scrollHeight;
    
  },
  
  async handleSend() {
    
    const text = this.userInput.value.trim();
    const sessionId = this.currentSessionId;
    
    if (text !== '') {
      
      if (!sessionId) {
        this.appendMessage('Por favor selecciona o crea un nuevo chat en el menú lateral antes de escribir.', 'agent');
        return;
      }
      
      this.appendMessage(text, 'user');
      this.userInput.value = '';
      
      // Inyectar estado de "pensando..."
      const agentDiv = this.appendMessage('', 'agent', true);
      let fullResponse = '';
      
      try {
        
        await apiService.sendMessageStream(
          sessionId, 
          text, 
          // onChunk callback
          (chunk) => {
            fullResponse += chunk;
            this.updateAgentMessage(agentDiv, fullResponse);
          },
          // onDone callback
          () => {
            if (this.onMessageSent) this.onMessageSent(); 
          },
          // onError callback
          (error) => {
            if (!fullResponse) {
              this.updateAgentMessage(agentDiv, 'Error: ' + error.message);
            }
          }
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
