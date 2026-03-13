import { llmConfig } from '../config/llm.config';
import { AGENT_TOOLS } from '../tools/definitions.tool';
import { executeTool } from '../tools/executor.tool';


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
  
  async generateStream( messages: {role: string, content: string}[], onChunk: (chunk: string) => void ): Promise<any> {
    
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
            if (parsed.done) {
              return {
                prompt_eval_count: parsed.prompt_eval_count || 0,
                eval_count: parsed.eval_count || 0
              };
            }
          } catch (e) {
            // Ignorar errores de parseo por chunks
          }
        }
        
      }
      return { prompt_eval_count: 0, eval_count: 0 };
      
    } catch ( error ) {
      
      console.error( 'Error llamando a Ollama por stream:', error );
      throw error;
      
    }
    
  }
  
  // Loop de tool calling para el modo agente
  async generateAgentStream(
    messages: {role: string, content: string}[],
    onChunk: (chunk: string) => void,
    onToolCall?: (toolName: string, result: string) => void
  ): Promise<any> {

    const config = llmConfig.providers.ollama;
    const url = `${config.baseUrl}/api/chat`;

    // Mapear roles para Ollama
    let agentMessages = messages.map(msg => ({
      role: msg.role === 'agent' ? 'assistant' : msg.role,
      content: msg.content
    }));

    const MAX_TOOL_LOOPS = 5;

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {

      // Llamada al modelo con herramientas disponibles (sin stream para detectar tool_calls)
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: agentMessages,
          tools: AGENT_TOOLS,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama respondió con error: ${response.statusText}`);
      }

      const data: any = await response.json();
      const assistantMsg = data.message;

      // Si el modelo usó herramientas, ejecutarlas
      if (assistantMsg?.tool_calls && assistantMsg.tool_calls.length > 0) {

        // Agregar el mensaje del assistant con los tool_calls al historial
        agentMessages.push({
          role: 'assistant',
          content: assistantMsg.content || ''
        });

        // Ejecutar cada herramienta y agregar resultados como mensajes "tool"
        for (const tc of assistantMsg.tool_calls) {

          const toolName: string = tc.function?.name ?? 'unknown';
          const toolArgs: Record<string, any> = tc.function?.arguments ?? {};

          console.log(`[Agent] Ejecutando herramienta: ${toolName}`, toolArgs);
          const toolResult = await executeTool(toolName, toolArgs);

          // Notificar al caller qué herramienta se ejecutó (para SSE de frontend)
          if (onToolCall) {
            onToolCall(toolName, toolResult);
          }

          // Agregar resultado de la herramienta al historial
          agentMessages.push({
            role: 'tool',
            content: toolResult
          });

        }

        // Continuar el loop para que el modelo procese los resultados
        continue;

      }

      // Sin tool_calls: el modelo respondi텥 con texto final — hacer stream de esa respuesta
      if (assistantMsg?.content) {

        // Simular streaming del texto final chunk a chunk
        const finalText: string = assistantMsg.content;
        const words = finalText.split(' ');
        for (const word of words) {
          onChunk(word + ' ');
        }

      }

      return {
        prompt_eval_count: data.prompt_eval_count || 0,
        eval_count: data.eval_count || 0
      };

    }

    // Si se agotaron loops, responder con mensaje de error
    onChunk('Error: el agente superó el número máximo de iteraciones de herramientas.');
    return { prompt_eval_count: 0, eval_count: 0 };

  }

  async extractSearchIntent( prompt: string ): Promise<string | null> {
    
    const config = llmConfig.providers.ollama;
    const url = `${config.baseUrl}/api/chat`;
    
    const systemPrompt = `
      Eres un analizador de intenciones. Evalúa si el usuario quiere buscar información en sus CONVERSACIONES PASADAS (otros chats).
      Devuelve ÚNICAMENTE un objeto JSON en formato {"isSearch": boolean, "keyword": "una o dos palabras clave principales"}.
      Si no quiere buscar en conversaciones pasadas, isSearch debe ser false y keyword nulo.
    `;
    
    try {
      
      const response = await fetch( url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          stream: false,
          format: 'json' // Obligado a JSON (Ollama soporta este flag en varios modelos)
        })
      });
      
      if ( !response.ok ) return null;
      
      const data: any = await response.json();
      
      if (data && data.message && data.message.content) {
        try {
          const parsed = JSON.parse(data.message.content);
          if (parsed.isSearch && parsed.keyword) {
            return parsed.keyword;
          }
        } catch(e) { /* Ignorar errores de json malformado del LLM */ }
      }
      
      return null;
      
    } catch ( error ) {
      
      console.error( 'Error en extractSearchIntent:', error );
      return null;
      
    }
    
  }
  
}
