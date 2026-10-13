// @ts-nocheck — plain browser script (home only): turns 3D story drawings into their build-time final pose,
// and swings a hinged part (data-hinge) in time with the drawing's CSS loop.
(() => {
	const R = Math.PI / 180;
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const restored = document.documentElement.classList.contains('restored');
	const nums = (s) => s.split(',').map(Number);
	const ease = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
	for (const svg of document.querySelectorAll('svg[data-model]')) {
		const fig = svg.closest('[data-draw]');
		if (!fig) continue;
		const [cx, cy] = nums(svg.dataset.centre);
		const from = nums(svg.dataset.from), to = nums(svg.dataset.to);
		const hinge = svg.dataset.hinge && nums(svg.dataset.hinge); // axis x, axis z, max degrees
		const attr = (el) => (el.tagName === 'polyline' ? 'points' : el.hasAttribute('data-plane') ? 'transform' : 'd');
		const parts = [...svg.querySelectorAll('[data-pts], [data-plane], [data-anchor]')].map((el) => ({
			el,
			door: el.dataset.part === 'door',
			pts: el.dataset.pts && JSON.parse(el.dataset.pts),
			plane: el.dataset.plane && nums(el.dataset.plane),
			anchor: el.dataset.anchor && nums(el.dataset.anchor),
			ssr: el.getAttribute(attr(el))
		}));
		// project at (yaw, pitch); door points first rotate about the hinge's vertical axis by `swing` degrees
		const set = (yaw, pitch, swing = 0, onlyDoor = false) => {
			const a = Math.cos(yaw * R), b = Math.sin(yaw * R), c = Math.cos(pitch * R), d = Math.sin(pitch * R);
			const sa = Math.cos(swing * R), sb = Math.sin(swing * R);
			const P = ([x, y, z], door) => {
				if (door && swing) {
					const dx = x - hinge[0], dz = z - hinge[1];
					x = hinge[0] + dx * sa - dz * sb;
					z = hinge[1] + dx * sb + dz * sa;
				}
				const X = x - cx, Y = y - cy, Z1 = -X * b + z * a;
				return [cx + X * a + z * b, cy + Y * c - Z1 * d];
			};
			const f = (q) => q.map((n) => n.toFixed(1));
			for (const { el, door, pts, plane, anchor } of parts) {
				if (onlyDoor && !door) continue;
				if (pts) el.setAttribute('d', 'M' + pts.map((p) => f(P(p, door)).join(' ')).join('L'));
				else if (plane) {
					const [ox, oy, oz, ux, uy, uz, vx, vy, vz] = plane;
					const p0 = P([ox, oy, oz], door), pu = P([ox + ux, oy + uy, oz + uz], door), pv = P([ox + vx, oy + vy, oz + vz], door);
					el.setAttribute('transform', `matrix(${pu[0] - p0[0]} ${pu[1] - p0[1]} ${pv[0] - p0[0]} ${pv[1] - p0[1]} ${p0[0]} ${p0[1]})`);
				} else {
					const q = f(P(anchor, door));
					if (el.tagName === 'polyline') el.setAttribute('points', el.getAttribute('points').replace(/^\S+/, q.join(',')));
					else el.setAttribute('d', el.getAttribute('d').replace(/^M\s*[-\d.]+[ ,]+[-\d.]+/, 'M' + q.join(' ')));
				}
			}
		};
		const land = (onlyDoor = false) => { for (const p of parts) if (!onlyDoor || p.door) p.el.setAttribute(attr(p.el), p.ssr); };

		// the turn: from FROM into the build-time pose as the drawing draws (first visit only)
		if (!restored && !fig.hasAttribute('data-drawn')) {
			fig.addEventListener('draw:start', (e) => {
				// once the safety net has dropped html.js the drawing is already showing finished: leave it there
				if (!document.documentElement.classList.contains('js')) return;
				set(...from); // strokes are still hidden at this point (data-drawn lands two frames later)
				const ms = Math.min(e.detail.end, 1800), t0 = performance.now();
				const tick = (now) => {
					const p = Math.min(1, (now - t0) / ms), k = 1 - (1 - p) ** 3;
					if (p < 1) { set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k); requestAnimationFrame(tick); }
					else land(); // exactly the build-time pose
				};
				requestAnimationFrame(tick);
			}, { once: true });
		}

		// the swing: follows the drawing's loop clock (.st-clock) while it is live, shut otherwise
		if (hinge) {
			const clock = svg.querySelector('.st-clock');
			const curve = (p) => (p < 0.28 ? 0 : p < 0.4 ? ease((p - 0.28) / 0.12) : p < 0.7 ? 1 : p < 0.84 ? 1 - ease((p - 0.7) / 0.14) : 0);
			let raf = 0;
			const run = () => {
				const anim = clock.getAnimations()[0];
				if (anim) {
					const dur = anim.effect.getTiming().duration;
					set(to[0], to[1], hinge[2] * curve(((anim.currentTime ?? 0) % dur) / dur), true);
				}
				raf = requestAnimationFrame(run);
			};
			new MutationObserver(() => {
				const live = fig.hasAttribute('data-live');
				if (live && !raf) raf = requestAnimationFrame(run);
				if (!live && raf) { cancelAnimationFrame(raf); raf = 0; land(true); }
			}).observe(fig, { attributes: true, attributeFilter: ['data-live'] });
		}
	}
})();
