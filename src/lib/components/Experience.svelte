<script lang="ts">
	import { experience } from '$lib/data/site';
</script>

<section id="experience" aria-labelledby="exp-heading" class="py-16">
	<div class="section-head" data-reveal-head><span data-n aria-hidden="true">03</span><h2 id="exp-heading">Experience</h2><span data-rule aria-hidden="true"></span></div>
	<ol class="border-l border-line-dim">
		{#each experience as job, i}
			<li class="relative pb-10 pl-6 last:pb-0" data-reveal style="--r: {i}">
				<span aria-hidden="true" class="absolute top-2 -left-[5px] h-2.5 w-2.5 border border-signal bg-ink"></span>
				<p class="font-mono text-xs tracking-widest text-paper/70 uppercase">{job.period} · {job.place}</p>
				<h3 class="mt-1 text-xl font-semibold">{job.role} — {job.org}</h3>
				<p class="mt-2 max-w-2xl text-paper/85">{job.note}</p>
			</li>
		{/each}
	</ol>
</section>
