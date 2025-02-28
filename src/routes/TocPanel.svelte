<script>
  import { layers } from "./layers.js";
  import { onDestroy } from "svelte";
  import TocItem from "./TocItem.svelte";

  let { zoomToExtentFn } = $props();
  let layerList = $state([]);

  const unsubscribe = layers.subscribe((value) => {
    layerList = value;
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<div id="toc-panel">
  {#each [...layerList].reverse() as layer (layer.id)}
    <TocItem
      {layer}
      zoomToExtentFn={(e) => {
        zoomToExtentFn(e);
      }}
    />
  {/each}
</div>

<style>
  #toc-panel {
    font-family: sans-serif;
  }
</style>
