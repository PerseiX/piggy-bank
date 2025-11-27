import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthFormSchema, type AuthFormViewModel } from "@/lib/schemas/auth.schema";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isLogin = mode === "login";
  const title = isLogin ? "Sign In" : "Sign Up";
  const description = isLogin 
    ? "Enter your credentials to access your account" 
    : "Create a new account to get started";
  const buttonText = isLogin ? "Sign In" : "Sign Up";
  const footerText = isLogin ? "Don't have an account?" : "Already have an account?";
  const footerLinkText = isLogin ? "Sign Up" : "Sign In";
  const footerLinkHref = isLogin ? "/auth/signup" : "/auth/login";
  const apiEndpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";

  const form = useForm<AuthFormViewModel>({
    resolver: zodResolver(AuthFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: AuthFormViewModel) => {
    setIsLoading(true);

    try {
      // Call the appropriate API endpoint
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle error response
        toast.error(isLogin ? "Authentication Failed" : "Sign Up Failed", {
          description: result.error || "Please try again.",
        });
        return;
      }

      // Success - refresh the browser client's session
      // This ensures the browser client picks up the cookies set by the server
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.refreshSession();

      // Show success message
      if (isLogin) {
        toast.success("Welcome back!", {
          description: "You have successfully signed in.",
        });
      } else {
        toast.success("Account Created!", {
          description: "You have successfully signed up.",
        });
      }

      // Redirect to home page after a short delay to ensure session is synced
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } catch (error) {
      // Handle unexpected errors
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-test-id="auth-form">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        disabled={isLoading}
                        data-test-id="auth-email-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      {isLogin && (
                        <a 
                          href="/auth/forgot-password" 
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot password?
                        </a>
                      )}
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        data-test-id="auth-password-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading} data-test-id="auth-submit-button">
                {isLoading ? "Loading..." : buttonText}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {footerText}{" "}
            <a href={footerLinkHref} className="font-medium text-primary hover:underline">
              {footerLinkText}
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

