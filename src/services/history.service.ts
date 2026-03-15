import { dbService } from './db.service';

export interface ChatMessage {
  id?: number;
  session_id: number;
  role: 'user' | 'agent' | 'system';
  content: string;
  created_at?: string;
}

export interface ChatSession {
  id: number;
  title: string;
  model: string | null;
  root_path?: string | null;
  web_search_enabled: number;
  capabilities?: string | null;
  created_at?: string;
}

export class HistoryService {
  
  // -- MÉTODOS DE SESIÓN --
  
  async getSessions(): Promise<ChatSession[]> {
    
    const sql = `SELECT id, title, model, root_path, web_search_enabled, capabilities, created_at FROM sessions ORDER BY created_at DESC`;
    return await dbService.query(sql);
    
  }
  
  async getSessionData(sessionId: number): Promise<ChatSession | null> {
    
    const sql = `SELECT id, title, model, root_path, web_search_enabled, capabilities, created_at FROM sessions WHERE id = ?`;
    const row = await dbService.queryOne(sql, [sessionId]);
    return row || null;
    
  }
  
  async createSession(title: string, model: string, rootPath: string | null = null): Promise<number> {
    
    const sql = `INSERT INTO sessions (title, model, root_path) VALUES (?, ?, ?)`;
    const result = await dbService.run(sql, [title, model, rootPath]);
    return result.lastID;
    
  }

  async updateSessionRootPath(sessionId: number, rootPath: string | null): Promise<void> {
    
    const sql = `UPDATE sessions SET root_path = ? WHERE id = ?`;
    await dbService.run(sql, [rootPath, sessionId]);
    
  }

  async updateWebSearchStatus(sessionId: number, enabled: boolean): Promise<void> {
    
    const sql = `UPDATE sessions SET web_search_enabled = ? WHERE id = ?`;
    await dbService.run(sql, [enabled ? 1 : 0, sessionId]);
    
  }

  async updateSessionCapabilities(sessionId: number, capabilities: any): Promise<void> {
    
    const sql = `UPDATE sessions SET capabilities = ? WHERE id = ?`;
    await dbService.run(sql, [JSON.stringify(capabilities), sessionId]);
    
  }
  
  async deleteSession(sessionId: number): Promise<void> {
    
    // Al eliminar la sesión, SQLite (con ON DELETE CASCADE configurado manualmente o por lógica de app)
    // borraría los mensajes. Para asegurar borraremos explícitamente.
    await dbService.run(`DELETE FROM messages WHERE session_id = ?`, [sessionId]);
    await dbService.run(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
    
  }
  
  // -- MÉTODOS DE MENSAJE --
  
  async getHistory(sessionId: number): Promise<ChatMessage[]> {
    
    const sql = `SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC`;
    return await dbService.query(sql, [sessionId]);
    
  }
  
  async addMessage(sessionId: number, role: ChatMessage['role'], content: string): Promise<void> {
    
    const sql = `INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)`;
    await dbService.run(sql, [sessionId, role, content]);
    
    // Opcional: Si el título de la sesión dice "Nuevo Chat" y este es el primer mensaje de usuario, actualizar el título
    if (role === 'user') {
      
      const session = await this.getSessionData(sessionId);
      if (session && session.title === 'Nuevo Chat') {
        
        // Tomar las primeras 4 palabras del mensaje
        const newTitle = content.split(' ').slice(0, 4).join(' ') + '...';
        await dbService.run(`UPDATE sessions SET title = ? WHERE id = ?`, [newTitle, sessionId]);
        
      }
      
    }
    
  }
  
  async searchPastChats(keyword: string, currentSessionId: number): Promise<{ session_title: string, created_at: string, role: string, content: string }[]> {
    
    // Buscamos mensajes que contengan la palabra clave en chats DIFERENTES al actual.
    // Usamos JOIN para obtener la fecha de la sesión y el título.
    // Buscamos mensajes utilizando FTS5 para máxima velocidad
    const sql = `
      SELECT s.title as session_title, s.created_at, m.role, m.content 
      FROM messages_fts f
      JOIN messages m ON f.id = m.id
      JOIN sessions s ON m.session_id = s.id
      WHERE m.session_id != ? 
      AND messages_fts MATCH ?
      ORDER BY s.created_at DESC, m.created_at ASC
      LIMIT 20
    `;
    
    return await dbService.query(sql, [currentSessionId, keyword]);
    
  }
  
}

// Singleton
export const historyService = new HistoryService();
