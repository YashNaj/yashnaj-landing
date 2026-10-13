<script lang="ts">
	import '@fontsource-variable/inter-tight/wght.css';
	import '@fontsource/ibm-plex-mono/latin-400.css';
	import '@fontsource/ibm-plex-mono/latin-500.css';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<meta name="google-site-verification" content="DpRDN8S4C7lxB8omOBLxNdOBkkvq0gNEBsFw-Q4748M" />
</svelte:head>

<!-- shared by every drawing: labels sit on a solid ink tag so they read over the linework -->
<svg width="0" height="0" style="position: absolute" aria-hidden="true" focusable="false">
	<filter id="tag" x="-0.06" y="-0.2" width="1.12" height="1.4" color-interpolation-filters="sRGB">
		<feFlood flood-color="#0b1f3a" />
		<feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
	</filter>
</svg>

{@render children()}
