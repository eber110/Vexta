import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class UtilsController {
  
  /**
   * Abre un selector de carpetas nativo de Windows usando PowerShell
   */
  async selectFolder(req: http.IncomingMessage, res: http.ServerResponse) {
    
    try {
      
      // Comando PowerShell para abrir el FolderBrowserDialog
      // Usamos -ExecutionPolicy Bypass para evitar bloqueos
      const psCommand = `powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; if($f.ShowDialog() -eq 'OK'){ $f.SelectedPath }"`;
      
      const { stdout } = await execAsync(psCommand);
      const selectedPath = stdout.trim();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ path: selectedPath || null }));
      
    } catch (error: any) {
      
      console.error('[UtilsController] Error al seleccionar carpeta:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No se pudo abrir el selector de carpetas.' }));
      
    }
    
  }
  
}

export const utilsController = new UtilsController();
