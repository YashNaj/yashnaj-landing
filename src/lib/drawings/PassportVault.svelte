<script lang="ts">
	import Plane from './Plane.svelte';
	import Wire from './Wire.svelte';
	import { band, box, pose, ring, roundedRect, weigh, type Edge } from './project';

	// A vault door (a thick cylinder on a hinge block) beside a passport slab, both in 3D; models.js turns them in
	// from FROM and swings the door on its hinge during the loop.
	const DZ = 10; // half the door's depth
	const PZ = 3; // half the passport's thickness
	const FROM = [-8, 4];
	const TO = [-24, 8];
	const final = pose(TO[0], TO[1], [200, 155]);
	const doorFront = ring(140, 155, 95, DZ, 32);
	const doorBack = ring(140, 155, 95, -DZ, 32);
	const passFront = roundedRect(248, 85, 112, 150, 8, PZ);
	const passBack = roundedRect(248, 85, 112, 150, 8, -PZ);
	const edges: Edge[] = weigh(
		final,
		[
			{ pts: ring(140, 155, 100, DZ, 40), cls: 'stroke dim' }, // the jamb: stays put, so an open door reveals the vault
			{ pts: ring(140, 155, 100, -DZ, 40), cls: 'stroke dim' },
			{ pts: doorBack, w: 1.35, part: 'door' }, // full ink, so the door reads as one solid drum
			...band(doorFront.slice(0, -1), doorBack, 2).map((pts) => ({ pts, cls: 'stroke dim', part: 'door' })),
			...box(30, 42, 122, 188, -DZ, DZ).map((pts) => ({ pts })), // hinge block
			{ pts: passBack, w: 1.35 },
			...band(passFront.slice(0, -1), passBack, 2).map((pts) => ({ pts, cls: 'stroke dim' }))
		],
		DZ
	);
	// the eight bolts retract 6 units toward the hub
	const bolts = Array.from({ length: 8 }, (_, i) => {
		const a = (i * Math.PI) / 4;
		return { x: +(140 + 87 * Math.cos(a)).toFixed(1), y: +(155 + 87 * Math.sin(a)).toFixed(1), dx: +(-6 * Math.cos(a)).toFixed(2), dy: +(-6 * Math.sin(a)).toFixed(2) };
	});
	const at = (x: number, y: number, z: number) => final.point([x, y, z]).map((n) => +n.toFixed(1));
	const [vx, vy] = at(92, 72, DZ);
	const [px, py] = at(320, 85, PZ);
</script>

