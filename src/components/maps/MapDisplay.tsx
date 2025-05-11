import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { detectLocationInText, detectMapUrlInText, geocodeAddress, GeocodingResult } from '@/lib/geocoding';

// Importación dinámica de componentes para evitar errores de SSR
const MapViewer = dynamic(() => import('./MapViewer'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted/30 rounded-md flex items-center justify-center">Cargando mapa...</div>
});

const GoogleMapEmbed = dynamic(() => import('./GoogleMapEmbed'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted/30 rounded-md flex items-center justify-center">Cargando mapa de Google...</div>
});

interface MapDisplayProps {
  text: string;
}

// Función para extraer URL de Google Maps del texto
const extractGoogleMapsUrl = (text: string): string | null => {
  // Buscar URL de Google Maps en el texto
  const urlRegex = /(https?:\/\/(?:www\.)?google\.com\/maps\/[^\s]+)/i;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

// Función para generar URL de Google Maps para una dirección
const generateGoogleMapsUrl = (address: string): string => {
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
};

const MapDisplay: React.FC<MapDisplayProps> = ({ text }) => {
  const [location, setLocation] = useState<GeocodingResult | null>(null);
  const [googleMapUrl, setGoogleMapUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processMap = async () => {
      // 1. Intentar extraer URL de Google Maps directamente
      const mapUrl = extractGoogleMapsUrl(text);
      if (mapUrl) {
        setGoogleMapUrl(mapUrl);
        return;
      }

      // 2. Detectar si hay una dirección en el texto y referencia a un mapa
      const addressText = detectLocationInText(text);
      const containsMapUrl = detectMapUrlInText(text);

      if (addressText) {
        // Si contiene "[URL del mapa]" pero no una URL real, generar una URL para la dirección
        if (text.includes("[URL del mapa]")) {
          setGoogleMapUrl(generateGoogleMapsUrl(addressText));
          return;
        }
        
        // Continúa el procesamiento normal para las direcciones
        if (containsMapUrl) {
          setLoading(true);
          setError(null);

          try {
            const result = await geocodeAddress(addressText);
            if (result.success) {
              setLocation(result);
            } else {
              setError(result.error || 'No se pudo encontrar la ubicación');
            }
          } catch (err) {
            setError(`Error al procesar la ubicación: ${(err as Error).message}`);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    processMap();
  }, [text]);

  if (googleMapUrl) {
    return (
      <div className="mt-3 w-full">
        <GoogleMapEmbed mapUrl={googleMapUrl} />
      </div>
    );
  }

  if (!location && !loading && !error && !googleMapUrl) return null;

  return (
    <div className="mt-3 w-full">
      {loading ? (
        <div className="h-[300px] w-full bg-muted/30 rounded-md flex items-center justify-center">
          Cargando mapa...
        </div>
      ) : error ? (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      ) : location && location.success ? (
        <div>
          <div className="mb-2 text-sm font-medium text-primary/80">Ubicación: {location.address}</div>
          <MapViewer location={location} />
        </div>
      ) : null}
    </div>
  );
};

export default MapDisplay; 