export default function TreatmentsLoading() {
  return (
    <div className="p-4">
      <div className="h-10 bg-muted rounded-xl animate-pulse mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
