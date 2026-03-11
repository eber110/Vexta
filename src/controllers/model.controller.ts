import http from 'http';
import { llmConfig } from '../config/llm.config';

export class ModelController {
  
  getModels(req: http.IncomingMessage, res: http.ServerResponse) {
    
    const targetUrl = new URL(`${llmConfig.providers.ollama.baseUrl}/api/tags`);
    
    const apiReq = http.request(targetUrl, (apiRes) => {
      
      let responseData = '';
      
      apiRes.on('data', d => { responseData += d; });
      
      apiRes.on('end', () => {
        
        if (apiRes.statusCode === 200) {
          
          const data = JSON.parse(responseData);
          const models = data.models ? data.models.map((m: any) => m.name) : [];
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ models, activeModel: llmConfig.providers.ollama.model }));
          
        } else {
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No se pudieron obtener los modelos de Ollama' }));
          
        }
        
      });
      
    });
    
    apiReq.on('error', (error) => {
      
      console.error('Error obteniendo modelos:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error de red con Ollama' }));
      
    });
    
    apiReq.end();
    
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
