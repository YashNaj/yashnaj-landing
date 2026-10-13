<script lang="ts">
	let {
		title,
		description,
		path,
		image = 'https://yashnaj.dev/og.png',
		imageAlt = 'Yashal Najeeb — Full-Stack Product Engineer, drawn as a blueprint title block',
		jsonLd,
		noindex = false
	}: { title: string; description: string; path: string; image?: string; imageAlt?: string; jsonLd?: object; noindex?: boolean } = $props();
	const url = $derived(`https://yashnaj.dev${path}`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if noindex}<meta name="robots" content="noindex" />{:else}<link rel="canonical" href={url} />{/if}
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:image:alt" content={imageAlt} />
	<meta name="twitter:card" content="summary_large_image" />
	{#if jsonLd}{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}{/if}
</svelte:head>
