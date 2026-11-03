import { useEffect, useState } from 'react';
import type { RouteResponse, RoutePoint, TrafficResponse, MapVideoMeta } from '../types';
import LoadingDots from './LoadingDots';
import MapView from './MapView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Server responded with ${res.status}`);
  }
  return res.json();
}

interface VideoCardProps {
  video: MapVideoMeta;
  isSelected: boolean;
  onSelect: () => void;
}

function VideoCard({ video, isSelected, onSelect }: VideoCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={`rounded-lg border-2 transition-colors ${
        isSelected ? 'border-evify-teal bg-evify-teal/5' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
      }`}
    >
      <label className="flex items-center gap-3 p-3 cursor-pointer">
        <input
          type="radio"
          name="map-video-selection"
          className="h-4 w-4 accent-evify-teal cursor-pointer shrink-0"
          checked={isSelected}
          onChange={onSelect}
        />
        <p className="font-medium text-evify-dark truncate text-sm flex-1">{video.video_name}</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDetailsOpen((open) => !open);
          }}
          className="text-gray-400 hover:text-evify-teal p-1 shrink-0"
          aria-label="Toggle video details"
        >
          <span className={`inline-block transition-transform ${detailsOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
      </label>

      {detailsOpen && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2 text-xs border-t border-gray-200 pt-2 mx-3">
          <div>
            <p className="text-gray-400">Number Plate</p>
            <p className="font-medium text-evify-dark">{video.vehicle_number_plate}</p>
          </div>
          <div>
            <p className="text-gray-400">Rider</p>
            <p className="font-medium text-evify-dark">{video.rider_name}</p>
          </div>
          <div>
            <p className="text-gray-400">Date</p>
            <p className="font-medium text-evify-dark">{video.date}</p>
          </div>
          <div>
            <p className="text-gray-400">Time Window</p>
            <p className="font-medium text-evify-dark">
              {video.normalized_time_window.start} – {video.normalized_time_window.end}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RouteMapPanel() {
  const [videos,        setVideos]        = useState<MapVideoMeta[]>([]);
  const [videosLoading, setVideosLoading]  = useState(true);
  const [videosError,   setVideosError]    = useState<string | null>(null);

  const [selectedVideo, setSelectedVideo]  = useState<string | null>(null);
  const [points,        setPoints]         = useState<RoutePoint[] | null>(null);
  const [traffic,       setTraffic]        = useState<TrafficResponse | null>(null);
  const [trafficError,  setTrafficError]   = useState<string | null>(null);
  const [mapLoading,    setMapLoading]     = useState(false);
  const [mapError,      setMapError]       = useState<string | null>(null);

  const selectedVideoMeta = videos.find((v) => v.video_name === selectedVideo) ?? null;

  useEffect(() => {
    fetch(`${API_BASE_URL}/map/videos`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Server responded with ${r.status}`);
        return r.json();
      })
      .then(({ videos: list }: { videos: MapVideoMeta[] }) => setVideos(list))
      .catch((err: Error) => setVideosError(err.message))
      .finally(() => setVideosLoading(false));
  }, []);

  function handleSelect(video: string) {
    setSelectedVideo(video);
    setPoints(null);
    setTraffic(null);
    setTrafficError(null);
    setMapError(null);
  }

  function handleGetMap() {
    if (!selectedVideo) return;
    setMapLoading(true);
    setMapError(null);
    setTrafficError(null);
    setPoints(null);
    setTraffic(null);

    const routeUrl = `${API_BASE_URL}/map/videos/${encodeURIComponent(selectedVideo)}/route`;
    const trafficUrl = `${API_BASE_URL}/map/videos/${encodeURIComponent(selectedVideo)}/traffic`;

    Promise.all([
      fetchJson<RouteResponse>(routeUrl)
        .then((data) => setPoints(data.points))
        .catch((err: Error) => setMapError(err.message)),
      fetchJson<TrafficResponse>(trafficUrl)
        .then((data) => setTraffic(data))
        .catch((err: Error) => setTrafficError(err.message)),
    ]).finally(() => setMapLoading(false));
  }

  if (videosLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">
        Loading available videos…
      </div>
    );
  }

  if (videosError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center text-red-500 text-sm">
        Could not load video list: {videosError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-evify-dark mb-1">1. Select Video</h2>
        <p className="text-sm text-gray-500 mb-4">Choose a video to view its ride route on the map.</p>

        {videos.length === 0 ? (
          <p className="text-sm text-gray-400">No videos found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            {videos.map((video) => (
              <VideoCard
                key={video.video_name}
                video={video}
                isSelected={selectedVideo === video.video_name}
                onSelect={() => handleSelect(video.video_name)}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col items-end gap-3 mt-4">
          {mapError && <p className="text-sm text-red-500">{mapError}</p>}
          <button
            type="button"
            onClick={handleGetMap}
            disabled={!selectedVideo || mapLoading}
            className="bg-evify-teal hover:bg-evify-teal-dark disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            {mapLoading ? <LoadingDots label="Loading" /> : 'Get Map'}
          </button>
        </div>
      </section>

      {mapLoading && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">
          <LoadingDots label="Fetching route" />
        </section>
      )}

      {points && !mapLoading && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-evify-dark mb-1">2. Route</h2>
          <p className="text-sm text-gray-500 mb-4">
            {selectedVideoMeta
              ? `${selectedVideoMeta.rider_name} — ${selectedVideoMeta.vehicle_number_plate} — ${selectedVideoMeta.date}`
              : selectedVideo}{' '}
            — {points.length} GPS points
          </p>
          {trafficError && (
            <p className="text-xs text-amber-600 mb-3">
              Traffic data unavailable ({trafficError}); showing route only.
            </p>
          )}
          <MapView points={points} traffic={traffic} />
        </section>
      )}
    </div>
  );
}
