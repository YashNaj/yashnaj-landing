<script lang="ts">
	let { command }: { command: string } = $props();

	let code: HTMLElement;
	let status = $state('');

	function selectCode() {
		const range = document.createRange();
		range.selectNodeContents(code);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}

	async function copy() {
		try {
			if (!navigator.clipboard) throw new Error('clipboard unavailable');
			await navigator.clipboard.writeText(command);
			status = 'Copied';
		} catch {
			selectCode();
			status = 'Press ⌘C / Ctrl+C';
		}
	}
</script>

<div class="flex max-w-full items-center gap-2 border border-line-dim bg-ink/80 font-mono text-sm">
	<span class="pl-3 text-signal" aria-hidden="true">$</span>
	<code bind:this={code} class="min-w-0 flex-1 overflow-x-auto py-2 whitespace-nowrap">{command}</code>
	<button
		type="button"
		data-testid="copy-command"
		class="shrink-0 border-l border-line-dim px-3 py-2 uppercase tracking-widest hover:text-signal"
		onclick={copy}
	>
		Copy
	</button>
</div>
<p data-testid="copy-status" class="mt-1 min-h-5 font-mono text-xs text-signal" aria-live="polite">{status}</p>
