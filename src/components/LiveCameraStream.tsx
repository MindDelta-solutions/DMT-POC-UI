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

interface LiveMeta { video: string; total_frames: number; fps: number; }
interface LiveCameraStreamProps {
  classes: string[];
  labels: boolean;
  onStop: () => void;
}
type Status = 'connecting' | 'streaming' | 'reconnecting' | 'error' | 'stopped';

export default function LiveCameraStream({ classes, labels, onStop }: LiveCameraStreamProps) {
  const imgRef      = useRef<HTMLImageElement>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const blobUrlRef  = useRef<string | null>(null);
  const activeRef   = useRef(true); // false after unmount / user stop
  const classesRef  = useRef(classes);
  const labelsRef   = useRef(labels);

  const [status,     setStatus]     = useState<Status>('connecting');
  const [meta,       setMeta]       = useState<LiveMeta | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  // Keep refs in sync and send mid-stream updates
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    sendMsg({ type: 'classes', value: classes });
  }, [classes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mountedRef.current) return;
    sendMsg({ type: 'labels', value: labels });
  }, [labels]); // eslint-disable-line react-hooks/exhaustive-deps

  function sendMsg(msg: object) {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsExpanded(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    activeRef.current = true;

    function connect() {
      if (!activeRef.current) return;

      const ws = new WebSocket(`${WS_BASE_URL}/live`);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      setStatus('connecting');

      const isStale = () => wsRef.current !== ws;

      ws.onopen = () => {
        if (isStale()) return;
        ws.send(JSON.stringify({ classes: classesRef.current, labels: labelsRef.current }));
      };

      ws.onmessage = (event) => {
        if (isStale()) return;

        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data as string);

          if (msg.type === 'meta') {
            setMeta({ video: msg.video, total_frames: msg.total_frames, fps: msg.fps });
            setStatus('streaming');
          } else if (msg.type === 'done') {
            // Video ended — reconnect immediately for the next live video
            ws.close();
            wsRef.current = null;
            setStatus('reconnecting');
            setMeta(null);
            connect();
          } else if (msg.type === 'error') {
            setErrorMsg(msg.message ?? 'Unknown server error');
            setStatus('error');
          }
        } else {
          const prevUrl = blobUrlRef.current;
          const blob    = new Blob([event.data as ArrayBuffer], { type: 'image/jpeg' });
          const url     = URL.createObjectURL(blob);
          blobUrlRef.current = url;

          const img = imgRef.current;
          if (img) {
            img.onload = () => { if (prevUrl) URL.revokeObjectURL(prevUrl); };
            img.src    = url;
          } else {
            URL.revokeObjectURL(url);
            blobUrlRef.current = prevUrl;
          }
        }
      };

      ws.onerror = () => { if (!isStale()) setStatus('error'); };
      ws.onclose = () => {};
    }

    connect();

    return () => {
      activeRef.current = false;
      const ws = wsRef.current;
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'stop' }));
        ws.close();
        wsRef.current = null;
      }
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStop() {
    activeRef.current = false;
    const ws = wsRef.current;
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'stop' }));
      ws.close();
      wsRef.current = null;
    }
    setStatus('stopped');
    onStop();
  }

  const liveBadge = (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded-full">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      LIVE
    </span>
  );

  const reconnectingBadge = (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-evify-yellow text-evify-dark">Connecting…</span>
  );

  const errorBadge = (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">Error</span>
  );

  const badge = status === 'streaming' ? liveBadge
    : status === 'error' ? errorBadge
    : reconnectingBadge;

  const channelLabel = meta?.video ?? '—';

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            {badge}
            <p className="font-medium text-evify-dark text-sm truncate">Channel: {channelLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={handleStop}
              className="text-xs font-semibold px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Stop
            </button>
            <button onClick={() => setIsExpanded(true)} title="Expand view"
              className="p-1.5 rounded-md text-gray-400 hover:text-evify-teal hover:bg-gray-100 transition-colors">
              <ExpandIcon />
            </button>
          </div>
        </div>

        {/* Frame */}
        <div className="bg-black aspect-video flex items-center justify-center">
          {status === 'error' ? (
            <p className="text-red-400 text-sm px-4 text-center">{errorMsg}</p>
          ) : status === 'stopped' ? (
            <p className="text-gray-500 text-sm">Stream stopped.</p>
          ) : (status === 'connecting' || status === 'reconnecting') && !meta ? (
            <p className="text-gray-400 text-sm">
              {status === 'reconnecting' ? 'Loading next video…' : 'Connecting to live stream…'}
            </p>
          ) : isExpanded ? (
            <p className="text-gray-500 text-sm">Viewing in expanded mode</p>
          ) : (
            <img ref={imgRef} alt="live video frame" className="max-w-full max-h-full object-contain" />
          )}
        </div>

        {/* Footer info */}
        {meta && (
          <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
            <span>{Math.round(meta.fps)} fps</span>
          </div>
        )}
      </div>

      {/* Expanded overlay */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex flex-col w-full max-w-7xl bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ height: '90vh' }}>

            <div className="flex items-center justify-between px-5 py-3 bg-gray-900 shrink-0 border-b border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                {badge}
                <p className="text-gray-100 font-medium text-sm truncate">Channel: {channelLabel}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <button onClick={handleStop}
                  className="text-xs font-semibold px-3 py-1 rounded-md bg-gray-700 text-gray-200 hover:bg-red-700 hover:text-white transition-colors">
                  Stop
                </button>
                <button onClick={() => setIsExpanded(false)} title="Close (Esc)"
                  className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                  <CompressIcon />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-black flex items-center justify-center">
              {status === 'error' ? (
                <p className="text-red-400 text-sm px-4 text-center">{errorMsg}</p>
              ) : status === 'stopped' ? (
                <p className="text-gray-500 text-sm">Stream stopped.</p>
              ) : (
                <img ref={imgRef} alt="live video frame" className="max-w-full max-h-full object-contain" />
              )}
            </div>

            {meta && (
              <div className="bg-gray-900 px-5 py-3 shrink-0 border-t border-gray-700 flex items-center gap-4 text-xs text-gray-400">
                <span>{Math.round(meta.fps)} fps</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
