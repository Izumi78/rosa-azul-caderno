import { createFileRoute } from "@tanstack/react-router";
import { HomeCalendar } from "@/components/home-calendar";

export const Route = createFileRoute("/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Rosa Azul" }, { name: "description", content: "Sua agenda de notas e compromissos." }] }),
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <div className="rosa-calendar-page mx-auto min-h-[calc(100vh-4.5rem)] max-w-[1440px] px-5 pb-16 pt-8 sm:px-8">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-300">ROSA AZUL · ORGANIZAÇÃO</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Seu calendário</h1>
        <p className="mt-2 text-sm text-violet-100/65">Planeje seus dias, crie blocos e acompanhe seus próximos compromissos.</p>
      </header>
      <HomeCalendar />
    </div>
  );
}
