<script lang="ts">
	// Click handling lives in static/enhance.js — the home page ships no Svelte runtime.
	let { command }: { command: string } = $props();
</script>

<div data-copy-root>
	<div class="flex max-w-full items-center gap-2 border border-line-dim bg-ink/80 font-mono text-sm">
		<span class="pl-3 text-signal" aria-hidden="true">$</span>
		<code class="min-w-0 flex-1 overflow-x-auto py-2 whitespace-nowrap">{command}</code>
		<button
			type="button"
			data-testid="copy-command"
			class="shrink-0 border-l border-line-dim px-3 py-2 uppercase tracking-widest hover:text-signal"
		>
			Copy
		</button>
	</div>
	<p data-testid="copy-status" class="mt-1 min-h-5 font-mono text-xs text-signal" aria-live="polite"></p>
</div>
