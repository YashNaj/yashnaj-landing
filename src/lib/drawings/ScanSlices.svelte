<script lang="ts">
	import Plane from './Plane.svelte';
	import Wire from './Wire.svelte';
	import { band, pose, rectXZ, roundedRect, weigh, type Edge, type Vec3 } from './project';

	// A scan volume (five axial slices) beside the phone viewer, both in 3D; models.js turns them in from FROM.
	const HALF = 5; // half the phone's depth
	const FROM = [-10, 12];
	const TO = [-26, 22];
	const final = pose(TO[0], TO[1], [200, 150]);
	const SLICES = [64, 98, 132, 166, 200];
	const front = roundedRect(270, 40, 96, 210, 16, HALF);
	const back = roundedRect(270, 40, 96, 210, 16, -HALF);
	// the bridge leaves the stack's front-right corner and lands on the viewer's screen edge
	const q = (a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 => [0, 1, 2].map((i) => (1 - t) ** 2 * a[i] + 2 * (1 - t) * t * c[i] + t * t * b[i]) as Vec3;
	const bridge = Array.from({ length: 9 }, (_, i) => q([190, 166, 45], [236, 118, 58], [276, 110, HALF], i / 8));
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

<svg class="story mri" viewBox="0 0 400 300" aria-hidden="true" data-model data-centre="200,150" data-from={FROM.join(',')} data-to={TO.join(',')}>
	<Plane pose={final} o={[0, 0, 0]}>
		<line class="c" x1="130" y1="36" x2="130" y2="262" />
		<line class="c" x1="24" y1="248" x2="236" y2="248" />
		<rect class="c" x="264" y="34" width="108" height="222" />
		<line class="c" x1="222" y1="190" x2="282" y2="110" />
	</Plane>
	<Wire pose={final} {edges} />
	<!-- the scan on the bottom slice: drawn in the slice's own (x, z) plane -->
	<Plane pose={final} o={[0, 200, 0]} v={[0, 0, 1]}>
		<path class="stroke" pathLength="1" d="M80 0 C 80 -34 180 -34 180 0 C 180 30 140 40 120 36 C 92 32 80 18 80 0 Z" />
		<path class="stroke dim" pathLength="1" d="M88 1 C 88 -28 172 -28 172 1 C 172 26 138 34 121 31 C 97 27 88 15 88 1 Z" />
		<path class="stroke" pathLength="1" d="M110 -10 C 116 -16 126 -16 130 -10" />
		<path class="stroke" pathLength="1" d="M114 12 C 120 18 132 18 138 12" />
		<line class="stroke dim" pathLength="1" x1="130" y1="-30" x2="130" y2="36" />
	</Plane>
	<!-- the active slice: steps down the stack on the loop clock -->
	<g class="st-plane-g" style="--drop: {drop}px">
		<Wire pose={final} edges={plane} />
	</g>
	<Plane pose={final} o={[0, 0, HALF]} class="face">
		<rect class="face-fill" x="270" y="40" width="96" height="210" rx="16" />
		<rect class="stroke ink" pathLength="1" x="270" y="40" width="96" height="210" rx="16" />
		<rect class="stroke dim" pathLength="1" x="276" y="46" width="84" height="198" rx="11" />
		<rect class="stroke" pathLength="1" x="304" y="52" width="28" height="6" rx="3" />
		<rect class="stroke" pathLength="1" x="282" y="74" width="72" height="72" />
		<g class="vp vp-a">
			<path class="stroke" pathLength="1" d="M296 110 C 296 90 340 86 342 108 C 344 128 322 136 308 132 C 298 129 296 120 296 110 Z" />
			<path class="stroke" pathLength="1" d="M310 104 C 314 100 320 100 322 104" />
			<path class="stroke" pathLength="1" d="M312 116 C 316 120 322 120 326 116" />
		</g>
		<g class="vp vp-b" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M292 110 C 292 86 344 82 346 108 C 348 132 322 140 306 136 C 294 132 292 122 292 110 Z" />
			<path d="M308 100 C 314 94 324 94 328 102" />
			<path d="M306 118 C 314 126 326 126 332 116" />
		</g>
		<g class="vp vp-c" fill="none" stroke="currentColor" stroke-width="1.5">
			<path d="M300 110 C 300 94 336 92 338 108 C 340 124 322 130 312 128 C 304 126 300 118 300 110 Z" />
			<line x1="318" y1="96" x2="319" y2="126" />
		</g>
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
