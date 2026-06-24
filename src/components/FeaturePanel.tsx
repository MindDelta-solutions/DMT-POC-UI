import type { AIFeature, VehicleType, VideoSelection } from '../types';
import { AI_FEATURES } from '../config/features';
import VehicleTypeDropdown from './VehicleTypeDropdown';

interface FeaturePanelProps {
  videoName: string | null;
  selection: VideoSelection | null;
  onFeatureToggle: (feature: AIFeature) => void;
  onVehicleTypeToggle: (vehicleType: VehicleType) => void;
}

export default function FeaturePanel({
  videoName,
  selection,
  onFeatureToggle,
  onVehicleTypeToggle,
}: FeaturePanelProps) {
  if (!selection) {
    return (
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-evify-dark mb-1">2. Configure AI Features</h2>
        <p className="text-sm text-gray-500">Select a video above to configure AI features.</p>
      </section>
    );
  }

  const vehicleDetectionEnabled = selection.features.includes('vehicleDetection');

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-evify-dark mb-1">2. Configure AI Features</h2>
      <p className="text-sm text-gray-500 mb-4">
        Choose the AI features to enable{videoName ? ` for ${videoName}` : ''}. Multiple features can be enabled.
      </p>

      <div className="border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AI_FEATURES.map((feature) => {
            const checked = selection.features.includes(feature.id);
            return (
              <div key={feature.id}>
                <label className="flex items-start gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-evify-teal cursor-pointer"
                    checked={checked}
                    onChange={() => onFeatureToggle(feature.id)}
                  />
                  <span>
                    <span className="font-medium text-evify-dark">{feature.label}</span>
                    <span className="block text-xs text-gray-400">{feature.description}</span>
                  </span>
                </label>

                {feature.id === 'vehicleDetection' && vehicleDetectionEnabled && (
                  <div className="mt-2 ml-6">
                    <VehicleTypeDropdown
                      selected={selection.vehicleTypes}
                      onToggle={onVehicleTypeToggle}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
