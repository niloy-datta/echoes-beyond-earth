export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[100svh] items-center justify-center">
      <span className="relative flex h-2.5 w-2.5">
        <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-signal" />
      </span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
