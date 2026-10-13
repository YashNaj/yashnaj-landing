<svg class="story pills" viewBox="0 0 400 300" aria-hidden="true">
	<defs>
		<pattern id="halftone" width="8" height="8" patternUnits="userSpaceOnUse">
			<circle cx="4" cy="4" r="1.6" fill="currentColor" />
		</pattern>
	</defs>
	<g class="layer" style="--depth: -2">
		<rect class="c" x="32" y="22" width="336" height="256" />
		<line class="c" x1="206" y1="22" x2="206" y2="138" />
		<line class="c" x1="32" y1="138" x2="368" y2="138" />
		<line class="c" x1="148" y1="138" x2="148" y2="278" />
	</g>
	<g class="layer" style="--depth: 0">
		<rect class="stroke ink" pathLength="1" x="40" y="30" width="320" height="240" />
		<rect class="stroke" pathLength="1" x="48" y="38" width="154" height="96" />
		<rect class="stroke" pathLength="1" x="210" y="38" width="142" height="96" />
		<rect class="stroke" pathLength="1" x="48" y="142" width="96" height="120" />
		<rect class="stroke" pathLength="1" x="152" y="142" width="200" height="120" />
		<!-- panel 1: the speech bubble -->
		<g class="st-panel" style="--i: 0">
			<path class="stroke" pathLength="1" d="M72 50 h96 a10 10 0 0 1 10 10 v26 a10 10 0 0 1 -10 10 h-62 l-16 14 l3 -14 h-21 a10 10 0 0 1 -10 -10 v-26 a10 10 0 0 1 10 -10 Z" />
			<line class="stroke" pathLength="1" x1="76" y1="66" x2="158" y2="66" />
			<line class="stroke dim" pathLength="1" x1="76" y1="78" x2="140" y2="78" />
			<line class="stroke dim" pathLength="1" x1="56" y1="124" x2="118" y2="124" />
		</g>
		<!-- panel 2: POW and the pill -->
		<g class="st-panel" style="--i: 1">
			<g class="wobble">
				<path class="stroke sig" pathLength="1" d="M285 48 L295 71 L320 64 L308 86 L330 100 L304 104 L308 128 L288 112 L270 130 L268 106 L244 102 L264 88 L252 66 L276 72 Z" />
			</g>
			<g class="bob">
				<path class="capsule-fill after" d="M293.3 99 L281 107.6 A11 11 0 0 1 268.4 89.6 L280.7 81 Z" />
				<path class="stroke" pathLength="1" d="M281 107.6 L305.6 90.4 A11 11 0 0 0 293 72.4 L268.4 89.6 A11 11 0 0 0 281 107.6 Z" />
				<line class="stroke" pathLength="1" x1="293.3" y1="99" x2="280.7" y2="81" />
			</g>
		</g>
		<!-- panel 3: halftone -->
		<g class="st-panel" style="--i: 2">
			<!-- the mask sits here, not in the top defs, so its grow lands after the panel borders in the sequence -->
			<defs>
				<mask id="halftone-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="300">
					<circle class="grow" cx="96" cy="202" r="90" fill="white" />
				</mask>
			</defs>
			<rect x="48" y="142" width="96" height="120" fill="url(#halftone)" fill-opacity="0.5" mask="url(#halftone-reveal)" />
			<line class="stroke dim" pathLength="1" x1="56" y1="250" x2="136" y2="170" />
		</g>
		<!-- panel 4: later… -->
		<g class="st-panel" style="--i: 3">
			<rect class="stroke dim framed-tag" pathLength="1" x="158" y="148" width="66" height="16" />
			<text class="dimtext type framed" x="164" y="159">LATER…</text>
			<path class="stroke st-arc" pathLength="1" d="M170 236 C 210 176 280 176 340 236" />
			<rect class="after" x="152" y="206" width="200" height="56" fill="url(#halftone)" fill-opacity="0.3" />
			<line class="after march" x1="316" y1="226" x2="186" y2="168" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
			<line class="after march" x1="318" y1="232" x2="178" y2="200" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
			<line class="after march" x1="316" y1="240" x2="182" y2="236" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
			<line class="after march" x1="322" y1="222" x2="232" y2="156" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
			<line class="after march" x1="328" y1="220" x2="282" y2="176" style="stroke: var(--color-line-dim); stroke-width: 1.5" />
		</g>
	</g>
	<g class="layer" style="--depth: 2.5">
		<line class="stroke dim" pathLength="1" x1="28" y1="24" x2="40" y2="24" />
		<line class="stroke dim" pathLength="1" x1="34" y1="18" x2="34" y2="30" />
		<line class="stroke dim" pathLength="1" x1="360" y1="276" x2="372" y2="276" />
		<line class="stroke dim" pathLength="1" x1="366" y1="270" x2="366" y2="282" />
		<text class="dimtext type" x="44" y="16">ISSUE 01 · POP-ART EDITION</text>
		<text class="dimtext type" x="330" y="292">P. 04</text>
		<g class="stamp">
			<rect class="stroke sig" pathLength="1" x="290" y="150" width="52" height="20" rx="2" />
			<text class="sigtext" x="298" y="165">POW!</text>
		</g>
	</g>
	<g class="layer" style="--depth: 3.5">
		<text class="sigtext live" x="322" y="58">!!</text>
	</g>
</svg>
