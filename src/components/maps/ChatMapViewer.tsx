'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { detectLocationInText } from '@/lib/geocoding';

const GoogleMapEmbed = dynamic(() => import('./GoogleMapEmbed'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted/30 rounded-md flex items-center justify-center">Cargando mapa...</div>
});

interface ChatMapViewerProps {
  text: string;
}

const ChatMapViewer: React.FC<ChatMapViewerProps> = ({ text }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("Mi ubicación actual");

  useEffect(() => {
    // Intentar extraer la dirección del texto del mensaje
    const extractedAddress = detectLocationInText(text);
    if (extractedAddress) {
      setAddress(extractedAddress);
    } else {
      // Si no se detecta dirección específica, intentar extraer cualquier dirección del texto
      const anyAddress = extractAddressFromText(text);
      if (anyAddress) {
        setAddress(anyAddress);
      }
    }

    // Detectar la posible ubicación de origen
    const originRegex = /desde\s+([^\.]+?)(?:\s+hasta|\s*$)/i;
    const originMatch = text.match(originRegex);
    if (originMatch && originMatch[1] && !originMatch[1].toLowerCase().includes("mi ubicación actual")) {
      setOrigin(originMatch[1].trim());
    } else {
      // Si la ubicación de origen es "Mi ubicación actual", intentar usar coordenadas exactas
      try {
        const exactLocationStr = localStorage.getItem('userExactLocation');
        if (exactLocationStr) {
          const exactLocation = JSON.parse(exactLocationStr);
          if (exactLocation && exactLocation.lat && exactLocation.lng) {
            // Usar las coordenadas directamente como origen
            setOrigin(`${exactLocation.lat},${exactLocation.lng}`);
          }
        }
      } catch (e) {
        console.error("Error al obtener ubicación exacta:", e);
        // Si hay un error, mantener "Mi ubicación actual" como valor predeterminado
      }
    }
  }, [text]);

  // Función para extraer cualquier posible dirección del texto
  const extractAddressFromText = (text: string): string | null => {
    // Buscar patrones como "Cl. 33 #N° 39 - 95, Soacha, Cundinamarca"
    const addressRegex = /([a-zA-Z]+\.?\s+\d+[\w\s,\.#°\-]+)/g;
    const matches = text.match(addressRegex);
    
    if (matches && matches.length > 0) {
      // Devolver la coincidencia más larga, que probablemente sea la dirección más completa
      return matches.reduce((prev, current) => 
        current.length > prev.length ? current : prev, matches[0]);
    }
    
    return null;
  };

  if (!address) return null;

  // Generar URL de Google Maps para obtener direcciones (no solo buscar)
  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(address)}&travelmode=driving`;

  return (
    <div className="mt-3 w-full">
      <div className="mb-2 text-sm font-medium text-primary/80">
        Ruta: {origin} → {address}
      </div>
      <GoogleMapEmbed mapUrl={mapUrl} />
    </div>
  );
};

export default ChatMapViewer; 