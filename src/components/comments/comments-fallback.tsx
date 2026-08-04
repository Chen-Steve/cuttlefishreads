export function CommentsFallback() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Loading comments"
    >
      <div className="h-16 rounded-xl bg-surface" />
      <div className="h-24 rounded-xl bg-surface" />
      <div className="h-20 rounded-xl bg-surface" />
    </div>
  );
}
