import DocsHeader from "@/components/docs/docs-header";
import DocsSidebar from "@/components/docs/docs-sidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <DocsHeader />
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-[var(--border)] px-4 pt-10 md:block">
          <DocsSidebar />
        </aside>
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
