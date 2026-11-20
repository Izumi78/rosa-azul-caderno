import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock3, Plus, Sparkles, NotebookPen, Trash2 } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notesActions } from "@/lib/notes-store";

type AgendaItem = {
  id: string;
  title: string;
  details: string;
  date: string;
  kind: "appointment" | "note";
  noteId?: string;
};

const STORAGE_KEY = "rosa-azul:agenda:v1";
const dateKey = (date: Date) => format(date, "yyyy-MM-dd");

export function HomeCalendar() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [selected, setSelected] = useState<Date>(startOfDay(new Date()));
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [time, setTime] = useState("09:00");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((item) => item && typeof item.id === "string" && typeof item.title === "string" && typeof item.date === "string"));
      }
    } catch { /* mantém a agenda vazia se o armazenamento estiver indisponível */ }
  }, []);

  const save = (next: AgendaItem[]) => {
    setItems(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* segue funcionando em memória */ }
  };

  const selectedItems = useMemo(
    () => items.filter((item) => item.date.slice(0, 10) === dateKey(selected)).sort((a, b) => a.date.localeCompare(b.date)),
    [items, selected],
  );
  const upcoming = useMemo(
    () => items.filter((item) => parseISO(item.date) >= startOfDay(new Date())).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4),
    [items],
  );
  const markedDays = useMemo(() => items.map((item) => parseISO(item.date)), [items]);

  const createNoteForDay = () => {
    const noteTitle = window.prompt("Qual será o título deste bloco?", "Anotações de " + format(selected, "dd/MM/yyyy"));
    if (!noteTitle?.trim()) return;
    const note = notesActions.create({ title: noteTitle.trim(), description: "Criado pela agenda em " + format(selected, "dd/MM/yyyy"), color: "roxo" });
    const entry: AgendaItem = { id: crypto.randomUUID(), title: note.title, details: "Bloco de notas deste dia", date: dateKey(selected) + "T12:00:00", kind: "note", noteId: note.id };
    save([...items, entry]);
    void navigate({ to: "/nota/$id", params: { id: note.id } });
  };

  const addAppointment = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const date = dateKey(selected) + "T" + time + ":00";
    if (parseISO(date) < new Date()) {
      window.alert("Escolha um horário futuro para o compromisso.");
      return;
    }
    save([...items, { id: crypto.randomUUID(), title: title.trim(), details: details.trim(), date, kind: "appointment" }]);
    setTitle("");
    setDetails("");
    setShowForm(false);
  };

  const removeItem = (id: string) => save(items.filter((item) => item.id !== id));

  return (
    <section className="rosa-agenda-panel mt-7 rounded-[1.8rem] border p-4 shadow-2xl sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="rosa-agenda-eyebrow"><Sparkles className="inline h-3.5 w-3.5" /> SEU TEMPO, SUAS IDEIAS</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-white"><CalendarDays className="h-5 w-5 text-violet-300" /> Agenda inteligente</h2>
          <p className="mt-1 text-sm text-violet-100/60">Crie blocos por data e não perca seus próximos compromissos.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-violet-100/70">{items.length} {items.length === 1 ? "item salvo" : "itens salvos"}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,.95fr)]">
        <div className="rosa-agenda-calendar rounded-2xl border border-white/10 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <div><p className="text-xs uppercase tracking-[.16em] text-violet-200/55">Data selecionada</p><p className="mt-1 font-medium text-white">{format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p></div>
            <button type="button" onClick={() => setSelected(startOfDay(new Date()))} className="text-xs text-violet-300 hover:text-white">Hoje</button>
          </div>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => date && setSelected(date)}
            modifiers={{ hasAgenda: markedDays }}
            modifiersClassNames={{ hasAgenda: "rosa-calendar-has-agenda" }}
            locale={ptBR}
            className="mx-auto w-full [--cell-size:2.65rem] text-violet-100"
            disabled={undefined}
          />
          <div className="mt-1 flex items-center gap-2 px-2 text-[11px] text-violet-200/55"><span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Dias com notas ou compromissos</div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rosa-agenda-day rounded-2xl border border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-white">Neste dia</h3>
              <span className="text-xs text-violet-200/55">{selectedItems.length} item(ns)</span>
            </div>
            {selectedItems.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-sm text-violet-100/45">Nada marcado para esta data. Que tal planejar algo?</p> : <div className="space-y-2">
              {selectedItems.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.045] p-3">
                <span className="mt-0.5 rounded-lg bg-violet-400/15 p-2 text-violet-200">{item.kind === "note" ? <NotebookPen className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{item.title}</p><p className="mt-0.5 text-xs text-violet-100/55">{item.kind === "note" ? "Bloco de notas" : format(parseISO(item.date), "HH:mm") + " · Compromisso"}</p>{item.details && <p className="mt-1 text-xs text-violet-100/45">{item.details}</p>}{item.noteId && <button type="button" onClick={() => void navigate({ to: "/nota/$id", params: { id: item.noteId! } })} className="mt-2 text-xs text-violet-300 hover:text-white">Abrir bloco →</button>}</div>
                <button type="button" onClick={() => removeItem(item.id)} aria-label="Remover item da agenda" className="rounded-lg p-1.5 text-violet-200/40 hover:bg-white/10 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>)}
            </div>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" onClick={createNoteForDay} className="h-auto min-h-10 rounded-xl bg-violet-500 text-white hover:bg-violet-400"><NotebookPen className="h-4 w-4" /> Criar bloco</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm((v) => !v)} className="h-auto min-h-10 rounded-xl border-white/15 bg-white/5 text-violet-100 hover:bg-white/10"><Plus className="h-4 w-4" /> Compromisso</Button>
            </div>
            {showForm && <form onSubmit={addAppointment} className="mt-3 space-y-2 rounded-xl border border-violet-300/15 bg-black/15 p-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do compromisso" maxLength={100} required className="border-white/10 bg-white/5 text-white placeholder:text-violet-100/35" />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="border-white/10 bg-white/5 text-white" />
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Detalhes (opcional)" rows={2} maxLength={300} className="border-white/10 bg-white/5 text-white placeholder:text-violet-100/35" />
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-violet-200">Cancelar</Button><Button type="submit" className="bg-violet-500 text-white hover:bg-violet-400">Salvar compromisso</Button></div>
            </form>}
          </div>
          <div className="rosa-agenda-upcoming rounded-2xl border border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">Próximos avisos</h3><span className="text-[10px] uppercase tracking-wider text-violet-200/45">Agenda</span></div>
            {upcoming.length === 0 ? <p className="text-sm text-violet-100/45">Seus próximos compromissos aparecerão aqui.</p> : <div className="space-y-2">
              {upcoming.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/[.045] px-3 py-2.5">
                <div className="min-w-[48px] rounded-lg bg-violet-400/15 px-2 py-1 text-center"><strong className="block text-sm text-white">{format(parseISO(item.date), "dd")}</strong><small className="text-[9px] uppercase text-violet-200/60">{format(parseISO(item.date), "MMM", { locale: ptBR })}</small></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm text-violet-50">{item.title}</p><p className="text-[11px] text-violet-200/45">{item.kind === "note" ? "Bloco" : format(parseISO(item.date), "HH:mm") + " · Compromisso"}</p></div>
              </div>)}
            </div>}
          </div>
        </div>
      </div>
    </section>
  );
}
