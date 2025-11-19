import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { AuthFormSchema, type AuthFormViewModel } from "@/lib/schemas/auth.schema";

type AuthFormProps = {
  variant: "signin" | "signup";
};

export function AuthForm({ variant }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseBrowserClient();

  const isSignIn = variant === "signin";
  const title = isSignIn ? "Sign In" : "Sign Up";
  const description = isSignIn 
    ? "Enter your credentials to access your account" 
    : "Create a new account to get started";
  const buttonText = isSignIn ? "Sign In" : "Sign Up";
  const footerText = isSignIn ? "Don't have an account?" : "Already have an account?";
  const footerLinkText = isSignIn ? "Sign Up" : "Sign In";
  const footerLinkHref = isSignIn ? "/signup" : "/signin";

  const form = useForm<AuthFormViewModel>({
    resolver: zodResolver(AuthFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: AuthFormViewModel) => {

    console.log("data", data);
    console.log("isSignIn", isSignIn);
    setIsLoading(true);

    try {
      console.log("isSignIn", isSignIn);
      if (isSignIn) {
        // Sign in with existing credentials
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        
        console.log("error", error);
        if (error) {
          toast.error("Authentication Failed", {
            description: error.message,
          });
          return;
        }

        // Success - redirect to dashboard
        toast.success("Welcome back!", {
          description: "You have successfully signed in.",
        });
        // window.location.href = "/wallets";
      } else {
        // Sign up with new credentials
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (error) {
          toast.error("Sign Up Failed", {
            description: error.message,
          });
          return;
        }

        // Success - redirect to dashboard or show confirmation message
        toast.success("Account Created!", {
          description: "You have successfully signed up. Please check your email for verification.",
        });
        window.location.href = "/";
      }
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
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

