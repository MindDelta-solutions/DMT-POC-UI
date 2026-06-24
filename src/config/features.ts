import type { AIFeature, VehicleType } from '../types';

export const AI_FEATURES: { id: AIFeature; label: string; description: string }[] = [
  {
    id: 'numberPlateBlur',
    label: 'Number Plate Blur',
    description: 'Automatically blur vehicle number plates',
  },
  {
    id: 'faceBlur',
    label: 'Face Blur',
    description: 'Automatically blur detected faces',
  },
  {
    id: 'vehicleDetection',
    label: 'Vehicle Detection',
    description: 'Detect and classify vehicles by type',
  },
  // pedestrianDetection temporarily hidden — re-add to this array to restore it
  // { id: 'pedestrianDetection', label: 'Pedestrian Detection', description: 'Detect pedestrians in the frame' },
];

export const VEHICLE_TYPES: { id: VehicleType; label: string }[] = [
  { id: '2-wheeler',     label: '2 Wheeler' },
  { id: 'auto-rickshaw', label: 'Auto Rickshaw' },
  { id: 'car',           label: 'Car' },
  { id: 'truck',         label: 'Truck' },
  { id: 'bus',           label: 'Bus' },
];

// Maps our UI feature/vehicle-type selections to the backend's class name strings.
// numberPlateBlur → licence_plate
// faceBlur        → face
// vehicleDetection with specific types → each type mapped below;
//   if no types selected, all vehicle classes are sent
// pedestrianDetection → pedestrian
const VEHICLE_CLASS_MAP: Record<VehicleType, string> = {
  '2-wheeler':     'motorcycle',
  'auto-rickshaw': 'auto',
  'car':           'car',
  'truck':         'truck',
  'bus':           'bus',
};

const ALL_VEHICLE_CLASSES = ['auto', 'bus', 'car', 'motorcycle', 'truck'];

export function featuresToClasses(features: AIFeature[], vehicleTypes: VehicleType[]): string[] {
  const classes: string[] = [];

  for (const feature of features) {
    switch (feature) {
      case 'numberPlateBlur':
        classes.push('licence_plate');
        break;
      case 'faceBlur':
        classes.push('face');
        break;
      case 'vehicleDetection':
        if (vehicleTypes.length > 0) {
          classes.push(...vehicleTypes.map(vt => VEHICLE_CLASS_MAP[vt]));
        } else {
          classes.push(...ALL_VEHICLE_CLASSES);
        }
        break;
      case 'pedestrianDetection':
        classes.push('pedestrian');
        break;
    }
  }

  return [...new Set(classes)];
}
