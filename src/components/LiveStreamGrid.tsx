import LiveStream from './LiveStream';
import LiveCameraStream from './LiveCameraStream';

export interface ActiveStream {
  mode: 'ondemand' | 'live';
  filename?: string;
  classes: string[];
  labels: boolean;
}

interface LiveStreamGridProps {
  activeStream: ActiveStream | null;
  step?: number;
  onLiveStop?: () => void;
}

export default function LiveStreamGrid({ activeStream, step = 3, onLiveStop }: LiveStreamGridProps) {
  if (!activeStream) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-evify-dark mb-1">{step}. Live Processed Output</h2>
      <p className="text-sm text-gray-500 mb-4">
        Streaming processed frames from the backend in real time.
      </p>
      <div className="max-w-2xl">
        {activeStream.mode === 'live' ? (
          <LiveCameraStream
            classes={activeStream.classes}
            labels={activeStream.labels}
            onStop={onLiveStop ?? (() => {})}
          />
        ) : (
          <LiveStream
            filename={activeStream.filename!}
            classes={activeStream.classes}
            labels={activeStream.labels}
          />
        )}
      </div>
    </section>
  );
}
