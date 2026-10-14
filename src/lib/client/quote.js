// @ts-nocheck — plain browser script, served as-is
// Quote form: send in place, show the result inline, never lose a lead. Turnstile loads only near the form.
(() => {
	const form = document.querySelector('[data-quote]');
	if (!form) return;
	const status = form.querySelector('[data-status]');
	const box = form.querySelector('[data-turnstile]');
	const btn = form.querySelector('button[type="submit"]');
	const email = form.dataset.email;

	// package buttons preselect what the visitor asked about
	document.querySelectorAll('a[data-need]').forEach((a) =>
		a.addEventListener('click', () => {
			const c = form.querySelector(`input[name="need"][value="${a.dataset.need}"]`);
			if (c) c.checked = true;
		})
	);

	let loading = false;
	const load = () => {
		if (loading) return;
		loading = true;
		window.onTurnstileLoad = () => window.turnstile.render(box, { sitekey: box.dataset.sitekey, theme: 'dark' });
		const s = document.createElement('script');
		s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
		s.async = true;
		document.head.appendChild(s);
	};
	if ('IntersectionObserver' in window) {
		const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (io.disconnect(), load()), { rootMargin: '400px' });
		io.observe(form);
	} else load();
	form.addEventListener('focusin', load);

	const say = (parts, kind) => {
		status.dataset.kind = kind;
		status.replaceChildren(...parts);
	};
	const mailto = () => {
		const d = new FormData(form);
		const body = [`Name: ${d.get('name')}`, `Business: ${d.get('business')}`, `Phone: ${d.get('phone')}`, `Needs: ${d.getAll('need').join(', ')}`, `Budget: ${d.get('budget')}`, '', d.get('message')].join('\n');
		const a = document.createElement('a');
		a.href = `mailto:${email}?subject=${encodeURIComponent('Quote request')}&body=${encodeURIComponent(body)}`;
		a.className = 'link-sweep';
		a.textContent = `email me at ${email}`;
		return a;
	};

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (btn.disabled) return;
		btn.disabled = true;
		form.querySelectorAll('[data-error-for]').forEach((p) => (p.textContent = ''));
		say(['Sending…'], 'busy');
		let res = null;
		try {
			const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json' } });
			res = await r.json();
		} catch (_) {}
		btn.disabled = false;
		const resetCheck = () => window.turnstile && window.turnstile.reset(box);
		if (res && res.ok) {
			form.reset();
			resetCheck();
			return say(['Thanks — I’ll reply within 24 hours.'], 'ok');
		}
		if (res && res.error === 'invalid' && res.fields) {
			for (const [k, m] of Object.entries(res.fields)) {
				const p = form.querySelector(`[data-error-for="${k}"]`);
				if (p) p.textContent = m;
			}
			return say(['Please fix the highlighted fields.'], 'error');
		}
		resetCheck();
		if (res && res.error === 'turnstile') return say(['The spam check didn’t pass. Try again, or ', mailto(), '.'], 'error');
		say(['Couldn’t send just now — ', mailto(), ' (your message is filled in).'], 'error');
	});
})();
