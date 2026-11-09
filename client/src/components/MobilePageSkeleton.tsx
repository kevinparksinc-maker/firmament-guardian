/** Loading feedback only: never stands in for a chart or generated reading. */
export function MobilePageSkeleton({ label = "Opening your observatory…" }: { label?: string }) {
  return (
    <section role="status" aria-live="polite" aria-busy="true" className="fg-page-loading">
      <p className="mb-5 text-sm text-cyan-100">{label}</p>
      <div aria-hidden="true" className="fg-loading-card space-y-4">
        <div className="fg-skeleton h-3 w-24" />
        <div className="fg-skeleton h-7 w-3/4" />
        <div className="fg-skeleton h-3 w-full" />
        <div className="fg-skeleton h-3 w-5/6" />
      </div>
      <div aria-hidden="true" className="mt-4 grid gap-4 sm:grid-cols-2">
        {[0, 1].map(index => <div key={index} className="fg-loading-card space-y-4">
          <div className="fg-skeleton h-10 w-10 rounded-full" />
          <div className="fg-skeleton h-4 w-1/2" />
          <div className="fg-skeleton h-3 w-full" />
          <div className="fg-skeleton h-3 w-4/5" />
        </div>)}
      </div>
      <span className="sr-only">Please wait. Your content will appear here.</span>
    </section>
  );
}
