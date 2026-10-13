<script lang="ts">
	import Plane from './Plane.svelte';
	import Wire from './Wire.svelte';
	import { band, lean, pose, rectXZ, roundedRect, weigh, type Edge, type Vec3 } from './project';

	// A scan volume (five axial slices, each with its own cross-section) beside the phone viewer, both in 3D;
	// models.js turns them in from FROM. The phone leans to face the reader inside the steeper scene.
	const HALF = 5; // half the phone's depth
	const FROM = [-10, 12];
	const TO: [number, number] = [-26, 22];
	const final = pose(TO[0], TO[1], [200, 150]);
	const SLICES = [64, 98, 132, 166, 200];
	const SCALE = [0.55, 0.8, 1, 0.9, 0.65]; // the head is narrow at the crown and the base
	const L = lean([318, 145, 0], TO, [-20, 8]);
	const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	const front = roundedRect(270, 40, 96, 210, 16, HALF).map(L);
	const back = roundedRect(270, 40, 96, 210, 16, -HALF).map(L);
	const faceO = L([0, 0, HALF]);
	const faceU = sub(L([1, 0, HALF]), faceO);
	const faceV = sub(L([0, 1, HALF]), faceO);
	// the bridge leaves the stack's front-right corner and lands on the viewer's screen edge
	const q = (a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 => [0, 1, 2].map((i) => (1 - t) ** 2 * a[i] + 2 * (1 - t) * t * c[i] + t * t * b[i]) as Vec3;
	const bridge = Array.from({ length: 9 }, (_, i) => q([190, 166, 45], [236, 118, 58], L([276, 110, HALF]), i / 8));
	const edges: Edge[] = weigh(
		final,
		[
			...SLICES.map((y, i) => ({ pts: rectXZ(50, 190, y, -45, 45), cls: i === SLICES.length - 1 ? 'stroke' : 'stroke dim' })),
			...[50, 190].flatMap((x) => [-45, 45].map((z) => ({ pts: [[x, 64, z], [x, 200, z]] as Vec3[], cls: 'stroke dim' }))),
			{ pts: back, w: 1.35 },
			...band(front.slice(0, -1), back, 2).map((pts) => ({ pts, cls: 'stroke dim' })),
			{ pts: bridge, cls: 'stroke dim' },
			{ pts: bridge, cls: 'pulse live st-bridge', w: 2.4 }
		],
		HALF
	);
	const plane: Edge[] = [{ pts: rectXZ(50, 190, 64, -45, 45), cls: 'stroke sig', w: 1.6 }];
	const drop = +(136 * Math.cos((TO[1] * Math.PI) / 180)).toFixed(2); // a 136-unit fall in 3D, as seen at the final pitch
	const mid = final.point(bridge[4]).map((n) => +n.toFixed(1));
</script>

<!-- one axial cross-section, centred on its origin; drawn on a slice in the stack and in the viewer -->
{#snippet scan(cls: string)}
	<path class="stroke {cls}" pathLength="1" d="M-50 0 C -50 -34 50 -34 50 0 C 50 30 10 40 -10 36 C -38 32 -50 18 -50 0 Z" />
	<path class="stroke dim" pathLength="1" d="M-42 1 C -42 -28 42 -28 42 1 C 42 26 8 34 -9 31 C -33 27 -42 15 -42 1 Z" />
	<path class="stroke dim" pathLength="1" d="M-20 -10 C -14 -16 -4 -16 0 -10" />
	<path class="stroke dim" pathLength="1" d="M-16 12 C -10 18 2 18 8 12" />
{/snippet}

<svg class="story mri" viewBox="0 0 400 300" aria-hidden="true" data-model data-centre="200,150" data-from={FROM.join(',')} data-to={TO.join(',')}>
	<Plane pose={final} o={[0, 0, 0]}>
		<line class="c" x1="130" y1="36" x2="130" y2="262" />
		<line class="c" x1="24" y1="248" x2="236" y2="248" />
		<rect class="c" x="264" y="34" width="108" height="222" />
		<line class="c" x1="222" y1="190" x2="282" y2="110" />
	</Plane>
	<Wire pose={final} {edges} />
	<!-- every slice carries its own cross-section, in the slice's (x, z) plane; the one under the plane lights up -->
	{#each SLICES as y, i}
		<Plane pose={final} o={[0, y, 0]} v={[0, 0, 1]}>
			<g class="scan-on-slice" transform="translate(120 0) scale({SCALE[i]})">
				{@render scan(`dim st-scan f${i}`)}
			</g>
		</Plane>
	{/each}
	<!-- the active slice: steps down the stack on the loop clock -->
	<g class="st-plane-g" style="--drop: {drop}px">
		<Wire pose={final} edges={plane} />
	</g>
	<Plane pose={final} o={faceO} u={faceU} v={faceV} class="face">
		<rect class="face-fill" x="270" y="40" width="96" height="210" rx="16" />
		<rect class="stroke ink" pathLength="1" x="270" y="40" width="96" height="210" rx="16" />
		<rect class="stroke dim" pathLength="1" x="276" y="46" width="84" height="198" rx="11" />
		<rect class="stroke" pathLength="1" x="304" y="52" width="28" height="6" rx="3" />
		<rect class="stroke" pathLength="1" x="282" y="74" width="72" height="72" />
		<!-- the viewer shows the slice the plane is on -->
		{#each SCALE as s, i}
			<g class="st-frame f{i}" style="--i: {i}" transform="translate(318 110) scale({(0.6 * s).toFixed(3)})">
				{@render scan('')}
			</g>
		{/each}
		<line class="stroke dim" pathLength="1" x1="284" y1="170" x2="352" y2="170" />
		<circle class="knob after" cx="318" cy="170" r="5" />
		<rect class="stroke sig" pathLength="1" x="282" y="182" width="22" height="10" rx="5" />
		<rect class="stroke dim" pathLength="1" x="308" y="182" width="22" height="10" rx="5" />
		<rect class="stroke dim" pathLength="1" x="334" y="182" width="22" height="10" rx="5" />
		<rect class="stroke dim" pathLength="1" x="282" y="202" width="34" height="12" rx="6" />
		<rect class="stroke dim" pathLength="1" x="320" y="202" width="34" height="12" rx="6" />
		<line class="stroke" pathLength="1" x1="302" y1="238" x2="334" y2="238" />
	</Plane>
	<!-- flat callouts -->
	<g>
		<text class="dimtext type" x={mid[0] + 8} y={mid[1] - 8}>BRIDGE</text>
		<text class="dimtext type" x="24" y="30">AXIAL · T2</text>
		<text class="sigtext after st-slice-static" x="272" y="272" data-count="115" data-prefix="SLICE " data-suffix="/232">SLICE 115/232</text>
		{#each [115, 116, 117, 118, 119] as n, i}
			<text class="sigtext st-slice" x="272" y="272" style="--i: {i}">SLICE {n}/232</text>
		{/each}
	</g>
</svg>
