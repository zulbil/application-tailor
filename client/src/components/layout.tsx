import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, User, FileText, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <FileText className="size-5" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">Apply4Me</span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-4">
            <Link href="/" className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              location === "/" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}>
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
            <Link href="/profile" className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              location === "/profile" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}>
              <User className="size-4" />
              Profile
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} className="object-cover" />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-0.5">
                    {(user?.firstName || user?.lastName) && (
                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    )}
                    {user?.email && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="w-full cursor-pointer" data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            Built with Replit
          </p>
        </div>
      </footer>
    </div>
  );
}
