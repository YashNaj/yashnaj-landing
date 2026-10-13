<script lang="ts">
	import { alsoBuilt } from '$lib/data/site';
</script>

<section id="also-built" aria-labelledby="also-heading" class="py-16">
	<h2 id="also-heading" class="mb-8 font-mono text-sm tracking-[0.3em] text-paper/80 uppercase">Also built</h2>
	<ul class="grid gap-px border border-line-dim bg-line-dim sm:grid-cols-2">
		{#each alsoBuilt as item}
			<li class="bg-ink p-5">
				{#if item.href}
					<a class="group block" href={item.href}>
						<strong class="text-lg font-semibold group-hover:text-signal">{item.name}</strong>
						<span aria-hidden="true" class="group-hover:text-signal">↗</span>
					</a>
				{:else}
					<strong class="block text-lg font-semibold">{item.name}</strong>
				{/if}
				<span class="mt-1 block text-paper/85">{item.description}</span>
			</li>
		{/each}
	</ul>
</section>
