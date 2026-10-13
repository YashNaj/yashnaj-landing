// @ts-nocheck — plain browser script, served as-is (was static/, never type-checked)
(() => {
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const pad = (n) => String(n).padStart(2, '0');
	document.querySelectorAll('[data-carousel]').forEach((root) => {
		const track = root.querySelector('[data-track]');
		const slides = [...root.querySelectorAll('[data-slide]')];
		const counter = root.querySelector('[data-counter]');
		const dots = [...root.querySelectorAll('[data-dot]')];
		const clamp = (i) => Math.max(0, Math.min(slides.length - 1, i));
		let active = 0;
		let target = null; // slide a button/key asked for, until the scroll arrives
		const visible = new Set(); // slides ≥ 60% inside the viewport (track clipping included)
		root.querySelector('[data-controls]').hidden = false;
		root.classList.add('is-enhanced');
		if (reduce) root.querySelectorAll('video').forEach((v) => (v.controls = true));

		const sync = () =>
			slides.forEach((s, j) => {
				const v = s.querySelector('video');
				if (!v) return;
				if (j === active && visible.has(s) && !reduce) v.play().catch(() => {});
				else v.pause();
			});
		const setActive = (i) => {
			active = i;
			counter.textContent = `FIG. ${pad(i + 1)} / ${pad(slides.length)}`;
			dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));
			slides.forEach((s, j) => s.toggleAttribute('data-active', j === i));
			sync();
		};
		const nearest = () => {
			const centre = track.scrollLeft + track.clientWidth / 2;
			let best = 0;
			let dist = Infinity;
			slides.forEach((s, i) => {
				const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - centre);
				if (d < dist) [best, dist] = [i, d];
			});
			return best;
		};
		const go = (i) => {
			target = clamp(i);
			const s = slides[target];
			track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
		};
		const step = (delta) => go((target ?? active) + delta);

		root.querySelector('[data-prev]').addEventListener('click', () => step(-1));
		root.querySelector('[data-next]').addEventListener('click', () => step(1));
		dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
		track.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
				e.preventDefault();
				step(e.key === 'ArrowRight' ? 1 : -1);
			}
		});
		// a hand on the track cancels any pending button target
		for (const ev of ['pointerdown', 'wheel', 'touchstart']) track.addEventListener(ev, () => (target = null), { passive: true });
		let raf = 0;
		track.addEventListener(
			'scroll',
			() => {
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(() => {
					const i = nearest();
					if (i === target) target = null;
					if (i !== active) setActive(i);
				});
			},
			{ passive: true }
		);
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) e.intersectionRatio >= 0.6 ? visible.add(e.target) : visible.delete(e.target);
				sync();
			},
			{ threshold: [0, 0.6] }
		);
		slides.forEach((s) => io.observe(s));
		setActive(nearest());
	});
})();
