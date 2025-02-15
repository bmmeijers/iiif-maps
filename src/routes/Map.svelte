<!-- src/Map.svelte -->
<script>
    import { onMount } from "svelte";
    import "ol/ol.css";
    import { Map, View } from "ol";
    // import LayerGroup from "ol/layer/Group";
    import { layers, loadLayers } from "./layers.js";
    import { initializeLayer } from "./layerHelpers.js";
    import TocPanel from "./TocPanel.svelte";
    import { fromLonLat } from "ol/proj.js";

    let map;

    let layerList = [];

    layers.subscribe((value) => {
        console.log("layers.subscribe()");
        layerList = value;
    });

    onMount(async () => {
        let view = new View({
            zoom: 12,
            center: fromLonLat([4, 52]),
        });
        // 	map = new Map({
        // 		controls: defaultControls().extend([scaleControl()]),
        // 		target: 'map',
        // 		view: view,
        // 		layers: []
        // 	});

        map = new Map({
            target: "map",
            layers: [],
            view: view,
        });

        // Load layers from settings file
        const settingsLayers = [
            {
                type: "WMTS",
                name: "BRT Water",
                url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0?request=getcapabilities&service=wmts",
                layerName: "water",
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 1, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1/latest.json",
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 2, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_2/latest.json",
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 3, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_3/latest.json",
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 4, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4/latest.json",
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 5, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_5/latest.json",
            },
            {
                type: "vector",
                name: "Graticule (RD)",
                url: "rdCannonicalSheetIndex.json",
            },
        ];

        // modifies the layers store
        loadLayers(settingsLayers);

        // Initialize layers
        layerList.forEach((layer) => {
            initializeLayer(layer).then((result) => {
                // console.log("second", second)
                let olLayer = null;
                layer.masks = result.masks;
                layer.olLayer = olLayer = result.layer;
                layer.isLoading = false;
                if (olLayer) {
                    console.log("adding to map");
                    map.addLayer(olLayer);
                    olLayer.setZIndex(layer.zIndex);
                    olLayer.setVisible(layer.isVisible);
                }
                layers.set([...layerList]);
            });
        });
    });
</script>

<div id="map" style="width: 100%; height: 70vh; border: 1px solid black;"></div>

<TocPanel></TocPanel>

<style>
    #map {
        /* Map styling */
    }
</style>
