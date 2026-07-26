import { Toaster as Sonner } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="h-4 w-4 animate-icon-pop text-success" />,
        error: <XCircle className="h-4 w-4 animate-icon-pop text-destructive" />,
        warning: <AlertTriangle className="h-4 w-4 animate-icon-pop text-accent-foreground" />,
        info: <Info className="h-4 w-4 animate-icon-pop text-primary" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-success/40 group-[.toaster]:bg-success/5",
          error: "group-[.toaster]:border-destructive/40 group-[.toaster]:bg-destructive/5",
          warning: "group-[.toaster]:border-accent/40 group-[.toaster]:bg-accent/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
