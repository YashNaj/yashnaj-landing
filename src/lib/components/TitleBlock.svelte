<script lang="ts">
	let { rows }: { rows: [string, string][] } = $props();
</script>

<dl class="grid grid-cols-[auto_1fr] border border-line-dim font-mono text-[11px] tracking-widest uppercase">
	{#each rows as [label, value]}
		<dt class="border-b border-r border-line-dim px-2 py-1 text-paper/70 last-of-type:border-b-0">{label}</dt>
		<dd class="m-0 border-b border-line-dim px-2 py-1 last-of-type:border-b-0">{value}</dd>
	{/each}
</dl>
