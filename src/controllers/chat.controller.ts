import http from 'http';
import { historyService } from '../services/history.service';
import { LlmService } from '../services/llm.service';
import { llmConfig } from '../config/llm.config';

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
        
        // 2. Transmitir como Server-Sent Events (SSE)
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        let fullReply = '';
        
        await llmService.generateStream(history, (chunk: string) => {
          
          fullReply += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          
        });
        
        // 3. Guardar mensaje completo final del agente y cerrar stream
        await historyService.addMessage(sessionId, 'agent', fullReply);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
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
  
}

export const chatController = new ChatController();
