<script lang="ts">
	import { alsoBuilt } from '$lib/data/site';
</script>

<section id="also-built" aria-labelledby="also-heading" class="py-16">
	<div class="section-head" data-reveal-head><span data-n aria-hidden="true">02</span><h2 id="also-heading">Also built</h2><span data-rule aria-hidden="true"></span></div>
	<ul class="grid gap-px border border-line-dim bg-line-dim sm:grid-cols-2">
		{#each alsoBuilt as item, i}
			<li class="bg-ink p-5" data-reveal style="--r: {i}">
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
