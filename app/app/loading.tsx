export default function AppLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-10" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-28 bg-surface-highest" />
      <div className="mt-3 h-9 w-64 max-w-full bg-surface-low" />
      <div className="mt-8 grid gap-px border border-foreground/10 lg:grid-cols-3">
        <div className="h-48 bg-surface-lowest lg:col-span-2" />
        <div className="h-48 bg-surface-lowest" />
        <div className="h-40 bg-surface-lowest" />
        <div className="h-40 bg-surface-lowest lg:col-span-2" />
      </div>
    </div>
  );
}
