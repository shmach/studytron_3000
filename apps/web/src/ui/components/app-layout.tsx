import { BookOpen } from 'lucide-react';
import { Link, Outlet, ScrollRestoration } from 'react-router';

export function AppLayout() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BookOpen className="size-5" />
            course-builder
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}
