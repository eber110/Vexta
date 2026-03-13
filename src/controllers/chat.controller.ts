import http from 'http';
import { historyService } from '../services/history.service';
import { LlmService } from '../services/llm.service';
import { llmConfig } from '../config/llm.config';
import { dbService } from '../services/db.service';

const llmService = new LlmService();

export class ChatController {
  
  // MÉTODOS DE SESIONES
  
  async getSessions(req: http.IncomingMessage, res: http.ServerResponse) {
    
    try {
      
      const sessions = await historyService.getSessions();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sessions));
      
    } catch (e) {
      
      console.error('Error cargando sesiones:', e);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Error cargando lista de sesiones' }));
      
    }
    
  }
  
  async createSession(req: http.IncomingMessage, res: http.ServerResponse) {
    
    try {
      
      const currentModel = llmConfig.providers.ollama.model;
      const sessionId = await historyService.createSession('Nuevo Chat', currentModel);
      
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: sessionId, title: 'Nuevo Chat', model: currentModel }));
      
    } catch (e) {
      
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Error creando la sesión' }));
      
    }
    
  }
  
  async deleteSession(req: http.IncomingMessage, res: http.ServerResponse) {
    
    // Obtener sessionId de la URL e.g. /api/sessions?id=1
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const id = Number(url.searchParams.get('id'));
    
    if (!id || isNaN(id)) {
      
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'ID de sesión inválido o faltante' }));
      
    }
    
    try {
      
      await historyService.deleteSession(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      
    } catch (e) {
      
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Error eliminando sesión' }));
      
    }
    
  }
  
  // MÉTODOS DE CHAT
  
  async getHistory(req: http.IncomingMessage, res: http.ServerResponse) {
    
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const sessionId = Number(url.searchParams.get('sessionId'));
    
    if (!sessionId || isNaN(sessionId)) {
      
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'sessionId es requerido' }));
      
    }
    
    try {
      
      // Lógica de validación rápida (Fallback): Si la sesión pide un modelo, asegurarnos que siga activo
      const session = await historyService.getSessionData(sessionId);
      if (session && session.model) {
        
        // Comprobar modelos en Ollama
        const targetUrl = new URL(`${llmConfig.providers.ollama.baseUrl}/api/tags`);
        const apiReq = http.request(targetUrl, (apiRes) => {
          let responseData = '';
          apiRes.on('data', d => { responseData += d; });
          apiRes.on('end', async () => {
            if (apiRes.statusCode === 200) {
              const data = JSON.parse(responseData);
              const models = data.models ? data.models.map((m: any) => m.name) : [];
              
              if (models.includes(session.model)) {
                // El modelo existe, setearlo
                llmConfig.providers.ollama.model = session.model!;
              } else {
                // Fallback: usar el primero disponible o qwen2.5-coder
                llmConfig.providers.ollama.model = models[0] || 'qwen2.5-coder:7b';
                console.log(`[Fallback] El modelo original ${session.model} no está disponible. Usando ${llmConfig.providers.ollama.model}`);
              }
            }
            
            // Devolver el historial finalmente
            const history = await historyService.getHistory(sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ history, activeModel: llmConfig.providers.ollama.model }));
            
          });
        });
        
        apiReq.on('error', async () => {
          // Si Ollama no está vivo o da error de red, igual devolvemos historial
          const history = await historyService.getHistory(sessionId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ history, activeModel: llmConfig.providers.ollama.model }));
        });
        
        apiReq.end();
        return;
      }
      
      const history = await historyService.getHistory(sessionId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ history, activeModel: llmConfig.providers.ollama.model }));
      
    } catch (error) {
      
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error cargando historial' }));
      
    }
    
  }
  
  async processChat(req: http.IncomingMessage, res: http.ServerResponse) {
    
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      
      try {
        
        const { message, sessionId } = JSON.parse(body);
        
        if (!message || !sessionId) {
          
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Mensaje y sessionId son requeridos' }));
          
        }
        
        // 1. Guardar mensaje del usuario
        await historyService.addMessage(sessionId, 'user', message);
        
        // RECUPERAR HISTORIAL COMPLETO
        const history = await historyService.getHistory(sessionId);
        
        // RAG GATILLO HÍBRIDO: ¿El usuario quiere buscar algo viejo?
        const searchRegex = /(antes|recuerdas|otros chats|historial|hablado|dije|ayer|pasado|mencioné|acuerdas|memoria|conversación|información anterior|sesión anterior|otra vez|comentaste|anteriormente|te dije|te conte)/i;
        if (searchRegex.test(message)) {
           console.log('[RAG] Posible intención de búsqueda detectada por regex...');
           const keyword = await llmService.extractSearchIntent(message);
           
           if (keyword) {
             console.log(`[RAG] Intención confirmada por LLM. Buscando palabra clave: '${keyword}'`);
             const pastChats = await historyService.searchPastChats(keyword, sessionId);
             
             if (pastChats && pastChats.length > 0) {
                // Formatear resultados e inyectarlos sigilosamente
                const formattedContext = pastChats.map(
                  p => `[Chat: "${p.session_title}" - Fecha: ${p.created_at}] ${p.role.toUpperCase()}: ${p.content}`
                ).join('\n');
                
                const sysContextMsg = `Información recuperada de otros chats en la base de datos relacionada a "${keyword}":\n${formattedContext}\nUsa esta información para responder a la pregunta actual del usuario. Si la información no es útil, ignórala.`;
                
                history.unshift({ role: 'system', content: sysContextMsg, session_id: sessionId });
             }
           }
        }
        
        // Formatear para Ollama mapper
        const ollamaHistory = history.map(h => ({ role: h.role, content: h.content }));
        
        // 2. Transmitir como Server-Sent Events (SSE)
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        let fullReply = '';
        
        const metrics = await llmService.generateStream(ollamaHistory, (chunk: string) => {
          
          fullReply += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          
        });
        
        // 3. Guardar mensaje completo final del agente y cerrar stream
        await historyService.addMessage(sessionId, 'agent', fullReply);
        res.write(`data: ${JSON.stringify({ done: true, metrics })}\n\n`);
        res.end();
        
      } catch (error) {
        
        console.error('Error en proceso de chat:', error);
        
        // Si no hemos mandado cabeceras (cayó antes de procesar), se manda error json normal.
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Error interno procesando el chat' }));
        } else {
          res.end(); // Solo cerramos si ya estábamos emitiendo evento
        }
        
      }
      
    });
    
  }
  
  // MÉTODOS DE CONFIGURACIÓN
  
  async getConfig(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const ollamaUrlRow = await dbService.queryOne(`SELECT value FROM settings WHERE key = 'ollama_url'`);
      const baseUrl = ollamaUrlRow ? ollamaUrlRow.value : llmConfig.providers.ollama.baseUrl;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ollamaUrl: baseUrl }));
    } catch (e) {
      console.error('Error leyendo configuracion:', e);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Error leyendo configuración' }));
    }
  }

  async updateConfig(req: http.IncomingMessage, res: http.ServerResponse) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { ollamaUrl } = JSON.parse(body);
        if (!ollamaUrl) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'La URL no puede estar vacía' }));
        }

        await dbService.run(`UPDATE settings SET value = ? WHERE key = 'ollama_url'`, [ollamaUrl]);
        
        // Actualizar en memoria
        llmConfig.providers.ollama.baseUrl = ollamaUrl;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ollamaUrl }));
      } catch (e) {
        console.error('Error actualizando configuracion:', e);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Error actualizando configuración' }));
      }
    });
  }
  
}

export const chatController = new ChatController();
