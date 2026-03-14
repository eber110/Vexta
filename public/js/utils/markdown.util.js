// Función para parsear Markdown y añadir componentes UI ricos

/**
 * Detecta bloques de callout en el HTML generado por marked.
 * Sintaxis usada en el chat: > [!INFO] Título\n> Contenido
 */
function processCallouts(container) {

  container.querySelectorAll('blockquote').forEach(bq => {

    const firstP = bq.querySelector('p:first-child');
    if (!firstP) return;

    const text = firstP.textContent.trim();
    const calloutMatch = text.match(/^\[!(INFO|TIP|WARNING|ERROR)\]\s*(.*)/i);

    if (calloutMatch) {

      const type = calloutMatch[1].toLowerCase();
      const title = calloutMatch[2].trim();

      const icons = {
        info:    'ℹ️',
        tip:     '💡',
        warning: '⚠️',
        error:   '❌'
      };

      const calloutDiv = document.createElement('div');
      calloutDiv.className = `callout ${type}`;

      const titleEl = document.createElement('div');
      titleEl.className = 'callout-title';
      titleEl.innerHTML = `<span>${icons[type] || ''}</span> ${title || type.toUpperCase()}`;

      calloutDiv.appendChild(titleEl);

      // Copiar el resto del contenido (sin el primer párrafo de título)
      const rest = [...bq.children].slice(1);
      rest.forEach(el => calloutDiv.appendChild(el.cloneNode(true)));

      bq.replaceWith(calloutDiv);

    }

  });

}

/**
 * Detecta bloques de tabs en el HTML.
 * Sintaxis: <!-- tabs:start -->
 * #### Tab 1
 * contenido 1
 * #### Tab 2
 * contenido 2
 * <!-- tabs:end -->
 */
