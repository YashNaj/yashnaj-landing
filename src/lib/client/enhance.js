// @ts-nocheck — plain browser script, served as-is (was static/, never type-checked)
(() => {
	document.documentElement.classList.add('draw-ready');
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const fine = matchMedia('(pointer: fine)').matches;
	const restored = document.documentElement.classList.contains('restored'); // Back/Forward: show finished
	const scrub = document.documentElement.classList.contains('scrub'); // scroll drives home drawings (app.html)
	const WINDOW = 65; // strokes and parts draw over the first 65% of a sheet's scroll range
	const OVERLAP = 0.35; // the next stroke starts when the previous one is 35% drawn
	const START = 260; // construction prelude before the first stroke
	const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
	const SVG = 'http://www.w3.org/2000/svg';

	// Labels type on letter by letter.
	const splitType = (fig) =>
		fig.querySelectorAll('text.type').forEach((t) => {
			const s = t.textContent;
			t.textContent = '';
			t.style.setProperty('--cn', String(s.length));
			[...s].forEach((ch, i) => {
				const span = document.createElementNS(SVG, 'tspan');
				span.textContent = ch;
				span.style.setProperty('--ci', String(i));
				t.appendChild(span);
			});
		});

	// Start time (--t) for every part; duration (--d) for strokes from their real length;
	// and the same order as scroll slots (--a0/--a1, % of the sheet's range) for scrub mode.
	const choreograph = (fig) => {
		fig.querySelectorAll('.c').forEach((el, i) => el.style.setProperty('--t', `${i * 40}ms`));
		let t = START;
		let end = START;
		const parts = [];
		for (const el of fig.querySelectorAll('.stroke, .after, .type, .stamp, .cursor, .unlock, .slide-out, .grow, [data-count]')) {
			el.style.setProperty('--t', `${Math.round(t)}ms`);
			const isStroke = el.classList.contains('stroke') && 'getTotalLength' in el;
			const d = isStroke ? clamp(el.getTotalLength() * 2.4, 280, 1400) : 700;
			if (isStroke) el.style.setProperty('--d', `${Math.round(d)}ms`);
			parts.push([el, t, d]);
			end = Math.max(end, t + d);
			t += isStroke ? d * OVERLAP : 90;
		}
		for (const [el, t0, d] of parts) {
			const count = el.hasAttribute('data-count'); // counts land with the callouts, at their final value
			el.style.setProperty('--a0', count ? '85' : ((t0 / end) * WINDOW).toFixed(1));
			el.style.setProperty('--a1', count ? '100' : (((t0 + d) / end) * WINDOW).toFixed(1));
		}
		return end;
	};

	// Dimension values count up when they appear.
	const countUp = (el) => {
		const to = Number(el.dataset.count);
		const pre = el.dataset.prefix ?? '';
		const post = el.dataset.suffix ?? '';
		const delay = parseFloat(el.style.getPropertyValue('--t')) || 0;
		setTimeout(() => {
			const t0 = performance.now();
			const tick = (now) => {
				const p = Math.min(1, (now - t0) / 700);
				el.textContent = pre + Math.round(to * (1 - (1 - p) ** 3)) + post;
				if (p < 1) requestAnimationFrame(tick);
			};
			el.textContent = pre + '0' + post;
			requestAnimationFrame(tick);
		}, delay);
	};

	const figs = [...document.querySelectorAll('[data-draw]')];
	const state = new Map();
	const setLive = (fig) => {
		const s = state.get(fig);
		fig.toggleAttribute('data-live', !reduce && s.done && s.visible);
	};
	const draw = (fig) => {
		const s = state.get(fig);
		if (fig.hasAttribute('data-drawn') || reduce || restored) {
			fig.setAttribute('data-drawn', '');
			s.done = true;
			return setLive(fig);
		}
		splitType(fig);
		const end = choreograph(fig);
		fig.querySelectorAll('[data-count]').forEach(countUp);
		requestAnimationFrame(() => requestAnimationFrame(() => fig.setAttribute('data-drawn', '')));
		setTimeout(() => {
			s.done = true;
			setLive(fig);
		}, end + 200);
	};

	figs.forEach((f) => state.set(f, { done: false, visible: false, started: false }));
	// Scrub mode: slots are laid out up front; scroll does the drawing, so figures count as done (live = on screen).
	if (scrub)
		figs.forEach((f) => {
			if (f.hasAttribute('data-drawn')) return;
			splitType(f);
			choreograph(f);
			Object.assign(state.get(f), { done: true, started: true });
		});
	if (!('IntersectionObserver' in window)) {
		figs.forEach((f) => {
			state.get(f).visible = true;
			draw(f);
		});
	} else {
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					const s = state.get(e.target);
					s.visible = e.intersectionRatio > 0;
					if (e.intersectionRatio >= 0.35 && !s.started) {
						s.started = true;
						draw(e.target);
					}
					setLive(e.target);
				}
			},
			{ threshold: [0, 0.35] }
		);
		figs.forEach((f) => io.observe(f));
	}

	// Depth parallax for fine pointers only.
	if (fine && !reduce) {
		figs.forEach((fig) => {
			let raf = 0;
			fig.addEventListener('pointermove', (e) => {
				const r = fig.getBoundingClientRect();
				const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
				const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(() => {
					fig.style.setProperty('--px', x.toFixed(3));
					fig.style.setProperty('--py', y.toFixed(3));
				});
			});
			fig.addEventListener('pointerleave', () => {
				fig.style.setProperty('--px', '0');
				fig.style.setProperty('--py', '0');
			});
		});
	}

	// Section heads draw their rule; [data-reveal] blocks rise in. Both once.
	const reveals = document.querySelectorAll('[data-reveal], [data-reveal-head]');
	if (!('IntersectionObserver' in window) || reduce || restored) reveals.forEach((el) => el.setAttribute('data-revealed', ''));
	else {
		const ro = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					e.target.setAttribute('data-revealed', '');
					ro.unobserve(e.target);
				}
			},
			{ threshold: 0.2 }
		);
		reveals.forEach((el) => ro.observe(el));
	}

	document.querySelectorAll('[data-copy-root]').forEach((root) => {
		const btn = root.querySelector('[data-testid="copy-command"]');
		const code = root.querySelector('code');
		const status = root.querySelector('[data-testid="copy-status"]');
		let clear = 0;
		const say = (msg) => {
			clearTimeout(clear);
			status.textContent = '';
			requestAnimationFrame(() => (status.textContent = msg)); // empty → text so it re-announces
			clear = setTimeout(() => (status.textContent = ''), 2500);
		};
		btn.addEventListener('click', async () => {
			try {
				if (!navigator.clipboard) throw new Error('clipboard unavailable');
				await navigator.clipboard.writeText(code.textContent);
				say('Copied');
			} catch {
				const range = document.createRange();
				range.selectNodeContents(code);
				const sel = window.getSelection();
				sel?.removeAllRanges();
				sel?.addRange(range);
				say('Press ⌘C / Ctrl+C');
			}
		});
	});
})();
