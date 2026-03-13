import sqlite3 from 'sqlite3';
import { dbConfig } from '../config/db.config';

export class DbService {
  
  private db: sqlite3.Database | null = null;
  
  async connect(): Promise<void> {
    
    return new Promise((resolve, reject) => {
      
      this.db = new sqlite3.Database(dbConfig.databasePath, (err) => {
        
        if (err) {
          
          console.error('[DB Service] Error conectando a SQLite:', err);
          reject(err);
          
        } else {
          
          console.log(`[DB Service] Conectado a SQLite: ${dbConfig.databasePath}`);
          this.initTables().then(resolve).catch(reject);
          
        }
        
      });
      
    });
    
  }
  
  private async initTables(): Promise<void> {
    
    const sessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        model TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const messagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `;
    
    const settingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `;
    
    await this.run(sessionsTable);
    await this.run(messagesTable);
    await this.run(settingsTable);

    // Migración simple: intentar agregar root_path si no existe
    try {
      await this.run(`ALTER TABLE sessions ADD COLUMN root_path TEXT`);
    } catch (e) {
      // Ignorar si la columna ya existe
    }
    
    // Inicializar ajustes por defecto si no existen
    await this.run(`
      INSERT OR IGNORE INTO settings (key, value)
      VALUES ('ollama_url', 'http://localhost:11434')
    `);
    
    console.log('[DB Service] Tablas inicializadas u omitidas si ya existían.');
    
  }
  
  // Wrapper para Promesas de correr statements (CREATE, INSERT, UPDATE, DELETE)
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    
    return new Promise((resolve, reject) => {
      
      if (!this.db) return reject(new Error('Base de datos no inicializada'));
      
      this.db.run(sql, params, function(err) {
        
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
        
      });
      
    });
    
  }
  
  // Wrapper para extraer multiples filas (SELECT)
  async query(sql: string, params: any[] = []): Promise<any[]> {
    
    return new Promise((resolve, reject) => {
      
      if (!this.db) return reject(new Error('Base de datos no inicializada'));
      
      this.db.all(sql, params, (err, rows) => {
        
        if (err) reject(err);
        else resolve(rows);
        
      });
      
    });
    
  }

  // Wrapper para extraer una sola fila de BD
  async queryOne(sql: string, params: any[] = []): Promise<any> {
    
    return new Promise((resolve, reject) => {
      
      if (!this.db) return reject(new Error('Base de datos no inicializada'));
      
      this.db.get(sql, params, (err, row) => {
        
        if (err) reject(err);
        else resolve(row);
        
      });
      
    });
    
  }
  
}

// Singleton
export const dbService = new DbService();
