import { apiService } from '../services/api.service.js';
import { chatComponent } from './chat.component.js';

export const modelSelectorComponent = {
  
  async init(forcedActiveModel = null) {
    
    try {
      
      const data = await apiService.fetchModels();
      const container = document.getElementById('modelSelectorContainer');
      
      if (!container) {
         console.warn('[modelSelector] Contenedor selector nulo o no renderizado aun.');
         return;
      }
      
      const labelText = document.createElement('span');
      labelText.className = 'model-label-text';
      labelText.textContent = 'Modelo:';
      
      container.innerHTML = '';
      container.appendChild(labelText);
      
      const activeModelToUse = forcedActiveModel || data.activeModel;
      
      chatComponent.currentModel = activeModelToUse;
      chatComponent.updateTokenGauge();
      
      if (data.models && data.models.length > 1) {
        
        // Crear Wrapper del Custom Select
        const selectWrapper = document.createElement('div');
        selectWrapper.className = 'custom-select-wrapper';
        
        // Botón (Valor Seleccionado)
        const selectBtn = document.createElement('button');
        selectBtn.className = 'custom-select-btn';
        selectBtn.type = 'button'; // Evitar submit
        
        const selectValue = document.createElement('span');
        selectValue.className = 'custom-select-value';
        selectValue.style.pointerEvents = 'none';
        selectValue.textContent = activeModelToUse;
        
        const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        chevron.setAttribute("viewBox", "0 0 24 24");
        chevron.setAttribute("width", "16");
        chevron.setAttribute("height", "16");
        chevron.setAttribute("fill", "currentColor");
        chevron.style.pointerEvents = 'none';
        chevron.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
        chevron.classList.add('custom-select-icon');
        
        selectBtn.appendChild(selectValue);
        selectBtn.appendChild(chevron);
        
        // Dropdown List (Opciones)
        const dropdownList = document.createElement('ul');
        dropdownList.className = 'custom-select-dropdown';
        
        data.models.forEach(modelName => {
          const listItem = document.createElement('li');
          listItem.textContent = modelName;
          listItem.dataset.value = modelName;
          
          if (modelName === activeModelToUse) {
            listItem.classList.add('selected');
          }
          
          listItem.addEventListener('click', async () => {
             // Actualizar UI
             selectValue.textContent = modelName;
             
             // Quitar 'selected' a todos y poner al actual
             dropdownList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
             listItem.classList.add('selected');
             
             // Cerrar dropdown
             selectWrapper.classList.remove('open');
             
             // Llamar backend
             if (modelName !== chatComponent.currentModel) {
               try {
                 await apiService.changeModel(modelName);
                 chatComponent.appendMessage(`He cambiado al modelo: ${modelName}`, 'agent');
                 
                 chatComponent.currentModel = modelName;
                 chatComponent.updateTokenGauge();
               } catch (err) {
                 console.error('Error cambiando modelo:', err);
               }
             }
          });
          
          dropdownList.appendChild(listItem);
        });
        
        // Evento para abrir/cerrar dropdown
        selectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation(); 
          
          const isOpen = selectWrapper.classList.contains('open');
          console.log(`[Selector] Click detectado. Estaba abierto: ${isOpen}`);
          
          // Cerrar otros si los hubiera
          document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
          
          if (!isOpen) {
             selectWrapper.classList.add('open');
          }
        });
        
        // Cerrar al clickear fuera
        document.addEventListener('click', (e) => {
           if (!selectWrapper.contains(e.target)) {
              selectWrapper.classList.remove('open');
           }
        });
        
        selectWrapper.appendChild(selectBtn);
        selectWrapper.appendChild(dropdownList);
        
        container.appendChild(selectWrapper);
        
      } else {
        
        const label = document.createElement('span');
        label.className = 'model-name';
        label.textContent = activeModelToUse || (data.models && data.models[0]) || 'Desconocido';
        container.appendChild(label);
        
      }
      
    } catch (error) {
      
      console.error('Error cargando modelos:', error);
      
    }
    
  }
  
};
