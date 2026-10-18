export default function Loading() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden"
    >
      <div className="h-full w-full bg-gradient-to-r from-teal-400 via-purple-500 to-emerald-400 animate-pulse" />
    </div>
  );
}
