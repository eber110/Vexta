import os

file_path = r'c:\Users\eber\Documents\prototipos\public\style.css'
output_path = r'c:\Users\eber\Documents\prototipos\public\style_clean.css'

try:
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Intentar decodificar ignorando errores
    text = content.decode('utf-8', errors='ignore')
    
    # Filtrar solo líneas que parezcan CSS válido (ignorando basura binaria si la hay)
    lines = text.splitlines()
    clean_lines = []
    
    # Solo tomamos las líneas hasta que detectamos basura o después de un punto conocido
    # O simplemente limpiamos caracteres no imprimibles
    for line in lines:
        if any(c in line for c in '{}:;'):
            # Si contiene sintaxis CSS básica, lo mantenemos
            clean_lines.append(line)
        elif line.strip().startswith('/*') or line.strip().endswith('*/'):
            clean_lines.append(line)
        elif line.strip() == '':
            clean_lines.append(line)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(clean_lines))
    
    print(f"File cleaned and saved to {output_path}")
except Exception as e:
    print(f"Error: {e}")
