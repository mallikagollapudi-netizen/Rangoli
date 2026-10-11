export type Point = [number, number];
export type StrokeKind = "free" | "line";
export type Stroke = { color: string; width: number; kind: StrokeKind; points: Point[] };
export type GridLayout = "square" | "rotated" | "triangle";
export type GridConfig = {
  layout: GridLayout;
  rows: number;
  cols: number;
  area: [number, number, number, number]; // x, y, w, h
};
export type Artwork = {
  id: string;
  name: string;
  mode: "free" | "dot";
  grid?: GridConfig | null;
  background: string;
  width: number;
  height: number;
  strokes: Stroke[];
  created_at: string;
  updated_at: string;
};

// Content colours (identical in every theme): festive rangoli powders.
export const PALETTE = [
  "#FFFFFF", "#C62828", "#E53935", "#F57C00", "#FFB300", "#FDD835",
  "#2E7D32", "#7CB342", "#00838F", "#1565C0", "#283593", "#6A1B9A",
  "#AD1457", "#F06292", "#795548", "#212121",
];

// Canvas floors: earthy courtyard, cream, deep green.
export const FLOORS = ["#3D261D", "#FFF9F2", "#1E3A2B", "#1A1A1A"];

export const BRUSH_SIZES = [3, 6, 10, 16, 24];

export const MAX_GRID = 30;

export function dotColorFor(bg: string) {
  return bg === "#FFF9F2" ? "#8C6A55" : "#F5E6D3";
}

/** Unit-spaced dot coordinates (distance 1 between neighbours) for each layout. */
function unitDots(layout: GridLayout, rows: number, cols: number): Point[] {
  const pts: Point[] = [];
  if (layout === "triangle") {
    // Row 0: 1 dot. Row r>=1: 2r dots at half-integer offsets, so the
    // middle dots of each row align with the row above (1, 2, 4, 6...).
    pts.push([0, 0]);
    for (let r = 1; r < rows; r++) {
      const n = 2 * r;
      for (let k = 0; k < n; k++) pts.push([-(n - 1) / 2 + k, r]);
    }
    return pts;
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const u = j - (cols - 1) / 2;
      const v = i - (rows - 1) / 2;
      if (layout === "rotated") {
        pts.push([(u - v) / Math.SQRT2, (u + v) / Math.SQRT2]);
      } else {
        pts.push([u, v]);
      }
    }
  }
  return pts;
}

export function computeDots(grid: GridConfig): { dots: Point[]; spacing: number } {
  const [ax, ay, aw, ah] = grid.area;
  const unit = unitDots(grid.layout, grid.rows, grid.cols);
  const xs = unit.map((p) => p[0]);
  const ys = unit.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const bw = Math.max(...xs) - minX;
  const bh = Math.max(...ys) - minY;
  let s = Math.min(bw > 0 ? aw / bw : Infinity, bh > 0 ? ah / bh : Infinity);
  if (!isFinite(s)) s = Math.min(aw, ah) / 2;
  s = Math.min(s, Math.min(aw, ah) / 2);
  const cx = ax + aw / 2 - (minX + bw / 2) * s;
  const cy = ay + ah / 2 - (minY + bh / 2) * s;
  return { dots: unit.map(([x, y]) => [cx + x * s, cy + y * s]), spacing: s };
}

export function pathFromPoints(points: Point[], kind: StrokeKind): string {
  if (points.length === 0) return "";
  const [x0, y0] = points[0];
  if (points.length === 1) return `M${x0} ${y0} L${x0 + 0.01} ${y0}`;
  if (kind === "line" || points.length < 3) {
    return `M${x0} ${y0} ` + points.slice(1).map(([x, y]) => `L${x} ${y}`).join(" ");
  }
  let d = `M${x0} ${y0}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const [lx, ly] = points[points.length - 1];
  return d + ` L${lx} ${ly}`;
}
