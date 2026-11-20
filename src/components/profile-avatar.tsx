export function ProfileAvatar() {
  return (
    <div className="rosa-profile flex items-center gap-2.5 rounded-2xl px-2 py-2" title="Perfil de Davi">
      <span className="rosa-profile-fallback flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">D</span>
      <span className="min-w-0 text-left"><strong className="block truncate text-xs font-semibold text-foreground">Davi</strong><small className="block text-[10px] text-muted-foreground">Meu perfil</small></span>
    </div>
  );
}
