import http from 'http';
import { chatController } from './controllers/chat.controller';
import { modelController } from './controllers/model.controller';
import { utilsController } from './controllers/utils.controller';
import { StaticServerUtil } from './utils/staticServer.util';
import { dbService } from './services/db.service';
import { llmConfig } from './config/llm.config';

// Configuración inicial del puerto
const PORT = 3005;

// Creación del servidor local centralizado
const server = http.createServer((req, res) => {
  
  const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  
  // MÉTODOS DE SESSION
  if (pathname === '/api/sessions' && req.method === 'GET') {
    return chatController.getSessions(req, res);
  }
  
  if (pathname === '/api/sessions' && req.method === 'POST') {
    return chatController.createSession(req, res);
  }

  if (pathname === '/api/sessions/project' && req.method === 'POST') {
    return chatController.createProjectSession(req, res);
  }

  if (pathname === '/api/sessions/root-path' && req.method === 'POST') {
    return chatController.updateSessionRootPath(req, res);
  }

  if (pathname === '/api/sessions/web-search' && req.method === 'POST') {
    return chatController.updateWebSearchStatus(req, res);
  }

  if (pathname === '/api/sessions/capabilities' && req.method === 'POST') {
    return chatController.updateCapabilities(req, res);
  }

  // MÉTODOS DE UTILERÍA
  if (pathname === '/api/utils/select-folder' && req.method === 'GET') {
    return utilsController.selectFolder(req, res);
  }
  
  if (pathname === '/api/sessions' && req.method === 'DELETE') {
    return chatController.deleteSession(req, res);
  }

  // MÉTODOS DE HISTORIAL Y CHAT
  if (pathname === '/api/history' && req.method === 'GET') {
    return chatController.getHistory(req, res);
  }

  // Endpoint para obtener los modelos disponibles
  if (pathname === '/api/models' && req.method === 'GET') {
    return modelController.getModels(req, res);
  }
  
  // Endpoint para cambiar el modelo activo
  if (pathname === '/api/model' && req.method === 'POST') {
    return modelController.changeModel(req, res);
  }

  // Endpoint de la API para el chat
  if (pathname === '/api/chat' && req.method === 'POST') {
    return chatController.processChat(req, res);
  }
  
  // Endpoint para configuraciones del agente
  if (pathname === '/api/config' && req.method === 'GET') {
    return chatController.getConfig(req, res);
  }
  if (pathname === '/api/config' && req.method === 'POST') {
    return chatController.updateConfig(req, res);
  }
  
  // Endpoint para activar/desactivar el modo agente
  if (pathname === '/api/agent/toggle' && req.method === 'POST') {
    llmConfig.agentMode = !llmConfig.agentMode;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ agentMode: llmConfig.agentMode }));
  }
  
  // Si no es ninguna ruta de API, servimos los archivos estáticos
  StaticServerUtil.serveFile(req, res);
  
});

// Iniciamos la escucha del servidor
server.listen(PORT, async () => {
  
  try {
    
    await dbService.connect();
    
    // Cargar configuración de base de datos a la memoria de la app
    const ollamaUrlRow = await dbService.queryOne(`SELECT value FROM settings WHERE key = 'ollama_url'`);
    if (ollamaUrlRow && ollamaUrlRow.value) {
      llmConfig.providers.ollama.baseUrl = ollamaUrlRow.value;
      console.log(`[Config] URL de Ollama cargada: ${llmConfig.providers.ollama.baseUrl}`);
    }
    
    console.log(`Servidor de Agente inicializado en http://localhost:${PORT}`);
    
  } catch (err) {
    
    console.error('Error inicializando el servidor:', err);
    process.exit(1);
    
  }
  
});