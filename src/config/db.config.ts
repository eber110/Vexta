import path from 'path';

// Configuración reservada para el sistema de base de datos
// Por ahora usaremos la ruta del archivo JSON, que luego
// cambiaremos a la ruta del archivo SQLite (ej: chat-history.sqlite)
export const dbConfig = {
  
  type: 'sqlite',
  databasePath: path.join(__dirname, '../../data/chat-history.db'),
  jsonBackupPath: path.join(__dirname, '../../data/chat-history.json')
  
};
