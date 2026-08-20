export type SeatPlace = "bottom" | "bottom-right" | "right" | "top" | "left" | "bottom-left";

const LAYOUTS: Record<number, SeatPlace[]> = {
  1: ["bottom"],
  2: ["bottom", "top"],
  3: ["bottom", "right", "left"],
  4: ["bottom", "right", "top", "left"],
  5: ["bottom", "bottom-right", "top", "left", "bottom-left"],
  6: ["bottom", "bottom-right", "right", "top", "left", "bottom-left"],
};

export function placeFor(viewerIndex: number, seatIndex: number, count: number): SeatPlace {
  const layout = LAYOUTS[count] ?? LAYOUTS[4]!;
  const offset = (seatIndex - viewerIndex + count) % count;
  return layout[offset] ?? "bottom";
}
