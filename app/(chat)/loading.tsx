export default function Loading() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden"
    >
      <div className="h-full w-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 animate-pulse" />
    </div>
  );
}
