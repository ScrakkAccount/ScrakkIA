'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GoogleMapEmbedProps {
  mapUrl: string;
  className?: string;
}

const GoogleMapEmbed: React.FC<GoogleMapEmbedProps> = ({ mapUrl, className }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Comprobar que navigator y geolocation existen para evitar errores en SSR
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      processUrlWithoutGeolocation();
      return;
    }
    
    // Intentar obtener la ubicación del usuario si es necesario
    if (mapUrl.includes("Mi ubicación actual") || mapUrl.includes("my current location")) {
      // Opciones para solicitar alta precisión
      const geoOptions = {
        enableHighAccuracy: true, // Solicitar la mayor precisión posible (GPS)
        timeout: 10000,           // Tiempo máximo de espera (10 segundos)
        maximumAge: 0             // No usar ubicaciones en caché
      };

      setProcessedUrl("Solicitando ubicación precisa...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Ubicación obtenida con precisión:", position.coords.accuracy, "metros");
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error);
          // Si falla, mostrar un mensaje al usuario
          alert("No se pudo obtener tu ubicación exacta. El mapa mostrará una ubicación aproximada. Error: " + error.message);
          processUrlWithoutGeolocation();
        },
        geoOptions
      );
    } else {
      processUrlWithoutGeolocation();
    }

    function processUrlWithoutGeolocation() {
      // Intentar extraer URL del texto si no es una URL válida
      if (!mapUrl.startsWith('http')) {
        const urlMatch = mapUrl.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          setProcessedUrl(urlMatch[0]);
        } else {
          // Caso fallback: crear URL de búsqueda genérica
          setProcessedUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapUrl)}`);
        }
      } else {
        setProcessedUrl(mapUrl);
      }
    }
  }, [mapUrl]);

  // Este efecto se ejecuta cuando tenemos la ubicación del usuario
  useEffect(() => {
    if (userLocation && mapUrl) {
      try {
        // Reemplazar "Mi ubicación actual" con coordenadas reales
        if (mapUrl.includes('origin=Mi+ubicación+actual') || 
            mapUrl.includes('origin=my+current+location') ||
            mapUrl.includes('origin=Mi%20ubicaci%C3%B3n%20actual')) {
          
          const userCoords = `${userLocation.lat},${userLocation.lng}`;
          let newUrl = mapUrl;
          
          // Reemplazar en diferentes formatos posibles
          newUrl = newUrl.replace(/origin=Mi\+ubicación\+actual/g, `origin=${userCoords}`);
          newUrl = newUrl.replace(/origin=my\+current\+location/g, `origin=${userCoords}`);
          newUrl = newUrl.replace(/origin=Mi%20ubicaci%C3%B3n%20actual/g, `origin=${userCoords}`);
          
          setProcessedUrl(newUrl);
        } else {
          processUrlWithoutGeolocation();
        }
      } catch (e) {
        console.error("Error procesando URL con ubicación:", e);
        processUrlWithoutGeolocation();
      }
    }
    
    function processUrlWithoutGeolocation() {
      if (!mapUrl.startsWith('http')) {
        setProcessedUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapUrl)}`);
      } else {
        setProcessedUrl(mapUrl);
      }
    }
  }, [userLocation, mapUrl]);

  // Preparar la URL para el iframe
  const getEmbedUrl = (url: string) => {
    try {
      // Si no es una URL, tratarla como una dirección para búsqueda
      if (!url.startsWith('http')) {
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(url)}`;
      }

      // Si la URL contiene "URL del mapa:", extraer la URL real
      if (url.includes("URL del mapa:")) {
        const extractedUrl = url.match(/(https?:\/\/[^\s]+)/);
        if (extractedUrl) {
          url = extractedUrl[0];
        } else {
          // Si no hay URL, usarla como dirección para búsqueda
          return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(url)}`;
        }
      }

      const parsedUrl = new URL(url);
      
      // Si ya es una URL de embed, usarla directamente
      if (url.includes('google.com/maps/embed')) {
        return url;
      }
      
      // Convertir URL de dirección a formato de embed
      if (url.includes('google.com/maps/dir')) {
        const params = new URLSearchParams(parsedUrl.search);
        const origin = params.get('origin');
        const destination = params.get('destination');
        
        if (origin && destination) {
          return `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving`;
        }
      }
      
      // Convertir URL de búsqueda a formato de embed
      if (url.includes('google.com/maps/search')) {
        const params = new URLSearchParams(parsedUrl.search);
        const query = params.get('query');
        
        if (query) {
          return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(query)}`;
        }
      }
      
      // Si es una URL de mapa general, convertir a embed
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(url)}`;
      
    } catch (error) {
      console.error("Error al parsear URL del mapa:", error);
      // En caso de error, intentar usar como dirección de búsqueda
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(url)}`;
    }
  };

  if (!isMounted || !processedUrl) return null;

  return (
    <div className={cn("w-full rounded-lg overflow-hidden border border-border shadow-md", className)}>
      <iframe
        src={getEmbedUrl(processedUrl)}
        width="100%"
        height="300"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="rounded-lg"
        title="Mapa de Google"
      />
    </div>
  );
};

export default GoogleMapEmbed; 