import { motion } from "framer-motion";

import { listItem } from "../animations/variants";
import { useCountUp } from "../hooks/useCountUp";
import { TiltCard } from "./TiltCard";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "crop" | "harvest" | "chill" | "rot" | "neutral";
}

const BARS: Record<string, string> = {
  crop: "bg-crop",
  harvest: "bg-harvest",
  chill: "bg-chill",
  rot: "bg-rot",
  neutral: "bg-soil-500",
};

const GLOWS: Record<string, string> = {
  crop: "from-crop/20",
  harvest: "from-harvest/20",
  chill: "from-chill/20",
  rot: "from-rot/20",
  neutral: "from-husk/8",
};

/**
 * Counts the numeric part of a value up on first paint, keeping any prefix
 * (₹) or suffix (%, kg) exactly as the page passed it in.
 */
function AnimatedValue({ value }: { value: string | number }) {
  const raw = String(value);
  const match = raw.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
  const numeric = match ? Number(match[2].replace(/,/g, "")) : Number.NaN;
  const decimals = match && match[2].includes(".") ? 1 : 0;
  const animated = useCountUp(Number.isFinite(numeric) ? numeric : 0);

  if (!match || !Number.isFinite(numeric)) return <>{raw}</>;

  return (
    <>
      {match[1]}
      {animated.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {match[3]}
    </>
  );
}

export function StatCard({ label, value, hint, tone = "neutral" }: StatCardProps) {
  return (
    <motion.div variants={listItem}>
      <TiltCard intensity={7} className="h-full">
        <article className="glass edge-light relative h-full overflow-hidden rounded-2xl p-5">
          <span
            className={`absolute inset-y-0 left-0 w-[3px] ${BARS[tone]} opacity-85`}
            aria-hidden
          />
          <span
            className={`pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-gradient-to-br ${GLOWS[tone]} to-transparent blur-2xl`}
            aria-hidden
          />
          <p className="relative text-xs text-moss">{label}</p>
          <p className="relative mt-2 font-display text-3xl font-semibold tabular-nums text-husk">
            <AnimatedValue value={value} />
          </p>
          {hint && <p className="relative mt-1 text-xs text-moss/80">{hint}</p>}
        </article>
      </TiltCard>
    </motion.div>
  );
}
