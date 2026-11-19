import { NOTE_COLORS, type NoteColor } from "@/lib/notes-model";
import { cn } from "@/lib/utils";

import { NOTE_COLOR_BG, NOTE_COLOR_LABEL } from "./note-colors";

export function ColorPicker({
  value,
  onChange,
}: {
  value: NoteColor;
  onChange: (c: NoteColor) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Cor do bloco">
      {NOTE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={NOTE_COLOR_LABEL[c]}
          title={NOTE_COLOR_LABEL[c]}
          onClick={() => onChange(c)}
          className={cn(
            "h-6 w-6 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
            NOTE_COLOR_BG[c],
            value === c && "ring-2 ring-ring",
          )}
        />
      ))}
    </div>
  );
}
