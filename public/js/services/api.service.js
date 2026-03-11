export const apiService = {
  
  async getSessions() {
    
    const response = await fetch('/api/sessions');
    if (!response.ok) throw new Error('No se pudieron cargar las sesiones');
    return await response.json();
    
  },
  
  async createSession() {
    
    const response = await fetch('/api/sessions', { method: 'POST' });
    if (!response.ok) throw new Error('Error creando sesión');
    return await response.json();
    
  },
  
  async deleteSession(id) {
    
    const response = await fetch(`/api/sessions?id=${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Error borrando sesión');
    return await response.json();
    
  },
  
  async fetchHistory(sessionId) {
    
    if (!sessionId) return { history: [], activeModel: null };
    
    const response = await fetch(`/api/history?sessionId=${sessionId}`);
    if (!response.ok) {
      
      throw new Error('No se pudo cargar el historial');
      
    }
    
    return await response.json();
    
  },
  
  async sendMessageStream(sessionId, text, onChunk, onDone, onError) {
    if (!sessionId) throw new Error('No hay sesión activa seleccionada');
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, message: text })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al enviar mensaje');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let parts = buffer.split('\n\n');
          buffer = parts.pop(); // La última parte podría estar incompleta, la devolvemos al buffer temporal
          
          for (const part of parts) {
            if (part.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(part.substring(6));
                if (parsed.chunk && onChunk) onChunk(parsed.chunk);
                if (parsed.done && onDone) onDone();
              } catch (e) {
                // Ignorar JSON parcial en medio del stream
              }
            }
          }
        }
        
        if (done) {
          if (onDone) onDone();
          break;
        }
      }
      
    } catch (error) {
      if (onError) onError(error);
    }
  },
  
  async fetchModels() {
    
    const response = await fetch('/api/models');
    if (!response.ok) {
      
      throw new Error('No se pudieron cargar los modelos');
      
    }
    
    return await response.json();
    
  },
  
  async changeModel(newModel) {
    
    const response = await fetch('/api/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: newModel })
    });
    
    return await response.json();
    
  }
  
};
