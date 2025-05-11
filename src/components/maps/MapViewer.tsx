import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from '@/lib/utils';

interface MapViewerProps {
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  className?: string;
}

const MapViewer: React.FC<MapViewerProps> = ({ location, className }) => {
  useEffect(() => {
    // Solución para los iconos de marcadores en Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });
  }, []);

  return (
    <div className={cn("w-full rounded-md overflow-hidden", className)}>
      <MapContainer 
        center={[location.lat, location.lng]} 
        zoom={15} 
        style={{ height: '300px', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[location.lat, location.lng]}>
          <Popup>
            {location.address}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapViewer; 