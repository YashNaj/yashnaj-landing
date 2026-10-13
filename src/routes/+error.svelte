<script lang="ts">
	import { page } from '$app/state';
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo title="{page.status} · Yashal Najeeb" description="This page isn’t in the set." path={page.url.pathname} noindex />

<main class="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4">
	<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Sheet missing</p>
	<h1 class="mt-4 text-6xl font-semibold">{page.status}</h1>
	<p class="mt-4 text-paper/85">This drawing isn’t in the set.</p>
	<a class="mt-8 w-fit border border-paper px-4 py-2 font-mono text-sm tracking-widest uppercase hover:border-signal hover:text-signal" href="/">Back to the main sheet</a>
</main>
