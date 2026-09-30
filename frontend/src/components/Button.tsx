import { useRef, type ButtonHTMLAttributes } from "react";

import { useReducedMotion } from "../hooks/useReducedMotion";

type Variant = "primary" | "ghost" | "danger" | "quiet";

const STYLES: Record<Variant, string> = {
  primary:
    "bg-crop text-soil-900 font-medium shadow-[0_10px_30px_-12px_rgba(79,191,122,0.8)] hover:bg-crop/90 hover:shadow-glow",
  ghost:
    "glass text-husk hover:border-crop/45 hover:text-crop hover:shadow-glass",
  danger:
    "border border-rot/40 bg-rot/10 text-rot backdrop-blur-sm hover:bg-rot/20 hover:shadow-[0_10px_30px_-14px_rgba(226,86,77,0.9)]",
  quiet: "text-moss hover:text-husk",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * Same API as before. The button now leans a few pixels toward the pointer,
 * scales down on press, and glows on hover.
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  const onMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (reduced || !ref.current || ref.current.disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `translate3d(${x * 4}px, ${y * 3}px, 0)`;
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <button
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerUp={reset}
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none ${STYLES[variant]} ${className}`}
    />
  );
}
