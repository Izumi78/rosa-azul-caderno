import { UserRound } from "lucide-react";

const portrait = "data:image/jpeg;base64,BASE64_PLACEHOLDER";

export function ProfileAvatar() {
  return (
    <div className="rosa-profile flex items-center gap-2.5 rounded-2xl px-2 py-2" title="Perfil de Davi">
      <img src={portrait} alt="Foto de perfil de Davi" className="rosa-profile-photo h-9 w-9 shrink-0 rounded-full object-cover" />
      <span className="min-w-0 text-left"><strong className="block truncate text-xs font-semibold text-foreground">Davi</strong><small className="block text-[10px] text-muted-foreground">Meu perfil</small></span>
    </div>
  );
}
