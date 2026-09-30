import { motion } from "framer-motion";

interface ProgressTrackProps {
  value: number;
  label?: string;
}

export function ProgressTrack({ value, label }: ProgressTrackProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-soil-600">
        <motion.div
          className="h-full rounded-full bg-crop"
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {label && (
        <p className="mt-1 text-[11px] tabular-nums text-moss">{label}</p>
      )}
    </div>
  );
}
