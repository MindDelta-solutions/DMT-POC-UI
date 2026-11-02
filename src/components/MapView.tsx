import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import type { RoutePoint, TrafficLevel, TrafficResponse } from '../types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

const containerStyle = { width: '100%', height: '100%' };

const TRAFFIC_COLORS: Record<TrafficLevel, string> = {
  low: '#22C55E',
  medium: '#EAB308',
  high: '#EF4444',
};

const DEFAULT_ROUTE_COLOR = '#00A19A';
const NO_DATA_COLOR = '#9CA3AF';

interface MapViewProps {
  points: RoutePoint[];
  traffic: TrafficResponse | null;
}

export default function MapView({ points, traffic }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const path = points.map((p) => ({ lat: p.latitude, lng: p.longitude }));
  const lastIndex = points.length - 1;

  const hasTrafficData = !!traffic && traffic.meta.has_road_segmentation && traffic.segments.length > 0;

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
    <div className="space-y-2">
      {traffic && !traffic.meta.has_road_segmentation && (
        <p className="text-xs text-amber-600">
          No road-segmentation data for this video — traffic level unavailable, showing route only.
        </p>
      )}

      {hasTrafficData && (
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="font-medium">Traffic:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: TRAFFIC_COLORS.low }} />
            Low
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: TRAFFIC_COLORS.medium }} />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: TRAFFIC_COLORS.high }} />
            High
          </span>
        </div>
      )}

      <div className="h-[480px] w-full rounded-lg overflow-hidden border border-gray-200">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={{ lat: points[0].latitude, lng: points[0].longitude }}
          zoom={15}
          onLoad={(map) => { mapRef.current = map; }}
          onUnmount={() => { mapRef.current = null; }}
          options={{ streetViewControl: false, mapTypeControl: false }}
        >
          {hasTrafficData ? (
            <>
              {traffic!.segments.map((segment, i) => (
                <Polyline
                  key={`${segment.start_timestamp}-${i}`}
                  path={[
                    { lat: segment.start_latitude, lng: segment.start_longitude },
                    { lat: segment.end_latitude, lng: segment.end_longitude },
                  ]}
                  options={{
                    strokeColor: segment.traffic_level ? TRAFFIC_COLORS[segment.traffic_level] : NO_DATA_COLOR,
                    strokeOpacity: 0.9,
                    strokeWeight: 5,
                  }}
                  onClick={() => setActiveSegment(i)}
                />
              ))}

              {activeSegment !== null && (() => {
                const segment = traffic!.segments[activeSegment];
                return (
                  <InfoWindow
                    position={{
                      lat: (segment.start_latitude + segment.end_latitude) / 2,
                      lng: (segment.start_longitude + segment.end_longitude) / 2,
                    }}
                    onCloseClick={() => setActiveSegment(null)}
                  >
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold capitalize">{segment.traffic_level ?? 'No data'} traffic</p>
                      <p>On-road density: {segment.on_road_density?.toFixed(2) ?? 'n/a'}</p>
                      <p>Duration: {segment.duration_s.toFixed(1)}s</p>
                      <p>{new Date(segment.start_timestamp).toLocaleTimeString()}</p>
                    </div>
                  </InfoWindow>
                );
              })()}
            </>
          ) : (
            <Polyline
              path={path}
              options={{ strokeColor: DEFAULT_ROUTE_COLOR, strokeOpacity: 0.85, strokeWeight: 4 }}
            />
          )}

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
    </div>
  );
}
