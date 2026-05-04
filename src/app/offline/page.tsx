"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-xs">
        TeamGlimpse can&apos;t reach the server right now. Check your connection
        and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-sm underline underline-offset-4 text-primary"
      >
        Try again
      </button>
    </div>
  );
}
