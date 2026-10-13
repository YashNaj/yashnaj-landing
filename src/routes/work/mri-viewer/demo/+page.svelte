<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo title="MRI/CT viewer, live demo — Yashal Najeeb" description="Try the mobile MRI/CT viewer Yashal Najeeb built with Cornerstone3D: series, slice scrubbing, window/level and pan, running in your browser." path="/work/mri-viewer/demo" />

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-0 py-6 md:flex-row md:items-start md:justify-center md:gap-12 md:px-8 md:py-12">
	<div class="px-4 md:w-80 md:px-0">
		<a href="/work/mri-viewer" class="font-mono text-xs tracking-[0.3em] text-paper/80 uppercase hover:text-signal">← Back to the project</a>
		<h1 class="mt-4 text-3xl font-semibold tracking-tight">MRI/CT viewer — live demo</h1>
		<p class="mt-3 text-paper/85">Pick a series, drag the scrubber, and switch between Scroll, Window and Pan. On a phone, pinch to zoom.</p>
		<p class="mt-4 font-mono text-xs text-paper/70">Sample study: BRAINIX, from the OsiriX / Orthanc public DICOM sample library — for teaching and demonstration.</p>
		<p class="mt-4 font-mono text-xs text-paper/70">Loads ~6 MB of viewer code plus scan slices as you browse.</p>
	</div>
	<div class="demo-frame">
		<iframe src="/demo/mri/index.html" title="MRI/CT viewer demo" loading="eager"></iframe>
	</div>
</main>

<style>
	.demo-frame { width: 100%; height: calc(100dvh - 12rem); min-height: 560px; background: #000; }
	.demo-frame iframe { width: 100%; height: 100%; border: 0; display: block; }
	@media (min-width: 768px) {
		.demo-frame { width: 390px; height: 844px; max-height: calc(100dvh - 6rem); border: 1px solid var(--color-line-dim); border-radius: 44px; padding: 12px; }
		.demo-frame iframe { border-radius: 32px; }
	}
</style>
