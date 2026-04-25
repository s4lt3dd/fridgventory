import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-surface-subtle text-text-primary">
      <Navbar />
      {/* On desktop, leave room for the 220px sidebar. On mobile, pb-20 keeps
          content clear of the bottom tab bar. */}
      <main className="md:ml-[220px] pb-24 md:pb-8">
        <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-[var(--space-lg)]">
          {children}
        </div>
      </main>
    </div>
  );
}
