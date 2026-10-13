<script lang="ts">
	import { edgePath, type Edge, type Pose } from './project';
	let { pose, edges }: { pose: Pose; edges: Edge[] } = $props();
</script>

<g class="wire">
	{#each edges as e}
		<path class={e.cls ?? 'stroke'} pathLength="1" d={edgePath(pose, e.pts)} data-pts={JSON.stringify(e.pts)} data-part={e.part} style:stroke-width={e.w} />
	{/each}
</g>
