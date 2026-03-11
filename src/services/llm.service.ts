import { llmConfig } from '../config/llm.config';

export class LlmService {
  
  async generateResponse( prompt: string ): Promise<string> {
    
    if ( llmConfig.activeProvider !== 'ollama' ) {
      throw new Error( 'Proveedor de LLM no soportado o no configurado.' );
    }
    
    return new Promise((resolve, reject) => {
      let full = '';
      this.generateStream(prompt, (chunk) => {
        full += chunk;
      }).then(() => resolve(full)).catch(reject);
    });
    
  }
  
  async generateStream( prompt: string, onChunk: (chunk: string) => void ): Promise<void> {
    
    const config = llmConfig.providers.ollama;
    const url = `${config.baseUrl}/api/generate`;
    
    try {
      
      const response = await fetch( url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          prompt: prompt,
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
            if (parsed.response) {
              onChunk(parsed.response);
            }
          } catch (e) {
            // Ignorar errores de parseo por chunks cortados (común en TCP local rápido)
          }
        }
        
      }
      
    } catch ( error ) {
      
      console.error( 'Error llamando a Ollama por stream:', error );
      throw error;
      
    }
    
  }
  
}
