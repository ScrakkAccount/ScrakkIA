/**
 * @fileOverview A Genkit tool for fetching directions between two locations.
 *
 * - getDirectionsTool - A tool that provides a mock map URL for directions.
 * - GetDirectionsInputSchema - The input type for the getDirectionsTool.
 * - GetDirectionsOutputSchema - The return type for the getDirectionsTool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const GetDirectionsInputSchema = z.object({
  originAddress: z.string().describe("The starting address for the directions. This could be a specific address or a general description like 'my current location'."),
  destinationAddress: z.string().describe("The full street address of the destination."),
  destinationCountry: z.string().describe("The country of the destination address (e.g., 'Peru', 'USA', 'España'). This helps in accurately geocoding the destination."),
});
export type GetDirectionsInput = z.infer<typeof GetDirectionsInputSchema>;

export const GetDirectionsOutputSchema = z.object({
  status: z.enum(["SUCCESS", "NOT_FOUND", "API_ERROR", "MISSING_INFO"]).describe("Status of the directions request."),
  message: z.string().describe("A human-readable message about the result, e.g., directions found, address not found, or error details."),
  mapEmbedUrl: z.string().optional().describe("An optional URL to a map showing the route. This will be a Google Maps directions URL."),
  routeSummary: z.string().optional().describe("A brief summary of the route, e.g., 'Route from [origin] to [destination].'"),
  response: z.string().describe("The formatted response to return to the user.")
});
export type GetDirectionsOutput = z.infer<typeof GetDirectionsOutputSchema>;

export const getDirectionsTool = ai.defineTool(
  {
    name: 'getDirectionsTool',
    description: 'Provides directions between a starting address and a destination street address within a specified country. Use this tool when a user asks for directions or how to get to a location.',
    inputSchema: GetDirectionsInputSchema,
    outputSchema: GetDirectionsOutputSchema,
  },
  async (input: GetDirectionsInput): Promise<GetDirectionsOutput> => {
    // In a real application, this would call a mapping service API (e.g., Google Maps, Mapbox).
    // For this mock, we'll simulate the process.

    if (!input.originAddress || !input.destinationAddress || !input.destinationCountry) {
      return {
        status: "MISSING_INFO",
        message: "Could not provide directions. Missing origin, destination, or country information.",
        response: "Lo siento, no puedo proporcionar indicaciones sin la información completa de origen, destino o país."
      };
    }
    
    const encodedOrigin = encodeURIComponent(input.originAddress);
    const encodedDestination = encodeURIComponent(`${input.destinationAddress}, ${input.destinationCountry}`);
    
    // Construct a Google Maps directions URL
    const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDestination}&travelmode=driving`;
    
    const routeSummary = `Ruta desde ${input.originAddress} hasta ${input.destinationAddress}, ${input.destinationCountry}.`;
    
    // Construir una respuesta formateada en español que incluya la URL real
    const formattedResponse = `Aquí tienes las indicaciones para llegar desde ${input.originAddress} hasta ${input.destinationAddress}, ${input.destinationCountry}. Puedes ver la ruta completa en el siguiente mapa. URL del mapa: ${mapUrl}`;

    return {
      status: "SUCCESS",
      message: `I've found directions from '${input.originAddress}' to '${input.destinationAddress}, ${input.destinationCountry}'.`,
      mapEmbedUrl: mapUrl,
      routeSummary: routeSummary,
      response: formattedResponse
    };
  }
);
