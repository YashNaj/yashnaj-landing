<script lang="ts">
	import type { Component } from 'svelte';
	import ProjectSheet from '$lib/components/ProjectSheet.svelte';
	import { projects, type ProjectSlug } from '$lib/data/site';
	import ComicPanels from '$lib/drawings/ComicPanels.svelte';
	import PassportVault from '$lib/drawings/PassportVault.svelte';
	import PhoneNoEffect from '$lib/drawings/PhoneNoEffect.svelte';
	import ScanSlices from '$lib/drawings/ScanSlices.svelte';

	const drawings: Record<ProjectSlug, Component> = {
		chauffeur: PhoneNoEffect,
		myne: PassportVault,
		'mri-viewer': ScanSlices,
		'hard-pills': ComicPanels
	};
</script>

<svelte:head><title>Yashal Najeeb</title></svelte:head>

<main class="mx-auto max-w-6xl px-4 md:px-8">
	<h1 class="py-24 text-5xl font-semibold">Yashal Najeeb</h1>

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
</main>
