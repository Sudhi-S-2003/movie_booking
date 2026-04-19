/**
 * Shimmering placeholder card rendered while `plans` is loading.
 * Pure CSS (tailwind `animate-pulse` + a custom gradient sweep) so we don't
 * import any new animation deps.
 */
export const SkeletonCard = () => (
  <div className="relative h-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 sm:p-6 overflow-hidden">
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    <div className="relative animate-pulse space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-white/[0.06]" />
        <div className="h-3 w-16 rounded bg-white/[0.06]" />
      </div>
      <div className="h-3 w-4/5 rounded bg-white/[0.04]" />
      <div className="h-10 w-28 rounded bg-white/[0.06]" />
      <div className="space-y-2 pt-2">
        <div className="h-2.5 w-full rounded bg-white/[0.04]" />
        <div className="h-2.5 w-5/6 rounded bg-white/[0.04]" />
        <div className="h-2.5 w-4/6 rounded bg-white/[0.04]" />
        <div className="h-2.5 w-3/6 rounded bg-white/[0.04]" />
      </div>
      <div className="h-11 w-full rounded-xl bg-white/[0.04] mt-6" />
    </div>
  </div>
);
