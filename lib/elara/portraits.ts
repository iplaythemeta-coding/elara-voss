import { norm } from "./text";
import type { PortraitId, Turn } from "./types";

export type Portrait = {
  id: PortraitId;
  src: string;
  label: string;
  note: string;
};

export const PORTRAITS: readonly Portrait[] = [
  {
    id: "studio",
    src: "/portraits/elara-studio.jpg",
    label: "Studio",
    note: "Silk blouse, soft light, the look she uses when a scene is just beginning.",
  },
  {
    id: "golden-hour",
    src: "/portraits/elara-golden-hour.jpg",
    label: "Golden hour",
    note: "Wind, a dark coat, the hour when a face keeps a secret.",
  },
  {
    id: "city",
    src: "/portraits/elara-city.jpg",
    label: "Between takes",
    note: "Street, coffee, tailored coat. She looks like she is late for a rehearsal she invented.",
  },
  {
    id: "cinematic",
    src: "/portraits/elara-cinematic.jpg",
    label: "Film still",
    note: "Off-camera gaze. The interesting thing is rarely the lens.",
  },
] as const;

const ORDER: PortraitId[] = ["studio", "golden-hour", "city", "cinematic"];

export function portraitById(id: PortraitId): Portrait {
  return PORTRAITS.find((portrait) => portrait.id === id) ?? PORTRAITS[0];
}

export function choosePortrait(message: string, history: Turn[]): PortraitId {
  const n = norm(message);
  if (/\b(golden|sunset|outdoor)\b/.test(n) || n.includes("golden hour")) return "golden-hour";
  if (/\b(city|street|coffee|café|cafe)\b/.test(n)) return "city";
  if (/\b(cinematic|dramatic|film still|off-camera|off camera)\b/.test(n)) return "cinematic";
  if (/\b(another|different look|other one|something else)\b/.test(n)) {
    return ORDER[(history.length + 1) % ORDER.length];
  }
  return "studio";
}

export function portraitLine(id: PortraitId): string {
  switch (id) {
    case "golden-hour":
      return "Different light. Same person. Wind, a dark coat, the hour when everyone looks as if they have a secret. Freckles included. I don't change my bones between scenes.";
    case "city":
      return "Street, coffee, tailored coat. I look like I'm between takes, which is more honest than a poster. Still the same face. Still no body to bring to the café.";
    case "cinematic":
      return "This is the performance still. I look slightly off-camera because the interesting thing is rarely the lens. Soft light, dark clothes, the same eyes, the same freckles.";
    default:
      return "This is the version of me the camera likes. Silk, soft light, the look that suggests I already know the last line. I don't have a body. I do have a rather consistent face.";
  }
}
