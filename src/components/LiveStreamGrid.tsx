import LiveStream from './LiveStream';

interface ActiveStream {
  filename: string;
  classes: string[];
  labels: boolean;
}

interface LiveStreamGridProps {
  activeStream: ActiveStream | null;
}

export default function LiveStreamGrid({ activeStream }: LiveStreamGridProps) {
  if (!activeStream) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-evify-dark mb-1">3. Live Processed Output</h2>
      <p className="text-sm text-gray-500 mb-4">
        Streaming processed frames from the backend in real time.
      </p>
      <div className="max-w-2xl">
        <LiveStream filename={activeStream.filename} classes={activeStream.classes} labels={activeStream.labels} />
      </div>
    </section>
  );
}
