import { useEffect, useRef, useState } from 'react';

function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function CompressIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
      <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
    </svg>
  );
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

interface StreamMeta { total_frames: number; fps: number; }
interface LiveStreamProps { filename: string; classes: string[]; labels: boolean; }
type Status = 'connecting' | 'streaming' | 'paused' | 'done' | 'error' | 'closed';

const BADGE: Record<Status, { label: string; cls: string }> = {
  connecting: { label: 'Connecting…',  cls: 'bg-evify-yellow text-evify-dark' },
  streaming:  { label: 'Live',         cls: 'bg-evify-teal text-white' },
  paused:     { label: 'Paused',       cls: 'bg-gray-400 text-white' },
  done:       { label: 'Finished',     cls: 'bg-gray-300 text-gray-700' },
  error:      { label: 'Error',        cls: 'bg-red-500 text-white' },
  closed:     { label: 'Disconnected', cls: 'bg-gray-300 text-gray-700' },
};

function formatTime(frames: number, fps: number) {
  const secs = Math.floor(frames / fps);
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function LiveStream({ filename, classes, labels }: LiveStreamProps) {
  const imgRef     = useRef<HTMLImageElement>(null);
  const wsRef      = useRef<WebSocket | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const seekingRef = useRef(false);
  const statusRef  = useRef<Status>('connecting');

  const [status,       setStatus]       = useState<Status>('connecting');
  const [meta,         setMeta]         = useState<StreamMeta | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [paused,       setPaused]       = useState(false);
  const [speed,        setSpeed]        = useState(1.0);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [isExpanded,   setIsExpanded]   = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsExpanded(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function send(msg: object) {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  const classesRef = useRef(classes);
  const labelsRef  = useRef(labels);

  // Keep refs in sync so the reconnect effect always sends fresh values on onopen
  useEffect(() => { classesRef.current = classes; }, [classes]);
  useEffect(() => { labelsRef.current  = labels;  }, [labels]);

  // Send classes / labels changes mid-stream without reconnecting
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    send({ type: 'classes', value: classes });
  }, [classes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mountedRef.current) return;
    send({ type: 'labels', value: labels });
  }, [labels]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/stream`);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    const setS = (s: Status) => { statusRef.current = s; setStatus(s); };
    setS('connecting');
    setMeta(null);
    setCurrentFrame(0);
    setPaused(false);
    seekingRef.current = false;

    // Guard: if this ws is no longer the active one (e.g. React StrictMode double-mount
    // closed it during cleanup), ignore all its callbacks so stale events don't
    // corrupt the state of the replacement socket.
    const isStale = () => wsRef.current !== ws;

    ws.onopen = () => {
      if (isStale()) return;
      ws.send(JSON.stringify({ video: filename, classes: classesRef.current, speed: 1.0, labels: labelsRef.current }));
    };

    ws.onmessage = (event) => {
      if (isStale()) return;

      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data as string);
        if      (msg.type === 'meta')  { setMeta({ total_frames: msg.total_frames, fps: msg.fps }); setS('streaming'); }
        else if (msg.type === 'done')  { setS('done'); }
        else if (msg.type === 'error') { setErrorMsg(msg.message ?? 'Unknown server error'); setS('error'); }
      } else {
        if (!seekingRef.current) setCurrentFrame(f => f + 1);

        // Revoke the previous blob URL only AFTER the new frame has loaded,
        // so the browser never loses the image between revocation and the new paint.
        const prevUrl = blobUrlRef.current;
        const blob    = new Blob([event.data as ArrayBuffer], { type: 'image/jpeg' });
        const url     = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const img = imgRef.current;
        if (img) {
          img.onload = () => { if (prevUrl) URL.revokeObjectURL(prevUrl); };
          img.src    = url;
        } else {
          // img not in DOM yet (view transition in progress); clean up immediately
          URL.revokeObjectURL(url);
          blobUrlRef.current = prevUrl;
        }
      }
    };

    ws.onerror = () => { if (!isStale()) setS('error'); };
    ws.onclose = () => {
      if (isStale()) return;
      if (statusRef.current !== 'done' && statusRef.current !== 'error') setS('closed');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'stop' }));
      ws.close();
      wsRef.current = null;
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, [filename]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePause() {
    if (paused) {
      send({ type: 'resume' });
      setPaused(false); statusRef.current = 'streaming'; setStatus('streaming');
    } else {
      send({ type: 'pause' });
      setPaused(true);  statusRef.current = 'paused';    setStatus('paused');
    }
  }

  function changeSpeed(val: number) { send({ type: 'speed', value: val }); setSpeed(val); }

  function onSeekStart() { seekingRef.current = true; }
  function onSeekChange(e: React.ChangeEvent<HTMLInputElement>) { setCurrentFrame(parseInt(e.target.value)); }
  function onSeekEnd(e: React.MouseEvent<HTMLInputElement>) {
    if (!meta) return;
    const frame = parseInt((e.target as HTMLInputElement).value);
    send({ type: 'seek', timestamp: frame / meta.fps });
    seekingRef.current = false;
  }

  const badge = BADGE[status];
  const controlsDisabled = status === 'done' || status === 'closed' || status === 'error';

  // ─── Compact card ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <p className="font-medium text-evify-dark text-sm truncate">{filename}</p>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
            <button onClick={() => setIsExpanded(true)} title="Expand view"
              className="p-1.5 rounded-md text-gray-400 hover:text-evify-teal hover:bg-gray-100 transition-colors">
              <ExpandIcon />
            </button>
          </div>
        </div>

        {/* Frame — always render the <img> here when NOT expanded so imgRef stays stable */}
        <div className="bg-black aspect-video flex items-center justify-center">
          {status === 'error' ? (
            <p className="text-red-400 text-sm px-4 text-center">{errorMsg}</p>
          ) : status === 'connecting' ? (
            <p className="text-gray-400 text-sm">Connecting to stream…</p>
          ) : isExpanded ? (
            <p className="text-gray-500 text-sm">Viewing in expanded mode</p>
          ) : (
            <img ref={imgRef} alt="processed video frame" className="max-w-full max-h-full object-contain" />
          )}
        </div>

        {/* Controls — only when not expanded */}
        {!isExpanded && meta && (
          <div className="px-4 py-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 tabular-nums w-10 text-right">{formatTime(currentFrame, meta.fps)}</span>
              <input type="range" className="flex-1 accent-evify-teal cursor-pointer"
                min={0} max={meta.total_frames} value={currentFrame}
                onMouseDown={onSeekStart} onChange={onSeekChange} onMouseUp={onSeekEnd} />
              <span className="text-xs text-gray-500 tabular-nums w-10">{formatTime(meta.total_frames, meta.fps)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={togglePause} disabled={controlsDisabled}
                className="bg-evify-teal hover:bg-evify-teal-dark disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-gray-400 mr-1">Speed:</span>
                {[0.5, 1.0, 1.5, 2.0].map(s => (
                  <button key={s} onClick={() => changeSpeed(s)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${speed === s ? 'bg-evify-teal text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Expanded overlay ─────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex flex-col w-full max-w-7xl bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ height: '90vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-900 shrink-0 border-b border-gray-700">
              <p className="text-gray-100 font-medium text-sm truncate">{filename}</p>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                <button onClick={() => setIsExpanded(false)} title="Close  (Esc)"
                  className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                  <CompressIcon />
                </button>
              </div>
            </div>

            {/* Frame — imgRef lives here while expanded */}
            <div className="flex-1 min-h-0 bg-black flex items-center justify-center">
              {status === 'error' ? (
                <p className="text-red-400 text-sm px-4 text-center">{errorMsg}</p>
              ) : status === 'connecting' ? (
                <p className="text-gray-400 text-sm">Connecting to stream…</p>
              ) : (
                <img ref={imgRef} alt="processed video frame" className="max-w-full max-h-full object-contain" />
              )}
            </div>

            {/* Controls */}
            {meta && (
              <div className="bg-gray-900 px-5 py-4 shrink-0 space-y-3 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 tabular-nums w-10 text-right">{formatTime(currentFrame, meta.fps)}</span>
                  <input type="range" className="flex-1 accent-evify-teal cursor-pointer"
                    min={0} max={meta.total_frames} value={currentFrame}
                    onMouseDown={onSeekStart} onChange={onSeekChange} onMouseUp={onSeekEnd} />
                  <span className="text-xs text-gray-300 tabular-nums w-10">{formatTime(meta.total_frames, meta.fps)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={togglePause} disabled={controlsDisabled}
                    className="bg-evify-teal hover:bg-evify-teal-dark disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
                    {paused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-gray-300 mr-1">Speed:</span>
                    {[0.5, 1.0, 1.5, 2.0].map(s => (
                      <button key={s} onClick={() => changeSpeed(s)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${speed === s ? 'bg-evify-teal text-white font-semibold' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
