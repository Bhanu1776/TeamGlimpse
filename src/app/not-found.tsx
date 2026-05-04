import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-xs">
        This page doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/home"
        className="mt-2 text-sm underline underline-offset-4 text-primary"
      >
        Back to home
      </Link>
    </div>
  );
}
