/**
 * AppHeader Component
 * 
 * Main navigation header that appears on all authenticated pages.
 * Includes sign-out functionality.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AppHeader() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const supabase = getSupabaseBrowserClient();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error("Sign out failed", {
          description: error.message,
        });
        setIsSigningOut(false);
        return;
      }

      toast.success("Signed out successfully");
      // Redirect to login page
      window.location.href = "/signin";
    } catch (error) {
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
      setIsSigningOut(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
              Piggy Bank
            </a>
          </div>
          
          <nav className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}

