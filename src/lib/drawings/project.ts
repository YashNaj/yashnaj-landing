// Orthographic 3D for the story drawings: rendered at build time in the final pose; models.js re-projects during the turn.
export type Vec3 = [number, number, number];
export type Matrix = [number, number, number, number, number, number];
export interface Pose { point(v: Vec3): Vec3; plane(o: Vec3, u?: Vec3, v?: Vec3): Matrix }
export interface Edge { pts: Vec3[]; cls?: string; w?: number; part?: string }

const R = Math.PI / 180;
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Yaw about the vertical axis, then pitch about the horizontal, around `centre`; returns [x, y, depth] (depth > 0 is nearer). */
export const pose = (yawDeg: number, pitchDeg: number, [cx, cy]: [number, number]): Pose => {
	const cyw = Math.cos(yawDeg * R), syw = Math.sin(yawDeg * R), cp = Math.cos(pitchDeg * R), sp = Math.sin(pitchDeg * R);
	const point = ([x, y, z]: Vec3): Vec3 => {
		const X = x - cx, Y = y - cy;
		const X1 = X * cyw + z * syw, Z1 = -X * syw + z * cyw;
		return [cx + X1, cy + Y * cp - Z1 * sp, Y * sp + Z1 * cp];
	};
	// local (s, t) on the plane through o spanned by u, v → view, as one affine matrix (exact for orthographic)
	const plane = (o: Vec3, u: Vec3 = [1, 0, 0], v: Vec3 = [0, 1, 0]): Matrix => {
		const p0 = point(o), pu = point(add(o, u)), pv = point(add(o, v));
		return [pu[0] - p0[0], pu[1] - p0[1], pv[0] - p0[0], pv[1] - p0[1], p0[0], p0[1]];
	};
	return { point, plane };
};

export const edgePath = (p: Pose, pts: Vec3[]) => 'M' + pts.map((v) => { const q = p.point(v); return `${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }).join('L');
export const matrixAttr = (m: Matrix) => `matrix(${m.map((n) => +n.toFixed(4)).join(' ')})`;

/** Depth-weighted stroke widths: nearer edges read heavier; an explicit w wins. */
export const weigh = (p: Pose, edges: Edge[], half: number): Edge[] =>
	edges.map((e) => {
		if (e.w !== undefined) return e;
		const z = e.pts.reduce((s, v) => s + p.point(v)[2], 0) / e.pts.length;
		const base = e.cls?.includes('dim') ? 1.05 : 1.3;
		return { ...e, w: +(base + 0.45 * clamp(z / half, -1, 1)).toFixed(2) };
	});

export const roundedRect = (x: number, y: number, w: number, h: number, r: number, z: number, seg = 6): Vec3[] => {
	const pts: Vec3[] = [];
	const corners: [number, number, number][] = [[x + r, y + r, 180], [x + w - r, y + r, 270], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90]];
	for (const [cx, cy, a0] of corners)
		for (let i = 0; i <= seg; i++) { const a = (a0 + (i * 90) / seg) * R; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); }
	return [...pts, pts[0]];
};
export const ring = (cx: number, cy: number, r: number, z: number, n = 16): Vec3[] =>
	Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i * 2 * Math.PI) / n), cy + r * Math.sin((i * 2 * Math.PI) / n), z] as Vec3).map((v, i, a) => (i === n ? a[0] : v));
export const rectXZ = (x0: number, x1: number, y: number, z0: number, z1: number): Vec3[] => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]];
export const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Vec3[][] => {
	const c = (i: number): Vec3 => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
	const e: Vec3[][] = [];
	for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) e.push([c(i), c(i | b)]);
	return e;
};
export const band = (a: Vec3[], b: Vec3[], every = 2): Vec3[][] => a.flatMap((v, i) => (i % every === 0 && i < b.length ? [[v, b[i]]] : []));
