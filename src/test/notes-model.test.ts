import { describe, expect, it } from "vitest";

import {
  addNote,
  connectedNotes,
  deleteNote,
  normalizeUrl,
  toggleConnection,
  type NotesData,
} from "@/lib/notes-model";

const empty: NotesData = { notes: [], connections: [] };

function twoNotes() {
  const a = addNote(empty, { title: "A", description: "" });
  const b = addNote(a.data, { title: "B", description: "" });
  return { data: b.data, a: a.note.id, b: b.note.id };
}

describe("board connections", () => {
  it("links two different notes", () => {
    const { data, a, b } = twoNotes();
    const next = toggleConnection(data, a, b);
    expect(next.connections).toHaveLength(1);
    expect(connectedNotes(next, b).map((n) => n.id)).toEqual([a]);
  });

  it("unlinks when the same pair is linked again in either direction", () => {
    const { data, a, b } = twoNotes();
    const linked = toggleConnection(data, a, b);
    expect(toggleConnection(linked, b, a).connections).toHaveLength(0);
  });

  it("never links a note to itself", () => {
    const { data, a } = twoNotes();
    expect(toggleConnection(data, a, a).connections).toHaveLength(0);
  });

  it("removes a note's connections when the note is deleted", () => {
    const { data, a, b } = twoNotes();
    const next = deleteNote(toggleConnection(data, a, b), a);
    expect(next.notes.map((n) => n.id)).toEqual([b]);
    expect(next.connections).toHaveLength(0);
  });
});

describe("notes", () => {
  it("gives an untitled note a default title", () => {
    expect(addNote(empty, { title: "  ", description: "" }).note.title).toBe("Sem título");
  });
});

describe("links", () => {
  it("adds https to bare domains", () => {
    expect(normalizeUrl("exemplo.com/artigo")).toBe("https://exemplo.com/artigo");
  });

  it("rejects text that is not a link", () => {
    expect(normalizeUrl("isso não é link")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("board placement", () => {
  it("places a new note where no other card sits", () => {
    let data: NotesData = empty;
    for (let i = 0; i < 6; i++) data = addNote(data, { title: `N${i}`, description: "" }).data;
    const spots = data.notes.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(spots).size).toBe(6);
  });
});
