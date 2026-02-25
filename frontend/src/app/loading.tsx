export default function Loading() {
  return (
    <div className="px-4 mt-4 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
