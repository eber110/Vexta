import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Ejecutor de las herramientas del agente — recibe el nombre y los argumentos del modelo LLM
export async function executeTool( name: string, args: Record<string, any> ): Promise<string> {

  try {

    if (name === 'read_file') {

      const rawPath: string = args.path ?? '';
      const filePath = path.resolve(rawPath);

      if (!fs.existsSync(filePath)) {
        return `Error: el archivo "${filePath}" no existe.`;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return content;

    }

    if (name === 'write_file') {

      const rawPath: string = args.path ?? '';
      const rawContent: string = args.content ?? '';

      const filePath = path.resolve(rawPath);
      const dir = path.dirname(filePath);

      // Crear directorios intermedios si no existen
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, rawContent, 'utf-8');

      return `Archivo escrito correctamente en: ${filePath}`;

    }

    if (name === 'list_directory') {

      const rawPath: string = args.path ?? '';
      const dirPath = path.resolve(rawPath);

      if (!fs.existsSync(dirPath)) {
        return `Error: la carpeta "${dirPath}" no existe.`;
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const list = entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`);

      return list.length > 0
        ? list.join('\n')
        : `La carpeta "${dirPath}" está vacía.`;

    }

    if (name === 'create_directory') {

      const rawPath: string = args.path ?? '';
      const dirPath = path.resolve(rawPath);

      fs.mkdirSync(dirPath, { recursive: true });

      return `Carpeta creada correctamente en: ${dirPath}`;

    }

    if (name === 'run_command') {

      const command: string = args.command ?? '';
      const cwd: string | undefined = args.cwd ? path.resolve(args.cwd) : undefined;

      if (!command.trim()) {
        return 'Error: el comando no puede estar vacío.';
      }

      try {

        // Ejecutar el comando capturando stdout y stderr
        const stdout = execSync(command, {
          cwd,
          timeout: 30000, // 30 segundos de límite
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        return stdout.trim() || '(el comando no produjo salida)';

      } catch (cmdError: any) {

        // execSync lanza en caso de exit code != 0, pero aún podemos capturar el stderr
        const stderr: string = cmdError.stderr ? cmdError.stderr.toString().trim() : '';
        const stdout: string = cmdError.stdout ? cmdError.stdout.toString().trim() : '';

        const parts: string[] = [];
        if (stdout) parts.push(`STDOUT:\n${stdout}`);
        if (stderr) parts.push(`STDERR:\n${stderr}`);
        if (cmdError.message && !stdout && !stderr) parts.push(`Error: ${cmdError.message}`);

        return parts.join('\n') || `El comando salió con código de error ${cmdError.status ?? 'desconocido'}.`;

      }

    }

    return `Error: herramienta desconocida "${name}".`;

  } catch (err: any) {

    return `Error ejecutando herramienta "${name}": ${err.message}`;

  }

}
