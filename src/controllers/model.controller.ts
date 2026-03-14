import http from 'http';
import { llmConfig } from '../config/llm.config';

export class ModelController {
  
  async getModels(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
      const targetUrl = `${llmConfig.providers.ollama.baseUrl}/api/tags`;
      const response = await fetch(targetUrl);

      if (response.ok) {
        const data: any = await response.json();
        const models = data.models ? data.models.map((m: any) => m.name) : [];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ models, activeModel: llmConfig.providers.ollama.model }));
      } else {
        console.error(`[ModelController] Error de Ollama: ${response.status}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ models: [], activeModel: llmConfig.providers.ollama.model, error: 'Ollama respondió con error' }));
      }
    } catch (error: any) {
      console.error('[ModelController] Error de red:', error.message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: [], activeModel: llmConfig.providers.ollama.model, error: 'Ollama inalcanzable' }));
    }
  }
  
  changeModel(req: http.IncomingMessage, res: http.ServerResponse) {
    
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      
      try {
        
        const { model } = JSON.parse(body);
        
        if (model) {
          
          llmConfig.providers.ollama.model = model;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, activeModel: model }));
          
        } else {
          
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Modelo no especificado' }));
          
        }
        
      } catch (e) {
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error parseando cuerpo' }));
        
      }
      
    });
    
  }
  
}

export const modelController = new ModelController();