<svg class="story myne" viewBox="0 0 400 300" aria-hidden="true" data-model data-centre="200,155" data-from={FROM.join(',')} data-to={TO.join(',')} data-hinge="42,{DZ},24">
	<defs>
		<pattern id="hatch-myne" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
			<line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width="1" opacity="0.45" />
		</pattern>
	</defs>
	<Plane pose={final} o={[0, 0, 0]}>
		<line class="c" x1="30" y1="155" x2="250" y2="155" />
		<line class="c" x1="140" y1="45" x2="140" y2="265" />
		<circle class="c" cx="140" cy="155" r="104" />
		<rect class="c" x="242" y="79" width="124" height="162" />
	</Plane>
	<Wire pose={final} {edges} />
	<!-- hinge block face -->
	<Plane pose={final} o={[0, 0, DZ]}>
		<line class="stroke dim" pathLength="1" x1="30" y1="140" x2="42" y2="140" />
		<line class="stroke dim" pathLength="1" x1="30" y1="170" x2="42" y2="170" />
	</Plane>
	<!-- the door face: swings with the door -->
	<Plane pose={final} o={[0, 0, DZ]} part="door" class="face">
		<circle class="face-fill" cx="140" cy="155" r="95" />
		<circle class="stroke ink" pathLength="1" cx="140" cy="155" r="95" />
		<circle class="stroke" pathLength="1" cx="140" cy="155" r="78" />
		<path class="hatch after" d="M140 60 a95 95 0 1 0 0.01 0 Z M140 77 a78 78 0 1 0 0.01 0 Z" fill="url(#hatch-myne)" fill-rule="evenodd" />
		{#each bolts as b}
			<circle class="stroke dim st-bolt" pathLength="1" cx={b.x} cy={b.y} r="3" style="--dx: {b.dx}px; --dy: {b.dy}px" />
		{/each}
		<circle class="stroke" pathLength="1" cx="140" cy="155" r="26" />
		<circle class="stroke dim" pathLength="1" cx="140" cy="155" r="16" />
		<line class="stroke dim" pathLength="1" x1="159" y1="155" x2="163" y2="155" />
		<line class="stroke dim" pathLength="1" x1="156.45" y1="164.5" x2="159.92" y2="166.5" />
		<line class="stroke dim" pathLength="1" x1="149.5" y1="171.45" x2="151.5" y2="174.92" />
		<line class="stroke dim" pathLength="1" x1="140" y1="174" x2="140" y2="178" />
		<line class="stroke dim" pathLength="1" x1="130.5" y1="171.45" x2="128.5" y2="174.92" />
		<line class="stroke dim" pathLength="1" x1="123.55" y1="164.5" x2="120.08" y2="166.5" />
		<line class="stroke dim" pathLength="1" x1="121" y1="155" x2="117" y2="155" />
		<line class="stroke dim" pathLength="1" x1="123.55" y1="145.5" x2="120.08" y2="143.5" />
		<line class="stroke dim" pathLength="1" x1="130.5" y1="138.55" x2="128.5" y2="135.08" />
		<line class="stroke dim" pathLength="1" x1="140" y1="136" x2="140" y2="132" />
		<line class="stroke dim" pathLength="1" x1="149.5" y1="138.55" x2="151.5" y2="135.08" />
		<line class="stroke dim" pathLength="1" x1="156.45" y1="145.5" x2="159.92" y2="143.5" />
		<g class="unlock">
			<line class="stroke" pathLength="1" x1="140" y1="129" x2="140" y2="95" />
			<circle class="stroke" pathLength="1" cx="140" cy="90" r="5" />
			<line class="stroke" pathLength="1" x1="162.52" y1="168" x2="191.96" y2="185" />
			<circle class="stroke" pathLength="1" cx="196.29" cy="187.5" r="5" />
			<line class="stroke" pathLength="1" x1="117.48" y1="168" x2="88.04" y2="185" />
			<circle class="stroke" pathLength="1" cx="83.71" cy="187.5" r="5" />
		</g>
	</Plane>
	<!-- the vault's diameter, and the hand-off from vault to passport, stay put when the door swings -->
	<Plane pose={final} o={[0, 0, DZ]}>
		<line class="stroke dim" pathLength="1" x1="140" y1="155" x2="72.8" y2="222.2" />
	</Plane>
	<Plane pose={final} o={[0, 0, 6]}>
		<line class="stroke dim" pathLength="1" x1="202" y1="160" x2="238" y2="160" />
		<path class="stroke dim" pathLength="1" d="M231 154 L238 160 L231 166" />
		<path class="pulse live st-pulse" pathLength="1" d="M140 155 C 190 118, 252 108, 304 138" />
	</Plane>
	<!-- the passport face -->
	<Plane pose={final} o={[0, 0, PZ]} class="face">
		<rect class="face-fill" x="248" y="85" width="112" height="150" rx="8" />
		<g class="slide-out">
			<rect class="stroke ink" pathLength="1" x="248" y="85" width="112" height="150" rx="8" />
			<line class="stroke dim" pathLength="1" x1="256" y1="85" x2="256" y2="235" />
			<rect class="stroke sig" pathLength="1" x="330" y="94" width="20" height="14" rx="2" />
			<rect class="foil-shine live" x="330" y="94" width="20" height="14" rx="2" />
			<circle class="stroke" pathLength="1" cx="304" cy="138" r="22" />
			<circle class="stroke dim" pathLength="1" cx="304" cy="138" r="16" />
			<path class="stroke sig st-check" pathLength="1" d="M294 138 l7 7 l14 -14" />
			<line class="stroke" pathLength="1" x1="268" y1="186" x2="340" y2="186" />
			<line class="stroke dim" pathLength="1" x1="268" y1="198" x2="326" y2="198" />
			<line class="stroke dim" pathLength="1" x1="268" y1="210" x2="334" y2="210" />
			<line class="stroke dim" pathLength="1" x1="266" y1="224" x2="344" y2="224" />
		</g>
	</Plane>
	<!-- flat callouts; leaders start on the projected door rim and passport corner -->
	<g>
		<text class="after" x="34" y="262" data-count="190" data-prefix="Ø ">Ø 190</text>
		<polyline class="stroke sig" pathLength="1" data-anchor="320,85,{PZ}" points="{px},{py} 340,52 386,52" />
		<text class="type" x="322" y="46">PASSPORT</text>
		<text class="dimtext type" x="322" y="66">OWNER-HELD KEY</text>
		<polyline class="stroke sig" pathLength="1" data-anchor="92,72,{DZ}" points="{vx},{vy} 72,34 18,34" />
		<text class="type" x="18" y="27">VAULT</text>
		<text class="dimtext type st-rec-a" x="18" y="48">16,830 RECORDS</text>
		<text class="dimtext st-rec-b" x="18" y="48">16,831 RECORDS</text>
		<rect class="st-clock" width="0" height="0" />
	</g>
</svg>
