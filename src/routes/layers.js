// src/layers.js

import { writable } from 'svelte/store';

export const layers = writable([]);

export function loadLayers(settingsLayers) {
  let zIndexCounter = 0;
  const loadedLayers = settingsLayers.map((layerSettings) => {
    return {
      id: generateUUID(),
      zIndex: zIndexCounter++,
      name: layerSettings.name,
      settings: layerSettings,
      olLayer: null, // Will hold the OpenLayers layer instance
      olLayers: [],
      isVisible: true,
      isLoading: true,
      hasError: false,
      iconImageUrls: null,
    };
  });

  layers.set(loadedLayers);
}

function generateUUID() {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return r.toString(16);
  });
}
