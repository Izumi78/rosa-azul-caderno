import { cn } from "@/lib/utils";

/** A small stylised blue rose drawn with layered petals. */
export function RoseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} aria-hidden="true">
      <path d="M20 36 C20 30 20 26 20 22" stroke="var(--note-tinta)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M20 30 C15 29 12 26 12 23 C16 23 19 26 20 30Z" fill="var(--note-tinta)" opacity="0.85" />
      <circle cx="20" cy="15" r="11" fill="var(--rose)" opacity="0.18" />
      <path d="M9.5 15 C9.5 8 14 4.5 20 4.5 C26 4.5 30.5 8 30.5 15 C30.5 20.5 26 24 20 24 C14 24 9.5 20.5 9.5 15Z" fill="var(--rose)" />
      <path d="M13.5 15 C13.5 10.5 16.5 8 20 8 C23.5 8 26.5 10.5 26.5 15 C24 13 22 12.5 20 12.5 C18 12.5 16 13 13.5 15Z" fill="var(--primary)" opacity="0.9" />
      <path d="M16 17 C16 14.5 18 13 20 13 C22 13 24 14.5 24 17 C22.5 16 21.3 15.6 20 15.6 C18.7 15.6 17.5 16 16 17Z" fill="var(--primary-foreground)" opacity="0.55" />
      <path d="M12 18 C14 21 17 22 20 22 C23 22 26 21 28 18" stroke="var(--primary-foreground)" strokeOpacity="0.35" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <RoseMark />
      <span className="font-display text-xl font-semibold tracking-tight text-foreground">
        Rosa <em className="font-medium text-rose">Azul</em>
      </span>
    </span>
  );
}
