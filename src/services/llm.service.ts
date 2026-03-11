import { llmConfig } from '../config/llm.config';

export class LlmService {
  
  async generateResponse( messages: {role: string, content: string}[] ): Promise<string> {
    
    if ( llmConfig.activeProvider !== 'ollama' ) {
      throw new Error( 'Proveedor de LLM no soportado o no configurado.' );
    }
    
    return new Promise((resolve, reject) => {
      let full = '';
      this.generateStream(messages, (chunk) => {
        full += chunk;
      }).then(() => resolve(full)).catch(reject);
    });
    
  }
  
  async generateStream( messages: {role: string, content: string}[], onChunk: (chunk: string) => void ): Promise<void> {
    
    const config = llmConfig.providers.ollama;
    const url = `${config.baseUrl}/api/chat`; // <-- Cambio a /api/chat
    
    // Mapeamos los roles, ya que Ollama espera "user", "assistant" o "system". 
    // En nuestra DB guardamos "agent", hay que convertirlo a "assistant".
    const mappedMessages = messages.map(msg => ({
      role: msg.role === 'agent' ? 'assistant' : msg.role,
      content: msg.content
    }));
    
    try {
      
      const response = await fetch( url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: mappedMessages, // <-- array de mensajes
          stream: true
        })
      });
      
      if ( !response.ok ) {
        
        throw new Error( `Ollama respondió con error: ${response.statusText}` );
        
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo obtener el stream de lectura de Ollama');
      
      const decoder = new TextDecoder();
      
      while (true) {
        
        const { done, value } = await reader.read();
        if (done) break;
        
        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) { // <-- parsing para /api/chat
              onChunk(parsed.message.content);
            }
          } catch (e) {
            // Ignorar errores de parseo por chunks
          }
        }
        
      }
      
    } catch ( error ) {
      
      console.error( 'Error llamando a Ollama por stream:', error );
      throw error;
      
    }
    
  }
  
}
