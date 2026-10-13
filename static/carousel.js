(() => {
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const pad = (n) => String(n).padStart(2, '0');
	document.querySelectorAll('[data-carousel]').forEach((root) => {
		const track = root.querySelector('[data-track]');
		const slides = [...root.querySelectorAll('[data-slide]')];
		const counter = root.querySelector('[data-counter]');
		const dots = [...root.querySelectorAll('[data-dot]')];
		let active = 0;
		let onScreen = false;
		root.querySelector('[data-controls]').hidden = false;
		root.classList.add('is-enhanced');
		if (reduce) root.querySelectorAll('video').forEach((v) => (v.controls = true));

		// Videos play only when their slide is active and the carousel is on screen.
		const sync = () =>
			slides.forEach((s, j) => {
				const v = s.querySelector('video');
				if (!v) return;
				if (onScreen && j === active && !reduce) v.play().catch(() => {});
				else v.pause();
			});
		const setActive = (i) => {
			active = i;
			counter.textContent = `FIG. ${pad(i + 1)} / ${pad(slides.length)}`;
			dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i)));
			slides.forEach((s, j) => s.toggleAttribute('data-active', j === i));
			sync();
		};
		// Several slides can be fully visible on wide screens, so "active" is the one nearest the centre.
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
			const s = slides[Math.max(0, Math.min(slides.length - 1, i))];
			track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
		};

		root.querySelector('[data-prev]').addEventListener('click', () => go(active - 1));
		root.querySelector('[data-next]').addEventListener('click', () => go(active + 1));
		dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
		track.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
				e.preventDefault();
				go(active + (e.key === 'ArrowRight' ? 1 : -1));
			}
		});
		let raf = 0;
		track.addEventListener(
			'scroll',
			() => {
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(() => {
					const i = nearest();
					if (i !== active) setActive(i);
				});
			},
			{ passive: true }
		);
		new IntersectionObserver(
			([e]) => {
				onScreen = e.isIntersecting;
				sync();
			},
			{ threshold: 0.25 }
		).observe(root);
		setActive(nearest());
	});
})();
