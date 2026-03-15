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
        web_search_enabled INTEGER DEFAULT 1,
        capabilities TEXT,
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
    } catch (e) {}

    // Migración simple: intentar agregar web_search_enabled si no existe
    try {
      await this.run(`ALTER TABLE sessions ADD COLUMN web_search_enabled INTEGER DEFAULT 1`);
    } catch (e) {}

    // Migración simple: intentar agregar capabilities si no existe
    try {
      await this.run(`ALTER TABLE sessions ADD COLUMN capabilities TEXT`);
    } catch (e) {}
    
    // Inicializar ajustes por defecto si no existen
    await this.run(`
      INSERT OR IGNORE INTO settings (key, value)
      VALUES ('ollama_url', 'http://127.0.0.1:11434')
    `);

    // Forzar cambio de localhost a 127.0.0.1 en instalaciones existentes para evitar errores de IPv6
    await this.run(`
      UPDATE settings SET value = 'http://127.0.0.1:11434' 
      WHERE key = 'ollama_url' AND value = 'http://localhost:11434'
    `);

    // --- OPTIMIZACIÓN DE BÚSQUEDA (FTS5) ---
    // Crear tabla virtual para búsqueda rápida si no existe
    await this.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        content,
        id UNINDEXED,
        session_id UNINDEXED
      )
    `);

    // Sincronizar datos existentes si la tabla FTS está vacía
    const ftsCount = await this.queryOne(`SELECT count(*) as count FROM messages_fts`);
    if (ftsCount.count === 0) {
      await this.run(`
        INSERT INTO messages_fts(id, session_id, content)
        SELECT id, session_id, content FROM messages
      `);
    }

    // Triggers para mantener FTS5 actualizado
    await this.run(`
      CREATE TRIGGER IF NOT EXISTS messages_after_insert AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(id, session_id, content) VALUES (new.id, new.session_id, new.content);
      END
    `);

    await this.run(`
      CREATE TRIGGER IF NOT EXISTS messages_after_update AFTER UPDATE ON messages BEGIN
        UPDATE messages_fts SET content = new.content WHERE id = old.id;
      END
    `);

    await this.run(`
      CREATE TRIGGER IF NOT EXISTS messages_after_delete AFTER DELETE ON messages BEGIN
        DELETE FROM messages_fts WHERE id = old.id;
      END
    `);
    
    console.log('[DB Service] Tablas y optimización FTS5 inicializadas.');
    
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
