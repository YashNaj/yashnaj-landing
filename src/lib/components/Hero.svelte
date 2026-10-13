<script lang="ts">
	import { profile } from '$lib/data/site';
	import TitleBlock from './TitleBlock.svelte';

	const actions = [
		{ label: 'Resume', href: profile.resume },
		{ label: 'GitHub', href: profile.github },
		{ label: 'LinkedIn', href: profile.linkedin },
		{ label: 'Email', href: `mailto:${profile.email}` }
	];
</script>

<header data-testid="hero" class="grid gap-10 py-16 md:grid-cols-[1fr_auto] md:items-center md:py-28">
	<div class="min-w-0">
		<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Drawing no. YN-001</p>
		<h1 class="mt-4 text-5xl leading-[0.95] font-semibold tracking-tight sm:text-6xl md:text-7xl">
			{profile.name}
		</h1>
		<p class="mt-4 font-mono text-sm text-paper/85">{profile.role}</p>
		<p class="mt-6 max-w-2xl text-xl leading-snug md:text-2xl">{profile.pitch}</p>
		<p data-testid="availability" class="mt-5 inline-flex items-center gap-2 font-mono text-sm text-paper">
			<span aria-hidden="true" class="h-2 w-2 rounded-full bg-signal motion-safe:animate-pulse"></span>
			{profile.availability}
		</p>

		<nav aria-label="Contact" class="mt-8 flex flex-wrap gap-3">
			{#each actions as a}
				<a
					href={a.href}
					class="border border-paper px-4 py-2 font-mono text-sm tracking-widest uppercase transition-colors hover:border-signal hover:text-signal"
					>{a.label}</a
				>
			{/each}
		</nav>

	</div>

	<div class="mx-auto w-56 md:w-72">
		<div class="relative border border-line-dim p-3">
			<span aria-hidden="true" class="absolute -top-px -left-px h-4 w-4 border-t-2 border-l-2 border-signal"></span>
			<span aria-hidden="true" class="absolute -right-px -bottom-px h-4 w-4 border-r-2 border-b-2 border-signal"></span>
			<img
				src="/img/yashal-460.webp"
				srcset="/img/yashal-320.webp 320w, /img/yashal-460.webp 460w"
				sizes="(min-width: 768px) 288px, 224px"
				width="460"
				height="460"
				alt={profile.photoAlt}
				fetchpriority="high"
				class="block h-auto w-full"
			/>
		</div>
		<div class="mt-3">
			<TitleBlock rows={[['Dwg no.', 'YN-001'], ['Rev', '2026'], ['Loc', profile.location]]} />
		</div>
	</div>
</header>
