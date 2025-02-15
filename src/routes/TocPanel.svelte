<!-- src/TocPanel.svelte -->
<script>
    import { layers } from './layers.js';
    import { onDestroy } from 'svelte';
    import TocItem from './TocItem.svelte';
  
    let layerList = [];
  
    const unsubscribe = layers.subscribe((value) => {
      layerList = value;
    });
  
    onDestroy(() => {
      unsubscribe();
    });
  </script>
  
  <div id="toc-panel">
    {#each [...layerList].reverse() as layer (layer.id)}
    <!-- {#each layerList as layer (layer.id)} -->
      <TocItem {layer} />
    {/each}
  </div>
  
  <style>
    #toc-panel {
      /* Panel styling */
      font-family: sans-serif;
    }
  </style>
  