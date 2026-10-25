import type { ComponentProps } from "react";
import { Link } from "react-router";
import { tv, type VariantProps } from "tailwind-variants/lite";

const button = tv({
  base: "inline-flex max-w-full items-center justify-center gap-3 font-ui transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      primary: "bg-button text-button-foreground hover:bg-button-hover",
      outline: "border border-border bg-surface/80 text-foreground backdrop-blur-sm hover:border-primary",
      ghost: "text-muted hover:text-foreground",
      text: "text-muted underline-offset-4 hover:text-primary hover:underline",
    },
    size: {
      md: "px-5 py-2.5 text-sm",
      sm: "px-4 py-2 text-sm",
      label: "text-xs",
      icon: "size-9 shrink-0 text-sm",
    },
    shape: {
      rounded: "rounded-md",
      pill: "rounded-full",
    },
  },
  defaultVariants: { variant: "primary", size: "md", shape: "rounded" },
});

export type ButtonVariants = VariantProps<typeof button>;
export type ButtonProps = Omit<ComponentProps<"button">, "className" | "style"> & ButtonVariants;
export type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className" | "style"> & ButtonVariants;

// Layout belongs on the surrounding container; appearance stays in this recipe.
export function Button({ variant, size, shape, type = "button", ...props }: ButtonProps) {
  return <button {...props} type={type} className={`cursor-pointer ${button({ variant, size, shape })}`} />;
}

export function ButtonLink({ variant, size, shape, ...props }: ButtonLinkProps) {
  return <Link {...props} className={button({ variant, size, shape })} />;
}
