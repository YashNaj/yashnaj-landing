export type Link = { label: string; href: string };
export type SlideFrame = 'phone' | 'browser';
export type Slide =
	| { kind: 'image'; src: string; width: number; height: number; alt: string; caption: string; frame: SlideFrame }
	| { kind: 'video'; src: string; poster: string; width: number; height: number; alt: string; caption: string; frame: SlideFrame }
	| { kind: 'cta'; href: string; label: string; caption: string };
export type ProjectDetail = { problem: string; built: string; how: string; outcome: string };
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
	detail: ProjectDetail;
	slides: Slide[];
	demo?: { href: string; label: string };
};

export const profile = {
	name: 'Yashal Najeeb',
	role: 'Full-Stack Product Engineer · iOS, React Native, TypeScript, Postgres',
	pitch:
		'I take products from zero to the App Store — most recently a provenance platform now holding $10M+ in luxury assets, and a five-repo HIPAA platform I rescued as its sole engineer.',
	availability: 'Open to full-time and contract roles · Remote, hybrid or on-site around Los Angeles',
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
			'Line drawing of a phone: a tap ripple lands on a greyed-out button and a NO EFFECT label stamps beside it.',
		detail: {
			problem:
				'Coding agents can write an iOS app but can’t tell whether it works. Pointed at the Simulator, an agent taps a disabled button and reports “Done” — nothing happened, and it has no way of knowing.',
			built:
				'chauffeur is an MCP server and agent skill, written in Swift, that lets Claude Code, Codex or Cursor drive the iOS Simulator and get the truth back. It installs with Homebrew and ships a doctor command that checks your Xcode setup.',
			how:
				'It hands the agent the screen as an accessibility outline it can reason about, taps through the Simulator’s own input system, then checks what actually changed. A tap that did nothing returns NO EFFECT, one an alert swallowed returns INTERCEPTED, and a crash returns APP CRASHED with the line that caused it.',
			outcome:
				'Benchmarked head to head with Xcode 27’s own MCP server over 180 runs: on Opus it verified 45 of 45 tasks to Xcode’s 39, in under half the turns at roughly a sixth of the cost — and it answered every crash and log task Xcode couldn’t.'
		},
		slides: [
			{ kind: 'video', src: '/media/chauffeur/honest.mp4', poster: '/media/chauffeur/honest.webp', width: 960, height: 722, frame: 'browser', alt: 'Screen recording: an agent taps a disabled button and chauffeur reports NO EFFECT', caption: 'NO EFFECT — the tap changed nothing, and the agent is told so' },
			{ kind: 'video', src: '/media/chauffeur/race.mp4', poster: '/media/chauffeur/race.webp', width: 960, height: 1444, frame: 'browser', alt: 'Side-by-side recording of the same task with chauffeur and with Xcode 27’s MCP server', caption: 'Same task, both tools: 5 turns vs 14' },
			{ kind: 'video', src: '/media/chauffeur/crash.mp4', poster: '/media/chauffeur/crash.webp', width: 960, height: 722, frame: 'browser', alt: 'Screen recording: the app crashes and chauffeur reports APP CRASHED with the failing line', caption: 'APP CRASHED — with the line that caused it' }
		]
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
			'Exploded-view drawing of a vault door with a Myne Passport pulled out beside it, with callout labels.',
		detail: {
			problem:
				'Collectors of watches, bags and other high-value goods had no way to prove they owned an item — or that it wasn’t stolen — when it came time to sell.',
			built:
				'As lead engineer I built Myne end to end: a SvelteKit API on Postgres with row-level security, a SwiftUI iOS app, and Stripe plus StoreKit billing. Owners register items in a private vault, dealers issue Myne Passports at the point of sale, and repair shops log service history with in-app estimate approval.',
			how:
				'Ownership transfers use owner-held keys with escrowed recovery, so the server never reads an item’s private data. Every buyer search is checked against a registry of 16,830 law-enforcement and Interpol stolen-item records. Design specs and API handoffs keep the web, iOS and repair-shop work in step.',
			outcome:
				'$10M+ in registered assets across 1,200 items and 400 collectors. Shifting revenue to dealers signed 12 NYC shops whose 800 passports became verified items in buyers’ vaults in the first quarter, and a proactive audit found and closed two critical privilege-escalation paths the same day.'
		},
		slides: [
			['Home: watch news and quick actions to add an item or search for stolen goods', 'Home screen with watch news and quick actions'],
			['The vault: every registered piece in one collection', 'Vault listing a Rolex Datejust and a Cartier bracelet'],
			['An item record: transfer it, report it stolen, or export a PDF', 'Rolex Datejust 41 item record with Transfer, Stolen and PDF actions'],
			['Repair and ownership history logged by service centres', 'Item repair history with service costs, technicians and ratings'],
			['A stolen-item search hit, verified against Interpol records', 'Search result flagging an Audemars Piguet as stolen, Interpol verified']
		].map(([caption, what], i) => ({
			kind: 'image' as const,
			src: `/media/myne/myne-${i + 1}.webp`,
			width: 600,
			height: 1304,
			frame: 'phone' as const,
			alt: `Myne Global iOS app — ${what}`,
			caption
		}))
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
			'Abstract drawing of stacked scan slices fanning out beside a phone with a slice scrubber.',
		demo: { href: '/work/mri-viewer/demo', label: 'Try the live viewer' },
		detail: {
			problem:
				'Clinicians on a healthcare records platform couldn’t view MRI or CT scans on their phones. The platform’s imaging viewer was a three-year-old fork that predated touch support, so the viewport was dead on mobile.',
			built:
				'Rather than a risky major upgrade that the web and admin apps also depended on, I built a small, modern Cornerstone3D viewport as its own build and moved every control a user touches into native React Native: series chips, a slice scrubber, scroll / window-level / pan tools and reset.',
			how:
				'The app fetches the study’s DICOMweb manifest, parses it into series, and pushes a stack of image IDs into the WebView over a thin message bridge — loadStack, setSlice, setPrimaryTool, reset — and the page reports back ready, stackLoaded, slice or error. Gestures map to tool groups: one finger for the active tool, pinch to zoom, three fingers to scroll.',
			outcome:
				'MRI and CT studies render on device with the first image in under 2 seconds. Alongside it I closed 57 of 68 open UAT defects (all 31 on mobile), rebuilt authorization across 156 API routes to derive privilege from the database, and stood up the platform’s first iOS release path.'
		},
		slides: [
			{ kind: 'image', src: '/media/mri/series.webp', width: 780, height: 1688, frame: 'phone', alt: 'MRI viewer showing an axial brain slice with series chips and a slice scrubber', caption: 'Series chips and a native slice scrubber' },
			{ kind: 'image', src: '/media/mri/volume.webp', width: 780, height: 1688, frame: 'phone', alt: 'MRI viewer on a 100-slice T1 volume, scrolled to the middle of the stack', caption: 'A 100-slice T1 volume, mid-scroll' },
			{ kind: 'image', src: '/media/mri/flair.webp', width: 780, height: 1688, frame: 'phone', alt: 'MRI viewer showing a FLAIR series with the Window tool selected', caption: 'FLAIR series with window/level' },
			{ kind: 'cta', href: '/work/mri-viewer/demo', label: 'Try the live viewer', caption: 'The real viewer, running in your browser' }
		]
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
		drawingLabel: 'Comic-book page drawing: panel grid, halftone shading and a speech bubble.',
		detail: {
			problem:
				'A writer wanted a blog with real personality — and to run all of it herself, from drafting and scheduling to the mailing list, without calling a developer.',
			built:
				'A pop-art public site with a featured post, ticker, RSS and generated share images, plus a full admin: a TipTap editor with autosave, scheduling and preview, comic-styled banners, a plain-language SEO panel, a media library, submissions, the mailing list, analytics and backups.',
			how:
				'Publishing runs on database triggers, so “publish now” and scheduled posts behave the same way: the new-post email goes out exactly once through a Supabase edge function, and the post is shared to the writer’s linked X and Threads accounts. Social tokens and API keys are encrypted at rest.',
			outcome:
				'Live at hardpillstoswallow.com and run end to end by a non-technical writer — every post, schedule, email and social share happens without a developer in the loop.'
		},
		slides: [
			{ kind: 'image', src: '/media/hard-pills/home.webp', width: 1440, height: 900, frame: 'browser', alt: 'Hard Pills to Swallow home page: pop-art featured post and recent articles', caption: 'Home: featured post, ticker and recent articles' },
			{ kind: 'image', src: '/media/hard-pills/article.webp', width: 1440, height: 900, frame: 'browser', alt: 'A Hard Pills to Swallow article page with a comic-styled banner', caption: 'An article with its comic-styled banner' },
			{ kind: 'image', src: '/media/hard-pills/mobile.webp', width: 780, height: 1688, frame: 'phone', alt: 'Hard Pills to Swallow home page on a phone', caption: 'The same site on a phone' }
		]
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
