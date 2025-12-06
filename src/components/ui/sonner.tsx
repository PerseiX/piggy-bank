import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group-[.toaster]:shadow-lg group-[.toaster]:border-border/60 group-[.toaster]:backdrop-blur-sm",
          title: "group-[.toaster]:font-semibold",
          description: "group-[.toaster]:text-muted-foreground",
          success:
            "group-[.toaster]:bg-emerald-50/95 group-[.toaster]:text-emerald-900 group-[.toaster]:border-emerald-200/80 dark:group-[.toaster]:bg-emerald-950/95 dark:group-[.toaster]:text-emerald-100 dark:group-[.toaster]:border-emerald-800/60",
          error:
            "group-[.toaster]:bg-red-50/95 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200/80 dark:group-[.toaster]:bg-red-950/95 dark:group-[.toaster]:text-red-100 dark:group-[.toaster]:border-red-800/60",
          warning:
            "group-[.toaster]:bg-amber-50/95 group-[.toaster]:text-amber-900 group-[.toaster]:border-amber-200/80 dark:group-[.toaster]:bg-amber-950/95 dark:group-[.toaster]:text-amber-100 dark:group-[.toaster]:border-amber-800/60",
          info: "group-[.toaster]:bg-sky-50/95 group-[.toaster]:text-sky-900 group-[.toaster]:border-sky-200/80 dark:group-[.toaster]:bg-sky-950/95 dark:group-[.toaster]:text-sky-100 dark:group-[.toaster]:border-sky-800/60",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />,
        info: <InfoIcon className="size-4 text-sky-600 dark:text-sky-400" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />,
        error: <OctagonXIcon className="size-4 text-red-600 dark:text-red-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-primary" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
