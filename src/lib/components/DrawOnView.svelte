<script lang="ts">
	import type { Snippet } from 'svelte';

	// Drawn state is added by src/lib/client/enhance.js (IntersectionObserver) — the home page ships no Svelte runtime.
	let { label, children, class: klass = '' }: { label: string; children: Snippet; class?: string } =
		$props();
</script>

<figure class="drawing {klass}" data-draw role="img" aria-label={label}>
	{@render children()}
</figure>
