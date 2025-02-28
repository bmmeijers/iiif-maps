<script>
  import { onMount } from "svelte";
  import "ol/ol.css";
  import { Map, View } from "ol";
  import { layers, loadLayers } from "./layers.js";
  import { initializeLayer } from "./layerHelpers.js";
  import TocPanel from "./TocPanel.svelte";
  import { fromLonLat } from "ol/proj.js";
  import proj4 from "proj4";
  import { register } from "ol/proj/proj4";
  import { getTransform } from "ol/proj";

  let map;
  let coordTransformer;

  let layerList = $state([]);

  layers.subscribe((value) => {
    layerList = value;
  });

  async function toDMS(coordinate) {
    const degrees = Math.floor(coordinate);
    const minutesFloat = (coordinate - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    return `${degrees}° ${minutes}' ${seconds.toFixed(4)}"`;
  }

  async function formatCoordinates([lon, lat]) {
    const lonDMS = await toDMS(Math.abs(lon));
    const latDMS = await toDMS(Math.abs(lat));

    const lonDirection = lon >= 0 ? "E" : "W";
    const latDirection = lat >= 0 ? "N" : "S";

    return `${latDirection}${latDMS} ${lonDirection}${lonDMS}`;
  }

  function initProj(map) {
    let buffer;
    fetch("./rdtrans2018.gsb")
      .then((response) => response.arrayBuffer())
      .then((data) => {
        buffer = data;
        proj4.nadgrid("rdtrans2018", buffer);
        proj4.defs(
          // using correction grid, mm accuracy
          "EPSG:28992",
          "+proj=sterea +lat_0=52.156160556 +lon_0=5.387638889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +nadgrids=@rdtrans2018,null +wktext +no_defs",
        );
        proj4.defs(
          // using 7 parameter transform, m accuracy
          "EPSG:28992.7",
          "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs",
        );
        proj4.defs(
          "Bonne",
          "+proj=bonne +lat_1=51.5 +lon_0=0 +a=6376950.4 +rf=309.65 +pm=4.883882778 +towgs84=932.9862,86.2986,-197.9356,-2.276813,-1.478043,-4.673555,50.09450 +type=crs",
        );
        proj4.defs(
          "EPSG:4258",
          "+proj=longlat +ellps=GRS80 +no_defs +type=crs",
        );
        proj4.defs(
          "Krayenhoff",
          "+proj=longlat +a=6376950.4 +rf=309.65 +pm=4.883882778 +towgs84=932.9862,86.2986,-197.9356,-2.276813,-1.478043,-4.673555,50.09450 +type=crs",
        );

        // Create a transformer instance
        // transformer = proj4(sourceCRS, destinationCRS);
        console.info("Inited Dutch coordinate transformations");
        register(proj4);

        const mercator2rd = getTransform("EPSG:3857", "EPSG:28992");
        const mercator2bonne = getTransform("EPSG:3857", "Bonne");
        const mercator2rd7params = getTransform("EPSG:3857", "EPSG:28992.7");
        const mercator2etrs89 = getTransform("EPSG:3857", "EPSG:4258");
        const mercator2krayenhoff = getTransform("EPSG:3857", "Krayenhoff");

        map.on("pointermove", async function (evt) {
          // console.log(evt);
          // const map = evt.map;
          // const view = map.getView();
          // const projection = view.getProjection();
          // const code = projection.getCode();

          const coordinate = evt.coordinate;
          const x = coordinate[0].toFixed(0);
          const y = coordinate[1].toFixed(0);

          let rd = mercator2rd(coordinate);
          let bonne = mercator2bonne(coordinate);

          // t = getTransform("EPSG:3857", "EPSG:28992.7");
          let rd7params = mercator2rd7params(coordinate);

          // t = getTransform("EPSG:3857", "EPSG:4258");
          let etrs = mercator2etrs89(coordinate);
          let krayenhoff = mercator2krayenhoff(coordinate);

          // const etrs = getTransform("EPSG:3857", "EPSG:4528")(coordinate)

          document.getElementById("mouse-position").innerHTML = `<table>
                    <tr><th>Proj</th> <th>X</th> <th>Y</th></tr>
                    <tr><td>Webmercator</td> <td>${x} </td> <td>${y}</td></tr>
                    <tr><td>ETRS89</td> <td>${etrs[0].toFixed(6)} </td> <td>${etrs[1].toFixed(6)}</td></tr>
                    <tr><td>ETRS89</td> <td colspan="2">${await formatCoordinates(etrs)}</td></tr>
                    <tr><td>RD Nieuw</td> <td>${rd[0].toFixed(3)}</td> <td>${rd[1].toFixed(3)}</td></tr>
                    <tr><td>RD Nieuw (7 params)</td> <td>${rd7params[0].toFixed(3)}</td> <td>${rd7params[1].toFixed(3)}</td></tr>
                    <tr><td>RD Oud</td> <td>${(rd7params[0] - 155000).toFixed(0)}</td> <td>${(rd7params[1] - 463000).toFixed(0)}</td></tr>
                    <tr><td>Bonne</td> <td>${bonne[0].toFixed(0)}</td> <td>${bonne[1].toFixed(0)}</td></tr>
                    <tr><td>Krayenhoff</td> <td colspan="2">${await formatCoordinates(krayenhoff)}</td></tr>
                    </table>
                     `;
          // }
        });
      })
      .catch((error) =>
        console.error("Error fetching rdtrans2018.gsb:", error),
      );
  }

  onMount(async () => {
    let view = new View({
      zoom: 8,
      center: fromLonLat([5.1335, 52.14]),
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

    initProj(map);

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
        type: "WMS",
        name: "Luchtfoto (8cm)",
        url: "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0",
        params: { LAYERS: "Actueel_orthoHR", TILED: true },
        isVisible: false,
      },
      {
        type: "WMTS",
        name: "BRT Water",
        url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0?request=getcapabilities&service=wmts",
        layerName: "water",
        isVisible: false,
      },
      {
        type: "IIIF",
        name: "Hoogtekaart van Nederland (W.C.H. Staring)",
        url: "./hoogtekaartStaringHR.json",
        isVisible: true,
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
        isVisible: false,
      },
      {
        type: "vector",
        name: "Bladindeling (1:50k, 🌐 Rijksdriehoekstelsel)",
        url: "rdCannonicalSheetIndex.json",
        isVisible: false,
      },
      {
        type: "vector",
        name: "Bladindeling (TMK, 🌐 Bonne)",
        url: "bonneCannonicalSheetIndex.json",
        isVisible: false,
      },
      {
        type: "vector",
        name: "Graticule (🌐 Krayenhoff)",
        url: "graticule_geographic_krayenhoff.geojson",
        isVisible: true,
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
    <fieldset
      style="margin:8px; padding:8px; font-family: sans-serif; font-size: smaller;"
    >
      <div id="mouse-position"></div>
    </fieldset>
    <TocPanel
      zoomToExtentFn={(extent) => {
        map.getView().fit(extent, { duration: 1000 });
      }}
    ></TocPanel>
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
