import TileLayer from 'ol/layer/Tile';

import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js';
import TileWMS from 'ol/source/TileWMS.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import { WarpedMapLayer } from '@allmaps/openlayers';

import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';

import Style from 'ol/style/Style.js';
import Stroke from 'ol/style/Stroke.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Text from 'ol/style/Text.js';


import { XYZ } from 'ol/source.js'

import OSM from 'ol/source/OSM.js';

// Function to convert HSV to RGB
function hsvToRgb(h, s, v) {
    let c = v * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = v - c;
    let r, g, b;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else[r, g, b] = [c, 0, x];

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}


const styleFunction = function (feature) {
    return new Style({

        // labels (id in .items of annotation, 1-based)
        text: new Text({
            font: '11px sans-serif',
            // when used as int; = 0 will not show a label
            text: feature.get('itemsId').toFixed(0),
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: 'beige', width: 4 }),
        }),

        // fill
        fill: new Fill({
            color: 'rgba(255, 0, 211, 0.0)',
        }),

        // outline
        stroke: new Stroke({
            color: 'rgba(255, 0, 221, 0.65)',
            width: 2
        })
    });
};


export async function initializeLayer(source) {
    let olLayer = null;

    if (source.settings.type === "WMTS") {
        let capabilities = await fetch(source.settings.url);

        const parser = new WMTSCapabilities();
        const parsed = parser.read(await capabilities.text());
        const options = optionsFromCapabilities(parsed, {
            layer: source.settings.layerName,
            matrixSet: source.settings.matrixSet,
        });
        let olLayer = new TileLayer({
            opacity: 1,
            source: new WMTS(options)
        });
        return { 'layer': olLayer, 'layers': [olLayer] }
    }

    else if (source.settings.type === "WMS") {
        let olLayer = new TileLayer({
            source: new TileWMS({
                url: source.settings.url,
                params: source.settings.params,
                transition: 1
            })
        });
        return { 'layer': olLayer, 'layers': [olLayer] };
    }

    else if (source.settings.type === "XYZ") {
        let olLayer = new TileLayer({
            source: new XYZ({
                url: source.settings.url,
                tileSize: source.settings.tileSize || 256, // Optional: Set tile size (default is 256)
            }),
        });
        return { 'layer': olLayer, 'layers': [olLayer] };
    }

    else if (source.settings.type === "OSM") {
        let olLayer = new TileLayer({
            source: new OSM(),
        });
        return { 'layer': olLayer, 'layers': [olLayer] };
    }

    else if (source.settings.type === "vector") {
        let hue = Math.floor(Math.random() * 360);
        let saturation = 1; // full saturation
        let value = 1;      // full brightness
        let [r, g, b] = hsvToRgb(hue, saturation, value);

        let randomColor = `rgba(${r}, ${g}, ${b}, 0.5)`;

        let layer = new VectorLayer({
            source: new VectorSource({
                url: source.settings.url,
                format: new GeoJSON()
            }),
            style: new Style({
                image: new CircleStyle({
                    radius: 1.5,
                    fill: new Fill({
                        color: 'darkgreen'
                        // randomColor 

                    }),
                    stroke: new Stroke({
                        color: 'darkgreen'
                        //randomColor
                        , width: 1
                    })
                }),
                fill: new Fill({
                    color: 'rgba(78, 205, 0, 0.0)',
                }),
                stroke: new Stroke({
                    color: 'darkgreen',
                    width: 0.75
                })
            })
        });
        return { 'layer': layer, 'layers': [layer] };

    } else if (source.settings.type == 'IIIF') {
        let olLayer = new WarpedMapLayer();
        olLayer.clear();
        let ids = undefined;
        if (source.settings.annotation !== undefined) {
            ids = await olLayer.addGeoreferenceAnnotation(JSON.parse(source.settings.annotation));
        } else if (source.settings.url !== undefined) {
            ids = await olLayer.addGeoreferenceAnnotationByUrl(source.settings.url);
        }
        let iconImageUrls = [];
        let pairs = [];
        for (const mapId of ids) {
            let mask = olLayer?.getWarpedMap(mapId)?.geoMask;
            let iconImageUrl = olLayer.getWarpedMap(mapId).georeferencedMap.resource.id + "/full/256,/0/default.jpg";
            iconImageUrls.push({ 'mapId': mapId, 'src': iconImageUrl });
            pairs.push([mapId, mask])
        }

        // Make a geojson layer of the masks
        // this layer is used for:
        // - recording the extent (being able to click on the sheets), 
        // - the object identifier and 
        // - the layer index
        let features = pairs.map((pair, i) => {
            let [mapId, mask] = pair;
            return {
                type: 'Feature',
                geometry: mask,
                properties: {
                    itemsId: 1 + i,
                    mapId: mapId,
                    // will be filled when adding the map to the layer
                    warpedMapLayerIndex: null 
                }
            };
        });

        // Compose the feature collection
        let collection = {
            type: 'FeatureCollection',
            features: features
        };

        // Create a vector source from the GeoJSON data
        const vectorSource = new VectorSource({
            features: new GeoJSON().readFeatures(collection, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
        });

        // The GeoJSON vector layer
        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: styleFunction

        });

        return { 'layer': olLayer, 'iconImageUrls': iconImageUrls, 'layers': [olLayer, vectorLayer] };
    
    } else {
        throw new Error('Undefined layer type')
    }

}