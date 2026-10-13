<script lang="ts">
	import AlsoBuilt from '$lib/components/AlsoBuilt.svelte';
	import Experience from '$lib/components/Experience.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import ProjectSheet from '$lib/components/ProjectSheet.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { profile, projects } from '$lib/data/site';
	import { drawings } from '$lib/drawings';

</script>

<Seo
	title="Yashal Najeeb — Full-Stack Product Engineer"
	description="Yashal Najeeb is a full-stack product engineer (iOS, React Native, SvelteKit, Postgres) who takes products from zero to the App Store. Selected work: chauffeur, Myne Global, a mobile MRI/CT viewer and more."
	path="/"
	jsonLd={{ '@context': 'https://schema.org', '@type': 'Person', name: profile.name, alternateName: ['Yash Najeeb', 'yashnaj'], url: 'https://yashnaj.dev/', image: 'https://yashnaj.dev/img/yashal-460.webp', jobTitle: 'Full-Stack Product Engineer', sameAs: [profile.github, profile.linkedin] }}
/>
<svelte:head><script src="/enhance.js" defer></script></svelte:head>

<main class="mx-auto max-w-6xl px-4 md:px-8">
	<Hero />

	<section id="work" aria-labelledby="work-heading" class="py-16">
		<h2 id="work-heading" class="mb-10 font-mono text-sm tracking-[0.3em] text-paper/80 uppercase">
			Selected work
		</h2>
		<div class="grid gap-10">
			{#each projects as project, i (project.slug)}
				<ProjectSheet {project} Drawing={drawings[project.slug]} flip={i % 2 === 1} />
			{/each}
		</div>
	</section>

	<AlsoBuilt />
	<Experience />
</main>

<div class="mx-auto max-w-6xl px-4 md:px-8"><Footer /></div>
