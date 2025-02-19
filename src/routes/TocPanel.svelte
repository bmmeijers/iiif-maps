<!-- src/TocPanel.svelte -->
<script>
  import { layers } from "./layers.js";
  import { onDestroy } from "svelte";
  import TocItem from "./TocItem.svelte";

  let layerList = [];

  const unsubscribe = layers.subscribe((value) => {
    layerList = value;
  });

  function updateLayerZIndex(layerId, newZIndex) {
    // console.log("updatelayer called");
    const layer = layerList.findIndex((l) => l.id === layerId);
    if (layer) {
      // console.log(layer);
      let item = layerList[layer];
      item.olLayer.setZIndex(newZIndex);
      item.zIndex = newZIndex;
      layerList[layer] = item;
      layers.set([...layerList]);
      // Trigger any necessary updates to the map here
    }
  }

  onDestroy(() => {
    unsubscribe();
  });
</script>

<div id="toc-panel">
  {#each [...layerList].reverse() as layer (layer.id)}
    <!-- {#each layerList as layer (layer.id)} -->
    <TocItem
      {layer}
      updateZIndex={(event) => updateLayerZIndex(layer.id, event.detail)}
    />
  {/each}
</div>

<style>
  #toc-panel {
    /* Panel styling */
    font-family: sans-serif;
  }
</style>
