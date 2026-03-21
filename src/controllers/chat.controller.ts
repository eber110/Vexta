import http from 'http';
import { historyService } from '../services/history.service';
import { LlmService } from '../services/llm.service';
import { llmConfig } from '../config/llm.config';
import { dbService } from '../services/db.service';
import { AGENT_TOOLS } from '../tools/definitions.tool';

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

  async createProjectSession(req: http.IncomingMessage, res: http.ServerResponse) {
    
    try {
      
      const currentModel = llmConfig.providers.ollama.model;
      const sessionId = await historyService.createSession('Nuevo Proyecto', currentModel, ''); // Root path vacío por defecto
      
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: sessionId, title: 'Nuevo Proyecto', model: currentModel, root_path: '' }));
      
    } catch (e) {
      
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Error creando el proyecto' }));
      
    }
    
  }

  async updateSessionRootPath(req: http.IncomingMessage, res: http.ServerResponse) {
    
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { sessionId, rootPath } = JSON.parse(body);
        if (!sessionId) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'sessionId es requerido' }));
        }

        await historyService.updateSessionRootPath(Number(sessionId), rootPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Error actualizando carpeta raíz' }));
      }
    });
    
  }

  async updateWebSearchStatus(req: http.IncomingMessage, res: http.ServerResponse) {
    
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { sessionId, enabled } = JSON.parse(body);
        if (!sessionId) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'sessionId es requerido' }));
        }

        await historyService.updateWebSearchStatus(Number(sessionId), enabled);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Error actualizando estado de búsqueda web' }));
      }
    });
    
  }

  async updateCapabilities(req: http.IncomingMessage, res: http.ServerResponse) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { sessionId, capabilities } = JSON.parse(body);
        if (!sessionId) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'sessionId es requerido' }));
        }

        await historyService.updateSessionCapabilities(Number(sessionId), capabilities);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error('Error actualizando capacidades:', e);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Error actualizando capacidades' }));
      }
    });
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
                // Fallback: usar el modelo configurado por defecto
                llmConfig.providers.ollama.model = llmConfig.providers.ollama.model || 'qwen2.5-coder:7b';
                console.log(`[Fallback] El modelo original ${session.model} no está disponible en Ollama. Usando el modelo activo por defecto: ${llmConfig.providers.ollama.model}`);
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
        
        const { message, sessionId, useAgent } = JSON.parse(body);
        
        if (!message || !sessionId) {
          
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Mensaje y sessionId son requeridos' }));
          
        }
        
        // 1. Guardar mensaje del usuario
        await historyService.addMessage(sessionId, 'user', message);

        // 2. ABRIR STREAM SSE INMEDIATAMENTE
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        // Enviar chunk vacío para confirmar conexión
        res.write(`data: ${JSON.stringify({ chunk: '' })}\n\n`);

        let fullReply = '';
        const isAgentMode = useAgent === true || llmConfig.agentMode;

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
        // 1. Obtener estado de la sesión y botones (Agente y Web)
        const session = await historyService.getSessionData(sessionId);
        const isWebSearchActive = session ? session.web_search_enabled === 1 : false;
        const isAgentEnabled = isAgentMode; 

        // Recuperar capacidades granulares (JSON)
        let caps: any = {};
        if (session && session.capabilities) {
          try {
            caps = JSON.parse(session.capabilities);
          } catch (e) {}
        }

        let ollamaHistory = history.map(h => ({ role: h.role, content: h.content }));

        // CONSOLIDAR PROMPTS DE SISTEMA
        let systemPrompts: string[] = [];

        // Extraer system prompts previos (RAG, etc.) y limpiar el historial de ellos
        ollamaHistory = ollamaHistory.filter(h => {
          if (h.role === 'system') {
            systemPrompts.push(h.content);
            return false;
          }
          return true;
        });

        // 2. Construir Prompt de Sistema Dinámico
        const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        let dynamicSystemPrompt = `FECHA ACTUAL: ${today}\n\n${(llmConfig as any).baseSystemPrompt}`;

        if (isAgentEnabled) {
          dynamicSystemPrompt += `\n\n${(llmConfig as any).prompts.files}`;
        }
        if (isWebSearchActive) {
          dynamicSystemPrompt += `\n\n${(llmConfig as any).prompts.web}`;
        }

        systemPrompts.unshift(dynamicSystemPrompt);

        // 3. Contexto de Proyecto (si existe)
        if (session && session.root_path) {
          systemPrompts.push(`CONTEXTO DEL PROYECTO: Estás trabajando en la carpeta raíz: "${session.root_path}". Todas las herramientas de archivos y comandos deben ejecutarse con este contexto si no se especifica otra ruta absoluta.`);
        }

        // Si hay prompts de sistema acumulados, los unimos y los ponemos al principio
        if (systemPrompts.length > 0) {
          ollamaHistory.unshift({ role: 'system' as any, content: systemPrompts.join('\n\n---\n\n') });
        }
        
        // 4. Determinar si usamos el loop de herramientas (Agente o Web activos)
        const useToolLoop = isAgentEnabled || isWebSearchActive;
        let fullThought = '';

        if (useToolLoop) {

          console.log(`[Agent] Activando loop de herramientas. Agente: ${isAgentEnabled}, Web: ${isWebSearchActive}`);

          // FILTRAR HERRAMIENTAS SEGÚN LOS BOTONES ACTIVOS Y CAPACIDADES GRANULARES
          let toolsToUse: any[] = [];
          
          if (isAgentEnabled) {
            // Herramientas de archivos y comandos
            const fileTools = ['read_file', 'write_file', 'list_directory', 'create_directory'];
            const cmdTools = ['run_command'];

            toolsToUse.push(...AGENT_TOOLS.filter(t => {
              const name = t.function.name;
              // Si la capacidad está definida explícitamente en el JSON, la respetamos
              if (caps.tools && caps.tools[name] !== undefined) {
                return caps.tools[name] === true;
              }
              return [...fileTools, ...cmdTools].includes(name);
            }));
          }
          
          if (isWebSearchActive) {
            // Herramientas de internet
            toolsToUse.push(...AGENT_TOOLS.filter(t => {
              const name = t.function.name;
              if (caps.tools && caps.tools[name] !== undefined) {
                return caps.tools[name] === true;
              }
              return ['search_web', 'fetch_url_content'].includes(name);
            }));
          }

          const metrics = await llmService.generateAgentStream(

            ollamaHistory,

            (chunk: string, isThought?: boolean) => {
              if (isThought) {
                fullThought += chunk;
              } else {
                fullReply += chunk;
              }
              res.write(`data: ${JSON.stringify({ chunk, thought: isThought ? chunk : undefined })}\n\n`);
            },

            // Callback cuando se ejecuta una herramienta
            (toolName: string, toolResult: string) => {
              // También guardamos el aviso de herramienta en el pensamiento persistente
              const toolNotice = `[TOOL_CALL:${toolName}]${toolResult}`;
              fullThought += toolNotice;
              res.write(`data: ${JSON.stringify({ toolCall: { name: toolName, result: toolResult } })}\n\n`);
            },
            
            toolsToUse // Pasar herramientas filtradas

          );

          await historyService.addMessage(sessionId, 'agent', fullReply, fullThought);
          res.write(`data: ${JSON.stringify({ done: true, metrics })}\n\n`);
          res.end();

        } else {

          const metrics = await llmService.generateStream(ollamaHistory, (chunk: string, isThought?: boolean) => {
            if (isThought) {
              fullThought += chunk;
            } else {
              fullReply += chunk;
            }
            res.write(`data: ${JSON.stringify({ chunk, thought: isThought ? chunk : undefined })}\n\n`);
          });

          // 4. Guardar mensaje completo final del agente y cerrar stream
          await historyService.addMessage(sessionId, 'agent', fullReply, fullThought);
          res.write(`data: ${JSON.stringify({ done: true, metrics })}\n\n`);
          res.end();

        }
        
      } catch (error: any) {
        
        console.error('Error en proceso de chat:', error);

        // Si es un error de compatibilidad de herramientas, informamos al usuario
        if (error.message === 'MODEL_NOT_SUPPORT_TOOLS') {
          const compatibilityMsg = "\n\n❌ **Error de Compatibilidad**: El modelo configurado no soporta el uso de herramientas (necesario para el modo Agente o Búsqueda Web).\n\n**Sugerencias:**\n1. Desactiva el modo Agente o la Búsqueda Web en los ajustes del chat.\n2. Cambia a un modelo compatible que soporte `tool calling` (ej: `qwen2.5-coder`, `llama3.1`, `mistral`).";
          
          if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ chunk: compatibilityMsg })}\n\n`);
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: compatibilityMsg }));
            return;
          }
        }
        
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
