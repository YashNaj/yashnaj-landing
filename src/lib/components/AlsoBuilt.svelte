<script lang="ts">
	import { alsoBuilt } from '$lib/data/site';
</script>

<section id="also-built" aria-labelledby="also-heading" class="py-16">
	<h2 id="also-heading" class="mb-8 font-mono text-sm tracking-[0.3em] text-paper/80 uppercase">Also built</h2>
	<ul class="grid gap-px border border-line-dim bg-line-dim sm:grid-cols-2">
		{#each alsoBuilt as item}
			<li class="bg-ink p-5">
				<strong class="block text-lg font-semibold">{item.name}</strong>
				<span class="mt-1 block text-paper/85">{item.description}</span>
			</li>
		{/each}
	</ul>
</section>
