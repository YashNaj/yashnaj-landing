<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children, class: klass = '' }: { label: string; children: Snippet; class?: string } =
		$props();

	let el: HTMLElement;
	let drawn = $state(false);

	$effect(() => {
		if (!('IntersectionObserver' in window)) {
			drawn = true;
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					drawn = true;
					io.disconnect();
				}
			},
			{ threshold: 0.35 }
		);
		io.observe(el);
		return () => io.disconnect();
	});
</script>

<figure
	bind:this={el}
	class="drawing {klass}"
	data-draw
	data-drawn={drawn ? '' : undefined}
	role="img"
	aria-label={label}
>
	{@render children()}
</figure>
