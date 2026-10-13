<script lang="ts">
	import { profile } from '$lib/data/site';

	// Resume keeps its word; the socials are icons (accessible names via aria-label)
	const socials = [
		{ label: 'GitHub', href: profile.github, icon: 'github' },
		{ label: 'LinkedIn', href: profile.linkedin, icon: 'linkedin' },
		{ label: 'Email', href: `mailto:${profile.email}`, icon: 'mail' }
	];
</script>

<!-- mobile: heading, portrait, pitch, actions; desktop: text on the left, portrait on the right -->
<section data-testid="hero" aria-labelledby="hero-name" class="hero grid gap-8 py-12 md:gap-x-10 md:gap-y-0 md:py-28">
	<div class="hero-head min-w-0">
		<p data-enter style="--e: 0" class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Drawing no. YN-001</p>
		<h1 id="hero-name" class="mt-4 text-5xl leading-[0.95] font-semibold tracking-tight sm:text-6xl md:text-7xl">
			{profile.name}
		</h1>
		<p data-enter style="--e: 1" class="mt-4 font-mono text-sm text-paper/85">{profile.role}</p>
	</div>

	<!-- the portrait is a background plate: no frame, its edges dissolve into the sheet -->
	<div class="hero-photo">
		<img
			class="hero-plate"
			src="/img/yashal-bg-480.webp"
			srcset="/img/yashal-bg-480.webp 480w, /img/yashal-bg-800.webp 800w"
			sizes="(min-width: 768px) 520px, 100vw"
			width="800"
			height="800"
			alt={profile.photoAlt}
			fetchpriority="high"
		/>
	</div>

	<div class="hero-body min-w-0">
		<p class="max-w-2xl text-xl leading-snug md:mt-6 md:text-2xl">{profile.pitch}</p>
		<p data-testid="availability" data-enter style="--e: 3" class="mt-5 inline-flex items-center gap-2 font-mono text-sm text-paper">
			<span aria-hidden="true" class="ping h-2 w-2 shrink-0 rounded-full bg-signal"></span>
			{profile.availability}
		</p>

		<nav aria-label="Contact" data-enter style="--e: 4" class="mt-8 flex items-center gap-3">
			<a href={profile.resume} class="btn-draft flex-1 md:flex-none">Resume</a>
			{#each socials as s}
				<a href={s.href} class="btn-draft btn-icon" aria-label={s.label} title={s.label}>
					{#if s.icon === 'github'}
						<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.04c-3.34.73-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3" /></svg>
					{:else if s.icon === 'linkedin'}
						<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" /></svg>
					{:else}
						<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="1.5" /><path d="m3 6 9 7 9-7" /></svg>
					{/if}
				</a>
			{/each}
		</nav>
	</div>
</section>
