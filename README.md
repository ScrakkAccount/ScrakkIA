# Aplicación de Chat con Mapas Integrados

Esta aplicación permite a los usuarios chatear con un asistente de IA y visualizar mapas directamente en el chat cuando se mencionan direcciones.

## Características

- Interfaz de chat moderna y responsiva
- Integración de mapas para visualizar direcciones
- **Navegación con rutas** desde tu ubicación actual hasta el destino
- Soporte para múltiples idiomas
- Respuestas de IA personalizadas

## Cómo ejecutar

1. Instala las dependencias:

```
npm install --legacy-peer-deps
```

2. Inicia el servidor de Genkit primero (¡importante!):

```
npm run genkit:dev
```

3. En otra terminal, inicia el servidor de desarrollo:

```
npm run dev
```

4. Abre tu navegador en: http://localhost:9002

## Cómo probar la funcionalidad de mapas

1. **Para ver rutas completas** desde tu ubicación hasta un destino:
   - Concede permisos de ubicación al navegador cuando se te solicite
   - Escribe mensajes como:
     - "¿Cómo llego desde mi ubicación actual hasta Cl. 33 #N° 39 - 95, Soacha, Cundinamarca?"
     - "Necesito rutas para ir a Calle 85 # 15-15, Bogotá, Colombia desde aquí"

2. **Para rutas entre dos ubicaciones específicas**:
   - "¿Cómo llego desde Centro Comercial Santafé hasta Parque Simón Bolívar en Bogotá?"
   - "Dame indicaciones desde Unicentro hasta la Zona T en Bogotá"

3. El asistente responderá con indicaciones y mostrará un mapa interactivo con la ruta completa.

## Solución de problemas

Si encuentras alguno de estos problemas, prueba las siguientes soluciones:

1. **Si no aparece el permiso de ubicación**:
   - Haz clic en el ícono de información/candado en la barra de direcciones
   - Activa "Permitir usar tu ubicación" y recarga la página

2. **Si el mapa no muestra la ruta correctamente**:
   - Verifica que hayas concedido permisos de ubicación
   - Intenta especificar tanto el origen como el destino de forma clara

3. **Si ves "[URL del mapa]" en el texto pero no aparece el mapa**:
   - Actualiza la página
   - Formula la pregunta nuevamente con una dirección más específica

## Tecnologías utilizadas

- Next.js
- React
- Tailwind CSS
- Leaflet y Google Maps (mapas)
- Genkit (IA)
- Geolocalización del navegador
