// @ts-nocheck — plain browser script (home only): turns 3D story drawings into their build-time final pose.
(() => {
	const R = Math.PI / 180;
	const html = document.documentElement;
	if (matchMedia('(prefers-reduced-motion: reduce)').matches || html.classList.contains('restored')) return;
	const nums = (s) => s.split(',').map(Number);
	for (const svg of document.querySelectorAll('svg[data-model]')) {
		const fig = svg.closest('[data-draw]');
		if (!fig || fig.hasAttribute('data-drawn')) continue;
		const [cx, cy] = nums(svg.dataset.centre);
		const from = nums(svg.dataset.from), to = nums(svg.dataset.to);
		const edges = [...svg.querySelectorAll('[data-pts]')].map((el) => [el, JSON.parse(el.dataset.pts)]);
		const planes = [...svg.querySelectorAll('[data-plane]')].map((el) => [el, nums(el.dataset.plane), el.getAttribute('transform')]);
		const anchors = [...svg.querySelectorAll('[data-anchor]')].map((el) => [el, nums(el.dataset.anchor)]);
		const ssr = [...edges.map(([el]) => [el, 'd', el.getAttribute('d')]), ...planes.map(([el, , t]) => [el, 'transform', t]), ...anchors.map(([el]) => [el, el.tagName === 'polyline' ? 'points' : 'd', el.getAttribute(el.tagName === 'polyline' ? 'points' : 'd')])];
		const set = (yaw, pitch) => {
			const a = Math.cos(yaw * R), b = Math.sin(yaw * R), c = Math.cos(pitch * R), d = Math.sin(pitch * R);
			const P = ([x, y, z]) => { const X = x - cx, Y = y - cy, Z1 = -X * b + z * a; return [cx + X * a + z * b, cy + Y * c - Z1 * d]; };
			const f = (q) => q.map((n) => n.toFixed(1));
			for (const [el, pts] of edges) el.setAttribute('d', 'M' + pts.map((p) => f(P(p)).join(' ')).join('L'));
			for (const [el, [ox, oy, oz, ux, uy, uz, vx, vy, vz]] of planes) {
				const p0 = P([ox, oy, oz]), pu = P([ox + ux, oy + uy, oz + uz]), pv = P([ox + vx, oy + vy, oz + vz]);
				el.setAttribute('transform', `matrix(${pu[0] - p0[0]} ${pu[1] - p0[1]} ${pv[0] - p0[0]} ${pv[1] - p0[1]} ${p0[0]} ${p0[1]})`);
			}
			for (const [el, p] of anchors) {
				const q = f(P(p));
				if (el.tagName === 'polyline') el.setAttribute('points', el.getAttribute('points').replace(/^\S+/, q.join(',')));
				else el.setAttribute('d', el.getAttribute('d').replace(/^M\s*[-\d.]+[ ,]+[-\d.]+/, 'M' + q.join(' ')));
			}
		};
		set(...from); // hidden until drawn, so the jump from the SSR pose is never seen
		fig.addEventListener('draw:start', (e) => {
			const ms = Math.min(e.detail.end, 1800), t0 = performance.now();
			const tick = (now) => {
				const p = Math.min(1, (now - t0) / ms), k = 1 - (1 - p) ** 3;
				if (p < 1) { set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k); requestAnimationFrame(tick); }
				else for (const [el, attr, v] of ssr) el.setAttribute(attr, v); // land exactly on the build-time pose
			};
			requestAnimationFrame(tick);
		}, { once: true });
		// a draw that started before this script ran keeps the SSR pose
		if (fig.hasAttribute('data-drawn')) for (const [el, attr, v] of ssr) el.setAttribute(attr, v);
	}
})();
