import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-[72px] items-center border-b border-border-2 px-8">
        <Link href="/login">
          <Logo size="md" />
        </Link>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        {children}
      </main>
    </div>
  );
}
