import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/features" className="hover:text-foreground">Features</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/docs" className="hover:text-foreground">Docs</Link>
            <Link href="https://github.com" className="hover:text-foreground">GitHub</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button>
          <Button asChild size="sm"><Link href="/signup">Get started →</Link></Button>
        </div>
      </div>
    </header>
  );
}
