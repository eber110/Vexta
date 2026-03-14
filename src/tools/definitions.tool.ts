// Definiciones de herramientas disponibles para el agente (formato Ollama tool calling)
export const AGENT_TOOLS = [

  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lee el contenido completo de un archivo del sistema de archivos.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta absoluta o relativa al archivo que se desea leer.'
          }
        },
        required: ['path']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Escribe o sobreescribe el contenido de un archivo. Si el archivo no existe, lo crea.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta absoluta o relativa al archivo donde se escribirá el contenido.'
          },
          content: {
            type: 'string',
            description: 'Contenido de texto que se escribirá en el archivo.'
          }
        },
        required: ['path', 'content']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Lista todos los archivos y carpetas de un directorio dado.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta absoluta o relativa al directorio a listar.'
          }
        },
        required: ['path']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'create_directory',
      description: 'Crea una nueva carpeta en el sistema de archivos (incluyendo carpetas intermedias si no existen).',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Ruta absoluta o relativa de la carpeta a crear.'
          }
        },
        required: ['path']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Ejecuta un comando de consola en el sistema operativo (PowerShell en Windows). Devuelve la salida estándar y los errores del comando. Úsalo para compilar código, instalar dependencias, correr scripts, ejecutar Node.js, etc.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'El comando a ejecutar en la consola. Ejemplo: "node index.js", "npm install", "dir", "echo Hola".'
          },
          cwd: {
            type: 'string',
            description: 'Directorio de trabajo donde se ejecutará el comando (opcional). Si no se especifica, se usa el directorio actual del proceso.'
          }
        },
        required: ['command']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Busca información en internet sobre un tema específico y devuelve los títulos y fragmentos de los resultados más relevantes.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'La consulta de búsqueda (ej: "últimas noticias de JavaScript 2024").'
          }
        },
        required: ['query']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'fetch_url_content',
      description: 'Descarga el contenido de una URL específica y lo devuelve en formato de texto limpio (Markdown) para su análisis.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'La URL completa del sitio web a leer (ej: "https://nodejs.org/en/about").'
          }
        },
        required: ['url']
      }
    }
  }

];
