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
  created_at?: string;
}

export class HistoryService {
  
  // -- MÉTODOS DE SESIÓN --
  
  async getSessions(): Promise<ChatSession[]> {
    
    const sql = `SELECT id, title, model, created_at FROM sessions ORDER BY created_at DESC`;
    return await dbService.query(sql);
    
  }
  
  async getSessionData(sessionId: number): Promise<ChatSession | null> {
    
    const sql = `SELECT id, title, model, created_at FROM sessions WHERE id = ?`;
    const row = await dbService.queryOne(sql, [sessionId]);
    return row || null;
    
  }
  
  async createSession(title: string, model: string): Promise<number> {
    
    const sql = `INSERT INTO sessions (title, model) VALUES (?, ?)`;
    const result = await dbService.run(sql, [title, model]);
    return result.lastID;
    
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
  
}

// Singleton
export const historyService = new HistoryService();
