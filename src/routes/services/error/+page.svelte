<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { CAL_URL } from '$lib/data/services';
	import { profile } from '$lib/data/site';
</script>

<Seo title="Couldn’t send — Yashal Najeeb" description="Your quote request couldn’t be sent." path="/services/error" noindex />

<main class="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4">
	<p class="font-mono text-xs tracking-[0.3em] text-signal uppercase">Quote request</p>
	<h1 class="mt-4 text-5xl font-semibold">That didn’t send.</h1>
	<p class="mt-4 text-paper/85">The form needs JavaScript for its spam check, or something went wrong on my side. Reach me directly:</p>
	<p class="mt-6 flex flex-wrap gap-4 font-mono text-sm">
		<a class="link-sweep" href="mailto:{profile.email}">{profile.email}</a>
		<a class="link-sweep" href={CAL_URL}>Book a 15-min call</a>
	</p>
	<a class="btn-draft mt-8 w-fit" href="/services">Back to services</a>
</main>
