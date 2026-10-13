// @ts-nocheck — plain browser script, served as-is (was static/, never type-checked)
(() => {
	document.documentElement.classList.add('draw-ready');
	const figs = document.querySelectorAll('[data-draw]');
	const draw = (el) => el.setAttribute('data-drawn', '');
	if (!('IntersectionObserver' in window)) {
		figs.forEach(draw);
	} else {
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						draw(e.target);
						io.unobserve(e.target);
					}
				}
			},
			{ threshold: 0.35 }
		);
		figs.forEach((f) => io.observe(f));
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
