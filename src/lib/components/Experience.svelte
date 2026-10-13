<script lang="ts">
	import { experience } from '$lib/data/site';
</script>

<section id="experience" aria-labelledby="exp-heading" class="py-16">
	<h2 id="exp-heading" class="mb-8 font-mono text-sm tracking-[0.3em] text-paper/80 uppercase">Experience</h2>
	<ol class="border-l border-line-dim">
		{#each experience as job}
			<li class="relative pb-10 pl-6 last:pb-0">
				<span aria-hidden="true" class="absolute top-2 -left-[5px] h-2.5 w-2.5 border border-signal bg-ink"></span>
				<p class="font-mono text-xs tracking-widest text-paper/70 uppercase">{job.period} · {job.place}</p>
				<h3 class="mt-1 text-xl font-semibold">{job.role} — {job.org}</h3>
				<p class="mt-2 max-w-2xl text-paper/85">{job.note}</p>
			</li>
		{/each}
	</ol>
</section>
