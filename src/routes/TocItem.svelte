<!-- src/TocItem.svelte -->
<script>
  export let layer;
  // export let updateZIndex;

  let isVisible = layer.isVisible;
  let opacity = 1; // Default opacity value

  function handleOpacityChange(event) {
    opacity = Number(event.target.value);
    // console.log("Change opacity : " + opacity);
    if (layer.olLayers) {
      layer.olLayers.forEach((l) => l.setOpacity(opacity));
    }
  }
  let isExpanded = false;

  function toggleExpand() {
    isExpanded = !isExpanded;
  }

  function toggleVisibility() {
    isVisible = !isVisible;
    console.log("Toggle visibility : " + isVisible);
    layer.isVisible = isVisible;
    // if (layer.olLayer) {
    //   layer.olLayer.setVisible(isVisible);
    // }
    if (layer.olLayers.length > 0) {
      layer.olLayers.forEach((element) => {
        element.setVisible(isVisible);
      });
    }
  }

  // function up() {
  //   layer.zIndex += 1;
  //   updateZIndex(layer.id, layer.zIndex);
  // }
  // function down() {
  //   layer.zIndex -= 1;
  //   updateZIndex(layer.id, layer.zIndex);
  // }
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

      <label for="toc-item-{layer.id}">{layer.name}</label>

      <!-- <button disabled={layer.zIndex === 0} on:click={down}>
        {layer.zIndex} &DownArrow;
      </button>
      <button disabled={layer.zIndex === 0} on:click={up}>
        {layer.zIndex} &UpArrow;
      </button> -->
    </legend>
    <div>
      Opacity:
      <input
        disabled={layer.isLoading || layer.hasError}
        type="range"
        min="0"
        max="1"
        step="0.05"
        bind:value={opacity}
        on:input={handleOpacityChange}
      />
    </div>
    {#if layer.isLoading}
      <span class="loading-spinner">🔄</span>
    {:else if layer.hasError}
      <span class="error-indicator">❗</span>
    {:else}
      <span>
        {#if layer.settings.type == "IIIF"}
          <a
            href="//dev.viewer.allmaps.org/?url={layer.settings.url}"
            target="_blank"
            aria-label="Open in Allmaps Viewer"><span class="allmaps"></span></a
          >
          &middot;
          <a href={layer.settings.url} aria-label="IIIF manifest" target="_blank"
            ><span class="iiif"></span></a
          >
          &middot;
          <button on:click={toggleExpand}>
            {isExpanded ? "▾" : "▸"}
          </button>
          
        {:else}
          {layer.settings.type}
        {/if}
      </span>

      <div>
        {#if isExpanded}
          {#each layer.iconImageUrls as src}
            <img
              {src}
              loading="lazy"
              width="128"
              alt="Thumbnail for {src}"
              class="rounded-border"
            />
          {/each}
        {/if}
      </div>
    {/if}
  </fieldset>
</div>

<style>
  .rounded-border {
    border-radius: 10px;
    border: 1px solid darkgray;
    margin: 1px;
  }
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
  .iiif {
    display: inline-block;
    background-repeat: no-repeat;
    background-size: 23px 20px;
    cursor: pointer;
    width: 23px;
    height: 20px;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAeCAYAAABJ/8wUAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpDRkQyMTBBMDMyNjIxMUUzQkJBM0QwRjI2NzMyQkY5MSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpDRkQyMTBBMTMyNjIxMUUzQkJBM0QwRjI2NzMyQkY5MSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkNGRDIxMDlFMzI2MjExRTNCQkEzRDBGMjY3MzJCRjkxIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkNGRDIxMDlGMzI2MjExRTNCQkEzRDBGMjY3MzJCRjkxIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+fU0zWQAABNFJREFUeNrEV79bHDcQnaePIuWdK5dHE1JCg10eVbqA21Dk+A9wYZzOn0s7Bc5fcLiAlJAyFS4dGlMGN1CmClu60uSNfq20e7j1wt5qJc1o5s3Mk3ZNVeVbXd3G04WK3xXBfO3bGPBk7kWXEJkZDBCVYAhenM0FumRzBsEdR94TqHf69ueuVnC/8WTCxyEV/EIFM8pzrj6b3lxd4+jsWFQPxXFU5YI/v+vb/Q9DI6hjwTFbSywYCAbw30KDl2f34nUSu/OoXNOoHZ+Muf9+e8L+S/Zt0pswBeLY8t2jnw53+PIpyGrQylfzUw7ozEk24r+N7T32n4uU8bSUUFM0bQLnYi8QJvHapJHnWQmFLvkTjHCCpMjbkwaaE5pdi/ZEsSWOTn+QshiOoxFOfJih5S8YAi5eJ21UCeufM2yLoATYtHVcMEDTQkgtNJLmTELcdPwYQ7JtembRSM3ORh2aEGHjQ+zXcttgCJuTXZFeuF44hgeWB/8gqEKvA8lfQ/vo9DGbu0EfehPS9auDm7rkyWvmSHIoTUPJpEmPlFaea4CXf8+ZB//y7SKsj4SIJlyjvu/YnCt6PTnHpjd/v5ncfOwiIpbdkIPoRoxh9le93knxv724zIFVTArvATuuNULZGxxWxxdzyLDwGpH1VYD7ZI3GnBCFHasW8zV5beX5Os24q2LKxbFDb0pF+DdWXbpDJ2x+16PoPxpi+S2AFRO3ca0Y4l7+YbXd0aAtzp6yvcX2Ou9gAD1fp+gWvZg++ny1RSUdiWmZklCYB5d87Kl68s9+kGfvlO2/mkQu7UJuanePiKop/IQXp7ecd8i7G4aCSHRQLEhKtzSIvCELGjdLw3O2l3TinjqWlJ/VhIiAQc5j12Rbg0jpgpjiV3zempe8Z4mMLq2PoTqOiyNxQZUOvY4F73PKmlFP+xSNBeBL6FOdaWMIWuiCDHlE3CyNzmtIS7XnUkaS15ojxNh6o9aPhE2TsNABIsjli6SzzWxJ9ZcL1wHFs1ItDr1EovuqymJiJwOQGZpT1hpEUu2X3WhYsUUpKlbRCiJkhu8Dr6V6Ck/lTcQ0TG6uMMoRNJtehrr2ZkDlA1aRATfY2ih0j8K2Mp5ZG1KQH1C1jthQqu2qcQTDPUebPaxljgd4JNdn85S2poZV0oNsnru0KFYehrTkxSo8akPyfgcMdPXQQmLphbxPZeM1J6tvaSA7k1BqmF9GG19lSIZVtTeqmd73p3NIIzaCD3UBxFxBPuusQM6NlaCqmLoE4q7qgHJEWCUbcggyCnETEuAroUkT6rofhykJwVXhQhuCwJoIOdNX3xhdDFJxNSKCB6o0J5mWyi66vDZzNbMzciX7pl40nvq+UjWo8sPe/XB7QsMFDaEV2ZiZ9REUlRm+Oe3Fa22UG8WN1sPshTTnzbacoyMYoIJBDmuKvtZDddXUivWBchjGus4R6c+jNQlX24Kr82mQfrUhXdnwioeo9oqWiNJvp+XkFo+JYdzrClIck9hDhLZOYZ6q7Cstb8ItbWufBjbngP6v8+R2ko6aW/FUJu846Q5wK6il8Agd4Dye+EY5kk5TdhB+5o7O7PtjT+zTUgsCNvaewhc8q96tpPHf9q+TjufUYfL2KfIlfVyZK2b0n9PPVxdD2f8FGABRh3uKJmT1VAAAAABJRU5ErkJggg==);
  }
  .allmaps {
    display: inline-block;
    background-repeat: no-repeat;
    background-size: 20px 20px;
    width: 20px;
    height: 20px;
    background-image: url(data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDE0NDAgMTQ0MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU+CjxnPgogIDxnPgoJCTxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNzIwLDcwMy44IDE2NC44LDEwMzEuNiA3MjAsMTM1OS41IDEyNzUuMiwxMDMxLjYiPjwvcG9seWdvbj4KCQk8cGF0aCBkPSJNNzIwLDYyNS4zTDMxLjgsMTAzMS42TDcyMCwxNDM4bDY4OC4yLTQwNi40TDcyMCw2MjUuM3ogTTcyMCw3MDMuOGw1NTUuMiwzMjcuOEw3MjAsMTM1OS41bC01NTUuMi0zMjcuOEw3MjAsNzAzLjh6Ij48L3BhdGg+Cgk8L2c+Cgk8Zz4KCQk8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjcyMCw1NDggMTY0LjgsODc1LjggNzIwLDEyMDMuNyAxMjc1LjIsODc1LjgiPjwvcG9seWdvbj4KCQk8cGF0aCBkPSJNNzIwLDQ2OS41TDMxLjgsODc1LjhMNzIwLDEyODIuMmw2ODguMi00MDYuNEw3MjAsNDY5LjV6IE03MjAsNTQ4bDU1NS4yLDMyNy44TDcyMCwxMjAzLjdMMTY0LjgsODc1LjhMNzIwLDU0OHoiPjwvcGF0aD4KCTwvZz4KCTxnPgoJCTxwb2x5Z29uIGNsYXNzPSJzdDAiIHBvaW50cz0iNzIwLDM5Mi4yIDE2NC44LDcyMCA3MjAsMTA0Ny45IDEyNzUuMiw3MjAiPjwvcG9seWdvbj4KCQk8cGF0aCBkPSJNNzIwLDMxMy43TDMxLjgsNzIwTDcyMCwxMTI2LjRMMTQwOC4yLDcyMEw3MjAsMzEzLjd6IE03MjAsMzkyLjJMMTI3NS4yLDcyMEw3MjAsMTA0Ny45TDE2NC44LDcyMEw3MjAsMzkyLjJ6Ij48L3BhdGg+Cgk8L2c+Cgk8Zz4KCQk8cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjcyMCwyMzYuMyAxNjQuOCw1NjQuMiA3MjAsODkyIDEyNzUuMiw1NjQuMiI+PC9wb2x5Z29uPgoJCTxwYXRoIGQ9Ik03MjAsMTU3LjhMMzEuOCw1NjQuMkw3MjAsOTcwLjVsNjg4LjItNDA2LjNMNzIwLDE1Ny44eiBNNzIwLDIzNi4zbDU1NS4yLDMyNy44TDcyMCw4OTJMMTY0LjgsNTY0LjJMNzIwLDIzNi4zeiI+PC9wYXRoPgoJPC9nPgoJPGc+CgkJPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSI3MjAsODAuNSAxNjQuOCw0MDguNCA3MjAsNzM2LjIgMTI3NS4yLDQwOC40Ij48L3BvbHlnb24+CgkJPHBhdGggZD0iTTcyMCwyTDMxLjgsNDA4LjRMNzIwLDgxNC43bDY4OC4yLTQwNi40TDcyMCwyeiBNNzIwLDgwLjVsNTU1LjIsMzI3LjhMNzIwLDczNi4yTDE2NC44LDQwOC40TDcyMCw4MC41eiI+PC9wYXRoPgoJPC9nPgoJPGc+CgkJPGcgY2xhc3M9InN0MSI+CgkJCTxnPgoJCQkJPHBhdGggZD0iTTYxMC41LDQwNGwyMTYuNy02OS45bC0xMjEuMywxMjVMNjEwLjUsNDA0IE05ODYsMjg4LjZsLTgwLjYtNDYuNUwyOTcuNCw0MjAuOGw5My41LDU0TDUxMy42LDQzNWwxMzguMSw3OS44bC02OC42LDcxLjFsOTMuNSw1NEw5ODYsMjg4LjYiPjwvcGF0aD4KCQkJPC9nPgoJCTwvZz4KCTwvZz4KPC9nPgo8L3N2Zz4K);
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #ccc;
    border-top: 2px solid #333;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-left: 10px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-indicator {
    color: red;
    font-size: 12px;
    margin-left: 10px;
  }
</style>
