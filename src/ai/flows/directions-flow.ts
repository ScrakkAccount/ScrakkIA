'use server';

/**
 * @fileOverview Un flujo de Genkit para manejar solicitudes de direcciones.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getDirectionsTool, GetDirectionsInput } from '@/ai/tools/get-directions-tool';

// Esquema de entrada para el flujo de direcciones
const DirectionsFlowInputSchema = z.object({
  query: z.string().describe('La consulta del usuario solicitando direcciones.'),
});
export type DirectionsFlowInput = z.infer<typeof DirectionsFlowInputSchema>;

// Esquema de salida para el flujo de direcciones
const DirectionsFlowOutputSchema = z.object({
  response: z.string().describe('La respuesta para el usuario con las direcciones formateadas.'),
  mapUrl: z.string().optional().describe('La URL del mapa para mostrar las direcciones.'),
});
export type DirectionsFlowOutput = z.infer<typeof DirectionsFlowOutputSchema>;

// Prompt para extraer información de la consulta del usuario
const extractLocationPrompt = ai.definePrompt({
  name: 'extractLocationPrompt',
  input: { schema: DirectionsFlowInputSchema },
  output: {
    schema: z.object({
      originAddress: z.string().describe('La dirección de origen para las direcciones.'),
      destinationAddress: z.string().describe('La dirección de destino para las direcciones.'),
      destinationCountry: z.string().describe('El país de la dirección de destino.'),
    })
  },
  prompt: `Extrae la información de ubicación de la consulta del usuario.
  Consulta: {{{query}}}
  
  Instrucciones:
  1. Identifica la dirección de origen (puede ser "Mi ubicación actual" si no se especifica)
  2. Identifica la dirección de destino completa
  3. Identifica el país de destino (usa "Colombia" si no se especifica)
  
  Responde SOLO con un objeto JSON que contenga las claves: originAddress, destinationAddress, y destinationCountry.`
});

// Flujo principal para manejar las solicitudes de direcciones
export const directionsFlow = ai.defineFlow(
  {
    name: 'directionsFlow',
    inputSchema: DirectionsFlowInputSchema,
    outputSchema: DirectionsFlowOutputSchema,
  },
  async (input) => {
    try {
      // Extraer la información de ubicación de la consulta
      const { output: locationInfo } = await extractLocationPrompt(input);
      
      if (!locationInfo) {
        return {
          response: "Lo siento, no pude entender las ubicaciones en tu consulta. Por favor, proporciona más detalles sobre el origen y el destino.",
        };
      }
      
      // Usar la herramienta de direcciones para obtener la ruta
      const directionsResult = await getDirectionsTool({
        originAddress: locationInfo.originAddress,
        destinationAddress: locationInfo.destinationAddress,
        destinationCountry: locationInfo.destinationCountry,
      });
      
      // Devolver la respuesta formateada
      return {
        response: directionsResult.response,
        mapUrl: directionsResult.mapEmbedUrl,
      };
    } catch (error) {
      console.error("Error en el flujo de direcciones:", error);
      return {
        response: "Lo siento, hubo un error al procesar tu solicitud de direcciones. Por favor, intenta de nuevo.",
      };
    }
  }
); 