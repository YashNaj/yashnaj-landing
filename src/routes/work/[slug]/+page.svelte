<script lang="ts">
	import carouselUrl from '$lib/client/carousel.js?url';
	import enhanceUrl from '$lib/client/enhance.js?url';
	import Carousel from '$lib/components/Carousel.svelte';
	import DrawOnView from '$lib/components/DrawOnView.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { drawings } from '$lib/drawings';

	let { data } = $props();
	const p = $derived(data.project);
	const Drawing = $derived(drawings[p.slug]);
	const sections = $derived([
		['The problem', p.detail.problem],
		['What I built', p.detail.built],
		['How it works', p.detail.how],
		['Outcome', p.detail.outcome]
	]);
</script>

<Seo
	title="{p.title} — Yashal Najeeb"
	description={p.seoDescription}
	path="/work/{p.slug}"
	image="https://yashnaj.dev/og/{p.slug}.png"
	imageAlt="{p.title} — a project by Yashal Najeeb, drawn as a blueprint title block"
/>
<svelte:head>
	<script src={enhanceUrl} defer></script>
	<script src={carouselUrl} defer></script>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-16">
	<a href="/#work" class="font-mono text-xs tracking-[0.3em] text-paper/80 uppercase hover:text-signal">← All work</a>

	<header class="relative mt-6 grid gap-8 border border-line-dim bg-ink/70 p-5 md:grid-cols-2 md:items-center md:p-10" style:view-transition-name="sheet-{p.slug}" style:view-transition-class="vt-sheet">
		<span class="sheet-corner" data-corner="tl" aria-hidden="true"></span>
		<span class="sheet-corner" data-corner="tr" aria-hidden="true"></span>
		<span class="sheet-corner" data-corner="bl" aria-hidden="true"></span>
		<span class="sheet-corner" data-corner="br" aria-hidden="true"></span>
		<span class="sheet-tb" style:view-transition-name="sheetno-{p.slug}"><span>SHEET {p.sheet} / 04</span><span>SCALE 1:1</span><span>REV 26</span></span>
		<div style:view-transition-name="drawing-{p.slug}" style:view-transition-class="vt-drawing">
			<DrawOnView label={p.drawingLabel} drawn><Drawing /></DrawOnView>
		</div>
		<div class="min-w-0">
			<h1 class="text-4xl font-semibold tracking-tight md:text-5xl" style:view-transition-name="title-{p.slug}" style:view-transition-class="vt-title">{p.title}</h1>
			<p class="mt-2 font-mono text-sm text-paper/80">{p.tagline}</p>
			<p class="metric mt-5 border-l-2 border-signal pl-3 font-mono text-sm">{p.metric}</p>
			<ul class="mt-5 flex flex-wrap gap-2" aria-label="Stack">
				{#each p.stack as tech}<li class="border border-line-dim px-2 py-0.5 font-mono text-xs tracking-wider uppercase">{tech}</li>{/each}
			</ul>
			<p class="mt-6 flex flex-wrap gap-4 font-mono text-sm">
				{#if p.demo}<a class="btn-draft btn-signal" href={p.demo.href}>{p.demo.label} →</a>{/if}
				{#each p.links as link}<a class="link-sweep self-center" href={link.href}>{link.label} ↗</a>{/each}
			</p>
		</div>
	</header>

	<section class="py-12" aria-labelledby="gallery-heading">
		<h2 id="gallery-heading" class="sr-only">Gallery</h2>
		<Carousel slides={p.slides} label="{p.title} gallery" />
	</section>

	<div class="grid gap-10 md:grid-cols-2">
		{#each sections as [heading, body], i}
			<section data-reveal style="--r: {i}">
				<h2 class="font-mono text-sm tracking-[0.3em] text-signal uppercase">{heading}</h2>
				<p class="mt-3 text-lg leading-relaxed text-paper/90">{body}</p>
			</section>
		{/each}
	</div>

	{#if p.slug === 'mri-viewer'}
		<p class="mt-10 font-mono text-xs text-paper/70">Sample study: BRAINIX, from the OsiriX / Orthanc public DICOM sample library — for teaching and demonstration.</p>
	{/if}

	<nav data-reveal class="mt-16 flex flex-wrap justify-between gap-4 border-t border-line-dim pt-8 font-mono text-sm" aria-label="More projects">
		<a class="hover:text-signal" href="/work/{data.prev.slug}">← Previous: {data.prev.title}</a>
		<a class="hover:text-signal" href="/work/{data.next.slug}">Next: {data.next.title} →</a>
	</nav>
	<Footer />
</main>
