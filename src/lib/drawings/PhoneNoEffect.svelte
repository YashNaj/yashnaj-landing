<script lang="ts">
	import Plane from './Plane.svelte';
	import Wire from './Wire.svelte';
	import { band, box, pose, ring, roundedRect, weigh, type Edge } from './project';

	// The phone as a 3D wireframe, drawn in its final 3/4 view; models.js turns it in from FROM on the home page.
	const HALF = 8; // half the body's depth (16 on a 260-tall phone)
	const FROM = [-12, 5];
	const TO = [-30, 10];
	const final = pose(TO[0], TO[1], [200, 150]);
	const front = roundedRect(130, 20, 140, 260, 24, HALF);
	const back = roundedRect(130, 20, 140, 260, 24, -HALF);
	const edges: Edge[] = weigh(
		final,
		[
			{ pts: back, w: 1.35 }, // full ink, so the body closes into one solid phone
			...band(front.slice(0, -1), back, 2).map((pts) => ({ pts, cls: 'stroke dim' })),
			...[...box(127, 130, 70, 88, -3, 3), ...box(127, 130, 96, 122, -3, 3), ...box(270, 273, 92, 128, -3, 3)].map((pts) => ({ pts })),
			{ pts: ring(232, 58, 13, -HALF - 2), cls: 'stroke dim' }, // camera bump on the back
			{ pts: ring(232, 58, 7, -HALF - 2), cls: 'stroke dim' }
		],
		HALF
	);
	const [bx, by] = final.point([214, 177, HALF]).map((n) => +n.toFixed(1));
</script>

<svg class="story chauffeur" viewBox="0 0 400 300" aria-hidden="true" data-model data-centre="200,150" data-from={FROM.join(',')} data-to={TO.join(',')}>
	<!-- construction axes live in the phone's middle plane, so they turn with it -->
	<Plane pose={final} o={[0, 0, 0]}>
		<line class="c" x1="200" y1="8" x2="200" y2="292" />
		<line class="c" x1="104" y1="184" x2="392" y2="184" />
		<rect class="c" x="124" y="14" width="152" height="272" />
		<circle class="c" cx="200" cy="184" r="28" />
	</Plane>
	<Wire pose={final} {edges} />
	<!-- the front face: 2D artwork mapped onto the phone's front plane -->
	<Plane pose={final} o={[0, 0, HALF]} class="face">
		<!-- solid front: hides the body behind it, so the screen sits proud -->
		<rect class="face-fill" x="130" y="20" width="140" height="260" rx="24" />
		<rect class="stroke ink" pathLength="1" x="130" y="20" width="140" height="260" rx="24" />
		<rect class="stroke dim" pathLength="1" x="138" y="28" width="124" height="244" rx="17" />
		<rect class="stroke" pathLength="1" x="181" y="36" width="38" height="10" rx="5" />
		<line class="stroke" pathLength="1" x1="148" y1="41" x2="160" y2="41" />
		<line class="stroke" pathLength="1" x1="236" y1="43" x2="236" y2="40" />
		<line class="stroke" pathLength="1" x1="240" y1="43" x2="240" y2="38" />
		<line class="stroke" pathLength="1" x1="244" y1="43" x2="244" y2="36" />
		<rect class="stroke" pathLength="1" x="247" y="36.5" width="11" height="7" rx="1.8" />
		<line class="stroke" pathLength="1" x1="259.6" y1="39" x2="259.6" y2="41" />
		<rect class="after battery-fill" x="248.8" y="38.3" width="6" height="3.4" rx="0.8" />
		<line class="stroke" pathLength="1" x1="150" y1="62" x2="212" y2="62" />
		<line class="stroke dim" pathLength="1" x1="150" y1="71" x2="188" y2="71" />
		<rect class="stroke" pathLength="1" x="150" y="88" width="100" height="22" rx="4" />
		<line class="stroke dim" pathLength="1" x1="158" y1="99" x2="196" y2="99" />
		<rect class="stroke" pathLength="1" x="150" y="118" width="100" height="22" rx="4" />
		<line class="stroke dim" pathLength="1" x1="158" y1="129" x2="210" y2="129" />
		<rect class="stroke dim" pathLength="1" x="150" y="149" width="8" height="8" rx="1.5" />
		<line class="stroke dim" pathLength="1" x1="164" y1="153" x2="216" y2="153" />
		<rect class="stroke dim btn" pathLength="1" x="150" y="170" width="100" height="28" rx="7" />
		<line class="stroke dim" pathLength="1" x1="182" y1="184" x2="218" y2="184" />
		<line class="stroke" pathLength="1" x1="180" y1="264" x2="220" y2="264" />
		<!-- story: the form fills on tap, then resets (no effect) -->
		<line class="st-type st-a" pathLength="1" x1="158" y1="99" x2="236" y2="99" />
		<line class="st-type st-b" pathLength="1" x1="158" y1="129" x2="222" y2="129" />
		<path class="st-tick" pathLength="1" d="M151.5 153 L154 155.5 L157.5 150.5" />
		<!-- drafting dimensions lie in the face plane -->
		<line class="stroke dim" pathLength="1" x1="112" y1="20" x2="112" y2="280" />
		<path class="stroke dim" pathLength="1" d="M108 28 L112 20 L116 28" />
		<path class="stroke dim" pathLength="1" d="M108 272 L112 280 L116 272" />
		<text class="after" x="64" y="154" data-count="260" data-prefix="H ">H 260</text>
		<line class="stroke dim" pathLength="1" x1="130" y1="292" x2="270" y2="292" />
		<path class="stroke dim" pathLength="1" d="M138 288 L130 292 L138 296" />
		<path class="stroke dim" pathLength="1" d="M262 288 L270 292 L262 296" />
		<text class="after" x="282" y="296" data-count="140" data-prefix="W ">W 140</text>
		<circle class="tapdot after" cx="200" cy="184" r="3.5" />
		<circle class="stroke sig" pathLength="1" cx="200" cy="184" r="9" />
		<circle class="stroke sig" pathLength="1" cx="200" cy="184" r="18" />
		<circle class="ripple live" cx="200" cy="184" r="10" />
		<circle class="ripple live" cx="200" cy="184" r="10" />
		<g class="cursor">
			<path class="stroke" pathLength="1" d="M204 190 L204 210 L209 205 L213 214 L217 212 L213 203 L220 203 Z" />
		</g>
	</Plane>
	<!-- callouts stay flat on the sheet; the leader starts at the projected button -->
	<g>
		<polyline class="stroke sig leader" pathLength="1" data-anchor="214,177,{HALF}" points="{bx},{by} 276,117 298,117" />
		<path class="pulse live leader-pulse" pathLength="1" data-anchor="214,177,{HALF}" d="M{bx} {by} L276 117 L298 117" />
		<g class="stamp">
			<rect class="stroke sig" pathLength="1" x="298" y="104" width="90" height="26" rx="2" />
			<text class="sig type" x="306" y="121">NO EFFECT</text>
		</g>
		<text class="dimtext type st-zero" x="300" y="146">0 CHANGES</text>
		<text class="sigtext st-one" x="300" y="146">1 CHANGE</text>
	</g>
</svg>
