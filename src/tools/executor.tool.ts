import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

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

    if (name === 'search_web') {

      const query: string = args.query ?? '';
      if (!query.trim()) return 'Error: la consulta de búsqueda está vacía.';

      try {
        // Timeout para la búsqueda
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        // Usar DuckDuckGo Lite version para mayor velocidad (sin JS y ligera)
        const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const results: string[] = [];

        // Parsing de la versión lite de DDG
        $('table').last().find('tr').each((i, el) => {
          const linkEl = $(el).find('a.result-link');
          const snippetEl = $(el).next().find('td.result-snippet');

          if (linkEl.length > 0) {
            const title = linkEl.text().trim();
            const link = linkEl.attr('href');
            const snippet = snippetEl.text().trim();
            results.push(`Título: ${title}\nResumen: ${snippet || 'Ver sitio para más detalles.'}\nLink: ${link}\n`);
          }
          
          if (results.length >= 8) return false; // Limitar a 8 resultados
        });

        return results.length > 0 
          ? `Resultados de búsqueda para "${query}":\n\n${results.join('\n---\n')}`
          : `No se encontraron resultados para "${query}".`;

      } catch (err: any) {
        return `Error en búsqueda web: ${err.message}`;
      }

    }

    if (name === 'fetch_url_content') {

      const url: string = args.url ?? '';
      if (!url.trim()) return 'Error: la URL está vacía.';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seg para leer URL compleja

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);

        // Limpiar elementos basura
        $('script, style, nav, footer, header, aside, .ads, #ads').remove();

        const title = $('title').text().trim();
        let bodyText = '';

        // Priorizar artículos o contenido principal
        const mainContent = $('main, article, #content, .content').length > 0 
          ? $('main, article, #content, .content') 
          : $('body');

        mainContent.find('h1, h2, h3, p, li').each((i, el) => {
          const tag = el.tagName.toLowerCase();
          const text = $(el).text().trim();
          if (text) {
            if (tag.startsWith('h')) bodyText += `\n## ${text}\n`;
            else if (tag === 'li') bodyText += `* ${text}\n`;
            else bodyText += `${text}\n\n`;
          }
        });

        return `CONTENIDO DE: ${url}\nTÍTULO: ${title}\n\n${bodyText.slice(0, 15000)}`; // Limitar para no saturar contexto

      } catch (err: any) {
        return `Error leyendo URL: ${err.message}`;
      }

    }

    return `Error: herramienta desconocida "${name}".`;

  } catch (err: any) {

    return `Error ejecutando herramienta "${name}": ${err.message}`;

  }

}
