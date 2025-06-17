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
        type: "OSM",
        name: "OpenStreetMap",
        isVisible: false,
      },

      {
        type: "WMS",
        name: "Actueel Hoogtebestand Nederland (DSM 5m)",
        url: "https://service.pdok.nl/rws/ahn/wms/v1_0",
        // layerName: "dtm_05m",
        params: { LAYERS: "dsm_05m", TILED: true },
        isVisible: false,
      },
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

      {
        type: "WMTS",
        name: "BRT Water",
        url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0?request=getcapabilities&service=wmts",
        layerName: "water",
        matrixSet: "EPSG:3857",
        isVisible: false,
      },

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

      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 1, UU)",
        // url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1/latest.json",
        url: "https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/01-1874-389916-georef.json",
        isVisible: true,
      },

      // Local
      // {
      //   type: "IIIF",
      //   name: "LOCAL Waterstaatskaart (editie 1, UU)",
      //   url: "http://localhost:3001/repos/iiif-annotations/items/series/waterstaatskaart/uu/editie_1/latest.json",
      //   isVisible: true,
      // },

      // {
      //   type: "IIIF",
      //   name: "LOCAL test-repo",
      //   url: "http://localhost:3001/repos/test-repo/items/test.json",
      //   isVisible: true,

      // },

      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 1-BIS, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1bis/latest.json",
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
        name: "Waterstaatskaart (editie 2-BIS, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_2bis/latest.json",
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
        name: "Waterstaatskaart (editie 3-BIS, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_3bis/latest.json",
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
        name: "Waterstaatskaart (editie 4 · HWP, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4/latest_hwp.json",
        isVisible: false,
      },
      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 4 · WVE, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4/latest_wve.json",
        isVisible: false,
      },

      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 4-BIS, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4bis/latest.json",
        isVisible: false,
      },
      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 4-BIS · WVE, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4bis/latest_wve.json",
        isVisible: false,
      },
      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 4-BIS · HWP, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_4bis/latest_hwp.json",
        isVisible: false,
      },

      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 5, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_5/latest.json",
        isVisible: false,
      },

      // {
      //   type: "IIIF",
      //   name: "Waterstaatskaart (editie 1, Schiermonnikoog · Apart blad, georeferentie obv graticule)",
      //   url: "./schier_ed1.json",
      //   isVisible: false,
      // },

      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 5 · HWP, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_5/latest_hwp.json",
        isVisible: false,
      },

      {
        type: "IIIF",
        name: "Waterstaatskaart (editie 5 · WVE, UU)",
        url: "https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_5/latest_wve.json",
        isVisible: false,
      },

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

    map.on("click", (event) => {
      const feature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature,
      );
      selectedFeature = feature || null;
      console.info(selectedFeature);
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
  <div id="map"></div>

  <div class="menu" id="menu">
    <div class="header">
      <img
        src="favicon.svg"
        width="20"
        height="20"
        alt="IIIF Maps"
        title="IIIF Maps"
      />
      Waterstaatskaart van Nederland · 1865 &ndash; 1988
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
