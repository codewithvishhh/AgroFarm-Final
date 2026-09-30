export function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-xs text-moss">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-crop border-t-transparent" />
      {label}
    </div>
  );
}
