<script lang="ts">
	import { profile } from '$lib/data/site';
	import TitleBlock from './TitleBlock.svelte';
</script>

<footer class="mt-16 border-t border-line-dim py-12">
	<div class="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
		<div>
			<p class="text-2xl font-semibold">Let’s build something.</p>
			<p class="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
				<a class="link-sweep" href="mailto:{profile.email}">{profile.email}</a>
				<a class="hover:text-signal" href={profile.github}>GitHub ↗</a>
				<a class="hover:text-signal" href={profile.linkedin}>LinkedIn ↗</a>
				<a class="hover:text-signal" href={profile.resume}>Resume ↗</a>
			</p>
		</div>
		<TitleBlock rows={[['Drawn by', profile.name], ['Sheet', 'END'], ['©', '2026 Yashal Najeeb']]} />
	</div>
</footer>
