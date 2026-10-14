<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { profile } from '$lib/data/site';
	import { BUDGETS, CAL_URL, NEEDS, TURNSTILE_SITE_KEY, also, faq, packages, steps, why } from '$lib/data/services';
	import quoteUrl from '$lib/client/quote.js?url';
</script>

<Seo
	title="Website design & software for Inland Empire businesses — Yashal Najeeb"
	description="Fixed-price websites, online stores and tool automations for small businesses in Corona, Riverside, Temecula and the Inland Empire — about half the agency price, live in about a week."
	path="/services"
/>

<svelte:head><script src={quoteUrl} defer></script></svelte:head>

<main class="mx-auto max-w-6xl px-4 md:px-8">
	<a href="/" class="mt-10 inline-block font-mono text-xs tracking-[0.3em] text-paper/80 uppercase hover:text-signal">← yashnaj.dev</a>

	<section aria-labelledby="services-title" class="pt-8 pb-12 md:pt-14 md:pb-16">
		<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Services · Inland Empire</p>
		<h1 id="services-title" class="mt-4 max-w-4xl text-4xl leading-[1.02] font-semibold tracking-tight md:text-6xl">
			Websites and software for Inland Empire businesses — at half the agency price.
		</h1>
		<p class="mt-5 max-w-2xl text-lg text-paper/85 md:text-xl">
			Built by an engineer who has shipped four apps to the App Store and runs a platform holding $10M+ in assets. Fixed prices, real engineering.
		</p>
		<div class="mt-8 flex flex-wrap gap-3">
			<a class="btn-draft btn-signal" href="#quote">Get a quote</a>
			<a class="btn-draft" href={CAL_URL}>Book a 15-min call</a>
		</div>
	</section>

	<section id="packages" aria-labelledby="packages-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">01</span><h2 id="packages-heading">Packages</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-6 md:grid-cols-3">
			{#each packages as p (p.id)}
				<article class="pkg relative flex flex-col border border-line-dim bg-ink/70 p-6" data-package={p.id}>
					<span class="sheet-corner" data-corner="tl" aria-hidden="true"></span>
					<span class="sheet-corner" data-corner="br" aria-hidden="true"></span>
					<h3 class="font-mono text-sm tracking-[0.25em] text-signal uppercase">{p.name}</h3>
					<p class="mt-4 text-4xl font-semibold tracking-tight">{p.price}</p>
					{#if p.note}<p class="mt-1 font-mono text-xs text-paper/75">{p.note}</p>{/if}
					<p class="mt-4 text-paper/90">{p.blurb}</p>
					<ul class="mt-5 grid gap-2 font-mono text-sm text-paper/85">
						{#each p.includes as item}<li class="flex gap-2"><span class="text-signal" aria-hidden="true">+</span>{item}</li>{/each}
					</ul>
					<div class="mt-auto pt-6"><a class="btn-draft w-full text-center" href="#quote" data-need={p.id}>Get a quote</a></div>
				</article>
			{/each}
		</div>
	</section>

	<section aria-labelledby="also-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">02</span><h2 id="also-heading">Also available</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-px border border-line-dim bg-line-dim md:grid-cols-3">
			{#each also as p (p.id)}
				<div class="bg-ink p-5" data-package={p.id}>
					<h3 class="font-semibold">{p.name}</h3>
					<p class="mt-1 font-mono text-sm text-signal">{p.price}</p>
					<p class="mt-3 text-sm text-paper/85">{p.blurb}</p>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="why-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">03</span><h2 id="why-heading">Why me</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-8 md:grid-cols-3">
			{#each why as w}
				<div><h3 class="text-xl font-semibold">{w.title}</h3><p class="mt-2 text-paper/85">{w.body}</p></div>
			{/each}
		</div>
		<p class="mt-8 font-mono text-sm"><a class="link-sweep" href="/#work">See the work →</a></p>
	</section>

	<section aria-labelledby="how-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">04</span><h2 id="how-heading">How it works</h2><span data-rule aria-hidden="true"></span></div>
		<ol class="grid gap-8 md:grid-cols-3">
			{#each steps as s, i}
				<li><p class="font-mono text-xs tracking-[0.3em] text-signal">STEP {i + 1}</p><h3 class="mt-2 text-xl font-semibold">{s.title}</h3><p class="mt-2 text-paper/85">{s.body}</p></li>
			{/each}
		</ol>
	</section>

	<section aria-labelledby="faq-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">05</span><h2 id="faq-heading">Questions</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-3">
			{#each faq as f}
				<details class="faq border border-line-dim bg-ink/70 px-5 py-4"><summary class="cursor-pointer font-semibold">{f.q}</summary><p class="mt-3 text-paper/85">{f.a}</p></details>
			{/each}
		</div>
	</section>

	<section id="quote" aria-labelledby="quote-heading" class="py-12">
		<div class="section-head" data-revealed><span data-n aria-hidden="true">06</span><h2 id="quote-heading">Get a quote</h2><span data-rule aria-hidden="true"></span></div>
		<div class="grid gap-10 md:grid-cols-[1fr_18rem]">
			<form method="POST" action="/api/quote" class="quote grid gap-5" data-quote data-email={profile.email}>
				<div class="grid gap-5 sm:grid-cols-2">
					<label class="field">Your name<input name="name" autocomplete="name" required maxlength="100" /><span class="field-error" data-error-for="name"></span></label>
					<label class="field">Business<input name="business" autocomplete="organization" maxlength="100" /><span class="field-error" data-error-for="business"></span></label>
					<label class="field">Email<input name="email" type="email" autocomplete="email" required maxlength="200" /><span class="field-error" data-error-for="email"></span></label>
					<label class="field">Phone (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="40" /><span class="field-error" data-error-for="phone"></span></label>
				</div>
				<fieldset class="field">
					<legend>What do you need?</legend>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each NEEDS as n}<label class="chip"><input type="checkbox" name="need" value={n.id} />{n.label}</label>{/each}
					</div>
					<span class="field-error" data-error-for="need"></span>
				</fieldset>
				<label class="field">Budget
					<select name="budget"><option value="">Choose a range</option>{#each BUDGETS as b}<option>{b}</option>{/each}</select>
					<span class="field-error" data-error-for="budget"></span>
				</label>
				<label class="field">Tell me about it<textarea name="message" rows="5" maxlength="5000"></textarea><span class="field-error" data-error-for="message"></span></label>
				<div class="hp" aria-hidden="true"><label>Fax<input name="fax" tabindex="-1" autocomplete="off" /></label></div>
				<div class="turnstile" data-turnstile data-sitekey={TURNSTILE_SITE_KEY}></div>
				<noscript><p class="font-mono text-sm text-paper/85">This form needs JavaScript for its spam check. Email <a class="link-sweep" href="mailto:{profile.email}">{profile.email}</a> or <a class="link-sweep" href={CAL_URL}>book a 15-min call</a>.</p></noscript>
				<div class="flex flex-wrap items-center gap-4">
					<button class="btn-draft btn-signal" type="submit">Send request</button>
					<p class="status font-mono text-sm" data-status role="status" aria-live="polite"></p>
				</div>
			</form>
			<aside class="grid content-start gap-4 font-mono text-sm">
				<p class="text-paper/85">Prefer to talk?</p>
				<a class="btn-draft text-center" href={CAL_URL}>Book a 15-min call</a>
				<a class="link-sweep w-fit" href="mailto:{profile.email}">{profile.email}</a>
				<p class="text-paper/70">{profile.location} · replies within 24 hours</p>
			</aside>
		</div>
	</section>
</main>

<div class="mx-auto max-w-6xl px-4 md:px-8"><Footer /></div>
