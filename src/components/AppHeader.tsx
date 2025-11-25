import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  user?: {
    id: string;
    email?: string;
  } | null;
};

export function AppHeader({ user }: AppHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const result = await response.json();
        toast.error("Logout Failed", {
          description: result.error || "Please try again.",
        });
        return;
      }

      toast.success("Logged Out", {
        description: "You have been successfully logged out.",
      });

      // Redirect to login page
      window.location.href = "/auth/login";
    } catch (error) {
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a href="/" className="text-xl font-bold hover:text-primary transition-colors">
            Piggy Bank
          </a>
          {user && (
            <nav className="hidden md:flex items-center gap-4">
              <a
                href="/"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Wallets
              </a>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xs font-medium text-primary" aria-hidden="true">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {user.email || "User"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Sign Out"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="/auth/login">Sign In</a>
              </Button>
              <Button size="sm" asChild>
                <a href="/auth/signup">Sign Up</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
