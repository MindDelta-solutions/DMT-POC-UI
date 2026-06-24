import { useEffect, useRef, useState } from 'react';
import type { VehicleType } from '../types';
import { VEHICLE_TYPES } from '../config/features';

interface VehicleTypeDropdownProps {
  selected: VehicleType[];
  onToggle: (type: VehicleType) => void;
}

export default function VehicleTypeDropdown({ selected, onToggle }: VehicleTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const label =
    selected.length === 0
      ? 'Select vehicle types'
      : `${selected.length} selected: ${selected
          .map((id) => VEHICLE_TYPES.find((v) => v.id === id)?.label)
          .join(', ')}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left text-sm border border-gray-300 rounded-md px-3 py-2 bg-white hover:border-evify-teal transition-colors"
      >
        <span className="truncate text-gray-700">{label}</span>
        <span className="text-gray-400 ml-2">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-2">
          {VEHICLE_TYPES.map((type) => (
            <label
              key={type.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-evify-teal/5 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-evify-teal cursor-pointer"
                checked={selected.includes(type.id)}
                onChange={() => onToggle(type.id)}
              />
              {type.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
