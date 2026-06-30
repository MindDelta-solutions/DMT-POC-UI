import { useEffect, useState } from 'react';
import Header from './components/Header';
import VideoSelector from './components/VideoSelector';
import FeaturePanel from './components/FeaturePanel';
import LiveStreamGrid, { type ActiveStream } from './components/LiveStreamGrid';
import { featuresToClasses } from './config/features';
import type { AIFeature, VehicleType, VideoItem, VideoSelection } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type StreamMode = 'ondemand' | 'live';

const EMPTY_SELECTION: VideoSelection = { videoId: '', features: [], vehicleTypes: [] };

function App() {
  const [mode, setMode] = useState<StreamMode>('ondemand');

  const [videos,        setVideos]        = useState<VideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError,   setVideosError]   = useState<string | null>(null);

  // On-demand state
  const [odSelection,  setOdSelection]  = useState<VideoSelection | null>(null);

  // Live state — always non-null so FeaturePanel stays unlocked in live mode
  const [liveSelection, setLiveSelection] = useState<VideoSelection>(EMPTY_SELECTION);

  const [activeStream,  setActiveStream]  = useState<ActiveStream | null>(null);
  const [liveLoading,   setLiveLoading]   = useState(false);
  const [showLabels,    setShowLabels]    = useState(true);
  const [submitError,   setSubmitError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/videos`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Server responded with ${r.status}`);
        return r.json();
      })
      .then(({ videos: stems }: { videos: string[] }) => {
        setVideos(
          stems.map((stem) => ({ id: stem, name: stem, filename: `${stem}.mp4` }))
        );
      })
      .catch((err: Error) => {
        setVideosError(err.message);
      })
      .finally(() => setVideosLoading(false));
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const currentSelection = mode === 'live' ? liveSelection : odSelection;

  function setSelection(updater: (prev: VideoSelection | null) => VideoSelection | null) {
    if (mode === 'live') {
      setLiveSelection(prev => updater(prev) ?? EMPTY_SELECTION);
    } else {
      setOdSelection(updater);
    }
  }

  // Recalculate active stream classes whenever selection changes mid-stream
  function updateActiveClasses(sel: VideoSelection) {
    const newClasses = featuresToClasses(sel.features, sel.vehicleTypes);
    setActiveStream(s => s ? { ...s, classes: newClasses } : null);
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleModeSwitch(newMode: StreamMode) {
    setMode(newMode);
    setActiveStream(null);
    setSubmitError(null);
  }

  function handleVideoSelect(videoId: string) {
    const next = { videoId, features: [], vehicleTypes: [] };
    setOdSelection(next);
    setActiveStream(null);
    setSubmitError(null);
  }

  function handleFeatureToggle(feature: AIFeature) {
    setSelection((prev) => {
      if (!prev) return prev;
      const has = prev.features.includes(feature);
      const next: VideoSelection = {
        ...prev,
        features:     has ? prev.features.filter((f) => f !== feature) : [...prev.features, feature],
        vehicleTypes: feature === 'vehicleDetection' && has ? [] : prev.vehicleTypes,
      };
      if (activeStream) updateActiveClasses(next);
      return next;
    });
  }

  function handleVehicleTypeToggle(vehicleType: VehicleType) {
    setSelection((prev) => {
      if (!prev) return prev;
      const vehicleTypes = prev.vehicleTypes.includes(vehicleType)
        ? prev.vehicleTypes.filter((v) => v !== vehicleType)
        : [...prev.vehicleTypes, vehicleType];
      const next = { ...prev, vehicleTypes };
      if (activeStream) updateActiveClasses(next);
      return next;
    });
  }

  function handleLabelsChange(checked: boolean) {
    setShowLabels(checked);
    if (activeStream) setActiveStream(s => s ? { ...s, labels: checked } : null);
  }

  function handleSubmit() {
    setSubmitError(null);
    if (!odSelection) { setSubmitError('Please select a video.'); return; }
    const video = videos.find((v) => v.id === odSelection.videoId);
    if (!video) return;
    const classes = featuresToClasses(odSelection.features, odSelection.vehicleTypes);
    setActiveStream({ mode: 'ondemand', filename: video.filename, classes, labels: showLabels });
  }

  function handleGoLive() {
    setSubmitError(null);
    setLiveLoading(true);
    const classes = featuresToClasses(liveSelection.features, liveSelection.vehicleTypes);
    setTimeout(() => {
      setLiveLoading(false);
      setActiveStream({ mode: 'live', classes, labels: showLabels });
    }, 5000);
  }

  function handleLiveStop() {
    setActiveStream(null);
    setLiveLoading(false);
  }

  const selectedVideo = videos.find((v) => v.id === (odSelection?.videoId ?? '')) ?? null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-evify-gray">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Mode tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(['ondemand', 'live'] as StreamMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeSwitch(m)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-white text-evify-dark shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'ondemand' ? 'On-Demand' : 'Live Camera'}
            </button>
          ))}
        </div>

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
            {/* Step 1 — Video selector (on-demand only) */}
            {mode === 'ondemand' && (
              <VideoSelector
                videos={videos}
                selectedId={odSelection?.videoId ?? null}
                onSelect={handleVideoSelect}
              />
            )}


            {/* Step 2 — Feature panel */}
            <FeaturePanel
              videoName={mode === 'live' ? null : (selectedVideo?.name ?? null)}
              selection={currentSelection}
              step={mode === 'live' ? 1 : 2}
              onFeatureToggle={handleFeatureToggle}
              onVehicleTypeToggle={handleVehicleTypeToggle}
            />

            {/* Submit row */}
            <div className="flex flex-col items-end gap-3">
              {submitError && <p className="text-sm text-red-500">{submitError}</p>}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-evify-teal cursor-pointer"
                    checked={showLabels}
                    onChange={(e) => handleLabelsChange(e.target.checked)}
                  />
                  Show Labels on Detections
                </label>
                {mode === 'ondemand' ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!odSelection}
                    className="bg-evify-teal hover:bg-evify-teal-dark disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-colors"
                  >
                    Start Stream
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoLive}
                    disabled={!!activeStream || liveLoading}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                    Go Live
                  </button>
                )}
              </div>
            </div>

            {/* Live loader */}
            {liveLoading && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-evify-dark mb-1">2. Live Processed Output</h2>
                <p className="text-sm text-gray-500 mb-4">Streaming processed frames from the backend in real time.</p>
                <div className="max-w-2xl bg-black rounded-xl aspect-video flex flex-col items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                    </span>
                    <span className="text-white font-semibold text-sm tracking-wide">LIVE</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs">Establishing live connection…</p>
                </div>
              </section>
            )}

            {/* Step 3 — Stream output */}
            <LiveStreamGrid
              activeStream={activeStream}
              step={mode === 'live' ? 2 : 3}
              onLiveStop={handleLiveStop}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
