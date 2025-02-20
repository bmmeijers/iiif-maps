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
        // console.log("layers.subscribe()");
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
                type: "WMS",
                name: "AHN",
                url: "https://service.pdok.nl/rws/ahn/wms/v1_0",
                // layerName: "dtm_05m",
                params: { LAYERS: "dsm_05m", TILED: true },
                isVisible: false,
            },
            {
                type: "WMTS",
                name: "BRT Water",
                url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0?request=getcapabilities&service=wmts",
                layerName: "water",
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 1 · nabewerkt, UU)",
                url: "https://sammeltassen.nl/iiif-manifests/allmaps/waterstaatskaart-1e-ed-uu.json",
                isVisible: false,
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 1, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1/latest.json",
                isVisible: false,
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 2, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_2/latest.json",
                isVisible: false,
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 3, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_3/latest.json",
                isVisible: false,
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 4, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4/latest.json",
                isVisible: false,
            },
            {
                type: "IIIF",
                name: "Waterstaatskaart (editie 5, UU)",
                url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_5/latest.json",
            },
            {
                type: "vector",
                name: "Bladindeling (1:50k, 🌐 Rijksdriehoekstelsel)",
                url: "rdCannonicalSheetIndex.json",
            },
            {
                type: "vector",
                name: "Bladindeling (TMK, 🌐 Bonne)",
                url: "bonneCannonicalSheetIndex.json",
                isVisible: false,
            },
        ];

        // modifies the layers store
        loadLayers(settingsLayers);

        // Initialize layers
        layerList.forEach((setting) => {
            initializeLayer(setting).then((result) => {
                let initedLayers = result.layers;
                initedLayers.forEach((l) => {
                    // if (l) {
                        map.addLayer(l);
                        l.setZIndex(setting.zIndex);
                        l.setVisible(setting.isVisible);
                        setting.olLayers.push(l);
                    // }
                });
                setting.iconImageUrls = result.iconImageUrls;
                setting.isLoading = false;
                layers.set([...layerList]);
            });
        });
    });
</script>

<div class="container">
    <div id="map"></div>
    <div id="toc">
        <TocPanel></TocPanel>
    </div>
</div>

<style>
    .container {
        display: grid;
        grid-template-columns: 70% 1fr;
        height: 100vh;
    }

    #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100vh;
        border: 1px solid black;
        /* Map styling */
    }
    #toc {
        overflow-y: scroll;
    }
</style>
