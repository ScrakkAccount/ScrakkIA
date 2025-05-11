'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationButtonProps {
  onLocationObtained?: (location: { lat: number; lng: number }) => void;
}

const LocationButton: React.FC<LocationButtonProps> = ({ onLocationObtained }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const getLocation = () => {
    setIsLoading(true);
    setError(null);
    
    // Opciones para solicitar alta precisión
    const geoOptions = {
      enableHighAccuracy: true, // Solicitar la mayor precisión posible (GPS)
      timeout: 10000,           // Tiempo máximo de espera (10 segundos)
      maximumAge: 0             // No usar ubicaciones en caché
    };
    
    // Solicitar permiso y obtener ubicación
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setLocation(userLocation);
        
        // Enviar la ubicación al componente padre si se proporcionó una función
        if (onLocationObtained) {
          onLocationObtained(userLocation);
        }
        
        // Abrir Google Maps para que el usuario verifique su ubicación
        window.open(
          `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`,
          '_blank'
        );
        
        setIsLoading(false);
      },
      (error) => {
        console.error('Error al obtener ubicación:', error);
        setError(
          error.code === 1
            ? 'Permiso denegado. Por favor, habilita la ubicación en tu navegador.'
            : error.code === 2
            ? 'Ubicación no disponible. Inténtalo de nuevo.'
            : error.code === 3
            ? 'Tiempo de espera agotado. Inténtalo de nuevo.'
            : 'Error desconocido al obtener ubicación.'
        );
        setIsLoading(false);
      },
      geoOptions
    );
  };
  
  return (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={getLocation} 
        disabled={isLoading}
        variant="outline"
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
        {location ? 'Verificar mi ubicación exacta' : 'Obtener mi ubicación exacta'}
      </Button>
      
      {error && (
        <div className="text-destructive text-sm">{error}</div>
      )}
      
      {location && (
        <div className="text-sm text-muted-foreground">
          Ubicación obtenida: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </div>
      )}
    </div>
  );
};

export default LocationButton; 