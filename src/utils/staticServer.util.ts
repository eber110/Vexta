import http from 'http';
import fs from 'fs';
import path from 'path';

export class StaticServerUtil {
  
  static serveFile(req: http.IncomingMessage, res: http.ServerResponse) {
    
    let filePath = path.join(__dirname, '../../public', req.url === '/' ? 'index.html' : req.url || '');
    let extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
      
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
        contentType = 'image/jpg';
        break;
        
    }
    
    fs.readFile(filePath, (error, content) => {
      
      if (error) {
        
        if (error.code === 'ENOENT') {
          
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Archivo no encontrado');
          
        } else {
          
          res.writeHead(500);
          res.end('Error en el servidor: ' + error.code);
          
        }
        
      } else {
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
        
      }
      
    });
    
  }
  
}
