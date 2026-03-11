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
      
      if (data.models && data.models.length > 1) {
        
        const select = document.createElement('select');
        select.className = 'model-select';
        
        data.models.forEach(modelName => {
          
          const option = document.createElement('option');
          option.value = modelName;
          option.textContent = modelName;
          if (modelName === activeModelToUse) {
            
            option.selected = true;
            
          }
          select.appendChild(option);
          
        });
        
        select.addEventListener('change', async (e) => {
          
          const newModel = e.target.value;
          try {
            
            await apiService.changeModel(newModel);
            chatComponent.appendMessage(`He cambiado al modelo: ${newModel}`, 'agent');
            
            // Actualizar el backend title indirectamente porque hay que refrescarlo pero lo ignoraremos
            
          } catch (err) {
            
            console.error('Error cambiando modelo:', err);
            
          }
          
        });
        
        container.appendChild(select);
        
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
