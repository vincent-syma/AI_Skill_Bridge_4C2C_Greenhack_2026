const notesKey = (id: number | string) => `project-finish-notes:${id}`;

export function stashFinishNotes(id: number | string, notes: string) {
  sessionStorage.setItem(notesKey(id), notes);
}

export function readFinishNotes(id: number | string, fallback = "") {
  return sessionStorage.getItem(notesKey(id)) ?? fallback;
}

export function clearFinishNotes(id: number | string) {
  sessionStorage.removeItem(notesKey(id));
}

export function projectFinishHref(id: number | string) {
  return `/projects?select=${id}&finish=1`;
}

export const PROJECT_FINISH_PARAM = "finish";
