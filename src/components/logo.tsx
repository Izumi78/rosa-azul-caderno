import { cn } from "@/lib/utils";

/** Rosa Azul signature: a layered rose with luminous glass petals. */
export function RoseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9 drop-shadow-[0_4px_12px_rgba(151,104,230,.38)]", className)} role="img" aria-label="Flor Rosa Azul">
      <defs>
        <linearGradient id="rose-petal" x1="8" y1="4" x2="38" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#F6D9FF"/><stop offset=".42" stopColor="#B98AF4"/><stop offset="1" stopColor="#6F54C8"/></linearGradient>
        <linearGradient id="rose-core" x1="16" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF1FF"/><stop offset="1" stopColor="#A77AEF"/></linearGradient>
        <linearGradient id="rose-leaf" x1="17" y1="29" x2="29" y2="45" gradientUnits="userSpaceOnUse"><stop stopColor="#A9E6D0"/><stop offset="1" stopColor="#438E91"/></linearGradient>
      </defs>
      <path d="M24 43c-.4-6.4-.2-10.4.3-15.4" fill="none" stroke="#83C9BD" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M24 35c-7.8-1.2-11.4-4.6-11.2-9.2 6.3.2 10.2 3.1 11.2 9.2Z" fill="url(#rose-leaf)" stroke="#D5FFF0" strokeOpacity=".55" strokeWidth=".7"/>
      <path d="M24 35c4.4-6.2 8.4-7.7 12.1-5.6-2.1 5.1-6.2 7.2-12.1 5.6Z" fill="url(#rose-leaf)" opacity=".9"/>
      <path d="M24 4.5c4.7-1 8.8 2.1 9.1 7.1 5.5-1.1 9.1 3 7.1 8.1 4 3.3 2.9 8.1-2.3 10.1-2.2 5.1-7.1 5.6-10.9 1.8-4.5 3.4-9.1 1.3-9.4-4-5.6-1.4-7.1-6-3.3-10.1-1.2-5.4 2.5-9 7.6-7.1 1-3.4 1.7-5.1 2.1-5.9Z" fill="url(#rose-petal)" stroke="#F8E9FF" strokeOpacity=".8" strokeWidth="1.1"/>
      <path d="M14.6 17.5c3.5-5.4 8.5-6.9 13.1-4.2 5.1-2.1 9.4.7 9.1 5.8 1.6 4.8-1.7 8.6-6.8 8.1-3.7 4.2-8.8 3.6-10.8-1.1-5.1-.6-7.3-4.3-4.6-8.6Z" fill="#9D75E8" fillOpacity=".82" stroke="#F5E8FF" strokeOpacity=".65"/>
      <path d="M19 17.5c2.1-3.5 6.4-4.1 8.8-1.3 3.7-.4 5.9 2.7 4.2 5.8.3 3.5-3 5.2-5.9 3.6-3.2 1.5-6.1-.3-5.8-3.5-2.8-1.1-3.2-3-.3-4.6Z" fill="url(#rose-core)" stroke="#FFF" strokeOpacity=".75"/>
      <circle cx="25" cy="20.5" r="2.2" fill="#F8E7FF"/>
      <path d="M10 11.5 12 9m24 2 2-2M8 25l-2 .5m34-.5 2 .5" stroke="#EAD5FF" strokeWidth="1.2" strokeLinecap="round" opacity=".8"/>
    </svg>
  );
}
export function Wordmark() {
  return <span className="flex items-center gap-2.5"><RoseMark /><span className="font-display text-xl font-semibold tracking-tight text-foreground">Rosa <em className="font-medium text-rose">Azul</em></span></span>;
}
