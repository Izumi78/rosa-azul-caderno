import { Link } from "@tanstack/react-router";
import { LayoutGrid, Waypoints } from "lucide-react";

import { Wordmark } from "./logo";

const navClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="Rosa Azul — início">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1" aria-label="Principal">
          <Link
            to="/"
            className={navClass}
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
          >
            <LayoutGrid className="h-4 w-4" />
            Blocos
          </Link>
          <Link
            to="/mural"
            className={navClass}
            activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
          >
            <Waypoints className="h-4 w-4" />
            Mural
          </Link>
        </nav>
      </div>
    </header>
  );
}
