<script lang="ts">
	import type { Snippet } from 'svelte';

	// The drawing engine lives in src/lib/client/enhance.js (no Svelte runtime on these pages).
	// `drawn` renders the finished state server-side (project pages are morph targets).
	let { label, children, class: klass = '', drawn = false }: { label: string; children: Snippet; class?: string; drawn?: boolean } = $props();
</script>

<figure class="drawing {klass}" data-draw data-drawn={drawn ? '' : undefined} role="img" aria-label={label}>
	{@render children()}
</figure>
