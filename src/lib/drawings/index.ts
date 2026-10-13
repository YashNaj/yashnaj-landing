import type { Component } from 'svelte';
import type { ProjectSlug } from '$lib/data/site';
import ComicPanels from './ComicPanels.svelte';
import PassportVault from './PassportVault.svelte';
import PhoneNoEffect from './PhoneNoEffect.svelte';
import ScanSlices from './ScanSlices.svelte';

export const drawings: Record<ProjectSlug, Component> = {
	chauffeur: PhoneNoEffect,
	myne: PassportVault,
	'mri-viewer': ScanSlices,
	'hard-pills': ComicPanels
};
