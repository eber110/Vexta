import http from 'http';
import { chatController } from './controllers/chat.controller';
import { modelController } from './controllers/model.controller';
import { StaticServerUtil } from './utils/staticServer.util';
import { dbService } from './services/db.service';

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
  
  // Si no es ninguna ruta de API, servimos los archivos estáticos
  StaticServerUtil.serveFile(req, res);
  
});

// Iniciamos la escucha del servidor
server.listen(PORT, async () => {
  
  try {
    
    await dbService.connect();
    console.log(`Servidor de Agente inicializado en http://localhost:${PORT}`);
    
  } catch (err) {
    
    console.error('Error inicializando el servidor:', err);
    process.exit(1);
    
  }
  
});