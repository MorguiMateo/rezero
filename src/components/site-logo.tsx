import { Link } from "react-router";
import { siteName } from "@/lib/seo";
import { PleiadesMark } from "./pleiades-mark";

export function SiteLogo() {
  return (
    <Link to="/" prefetch="intent" aria-label={siteName} className="flex items-center gap-3">
      <PleiadesMark className="h-7 w-auto text-header-accent" />
      {/* Narrow screens keep only the stars so the navigation fits. */}
      <span className="hidden font-display text-2xl font-medium text-header-foreground sm:inline">{siteName}</span>
    </Link>
  );
}
