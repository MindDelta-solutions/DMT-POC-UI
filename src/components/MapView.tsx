import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import type { RoutePoint } from '../types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

const containerStyle = { width: '100%', height: '100%' };

interface MapViewProps {
  points: RoutePoint[];
}

export default function MapView({ points }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const path = points.map((p) => ({ lat: p.latitude, lng: p.longitude }));
  const lastIndex = points.length - 1;

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, 32);
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  if (points.length === 0) return null;

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-[480px] w-full rounded-lg border border-gray-200 flex items-center justify-center text-sm text-red-500 bg-gray-50 px-4 text-center">
        Missing VITE_GOOGLE_MAPS_API_KEY — set it in your .env file to render the map.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-[480px] w-full rounded-lg border border-gray-200 flex items-center justify-center text-sm text-red-500 bg-gray-50 px-4 text-center">
        Failed to load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[480px] w-full rounded-lg border border-gray-200 flex items-center justify-center text-sm text-gray-400 bg-gray-50">
        Loading map…
      </div>
    );
  }

  return (
    <div className="h-[480px] w-full rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: points[0].latitude, lng: points[0].longitude }}
        zoom={15}
        onLoad={(map) => { mapRef.current = map; }}
        onUnmount={() => { mapRef.current = null; }}
        options={{ streetViewControl: false, mapTypeControl: false }}
      >
        <Polyline
          path={path}
          options={{ strokeColor: '#00A19A', strokeOpacity: 0.85, strokeWeight: 4 }}
        />

        {points.map((point, i) => {
          const isStart = i === 0;
          const isEnd = i === lastIndex;

          const color = isStart ? '#00A19A' : isEnd ? '#E11D48' : '#1A1A1A';
          const scale = isStart || isEnd ? 7 : 4;

          return (
            <Marker
              key={`${point.timestamp}-${i}`}
              position={{ lat: point.latitude, lng: point.longitude }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale,
                fillColor: color,
                fillOpacity: isStart || isEnd ? 1 : 0.8,
                strokeColor: '#ffffff',
                strokeWeight: isStart || isEnd ? 2 : 1,
              }}
              onClick={() => setActiveIndex(i)}
            >
              {activeIndex === i && (
                <InfoWindow onCloseClick={() => setActiveIndex(null)}>
                  <div className="text-xs">
                    <p className="font-semibold">
                      {isStart ? 'Start' : isEnd ? 'End' : `Point ${i + 1}`}
                    </p>
                    <p>{new Date(point.timestamp).toLocaleString()}</p>
                    <p>
                      {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}
      </GoogleMap>
    </div>
  );
}
