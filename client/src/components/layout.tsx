import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BriefcaseBusiness, User, FileText } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <FileText className="size-5" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">JobTailor</span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-4">
            <Link href="/" className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              location === "/" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}>
              <User className="size-4" />
              Profile
            </Link>
            <Link href="/application" className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              location === "/application" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}>
              <BriefcaseBusiness className="size-4" />
              Job Application
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            Built with Replit. Mockup Mode.
          </p>
        </div>
      </footer>
    </div>
  );
}
