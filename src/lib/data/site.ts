export type Link = { label: string; href: string };
export type ProjectSlug = 'chauffeur' | 'myne' | 'mri-viewer' | 'hard-pills';
export type Project = {
	slug: ProjectSlug;
	sheet: string;
	title: string;
	tagline: string;
	summary: string;
	metric: string;
	stack: string[];
	links: Link[];
	command?: string;
	drawingLabel: string;
};

export const profile = {
	name: 'Yashal Najeeb',
	role: 'Full-Stack Product Engineer · iOS, React Native, TypeScript, Postgres',
	pitch:
		'I take products from zero to the App Store — most recently a provenance platform now holding $10M+ in luxury assets, and a five-repo HIPAA platform I rescued as its sole engineer.',
	availability: 'Open to full-time and contract roles · Remote or Los Angeles area',
	location: 'Corona, CA',
	email: 'yashnaj@proton.me',
	github: 'https://github.com/YashNaj',
	linkedin: 'https://www.linkedin.com/in/yashnaj',
	resume: '/Yashal-Najeeb-Resume.pdf',
	photoAlt: 'Portrait of Yashal Najeeb'
};

export const projects: Project[] = [
	{
		slug: 'chauffeur',
		sheet: '01',
		title: 'chauffeur',
		tagline: 'Lets coding agents drive the iOS Simulator — and tells them the truth.',
		summary:
			'Agents tap a disabled button and report “done.” chauffeur hands the agent the screen as an outline it can reason about, taps through the Simulator’s own input system, and verifies every action against what actually changed: NO EFFECT, INTERCEPTED or APP CRASHED, with the line that caused it.',
		metric:
			'180-run benchmark vs Xcode 27’s MCP: under half the turns at ~1/6 the cost, 45/45 tasks verified on Opus.',
		stack: ['Swift', 'MCP', 'XCTest', 'Homebrew'],
		links: [
			{ label: 'GitHub', href: 'https://github.com/YashNaj/chauffeur' },
			{ label: 'Watch the benchmark', href: 'https://github.com/YashNaj/chauffeur#benchmark' }
		],
		command: 'brew install yashnaj/chauffeur/chauffeur',
		drawingLabel:
			'Line drawing of a phone: a tap ripple lands on a greyed-out button and a NO EFFECT label stamps beside it.'
	},
	{
		slug: 'myne',
		sheet: '02',
		title: 'Myne Global',
		tagline: 'Provenance for luxury goods, from purchase to resale.',
		summary:
			'Built end to end as lead engineer: SvelteKit API, Postgres with row-level security, a SwiftUI app and Stripe/StoreKit billing. Owner-held-key encryption carries every ownership transfer, dealers issue Myne Passports at the point of sale, and every buyer search checks a registry of 16,830 stolen-item records.',
		metric: '$10M+ in registered assets · 400 collectors · 12 NYC dealers',
		stack: ['SwiftUI', 'SvelteKit', 'Postgres', 'Supabase', 'Stripe', 'StoreKit 2'],
		links: [
			{ label: 'myneglobal.com', href: 'https://myneglobal.com' },
			{ label: 'App Store', href: 'https://apps.apple.com/us/app/myne-global/id6757202169' }
		],
		drawingLabel:
			'Exploded-view drawing of a vault door with a Myne Passport pulled out beside it, with callout labels.'
	},
	{
		slug: 'mri-viewer',
		sheet: '03',
		title: 'Mobile MRI/CT viewer',
		tagline: 'Healthcare records platform (contract).',
		summary:
			'Clinicians couldn’t view scans on mobile: the platform’s legacy imaging viewer predated touch support. Instead of a risky framework upgrade, I built a modern Cornerstone3D renderer inside a WebView and moved every control — slice scrubber, series, window/level, pan, pinch-zoom — into native React Native over a small message bridge. Also rebuilt authorization across 156 API routes and stood up the first iOS release path.',
		metric: 'First image on device in under 2 s · 57 of 68 UAT defects closed (31/31 on mobile)',
		stack: ['React Native', 'Cornerstone3D', 'DICOMweb', 'Express', 'AWS'],
		links: [],
		drawingLabel:
			'Abstract drawing of stacked scan slices fanning out beside a phone with a slice scrubber.'
	},
	{
		slug: 'hard-pills',
		sheet: '04',
		title: 'Hard Pills to Swallow',
		tagline: 'A pop-art blog its writer runs entirely herself.',
		summary:
			'Public site plus a full admin: TipTap editor with autosave and scheduling, banner styling, SEO panel, media library and mailing list. Database triggers make “publish now” and scheduled posts behave the same — the email goes out once and the post auto-shares to X and Threads.',
		metric: 'Live in production, run end to end by a non-technical writer',
		stack: ['SvelteKit', 'Supabase', 'Drizzle', 'Tailwind', 'Vercel'],
		links: [{ label: 'hardpillstoswallow.com', href: 'https://hardpillstoswallow.com' }],
		drawingLabel: 'Comic-book page drawing: panel grid, halftone shading and a speech bubble.'
	}
];

export const alsoBuilt: { name: string; description: string; href?: string }[] = [
	{
		name: 'Serveus',
		description: 'On-demand parcel delivery — App Store, 2026',
		href: 'https://apps.apple.com/us/app/serveus-peer-delivery/id6746662724'
	},
	{
		name: 'Rider365',
		description: 'Motorcycle ride planning in Expo — App Store, 2026',
		href: 'https://apps.apple.com/us/app/rider-365-never-ride-alone/id6748325897'
	},
	{ name: 'AutoAce', description: 'Voice-tone and background-noise classifier for call recordings, built in 9 days' },
	{ name: 'FieldDiligence', description: 'Jobber-to-QuickBooks invoice matcher that shrinks a month of invoices to a short review list' }
];

export const experience = [
	{
		org: 'Myne Global',
		role: 'Lead Engineer',
		place: 'Los Angeles',
		period: '2021 – Present',
		note: 'Built the provenance platform end to end: web, iOS, billing, encryption and dealer network.'
	},
	{
		org: 'Healthcare records platform',
		role: 'Senior Engineer (contract)',
		place: 'Irvine, CA',
		period: 'May – Jun 2026',
		note: 'Sole engineer across five repositories; mobile MRI/CT viewing, authorization hardening, first iOS release.'
	},
	{
		org: 'Freelance',
		role: 'Web Developer',
		place: 'Los Angeles',
		period: '2021 – 2023',
		note: 'React sites and a custom Shopify storefront with members-only drops for small businesses.'
	}
];
