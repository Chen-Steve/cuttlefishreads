"use client";

import { Feather } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export function OriginalsWriteButton({
  isAuthenticated,
  workspaceHref = "/workspace",
  signupHref,
  className,
  label = "Write",
}: {
  isAuthenticated: boolean;
  workspaceHref?: string;
  signupHref: string;
  className?: string;
  label?: string;
}) {
  const href = isAuthenticated ? workspaceHref : signupHref;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (isAuthenticated) return;
    event.preventDefault();
    toast("Please create an account to start writing.", {
      action: {
        label: "Sign up",
        onClick: () => {
          window.location.href = signupHref;
        },
      },
    });
    window.location.href = signupHref;
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <Feather className="size-3.5" strokeWidth={2} aria-hidden />
      {label}
    </a>
  );
}
