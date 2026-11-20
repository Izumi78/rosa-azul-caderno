import { Link } from "@tanstack/react-router";
import { LayoutGrid, Waypoints, CalendarDays, Settings2, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { Wordmark } from "./logo";
import { ProfileAvatar } from "./profile-avatar";

const itemClass = "rosa-rail-link group flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-[10px] font-semibold tracking-wide text-muted-foreground transition-all hover:bg-accent/70 hover:text-foreground";
export function SiteHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("rosa-azul-theme");
    const enabled = saved === "dark";
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("rosa-azul-theme", next ? "dark" : "light");
  };
  return (
    <>
      <header className="rosa-topbar sticky top-0 z-40 flex h-[4.5rem] items-center justify-center border-b border-border/70 px-4">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-5"><ProfileAvatar /></div>
        <Link to="/" aria-label="Rosa Azul — início" className="rosa-topbar-brand flex items-center justify-center">
          <Wordmark />
        </Link>
        <span className="absolute right-5 hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_oklch(0.75_0.16_150_/_45%)]" /> seu espaço criativo</span>
      </header>
      <aside className="rosa-sidebar fixed bottom-0 left-0 top-[4.5rem] z-30 flex w-[5.25rem] flex-col items-center gap-2 border-r border-border/70 px-2 py-5">
        <Link to="/" activeOptions={{ exact: true }} className={itemClass} activeProps={{ className: "is-active" }}><LayoutGrid className="h-5 w-5" />Blocos</Link>
        <Link to="/mural" className={itemClass} activeProps={{ className: "is-active" }}><Waypoints className="h-5 w-5" />Mural</Link>
        <Link to="/calendario" className={itemClass} activeProps={{ className: "is-active" }}><CalendarDays className="h-5 w-5" />Calendário</Link>
        <div className="my-2 h-px w-8 bg-border" />
        <div className="flex-1" />
        <button type="button" className={itemClass} onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}><Settings2 className="h-5 w-5" />Ajustes</button>
      </aside>
      {settingsOpen && <div className="rosa-settings-panel fixed bottom-24 left-[5.75rem] z-50 w-64 rounded-2xl border border-border p-4 shadow-2xl">
        <div className="mb-3"><p className="text-sm font-semibold text-foreground">Preferências</p><p className="text-xs text-muted-foreground">Personalize seu espaço de escrita.</p></div>
        <button type="button" onClick={toggleTheme} className="flex w-full items-center justify-between rounded-xl border border-border bg-background/70 px-3 py-3 text-sm text-foreground hover:bg-accent"><span className="flex items-center gap-2">{dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{dark ? "Tema escuro" : "Tema claro"}</span><span className="text-xs text-muted-foreground">Alternar</span></button>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Mais opções de aparência e organização podem ser adicionadas aqui.</p>
      </div>}
    </>
  );
}