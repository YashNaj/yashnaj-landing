<script lang="ts">
	import type { Component } from 'svelte';
	import type { Project } from '$lib/data/site';
	import CopyCommand from './CopyCommand.svelte';
	import DrawOnView from './DrawOnView.svelte';

	let { project, Drawing, flip = false }: { project: Project; Drawing: Component; flip?: boolean } =
		$props();
</script>

<div class="pin">
<article
	id={project.slug}
	data-testid="project-sheet"
	style:view-transition-name="sheet-{project.slug}" style:view-transition-class="vt-sheet"
	class="relative grid scroll-mt-8 gap-8 border border-line-dim bg-ink/70 p-5 md:grid-cols-2 md:items-center md:gap-12 md:p-10"
>
	<span class="sheet-corner" data-corner="tl" aria-hidden="true"></span>
	<span class="sheet-corner" data-corner="tr" aria-hidden="true"></span>
	<span class="sheet-corner" data-corner="bl" aria-hidden="true"></span>
	<span class="sheet-corner" data-corner="br" aria-hidden="true"></span>
	<span class="sheet-tb" style:view-transition-name="sheetno-{project.slug}"><span>SHEET {project.sheet} / 04</span><span>SCALE 1:1</span><span>REV 26</span></span>

	<div class={flip ? 'md:order-2' : ''} style:view-transition-name="drawing-{project.slug}" style:view-transition-class="vt-drawing">
		<DrawOnView label={project.drawingLabel}>
			<Drawing />
		</DrawOnView>
	</div>

	<div class="min-w-0">
		<h3 class="text-3xl font-semibold tracking-tight md:text-4xl">
			<a href="/work/{project.slug}" class="hover:text-signal" style:view-transition-name="title-{project.slug}" style:view-transition-class="vt-title">{project.title}</a>
		</h3>
		<p class="mt-2 font-mono text-sm text-paper/80">{project.tagline}</p>
		<p class="mt-5 leading-relaxed text-paper/90">{project.summary}</p>
		<p class="metric mt-5 border-l-2 border-signal pl-3 font-mono text-sm text-paper">{project.metric}</p>
		<ul class="mt-5 flex flex-wrap gap-2" aria-label="Stack">
			{#each project.stack as tech}
				<li class="border border-line-dim px-2 py-0.5 font-mono text-xs uppercase tracking-wider">
					{tech}
				</li>
			{/each}
		</ul>
		{#if project.command}
			<div class="mt-5"><CopyCommand command={project.command} /></div>
		{/if}
		{#if project.links.length}
			<p class="mt-4 flex flex-wrap gap-4 font-mono text-sm">
				{#each project.links as link}
					<a class="link-sweep self-center" href={link.href}
						>{link.label} ↗</a
					>
				{/each}
			</p>
		{/if}
		<p class="mt-6">
			<a href="/work/{project.slug}" class="btn-draft">View project →</a>
		</p>
	</div>
</article>
</div>
