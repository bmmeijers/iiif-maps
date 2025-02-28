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

export async function initializeLayer(source) {
    let olLayer = null;

    if (source.settings.type === "WMTS") {
        let capabilities = await fetch(source.settings.url);
        const parser = new WMTSCapabilities();
        const parsed = parser.read(await capabilities.text());
        const options = optionsFromCapabilities(parsed, {
            layer: source.settings.layerName,
            matrixSet: 'EPSG:3857'
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

    else if (source.settings.type === "vector") {
        let layer = new VectorLayer({
            source: new VectorSource({
                url: source.settings.url,
                format: new GeoJSON()
            }),
            style: new Style({
                image: new CircleStyle({
                    radius: 5,
                    fill: new Fill({ color: 'rgba(255, 0, 0, 0.5)' }),
                    stroke: new Stroke({ color: 'red', width: 1 })
                }),
                stroke: new Stroke({
                    color: 'darkgreen',
                    width: 0.25
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
            iconImageUrls.push({'mapId': mapId, 'src': iconImageUrl});
        pairs.push([mapId, mask])
    }

    // Make a geojson layer of the masks
    let features = pairs.map((pair) => {
        let [mapId, mask] = pair;
        return {
            type: 'Feature',
            geometry: mask,
            properties: {
                mapId: mapId
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
        style: new Style({
            fill: null,
            stroke: new Stroke({
                color: 'rgba(68, 15, 133, 0.65)',
                width: 0.5
            })
        })
    });

    return { 'layer': olLayer, 'iconImageUrls': iconImageUrls, 'layers': [olLayer, vectorLayer] };
}

}