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

  let selectedFeature = $state(null);
  let featureProperties = $derived.by(() => {
    return selectedFeature ? selectedFeature.getProperties() : null;
  });

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

    return `${lonDirection}${lonDMS} ${latDirection}${latDMS}`;
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
        // console.info("Inited Dutch coordinate transformations");
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
</table>`;
          // }
        });
      })
      .catch((error) =>
        console.error("Error fetching rdtrans2018.gsb:", error),
      );
  }

  onMount(async () => {
    let view = new View({
      zoom: 7,
      center: fromLonLat([5.474, 52.15]),
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
        type: "OSM",
        name: "OpenStreetMap",
        isVisible: false,
      },

      // {
      //   type: "XYZ",
      //   name: "HisGIS AHN3 Hillshade",
      //   url: "https://hisgis.nl/ahn3_nl/{z}/{x}/{y}.jpg",
      //   isVisible: false,
      // },

      // {
      //   type: "WMS",
      //   name: "Actueel Hoogtebestand Nederland (DSM 5m)",
      //   url: "https://service.pdok.nl/rws/ahn/wms/v1_0",
      //   // layerName: "dtm_05m",
      //   params: { LAYERS: "dsm_05m", TILED: true },
      //   isVisible: false,
      // },

      {
        type: "WMS",
        name: "Luchtfoto (Nederland, 8cm)",
        url: "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0",
        params: { LAYERS: "Actueel_orthoHR", TILED: true },
        isVisible: false,
      },

      // {
      //   type: "WMS",
      //   name: "Orthofotomozaïek (Vlaanderen)", // , grootschalig, winteropnamen, kleur, 2013-2015,
      //   url: "https://geo.api.vlaanderen.be/ogw/wms",
      //   params: { LAYERS: "OGWRGB13_15VL", TILED: true },
      //   isVisible: false,
      // },

      // {
      //   type: "WMTS",
      //   name: "Digitale Orthophotos (North Rhein Westfalen)",
      //   url: "https://www.wmts.nrw.de/geobasis/wmts_nw_dop/1.0.0/WMTSCapabilities.xml",
      //   layerName: "nw_dop",
      //   matrixSet: "EPSG_3857_16",
      //   isVisible: false,
      // },

      // {
      //   type: "WMS",
      //   name: "Digitale Orthophotos (Niedersachsen)",
      //   url: "https://opendata.lgln.niedersachsen.de/doorman/noauth/dop_wms",
      //   params: { LAYERS: "ni_dop20", TILED: true },
      //   isVisible: false,
      // },

      // {
      //   type: "WMTS",
      //   name: "BRT Water",
      //   url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0?request=getcapabilities&service=wmts",
      //   layerName: "water",
      //   matrixSet: "EPSG:3857",
      //   isVisible: false,
      // },

      {
        type: "WMTS",
        name: "BRT Grijs",
        url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0?request=getcapabilities&service=wmts",
        layerName: "grijs",
        matrixSet: "EPSG:3857",
        isVisible: false,
      },

      // {
      //   type: "XYZ",
      //   name: "HisGIS Minuutplans",
      //   url: "https://hisgis.nl/wmts/minuutplans/cut/{z}/{x}/{y}.png",
      //   isVisible: true,
      // },

      // {
      //   type: "WMTS",
      //   name: "Kadastrale Kaart",
      //   url: "https://service.pdok.nl/kadaster/kadastralekaart/wmts/v5_0?request=GetCapabilities&service=WMTS",
      //   layerName: "Kadastralekaart",
      //   matrixSet: "EPSG:3857",
      //   isVisible: true,
      // },

      // {
      //   type: "IIIF",
      //   name: "Hoogtekaart van Nederland (WCH Staring)",
      //   url: "./hoogtekaartStaringHR.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatkundige beschrijving van ons land",
      //   url: "./waterstaatkundig.json",
      //   isVisible: false,
      // }, // https://searchworks.stanford.edu/view/14174831

      // {
      //   type: "IIIF",
      //   name: "Nederland. Grondsoorten. (Bosatlas, 1890)",
      //   url: "./bosatlas.json",
      //   isVisible: false,
      // }, // https://objects.library.uu.nl/reader/viewer_sync.php?obj=1874-334289&pagenum=28&lan=nl&src=arrowedition

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 1 · nabewerkt, UU)",
      //   url: "https://sammeltassen.nl/iiif-manifests/allmaps/waterstaatskaart-1e-ed-uu.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Topografisch Militaire Kaart (facsimile)",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1/latest.json",
      //   url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/main/series/tmk/20231124.json",
      //   isVisible: false,
      // },

      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/01-1874-389916-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/02-1874-456650-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/03-1874-455650-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/04-1874-456550-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/05-1874-456551-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/06-1874-456552-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/07-1874-456588-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/07-1874-456588-hwp-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/07-1874-456588-wve-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/08-1874-456553-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/08-1874-456553-hwp-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/08-1874-456553-wve-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/09-1874-456827-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/09-1874-456827-hwp-georef.json",
      // // url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/09-1874-456827-wve-georef.json",

      // {
      //   type: "IIIF",
      //   name: "Natte plekkenkaart, rood-blauw (Von Frijtag Drabbe)",
      //   url: "https://sammeltassen.nl/iiif-manifests/allmaps/natte-plekkenkaart.json",
      //   //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1/latest.json",
      //   // url: "http://localhost:3001/repos/test-repo/items/natte-plekken.json",
      //   //   // seeAlso: https://historischwaterbeheer.wur.nl/
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 1, UU)",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1/latest.json",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/01-1874-389916-georef.json",
      //   isVisible: false,
      // },

      // // Local
      // // {
      // //   type: "IIIF",
      // //   name: "LOCAL Waterstaatskaart (editie 1, UU)",
      // //   url: "http://localhost:3001/repos/iiif-annotations/items/series/waterstaatskaart/uu/editie_1/latest.json",
      // //   isVisible: true,
      // // },

      // // {
      // //   type: "IIIF",
      // //   name: "LOCAL test-repo",
      // //   url: "http://localhost:3001/repos/test-repo/items/test.json",
      // //   isVisible: true,

      // // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 1-BIS, UU)",
      //   //url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1bis/latest.json",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/02-1874-456650-georef.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 2, UU)",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_2/latest.json",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/03-1874-455650-georef.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 2-BIS, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/04-1874-456550-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_2bis/latest.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 3, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/05-1874-456551-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_3/latest.json",
      //   isVisible: true,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 3-BIS, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/06-1874-456552-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_3bis/latest.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 4, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/07-1874-456588-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4/latest.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 4 · HWP, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/07-1874-456588-hwp-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4/latest_hwp.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 4 · WVE, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/07-1874-456588-wve-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4/latest_wve.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 4-BIS, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/08-1874-456553-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4bis/latest.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 4-BIS · WVE, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/08-1874-456553-wve-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4bis/latest_wve.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 4-BIS · HWP, UU)",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4bis/latest_hwp.json",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/08-1874-456553-hwp-georef.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 5, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/09-1874-456827-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_5/latest.json",
      //   isVisible: false,
      // },

      // // {
      // //   type: "IIIF",
      // //   name: "Waterstaatskaart (editie 1, Schiermonnikoog · Apart blad, georeferentie obv graticule)",
      // //   url: "./schier_ed1.json",
      // //   isVisible: false,
      // // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 5 · HWP, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/09-1874-456827-hwp-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_5/latest_hwp.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 5 · WVE, UU)",
      //   url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/09-1874-456827-wve-georef.json",
      //   // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_5/latest_wve.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Rivierkaart (1e druk, serie 1)",
      //   url: "https://raw.githubusercontent.com/bmmeijers/river-maps-iiif-scripts/refs/heads/main/Output/georef/georef_EERSTE_DRUK_1.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Rivierkaart (1e druk, serie 2)",
      //   url: "https://raw.githubusercontent.com/bmmeijers/river-maps-iiif-scripts/refs/heads/main/Output/georef/georef_EERSTE_DRUK_2.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Rivierkaart (1e druk, serie 3)",
      //   url: "https://raw.githubusercontent.com/bmmeijers/river-maps-iiif-scripts/refs/heads/main/Output/georef/georef_EERSTE_DRUK_3.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Rivierkaart (2e herziening, serie 3)",
      //   url: "https://raw.githubusercontent.com/bmmeijers/river-maps-iiif-scripts/refs/heads/main/Output/georef/georef_TWEEDE_HERZIENING_3.json",
      //   isVisible: false,
      // },


      // build
{
  type: "IIIF",
  name: "Bonne - 1",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-1-mapedge-approximate.json",
  isVisible: true,
},
{
  type: "IIIF",
  name: "Bonne - 2",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-2-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 3",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-3-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 4",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-4-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 5",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-5-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 6",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-6-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 7",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-7-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 8",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-8-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 9",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-9-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 10",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-10-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 11",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-11-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 12",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-12-mapedge-corrected.json",
  isVisible: false,
},
{
  type: "IIIF",
  name: "Bonne - 13",
  url: "https://gist.bk.tudelft.nl/~bmmeijers/volatile/2025/bonne/bonne-13-mapedge-corrected.json",
  isVisible: false,
},

      // /* local */
      // {
      //   type: "IIIF",
      //   name: "Bonne - 1",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-1-mapedge-approximate.json",
      //   isVisible: true,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 2",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-2-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 3",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-3-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 4",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-4-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 5",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-5-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 6",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-6-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 7",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-7-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 8",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-8-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 9",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-9-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 10",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-10-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 11",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-11-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 12",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-12-mapedge-corrected.json",
      //   isVisible: false,
      // },
      // {
      //   type: "IIIF",
      //   name: "Bonne - 13",
      //   url: "http://localhost:3001/repos/test-repo/items/bonne-13-mapedge-corrected.json",
      //   isVisible: false,
      // },

      // {
      //   type: "IIIF",
      //   name: "Delft · MIN08034C",
      //   url: "https://annotations.allmaps.org/images/3caf2fa7242b67d0",
      //   isVisible: true,
      // },

      // {
      //   type: "IIIF",
      //   name: "Delft · MIN08034D / MIN08034E",
      //   url: "https://annotations.allmaps.org/images/24efb897f58a4120",
      //   isVisible: true,
      // },
      // Missing could be obtained from here:
      // https://www.nationaalarchief.nl/onderzoeken/archief/4.KADOR-G/invnr/84/file/NL-HaNA_4.KADOR-G_84_D01?eadID=4.KADOR-G&unitID=84&query=

      // {
      //   type: "IIIF",
      //   name: "Temporary",
      //   url: "./_tmp.json",
      //   isVisible: false,
      // },

      {
        type: "vector",
        name: "Standaard bladindeling (TMK, 🌐 Bonne)",
        url: "bonneCannonicalSheetIndex.json",
        isVisible: false,
      },

      {
        type: "vector",
        name: "Standaard bladindeling (1:50k, 🌐 Rijksdriehoekstelsel)",
        url: "rdCannonicalSheetIndex.json",
        isVisible: false,
      },

      {
        type: "vector",
        name: "Graticule 2.5 × 2.5km · kruispunten (🌐 Bonne)",
        url: "graticule_bonne_2_5x2_5km.geojson",
        isVisible: false,
      },

      {
        type: "vector",
        name: "Graticule 5 × 5km · kruispunten (🌐 Bonne)",
        url: "graticule_bonne_5x5km.geojson",
        isVisible: false,
      },

      {
        type: "vector",
        name: "Graticule 5 × 5km · kruispunten (🌐 Rijksdriehoekstelsel)",
        url: "graticule_rd_5x5km.geojson",
        isVisible: false,
      },

      {
        type: "vector",
        name: "Graticule 5 × 5 · lijnen'  (🌐 Krayenhoff)",
        url: "graticule_geographic_krayenhoff.geojson",
        isVisible: false,
      },

      // {
      //   type: "vector",
      //   name: "Kadaster Minuutplans (🌐 WGS'84)",
      //   url: "minuutplans_simpler.geojson",
      //   isVisible: true,
      // },
    ];

    // modifies the layers store
    loadLayers(settingsLayers);

    // Initialize layers

    //   if (sheetsWarpedMapLayer) {
    //   sheetsWarpedMapLayer.setOpacity(opacity);
    //   sheetsWarpedMapLayer.setSaturation(saturation);
    //   sheetsWarpedMapLayer.setRemoveColor({
    //     hexColor,
    //     threshold,
    //     hardness
    //   });
    //   if (colorize) {
    //     sheetsWarpedMapLayer.setColorize(colorizeHexColor);
    //   } else {
    //     sheetsWarpedMapLayer.resetColorize();
    //   }
    // }

    layerList.forEach((setting) => {
      // console.log(index);
      initializeLayer(setting).then((result) => {
        let initedLayers = result.layers;

        // record to each feature in the vector layer with mask
        // what is the layer index of the raster map that belongs to i
        if (setting.settings.type == "IIIF") {
          initedLayers[1]
            .getSource()
            .getFeatures()
            .forEach((feature) => {
              feature.set(
                "warpedMapLayerIndex",
                // the index of where the WarpedMapLayer resides
                map.getLayers().getArray().length,
              );
            });
        }
        initedLayers.forEach((l) => {
          l.set("title", `${setting.name} ${setting.settings.type}`);
          map.addLayer(l);
          l.setZIndex(setting.zIndex);
          l.setVisible(setting.isVisible);
          setting.olLayers.push(l);
        });
        setting.iconImageUrls = result.iconImageUrls;
        setting.isLoading = false;
        layers.set([...layerList]);
      });
    });

    // map.on("pointermove", (evt) => {
    //   console.log(`move over ${evt.pixel}`);
    //   map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
    //     console.info(feature, layer);
    //   });
    // });

    // Add a click event listener to the map
    map.on("click", async function (evt) {
      // workaround for map.getFeaturesAtPixel not working properly
      // (when clicking we do not get a match)
      // moreover, from clicked feature to warpedmaplayer is a bit more difficult
      // with multiple warpedmaplayers loaded
      // console.log(`click ${evt.pixel} ${evt.coordinate}`);
      const layers = map.getLayers().getArray();
      const featuresAtPixel = [];
      layers.forEach(async (layer) => {
        let source = layer.getSource?.() ?? null;
        if (layer.getVisible() == true && source) {
          const features =
            source.getFeaturesAtCoordinate?.(evt.coordinate) ?? [];
          if (features) {
            featuresAtPixel.push(...features);
          }
        }
      });
      if (featuresAtPixel.length > 0) {
        let f = featuresAtPixel[featuresAtPixel.length - 1];

        const shiftHeld = evt.originalEvent.shiftKey;
        // if (shiftHeld) {
        //   console.log("Shift key was held during click");
        // } else {
        //   console.log("Regular click without Shift");
        // }
        // when shift is pressed, we do not want to zoom to extent
        // if (!shiftHeld) {
        // map.getView().fit(f.getGeometry?.().getExtent(), {
        //   duration: 600,
        //   padding: [50, 50, 50, 50],
        // });
        // }

        // the warpedMapLayerIndex of the props can be used to get a reference to the warpedMapLayer
        let props = f.getProperties();
        let warpedMapLayer = map.getLayers().item(props.warpedMapLayerIndex);
        warpedMapLayer.bringMapsToFront([props.mapId]);

        // this is here because resourceFullMask and resourceMask become the same once the resourceMask is set to resourceFullMask
        // so we remember the initial state from the annotation in the feature properties
        if (f.get("__uglyWorkAround") == undefined) {
          f.set("__uglyWorkAround", true);
          f.set(
            "__resourceFullMask",
            warpedMapLayer.getWarpedMap(props.mapId).resourceFullMask,
          );
          f.set(
            "__resourceMask",
            warpedMapLayer.getWarpedMap(props.mapId).resourceMask,
          );
        }

        if (shiftHeld) {
          warpedMapLayer.setMapResourceMask(
            props.mapId,
            f.get("__resourceFullMask"),
          );
          map.getView().fit(f.getGeometry?.().getExtent(), {
            duration: 1000,
            padding: [150, 150, 150, 150],
          });
          
        } else {
          warpedMapLayer.setMapResourceMask(
            props.mapId,
            f.get("__resourceMask"),
          );
          map.getView().fit(f.getGeometry?.().getExtent(), {
            duration: 1000,
            padding: [50, 50, 50, 50],
          });
        }
        warpedMapLayer.changed();
      }

      // const featuresAtPixel = [];
      // map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
      //   featuresAtPixel.push({
      //     feature: feature,
      //     layer: layer,
      //   });
      // });
    });
  });

  let isExpanded = false;

  function toggleContent() {
    isExpanded = !isExpanded;
    const menu = document.getElementById("menu");
    if (isExpanded) {
      menu.classList.add("expanded");
    } else {
      menu.classList.remove("expanded");
    }
  }
</script>

<div id="map"></div>

<div class="container">
  <!--
  <div id="feature-info" class="feature-info">
    {#if featureProperties}
      <h3>Feature Properties</h3>
      <table style="font-size:x-small;">
        <thead>
          <tr>
            <th></th><th></th>
          </tr>
        </thead>
        <tbody>
          {#each Object.entries(featureProperties).sort( (a, b) => a[0].localeCompare(b[0]), ) as [key, value]}
            {#if key !== "geometry"}
              <tr>
                <td>{key}</td>
                <td>
                  {#if typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))}
                    <a href={value} target="_blank" rel="noopener noreferrer"
                      >{value}</a
                    >
                  {:else}
                    {value}
                  {/if}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
  -->

  <div class="menu" id="menu">
    <div class="header">
      <img
        src="favicon.svg"
        width="20"
        height="20"
        alt="IIIF Maps"
        title="IIIF Maps"
      />
      <!-- Waterstaatskaart van Nederland · 1865 &ndash; 1988 -->
      <!-- Historisch Waterlandschap in Kaart -->
      Bonnebladen
      <button onclick={toggleContent}> Menu </button>
    </div>
    <div class="content-wrapper">
      <div class="content">
        <TocPanel
          zoomToExtentFn={(extent) => {
            map
              .getView()
              .fit(extent, { duration: 1200, padding: [50, 50, 50, 50] });
          }}
        ></TocPanel>

        <fieldset style="margin:8px; padding:8px; font-size: smaller;">
          <div id="mouse-position"></div>
        </fieldset>
      </div>
    </div>
  </div>
</div>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  #map {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100vh;
    border: 1px solid black;
    /* Map styling */
  }

  .menu {
    display: flex;
    flex-direction: column;
    height: auto;
    position: fixed;
    bottom: 0;
    right: 1%;
    transition: transform 0.3s ease-in-out;
    max-height: 80%;
    border-radius: 5px 4px 0 0;

    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  }

  .menu {
    width: 50%;
    /*Default for large screens*/
    max-width: 700px; /*   Limit the width*/
  }

  @media only screen and (max-width: 768px) {
    .menu {
      /*For screens smaller than 768px*/
      max-height: 40%;
      width: 90%;
    }
  }

  .header {
    display: flex;
    justify-content: space-between;
    background-color: #f8f9fa;
    padding: 10px;
    width: 100%;
    border-radius: 5px 4px 0 0;
    border: 1px solid #ccc;
    background-color: lightgoldenrodyellow;
  }

  .content-wrapper {
    display: none;
    flex-direction: column;
    background-color: white;
    overflow: hidden;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
  }

  :global(.menu.expanded .content-wrapper) {
    display: flex;
  }

  .content {
    padding: 20px;
    flex: 1;
    overflow: auto;
  }
</style>
