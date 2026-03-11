export const llmConfig = {
  
  activeProvider: 'ollama',
  
  providers: {
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:7b'
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
