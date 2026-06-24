import { useEffect, useState } from 'react';
import Header from './components/Header';
import VideoSelector from './components/VideoSelector';
import FeaturePanel from './components/FeaturePanel';
import LiveStreamGrid from './components/LiveStreamGrid';
import { featuresToClasses } from './config/features';
import type { AIFeature, VehicleType, VideoItem, VideoSelection } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ActiveStream {
  filename: string;
  classes: string[];
  labels: boolean;
}

function App() {
  const [videos,        setVideos]        = useState<VideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError,   setVideosError]   = useState<string | null>(null);

  const [selection,    setSelection]    = useState<VideoSelection | null>(null);
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);
  const [showLabels,   setShowLabels]   = useState(true);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  console.log("API_BASE_URL =", API_BASE_URL);
  console.log("Videos URL =", `${API_BASE_URL}/videos`);
  // Fetch available video list from the backend on mount
  useEffect(() => {
  fetch(`${API_BASE_URL}/videos`, {
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  })
    .then((r) => {
      if (!r.ok) {
        throw new Error(`Server responded with ${r.status}`);
      }
      return r.json();
    })
    .then(({ videos: stems }: { videos: string[] }) => {
      setVideos(
        stems.map((stem) => ({
          id: stem,
          name: stem,
          filename: `${stem}.mp4`,
        }))
      );
    })
    .catch((err: Error) => {
      console.error("Video fetch error:", err);
      setVideosError(err.message);
    })
    .finally(() => {
      setVideosLoading(false);
    });
}, []);

  function handleVideoSelect(videoId: string) {
    setSelection({ videoId, features: [], vehicleTypes: [] });
    setActiveStream(null);
    setSubmitError(null);
  }

  function handleFeatureToggle(feature: AIFeature) {
    setSelection((prev) => {
      if (!prev) return prev;
      const has = prev.features.includes(feature);
      return {
        ...prev,
        features:     has ? prev.features.filter((f) => f !== feature) : [...prev.features, feature],
        vehicleTypes: feature === 'vehicleDetection' && has ? [] : prev.vehicleTypes,
      };
    });
  }

  function handleVehicleTypeToggle(vehicleType: VehicleType) {
    setSelection((prev) => {
      if (!prev) return prev;
      const vehicleTypes = prev.vehicleTypes.includes(vehicleType)
        ? prev.vehicleTypes.filter((v) => v !== vehicleType)
        : [...prev.vehicleTypes, vehicleType];
      return { ...prev, vehicleTypes };
    });
  }

  function handleSubmit() {
    setSubmitError(null);
    if (!selection) {
      setSubmitError('Please select a video.');
      return;
    }
    const video = videos.find((v) => v.id === selection.videoId);
    if (!video) return;

    const classes = featuresToClasses(selection.features, selection.vehicleTypes);
    setActiveStream({ filename: video.filename, classes, labels: showLabels });
  }

  const selectedVideo = videos.find((v) => v.id === selection?.videoId) ?? null;

  return (
    <div className="min-h-screen bg-evify-gray">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {videosLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">
            Loading available videos…
          </div>
        ) : videosError ? (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center text-red-500 text-sm">
            Could not load video list: {videosError}
          </div>
        ) : (
          <>
            <VideoSelector
              videos={videos}
              selectedId={selection?.videoId ?? null}
              onSelect={handleVideoSelect}
            />

            <FeaturePanel
              videoName={selectedVideo?.name ?? null}
              selection={selection}
              onFeatureToggle={handleFeatureToggle}
              onVehicleTypeToggle={handleVehicleTypeToggle}
            />

            <div className="flex flex-col items-end gap-3">
              {submitError && <p className="text-sm text-red-500">{submitError}</p>}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-evify-teal cursor-pointer"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                  />
                  Show Labels on Detections
                </label>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selection}
                  className="bg-evify-teal hover:bg-evify-teal-dark disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  Start Stream
                </button>
              </div>
            </div>

            <LiveStreamGrid activeStream={activeStream} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
