<script lang="ts">
	import type { Slide } from '$lib/data/site';

	let { slides, label }: { slides: Slide[]; label: string } = $props();
	const pad = (n: number) => String(n).padStart(2, '0');
	// half the first slide's width, so the first and last slides can sit centred
	const first = $derived(slides[0]);
	const edge = $derived(first.kind !== 'cta' && first.frame === 'browser' ? 'min(43vw, 380px)' : 'min(36vw, 150px)');
</script>

<section class="carousel" style:--edge={edge} data-carousel aria-roledescription="carousel" aria-label={label}>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex — scroll containers must be focusable so keyboard users can scroll them -->
	<div class="carousel-track" data-track role="group" tabindex="0" aria-label="{label} — use arrow keys to browse">
		{#each slides as slide, i}
			<figure class="slide" data-slide role="group" aria-roledescription="slide" aria-label="{i + 1} of {slides.length}">
				{#if slide.kind === 'cta'}
					<a class="frame frame-cta" href={slide.href}>
						<span class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Live demo</span>
						<span class="mt-3 block text-2xl font-semibold">{slide.label} →</span>
					</a>
				{:else}
					<div class="frame frame-{slide.frame}">
						{#if slide.frame === 'browser'}
							<div class="frame-bar" aria-hidden="true"><i></i><i></i><i></i></div>
						{/if}
						{#if slide.kind === 'image'}
							<img src={slide.src} alt={slide.alt} width={slide.width} height={slide.height} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
						{:else}
							<video src={slide.src} poster={slide.poster} width={slide.width} height={slide.height} aria-label={slide.alt} muted playsinline loop preload="none"></video>
						{/if}
					</div>
				{/if}
				<figcaption class="mt-4 font-mono text-xs tracking-wider text-paper/80">
					<span class="text-signal">FIG. {pad(i + 1)}</span> — {slide.caption}
				</figcaption>
			</figure>
		{/each}
	</div>
	<div class="carousel-controls" data-controls hidden>
		<button type="button" data-prev aria-label="Previous slide">←</button>
		<span data-counter class="font-mono text-xs tracking-[0.25em]">FIG. 01 / {pad(slides.length)}</span>
		<span class="flex gap-2">
			{#each slides as _, i}
				<button type="button" data-dot aria-label="Go to slide {i + 1}" aria-current={i === 0 ? 'true' : 'false'}></button>
			{/each}
		</span>
		<button type="button" data-next aria-label="Next slide">→</button>
	</div>
</section>
