// Single source for the services page and the quote Worker (worker/index.ts imports this file,
// so keep it plain TypeScript: no $lib aliases, no Svelte).
export type Need = 'website' | 'landing' | 'store' | 'automation' | 'ai' | 'app' | 'security' | 'other';
export type Package = { id: Need; name: string; price: string; note?: string; blurb: string; includes: string[] };

export const CAL_URL = 'https://cal.com/yashnaj/15min';
// Cloudflare's always-pass test key until the real widget exists (swapped at launch).
export const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

export const packages: Package[] = [
	{
		id: 'website',
		name: 'Website',
		price: '$1,500',
		note: 'One-page landing site: $750',
		blurb: 'A fast, professional site that brings in calls and bookings.',
		includes: ['Up to 5 pages, built for phones first', 'Top Google speed scores', 'Basic SEO + Google Business Profile setup', 'Live in about a week', 'No monthly fees']
	},
	{
		id: 'store',
		name: 'Online store',
		price: '$2,500',
		blurb: 'Start selling online without the agency bill.',
		includes: ['Shopify setup and theme', 'Products imported', 'Payments and shipping', 'Custom touches (drops, members-only)', 'Live in about two weeks']
	},
	{
		id: 'automation',
		name: 'Connect your tools',
		price: 'from $1,000',
		blurb: 'Stop copying data between apps by hand.',
		includes: ['Invoices that reconcile themselves (Jobber → QuickBooks)', 'Bookings into your calendar', 'Payment and lead alerts', 'Monitoring so it never fails silently', 'A written handover']
	}
];

export const also: Package[] = [
	{ id: 'ai', name: 'AI assistant or feature', price: 'from $1,500', blurb: 'Answer customers, sort calls or draft quotes automatically.', includes: [] },
	{ id: 'app', name: 'App MVP to the App Store', price: 'from $9,500', blurb: 'iPhone and Android apps, shipped — I’ve launched four.', includes: [] },
	{ id: 'security', name: 'Code & access security review', price: 'from $1,500', blurb: 'Find who can see or change what they shouldn’t, before someone else does.', includes: [] }
];

export const why = [
	{ title: 'Fixed price', body: 'You know the cost before I start. No hourly surprises.' },
	{ title: 'Fast by default', body: 'The page you’re reading scores near 100 on Google’s speed test. Yours will too.' },
	{ title: 'Local and reachable', body: 'Based in Corona. Real engineering — the same work behind apps on the App Store.' }
];

export const steps = [
	{ title: 'Quote', body: 'Tell me what you need. I reply within 24 hours with a fixed price.' },
	{ title: 'Build', body: 'You see progress as it happens, with a preview link.' },
	{ title: 'Launch', body: 'We go live together. You own everything, with a written handover.' }
];

export const faq = [
	{ q: 'What do I need to provide?', a: 'Your logo, photos and the words you want. Don’t have them? I can help with that.' },
	{ q: 'Do I own the site?', a: 'Yes. The code, the domain and every account are yours.' },
	{ q: 'What if I need changes later?', a: 'An optional care plan is $40/month for edits and uptime checks, or you pay per change.' },
	{ q: 'What does hosting cost?', a: 'Usually $0–5 a month. No builder subscription.' },
	{ q: 'How long does it take?', a: 'A website about a week, a store about two. Automations and apps are quoted.' }
];

export const NEEDS: { id: Need; label: string }[] = [
	{ id: 'website', label: 'Website' },
	{ id: 'landing', label: 'Landing page' },
	{ id: 'store', label: 'Online store' },
	{ id: 'automation', label: 'Connect my tools' },
	{ id: 'ai', label: 'AI assistant' },
	{ id: 'app', label: 'App' },
	{ id: 'security', label: 'Security review' },
	{ id: 'other', label: 'Something else' }
];

export const BUDGETS = ['Under $1,000', '$1,000–2,500', '$2,500–5,000', '$5,000–10,000', '$10,000+', 'Not sure yet'] as const;

export const QUOTE_LIMITS = { name: 100, business: 100, email: 200, phone: 40, message: 5000 } as const;
