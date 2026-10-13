// @ts-nocheck — plain browser script, served as-is (was static/, never type-checked)
(() => {
	document.documentElement.classList.add('draw-ready');
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const fine = matchMedia('(pointer: fine)').matches;
	const OVERLAP = 0.35; // the next stroke starts when the previous one is 35% drawn
	const START = 260; // construction prelude before the first stroke
	const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
	const SVG = 'http://www.w3.org/2000/svg';

	// Labels type on letter by letter.
	const splitType = (fig) =>
		fig.querySelectorAll('text.type').forEach((t) => {
			const s = t.textContent;
			t.textContent = '';
			[...s].forEach((ch, i) => {
				const span = document.createElementNS(SVG, 'tspan');
				span.textContent = ch;
				span.style.setProperty('--ci', String(i));
				t.appendChild(span);
			});
		});

	// Start time (--t) for every part; duration (--d) for strokes from their real length.
	const choreograph = (fig) => {
		fig.querySelectorAll('.c').forEach((el, i) => el.style.setProperty('--t', `${i * 40}ms`));
		let t = START;
		let end = START;
		for (const el of fig.querySelectorAll('.stroke, .after, .type, .stamp, .cursor, .unlock, .slide-out, .grow, [data-count]')) {
			el.style.setProperty('--t', `${Math.round(t)}ms`);
			if (el.classList.contains('stroke') && 'getTotalLength' in el) {
				const d = clamp(el.getTotalLength() * 2.4, 280, 1400);
				el.style.setProperty('--d', `${Math.round(d)}ms`);
				end = Math.max(end, t + d);
				t += d * OVERLAP;
			} else {
				end = Math.max(end, t + 700);
				t += 90;
			}
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
		if (fig.hasAttribute('data-drawn') || reduce) {
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
