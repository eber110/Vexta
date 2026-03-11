// Función para parsear Markdown y agregar botones de copiar
export function formatMessage(text) {
  
  const rawHtml = marked.parse(text);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = rawHtml;
  
  tempDiv.querySelectorAll('pre').forEach(pre => {
    
    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';
    
    const header = document.createElement('div');
    header.className = 'code-header';
    
    const codeEl = pre.querySelector('code');
    let langLabel = 'Code';
    
    if (codeEl && codeEl.className) {
      
      const match = codeEl.className.match(/language-(\w+)/);
      if (match) {
        
        langLabel = match[1];
        
      }
      
    }
    
    const langSpan = document.createElement('span');
    langSpan.className = 'lang-label';
    langSpan.textContent = langLabel;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copiar';
    
    const codeText = codeEl ? codeEl.innerText : pre.innerText;
    
    copyBtn.addEventListener('click', () => {
      
      navigator.clipboard.writeText(codeText).then(() => {
        
        copyBtn.textContent = '¡Copiado!';
        setTimeout(() => copyBtn.textContent = 'Copiar', 2000);
        
      });
      
    });
    
    header.appendChild(langSpan);
    header.appendChild(copyBtn);
    
    wrapper.appendChild(header);
    
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    
    if (codeEl) {
      
      hljs.highlightElement(codeEl);
      
    }
    
  });
  
  return tempDiv;
  
}
