/**
 * Servicio de geocodificación para convertir direcciones en coordenadas
 * Utiliza la API de Nominatim de OpenStreetMap
 */

export interface GeocodingResult {
  address: string;
  lat: number;
  lng: number;
  success: boolean;
  error?: string;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      {
        headers: {
          "Accept-Language": "es",
          "User-Agent": "NextJSMapApp",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        address: address,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        success: true,
      };
    } else {
      return {
        address: address,
        lat: 0,
        lng: 0,
        success: false,
        error: "No se encontraron resultados para esta dirección",
      };
    }
  } catch (error) {
    console.error("Error en geocodificación:", error);
    return {
      address: address,
      lat: 0,
      lng: 0,
      success: false,
      error: `Error de geocodificación: ${(error as Error).message || "Desconocido"}`,
    };
  }
}

/**
 * Detecta si una cadena de texto podría contener una dirección
 */
export function detectLocationInText(text: string): string | null {
  // Patrones para detectar direcciones en texto
  const patterns = [
    // Patrón para direcciones como "Cl. 33 #N° 39 - 95, Soacha, Cundinamarca"
    /(?:Cl\.|Calle|Carrera|Cra\.|Av\.|Avenida|Diagonal|Diag\.|Transversal|Transv\.)[\s\w\.]+(?:#|N°|No\.)[\s\d-]+,[\s\w,]+/i,
    
    // Patrón para direcciones con números solamente
    /(?:calle|carrera|avenida|diagonal|transversal)\s+\d+[a-z]?\s+#\s+\d+[a-z]?(?:\s*-\s*\d+)?/i,
    
    // Patrón para detectar indicaciones desde "desde [ubicación] hasta [dirección]"
    /desde.+?\s+hasta\s+(.+?)(?:\.|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Si es el último patrón (indicaciones), devuelve el grupo capturado
      if (pattern === patterns[2]) return match[1].trim();
      // Sino, devuelve la coincidencia completa
      return match[0].trim();
    }
  }
  
  return null;
}

/**
 * Detecta si el texto contiene URL de un mapa
 */
export function detectMapUrlInText(text: string): boolean {
  const mapUrlPatterns = [
    /\[URL del mapa\]/i,
    /maps\.google\.com/i,
    /google\.com\/maps/i,
    /openstreetmap\.org/i,
    /maps\.apple\.com/i,
    /waze\.com/i,
    /https:\/\/[^\s]+/i, // Detectar cualquier URL en el texto
    /URL del mapa:/i     // Detectar la frase "URL del mapa:" que ahora incluimos
  ];
  
  return mapUrlPatterns.some(pattern => pattern.test(text));
} 