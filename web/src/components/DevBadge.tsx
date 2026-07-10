// Shown only on the dev deployment (built with base "/dev/"); the prod build
// (base "/") renders nothing.
export default function DevBadge() {
  if (import.meta.env.BASE_URL === '/') return null;
  return (
    <div className="pointer-events-none fixed right-2 top-2 z-[70] rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-lg ring-2 ring-amber-300/50">
      Dev
    </div>
  );
}
