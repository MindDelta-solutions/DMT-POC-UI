export type AIFeature =
  | 'numberPlateBlur'
  | 'faceBlur'
  | 'vehicleDetection'
  | 'pedestrianDetection';

export type VehicleType = '2-wheeler' | 'auto-rickshaw' | 'car' | 'truck' | 'bus';

export interface VideoItem {
  id: string;       // stem from backend, e.g. "20240103_043138A"
  name: string;     // display label
  filename: string; // full filename for WS init: stem + ".mp4"
}

export interface VideoSelection {
  videoId: string;
  features: AIFeature[];
  vehicleTypes: VehicleType[];
}
