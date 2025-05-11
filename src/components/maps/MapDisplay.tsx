import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { detectLocationInText, detectMapUrlInText, geocodeAddress, GeocodingResult } from '@/lib/geocoding';

const MapViewer = dynamic(() => import('./MapViewer'), {
  ssr: false, // Leaflet no es compatible con SSR
  loading: () => <div className="h-[300px] w-full bg-muted/30 rounded-md flex items-center justify-center">Cargando mapa...</div>
});

interface MapDisplayProps {
  text: string;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ text }) => {
  const [location, setLocation] = useState<GeocodingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      // Detectar si hay una dirección en el texto
      const addressText = detectLocationInText(text);
      const containsMapUrl = detectMapUrlInText(text);

      if (addressText && containsMapUrl) {
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
    };

    fetchLocation();
  }, [text]);

  if (!location && !loading && !error) return null;

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