import type { VideoItem } from '../types';

interface VideoSelectorProps {
  videos: VideoItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function VideoSelector({ videos, selectedId, onSelect }: VideoSelectorProps) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-evify-dark mb-1">1. Select Video</h2>
      <p className="text-sm text-gray-500 mb-4">Choose a video to process.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {videos.map((video) => {
          const isSelected = selectedId === video.id;
          return (
            <label
              key={video.id}
              className={`flex items-center gap-3 rounded-lg border-2 transition-colors p-3 cursor-pointer ${
                isSelected ? 'border-evify-teal bg-evify-teal/5' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="video-selection"
                className="h-4 w-4 accent-evify-teal cursor-pointer shrink-0"
                checked={isSelected}
                onChange={() => onSelect(video.id)}
              />
              <div className="min-w-0">
                <p className="font-medium text-evify-dark truncate">{video.name}</p>
                <p className="text-xs text-gray-400 truncate">{video.filename}</p>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
