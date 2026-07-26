import * as React from "react";

import { cn } from "@/lib/utils";
import { handleNativeInvalid, clearNativeValidity } from "@/lib/native-validation-messages";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onInvalid, onInput, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onInvalid={(e) => {
          handleNativeInvalid(e);
          onInvalid?.(e);
        }}
        onInput={(e) => {
          clearNativeValidity(e);
          onInput?.(e);
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
