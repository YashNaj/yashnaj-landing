import { describe, expect, it } from 'vitest';
import { band, box, edgePath, matrixAttr, pose, ring, roundedRect, weigh, type Vec3 } from '../../src/lib/drawings/project';

describe('pose', () => {
	it('identity pose maps points to themselves', () => {
		const p = pose(0, 0, [200, 150]);
		expect(p.point([10, 20, 5]).slice(0, 2)).toEqual([10, 20]);
	});
	it('90° yaw turns +z into +x', () => {
		const [x, y] = pose(90, 0, [0, 0]).point([0, 0, 10]);
		expect(x).toBeCloseTo(10);
		expect(y).toBeCloseTo(0);
	});
	it('plane() agrees with point() for points on that plane', () => {
		const p = pose(-30, 10, [200, 150]);
		const [a, b, c, d, e, f] = p.plane([0, 0, 8]);
		for (const [x, y] of [[130, 20], [270, 280], [200, 184]]) {
			const q = p.point([x, y, 8]);
			expect(a * x + c * y + e).toBeCloseTo(q[0], 6);
			expect(b * x + d * y + f).toBeCloseTo(q[1], 6);
		}
	});
	it('plane() handles a horizontal plane (u = x, v = z)', () => {
		const p = pose(-25, 20, [200, 150]);
		const m = p.plane([0, 196, 0], [1, 0, 0], [0, 0, 1]);
		const q = p.point([60, 196, -30]);
		expect(m[0] * 60 + m[2] * -30 + m[4]).toBeCloseTo(q[0], 6);
		expect(m[1] * 60 + m[3] * -30 + m[5]).toBeCloseTo(q[1], 6);
	});
});

describe('shapes', () => {
	it('roundedRect and ring are closed', () => {
		for (const s of [roundedRect(130, 20, 140, 260, 24, 8), ring(232, 58, 13, -8)]) expect(s.at(-1)).toEqual(s[0]);
	});
	it('box has 12 edges and band connects every n-th point', () => {
		expect(box(0, 1, 0, 1, 0, 1)).toHaveLength(12);
		const a: Vec3[] = [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1]];
		const b = a.map(([x, y]) => [x, y, -1] as Vec3);
		expect(band(a, b, 2)).toEqual([[[0, 0, 1], [0, 0, -1]], [[2, 0, 1], [2, 0, -1]]]);
	});
});

describe('output', () => {
	it('edgePath and matrixAttr are stable strings', () => {
		const p = pose(0, 0, [0, 0]);
		expect(edgePath(p, [[1, 2, 0], [3.14159, 4, 0]])).toBe('M1.0 2.0L3.1 4.0');
		expect(matrixAttr([1, 0, 0, 1, 2.123456, 3])).toBe('matrix(1 0 0 1 2.1235 3)');
	});
	it('weigh: nearer edges are heavier, explicit widths are kept', () => {
		const p = pose(0, 0, [0, 0]);
		const [near, far, fixed] = weigh(p, [{ pts: [[0, 0, 8], [1, 0, 8]] }, { pts: [[0, 0, -8], [1, 0, -8]] }, { pts: [[0, 0, -8]], w: 1.35 }], 8);
		expect(near.w).toBeGreaterThan(far.w!);
		expect(fixed.w).toBe(1.35);
	});
});
