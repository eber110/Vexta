export const llmConfig = {
  
  activeProvider: 'ollama',

  // Indica si el modo agente (tool calling) está activo
  agentMode: false,
  
  providers: {
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'qwen3.5:9b'
    },
    gemini: {
      apiKey: '',
      model: ''
    },
    claude: {
      apiKey: '',
      model: ''
    },
    chatgpt: {
      apiKey: '',
      model: ''
    }
  }
  
};
