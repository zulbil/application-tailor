import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, User, FileText, LogOut, Linkedin, GraduationCap, HelpCircle, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [showTips, setShowTips] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  const navLinks = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/linkedin", icon: Linkedin, label: "LinkedIn", testId: "link-linkedin" },
    { href: "/training", icon: GraduationCap, label: "Training", testId: "link-training" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 sm:size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <FileText className="size-4 sm:size-5" />
            </div>
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight">Apply4Me</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-4">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  location === link.href 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                data-testid={link.testId}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            ))}

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
                <DropdownMenuItem onClick={() => setShowTips(true)} data-testid="button-view-tips">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  View Tips
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="w-full cursor-pointer" data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9" data-testid="button-mobile-menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} className="object-cover" />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      {(user?.firstName || user?.lastName) && (
                        <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                      )}
                      {user?.email && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <nav className="flex-1 p-4 space-y-1">
                    {navLinks.map((link) => (
                      <Link 
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                          location === link.href 
                            ? "bg-primary/10 text-primary" 
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                        data-testid={link.testId ? `mobile-${link.testId}` : undefined}
                      >
                        <link.icon className="size-5" />
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                  
                  <div className="p-4 border-t space-y-1">
                    <button
                      onClick={() => { setShowTips(true); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full"
                      data-testid="mobile-button-view-tips"
                    >
                      <HelpCircle className="size-5" />
                      View Tips
                    </button>
                    <a
                      href="/api/logout"
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                      data-testid="mobile-button-logout"
                    >
                      <LogOut className="size-5" />
                      Sign out
                    </a>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          <OnboardingDialog open={showTips} onOpenChange={setShowTips} autoShow={false} />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
        {children}
      </main>

      <footer className="border-t py-4 md:py-0">
        <div className="container mx-auto px-4 flex items-center justify-center md:h-14">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Built by <a href="https://joelalexandrekhang.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Joel Alexandre Khang</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
