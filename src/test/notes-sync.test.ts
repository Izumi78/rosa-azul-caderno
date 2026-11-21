import { describe, expect, it } from "vitest";

import { collectMediaIds, isOnlySampleData, mergeNotesData, sampleData, type Note, type NotesData } from "@/lib/notes-model";

function note(id: string, updatedAt: number, title = id): Note {
  return { id, title, description: "", content: "", color: "roxo", links: [], chat: [], position: { x: 0, y: 0 }, createdAt: 1, updatedAt };
}

describe("account sync merge", () => {
  it("keeps notes that exist only on this device and only in the account", () => {
    const local: NotesData = { notes: [note("a", 1)], connections: [] };
    const cloud: NotesData = { notes: [note("b", 1)], connections: [] };
    expect(mergeNotesData(local, cloud).notes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("keeps the most recently edited copy of the same note", () => {
    const local: NotesData = { notes: [note("a", 5, "novo")], connections: [] };
    const cloud: NotesData = { notes: [note("a", 2, "velho")], connections: [] };
    expect(mergeNotesData(local, cloud).notes[0]?.title).toBe("novo");
    expect(mergeNotesData(cloud, local).notes[0]?.title).toBe("novo");
  });

  it("drops duplicate board links and links to missing notes", () => {
    const local: NotesData = { notes: [note("a", 1), note("b", 1)], connections: [{ id: "1", from: "a", to: "b" }, { id: "2", from: "a", to: "zz" }] };
    const cloud: NotesData = { notes: [], connections: [{ id: "3", from: "b", to: "a" }] };
    expect(mergeNotesData(local, cloud).connections).toHaveLength(1);
  });

  it("recognises a notebook that only has the starter notes", () => {
    expect(isOnlySampleData(sampleData())).toBe(true);
    expect(isOnlySampleData({ notes: [note("x", 1)], connections: [] })).toBe(false);
  });

  it("finds photos and videos in text, cover and layout", () => {
    const n = { ...note("a", 1), content: "![f](rosa-media://abc-1)", coverImage: "rosa-media://cov-2", layoutElements: [{ id: "e", type: "video" as const, x: 0, y: 0, width: 1, height: 1, content: "rosa-media://vid-3" }] };
    expect(collectMediaIds([n]).sort()).toEqual(["abc-1", "cov-2", "vid-3"]);
  });
});