function processTabs(container) {

  // Busca marcadores de tabs en comentarios HTML conservados por marked
  const html = container.innerHTML;
  const tabsRegex = /<!--\s*tabs:start\s*-->([\s\S]*?)<!--\s*tabs:end\s*-->/gi;

  let hasMatches = false;
  const newHtml = html.replace(tabsRegex, (_, body) => {

    hasMatches = true;

    // Separar por encabezados h4 que actúan como títulos de tab
    const lines = body.split('\n');
    const tabs = [];
    let currentTab = null;

    lines.forEach(line => {

      const headerMatch = line.match(/^<h4>(.*?)<\/h4>/i);

      if (headerMatch) {

        currentTab = { title: headerMatch[1], content: '' };
        tabs.push(currentTab);

      } else if (currentTab) {

        currentTab.content += line + '\n';

      }

    });

    if (tabs.length === 0) return body;

    const tabsId = 'tabs-' + Math.random().toString(36).slice(2, 8);

    let navHtml = `<div class="tabs-nav" role="tablist">`;
    tabs.forEach((t, i) => {
      navHtml += `<button class="tab-btn ${i === 0 ? 'active' : ''}" data-tabs="${tabsId}" data-index="${i}" role="tab">${t.title}</button>`;
    });
    navHtml += `</div>`;

    let panelsHtml = `<div class="tabs-content">`;
    tabs.forEach((t, i) => {
      panelsHtml += `<div class="tab-panel ${i === 0 ? 'active' : ''}" data-tabs="${tabsId}" data-index="${i}">${t.content}</div>`;
    });
    panelsHtml += `</div>`;

    return `<div class="tabs-wrapper">${navHtml}${panelsHtml}</div>`;

  });

  if (hasMatches) {
    container.innerHTML = newHtml;
  }

  // Añadir event listeners a los botones de tab
  container.querySelectorAll('.tab-btn').forEach(btn => {

    btn.addEventListener('click', () => {

      const tabsId = btn.dataset.tabs;
      const idx = btn.dataset.index;

      // Botones: quitar active de todos los del mismo grupo
      container.querySelectorAll(`.tab-btn[data-tabs="${tabsId}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Paneles: quitar active de todos del mismo grupo
      container.querySelectorAll(`.tab-panel[data-tabs="${tabsId}"]`).forEach(p => p.classList.remove('active'));
      const targetPanel = container.querySelector(`.tab-panel[data-tabs="${tabsId}"][data-index="${idx}"]`);
      if (targetPanel) targetPanel.classList.add('active');

    });

  });

}

/**
 * Procesar tablas: envuelta en .table-wrapper con botón fullscreen y scroll táctil.
 */
function processTables(container) {

  container.querySelectorAll('table').forEach(table => {

    // Evitar doble procesamiento
    if (table.closest('.table-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';

    const header = document.createElement('div');
    header.className = 'table-header';

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'fullscreen-btn';
    fullscreenBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">fullscreen</span> Pantalla completa';

    fullscreenBtn.addEventListener('click', () => {

      const modal = document.getElementById('fullscreenTableModal');
      const modalBody = document.getElementById('fullscreenTableBody');

      if (modal && modalBody) {
        modalBody.innerHTML = '';
        modalBody.appendChild(table.cloneNode(true));
        modal.classList.remove('hidden');
      }

    });

    header.appendChild(fullscreenBtn);
    wrapper.appendChild(header);

    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'table-scroll';

    // Scroll táctil con arrastre de mouse (drag-to-scroll)
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    scrollDiv.addEventListener('mousedown', e => {
      isDown = true;
      scrollDiv.classList.add('active');
      startX = e.pageX - scrollDiv.offsetLeft;
      scrollLeft = scrollDiv.scrollLeft;
    });

    scrollDiv.addEventListener('mouseleave', () => {
      isDown = false;
      scrollDiv.classList.remove('active');
    });

    scrollDiv.addEventListener('mouseup', () => {
      isDown = false;
      scrollDiv.classList.remove('active');
    });

    scrollDiv.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scrollDiv.offsetLeft;
      const walk = (x - startX) * 1.5;
      scrollDiv.scrollLeft = scrollLeft - walk;
    });

    table.parentNode.insertBefore(wrapper, table);
    scrollDiv.appendChild(table);
    wrapper.appendChild(scrollDiv);

  });

}

/**
 * Procesa bloques de razonamiento (<thought>...</thought> o similares)
 */
function processThoughts(container) {
  // Regex para capturar contenido entre etiquetas <thought> o similares
  const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|$)/gi;
  let html = container.innerHTML;

  const newHtml = html.replace(thoughtRegex, (_, content) => {
    return `<div class="thought-block">
      <div class="thought-header">
        <span class="material-icons-outlined" style="font-size:14px">psychology</span>
        Razonamiento Interno
      </div>
      <div class="thought-content">${content}</div>
    </div>`;
  });

  if (html !== newHtml) {
    container.innerHTML = newHtml;
  }
}

/**
 * Función principal de formateo de mensajes.
 * Parsea Markdown y aplica todos los componentes ricos.
 */
export function formatMessage(text) {

  const rawHtml = marked.parse(text);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = rawHtml;

  // 1. Bloques de código con botón copiar y highlight
  tempDiv.querySelectorAll('pre').forEach(pre => {

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'code-wrapper';

    const hdr = document.createElement('div');
    hdr.className = 'code-header';

    const codeEl = pre.querySelector('code');
    let langLabel = 'Code';

    if (codeEl && codeEl.className) {
      const match = codeEl.className.match(/language-(\w+)/);
      if (match) langLabel = match[1];
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

    hdr.appendChild(langSpan);
    hdr.appendChild(copyBtn);
    wrapperEl.appendChild(hdr);
    pre.parentNode.insertBefore(wrapperEl, pre);
    wrapperEl.appendChild(pre);

    if (codeEl) {
      hljs.highlightElement(codeEl);
    }

  });

  // 2. Tablas con scroll táctil y fullscreen
  processTables(tempDiv);

  // 3. Callouts ([!INFO], [!TIP], etc.)
  processCallouts(tempDiv);

  // 4. Tabs (<!-- tabs:start --> ... <!-- tabs:end -->)
  processTabs(tempDiv);

  // 5. Bloques de Pensamiento / Razonamiento
  processThoughts(tempDiv);

  return tempDiv;
}
