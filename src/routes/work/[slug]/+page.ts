import { error } from '@sveltejs/kit';
import { projects } from '$lib/data/site';
import type { EntryGenerator, PageLoad } from './$types';

export const csr = false;
export const entries: EntryGenerator = () => projects.map((p) => ({ slug: p.slug }));

export const load: PageLoad = ({ params }) => {
	const i = projects.findIndex((p) => p.slug === params.slug);
	if (i < 0) error(404, 'Not found');
	const n = projects.length;
	return { project: projects[i], prev: projects[(i + n - 1) % n], next: projects[(i + 1) % n] };
};
