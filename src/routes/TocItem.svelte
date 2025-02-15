<!-- src/TocItem.svelte -->
<script>
  export let layer;
  let isVisible = layer.isVisible;
  let isExpanded = false;

  function toggleExpand() {
    isExpanded = !isExpanded;
  }

  function toggleVisibility() {
    isVisible = !isVisible;
    console.log("Toggle visibility : " + isVisible);
    layer.isVisible = isVisible;
    if (layer.olLayer) {
      layer.olLayer.setVisible(isVisible);
    }
  }
</script>

<!-- 
-- In TocItem.svelte 
<script>
  let isExpanded = false;

  function toggleExpand() {
    isExpanded = !isExpanded;
  }
</script>

<div class="toc-item">
  <button on:click={toggleExpand}>
    {isExpanded ? '▾' : '▸'}
  </button>
</div>

{#if isExpanded}
  <div class="toc-sub-items">
  </div>
{/if}
-->

<div class="toc-item">
  <fieldset>
    <legend>
      <input
        type="checkbox"
        checked={isVisible}
        on:change={toggleVisibility}
        disabled={layer.isLoading || layer.hasError}
        id="toc-item-{layer.id}"
      />
      <label for="toc-item-{layer.id}">{layer.name}</label></legend
    >
    {layer.settings.type} &middot;
    {#if layer.isLoading}
      <span class="loading-spinner">Loading...</span>
    {:else if layer.hasError}
      <span class="error-indicator">Failed to load</span>
    {:else}
      <span>Loaded correctly</span>
      &middot;
      <span>
        {#if layer.settings.type == "IIIF"}
          <a
            href="//dev.viewer.allmaps.org/?url={layer.settings.url}"
            target="_blank">Allmaps</a
          >
        {/if}
      </span>
      <button on:click={toggleExpand}>
        {isExpanded ? "▾" : "▸"}
      </button>
      {#if isExpanded}
        <div class="toc-sub-items"></div>
      {/if}
      <div>
        <!-- <ul> -->
        {#each layer.masks as m}
          <!-- <li> -->
          <img src={m} loading="lazy" width="64" alt="Thumbnail for {m}" style="border-radius: 10px; border: 1px solid darkgray; margin: 1px;">
          <!-- </li> -->
        {/each}
      </div>
      <!-- </ul> -->
    {/if}
  </fieldset>
</div>

<style>
  .toc-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #ccc;
  }
  .loading-spinner {
    margin-left: 10px;
    /* Spinner styling */
  }
  .error-indicator {
    color: red;
    margin-left: 10px;
  }
</style>
