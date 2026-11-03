export type AIFeature =
  | 'numberPlateBlur'
  | 'faceBlur'
  | 'vehicleDetection'
  | 'pedestrianDetection'
  | 'potholeDetection';

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

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface RouteResponse {
  video: string;
  points: RoutePoint[];
}

export interface MapVideoMeta {
  video_name: string;
  vehicle_number_plate: string;
  rider_name: string;
  date: string;
  normalized_time_window: { start: string; end: string };
}

export type TrafficLevel = 'low' | 'medium' | 'high';

export interface TrafficSegment {
  start_timestamp: string;
  end_timestamp: string;
  duration_s: number;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  frame_start: number;
  frame_end: number;
  all_vehicle_density: number;
  on_road_density: number | null;
  traffic_level: TrafficLevel | null;
}

export interface TrafficMeta {
  video: string;
  fps: number;
  width: number;
  height: number;
  total_frames: number;
  has_road_segmentation: boolean;
  on_road_threshold: number;
  traffic_level_cutoffs: { low_max: number; high_min: number };
}

export interface TrafficResponse {
  meta: TrafficMeta;
  segments: TrafficSegment[];
}
