<script lang="ts">
	import '@fontsource-variable/inter-tight/wght.css';
	import '@fontsource/ibm-plex-mono/latin-400.css';
	import '@fontsource/ibm-plex-mono/latin-500.css';
	import '../app.css';
	import { profile } from '$lib/data/site';

	let { children } = $props();

	const title = `${profile.name} — Full-Stack Product Engineer`;
	const description = `${profile.pitch} iOS, React Native, SvelteKit, Postgres. Selected work: chauffeur, Myne Global, a mobile MRI/CT viewer and more.`;
	const url = 'https://yashnaj.dev/';
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: profile.name,
		url,
		jobTitle: 'Full-Stack Product Engineer',
		sameAs: [profile.github, profile.linkedin]
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="https://yashnaj.dev/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Yashal Najeeb — Full-Stack Product Engineer, drawn as a blueprint title block" />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

{@render children()}
