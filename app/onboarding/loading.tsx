export default function Loading() {
  return (
    <div
      aria-hidden="true"
      className="idealy-route-progress pointer-events-none fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden bg-border/60"
    >
      <div className="idealy-route-progress__indicator h-full w-1/3 rounded-full bg-primary" />
    </div>
  );
}
