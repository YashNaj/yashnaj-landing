<script lang="ts">
	import type { Snippet } from 'svelte';
	import { matrixAttr, type Pose, type Vec3 } from './project';
	let { pose, o, u = [1, 0, 0], v = [0, 1, 0], part, class: klass = '', children }: { pose: Pose; o: Vec3; u?: Vec3; v?: Vec3; part?: string; class?: string; children: Snippet } = $props();
</script>

<g class={klass} transform={matrixAttr(pose.plane(o, u, v))} data-plane={[...o, ...u, ...v].join(',')} data-part={part}>
	{@render children()}
</g>
