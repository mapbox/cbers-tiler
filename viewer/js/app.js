'use strict';

mapboxgl.accessToken = '{YOUR-MAPBOX-TOKEN}';
const cbers_services = 'https://gk4ai2v1m3.execute-api.us-east-1.amazonaws.com/production/cbers' //e.g https://xxxxxxxxxx.execute-api.xxxxxxx.amazonaws.com/production/cbers

let scope = {};

const zeroPad = (n, c) => {
    //From Libra by developmentseed (https://github.com/developmentseed/libra)
    let s = String(n);
    if (s.length < c) s = zeroPad('0' + n, c);
    return s;
};

const sortScenes = (a, b) => {
    return Date.parse(b.date) - Date.parse(a.date);
};


const buildQueryAndRequestCBERS = (features) => {
    $('.list-img').scrollTop(0);
    $('.list-img').empty();
    $('.errorMessage').addClass('none');
    $('.cbers-info').addClass('none');

    if (map.getSource('cbers-tiles')) map.removeSource('cbers-tiles');
    if (map.getLayer('cbers-tiles')) map.removeLayer('cbers-tiles');

    const results = [];

    Promise.all(features.map(e => {
      const row = zeroPad(e.properties.ROW, 3);
      const path = zeroPad(e.properties.PATH, 3);
      const query = `${cbers_services}/search?row=${row}&path=${path}&sensor=${selectedsensor}`;

      return $.getJSON(query).done()
        .then(data => {
          if (data.meta.found === 0) throw new Error('No image found in sat-api');
          return data.results;
        })
        .catch(err => {
          console.warn(err);
          return [];
        });
    }))
    .then(data => {
      data = [].concat.apply([], data);
      if (data.length === 0) throw new Error('No image found in sat-api');
      for (let i = 0; i < data.length; i += 1) {
        let scene = {};
        scene.path = data[i].path;
        scene.row = data[i].row;
        scene.date = data[i].acquisition_date;
        scene.thumbURL = data[i].thumbURL;
        scene.scene_id = data[i].scene_id;
        scene.type = data[i].processing_level;
        results.push(scene);
      }
      results.sort(sortScenes);

      for (let i = 0; i < results.length; i += 1) {

          $('.list-img').append(
            '<div class="list-element" onclick="initScene(\'' + results[i].scene_id + '\',\'' + results[i].date + '\')">' +
              '<div class="block-info">' +
                '<img "class="img-item lazy lazyload" src="' + results[i].thumbURL + '">' +
              '</div>' +
              '<div class="block-info">' +
                '<span class="scene-info">' + results[i].scene_id + '</span>' +
                '<span class="scene-info"><svg class="icon inline-block"><use xlink:href="#icon-clock"/></svg> ' + results[i].date + '</span>' +
              '</div>' +
            '</div>');
      }
    })
    .catch(err => {
      console.warn(err);
      $('.errorMessage').removeClass('none');
    })
    .then(() => {
      $('.spin').addClass('none');
    });
}

const initScene = (sceneID, sceneDate) => {
    $('.metaloader').removeClass('none');
    $('.errorMessage').addClass('none');

    let min = $("#minCount").val();
    let max = $("#maxCount").val();
    const query = `${cbers_services}/metadata/${sceneID}?'pmim=${min}&pmax=${max}`;

    $.getJSON(query, (data) => {
        scope.imgMetadata = data;
        updateRasterTile();
        $('.cbers-info').removeClass('none');
        $('.cbers-info .l8id').text(sceneID);
        $('.cbers-info .l8date').text(sceneDate);
    })
        .fail(() => {
            if (map.getSource('cbers-tiles')) map.removeSource('cbers-tiles');
            if (map.getLayer('cbers-tiles')) map.removeLayer('cbers-tiles');
            $('.cbers-info span').text('');
            $('.cbers-info').addClass('none');
            $('.errorMessage').removeClass('none');
        })
        .always(() => {
            $('.metaloader').addClass('none');
        });
};

const clear = () => {
  if (map.getLayer('cbers-tiles')) map.removeLayer('cbers-tiles');
  if (map.getSource('cbers-tiles')) map.removeSource('cbers-tiles');
  map.setFilter("PR_Highlighted", ["in", "PATH", ""]);
  map.setFilter("PR_Selected", ["in", "PATH", ""]);

  $('.list-img').scrollLeft(0);
  $('.list-img').empty();

  $(".metaloader").addClass('off');
  $('.errorMessage').addClass('none');
  $(".cbers-info span").text('');
  $(".cbers-info").addClass('none');

  scope = {};

  $("#minCount").val(5);
  $("#maxCount").val(95);

  $(".img-display-options .toggle-group input").prop('checked', false);
  $(".img-display-options .toggle-group input[data='natural_rgb']").prop('checked', true);

  $('.map').removeClass('in');
  $('.right-panel').removeClass('in');
  map.resize();
}

const updateRasterTile = () => {
    if (map.getSource('cbers-tiles')) map.removeSource('cbers-tiles');
    if (map.getLayer('cbers-tiles')) map.removeLayer('cbers-tiles');

    let meta = scope.imgMetadata;

    //let rgb = $(".img-display-options .toggle-group input:checked").attr("data");
    let rgb = sensor[selectedsensor][$(".img-display-options .toggle-group input:checked").attr("data")];
    const bands = rgb.split(',');

    // NOTE: Calling 512x512px tiles is a bit longer but gives a
    // better quality image and reduce the number of tiles requested

    // HACK: Trade-off between quality and speed. Setting source.tileSize to 512 and telling landsat-tiler
    // to get 256x256px reduces the number of lambda calls (but they are faster)
    // and reduce the quality because MapboxGl will oversample the tile.

    const tileURL = `${cbers_services}/tiles/${meta.sceneid}/{z}/{x}/{y}.png?` +
        `rgb=${rgb}` +
        '&tile=256' +
        `&histo${meta.rgbMinMax[bands[0]]}-${meta.rgbMinMax[bands[1]]}-${meta.rgbMinMax[bands[2]]}`;

    $('.cbers-info .l8rgb').text(rgb);

    map.addSource('cbers-tiles', {
      type: "raster",
      tiles: [ tileURL ],
      attribution : '',
      bounds: meta.bounds,
      minzoom: 7,
      maxzoom: 14,
      tileSize: 256
    });

    map.addLayer({
      'id': 'cbers-tiles',
      'type': 'raster',
      'source': 'cbers-tiles'
    });
};


const updateMetadata = () => {
    if (!map.getSource('cbers-tiles')) return;
    initScene(scope.imgMetadata.sceneid, scope.imgMetadata.date);
}


$(".img-display-options .toggle-group").change(() => {
    if (map.getSource('cbers-tiles')) updateRasterTile();
});

$(".img-display-options .stoggle-group").change(() => {
    selectedsensor = $(".img-display-options .stoggle-group input:checked").attr("data");
    clear(); 
});

document.getElementById("btn-clear").onclick = () => {
    clear();
};

////////////////////////////////////////////////////////////////////////////////

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-streets-v9',
    center: [-70.50, 0],
    zoom: 3,
    attributionControl: true,
    minZoom: 3,
    maxZoom: 14
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

map.on('mousemove', (e) => {

    const features = map.queryRenderedFeatures(e.point, {layers: ['Grid']});

    let pr = ['in', 'PATH', ''];

    if (features.length !== 0) {
        pr =  [].concat.apply([], ['any', features.map(e => {
            return ['all', ['==', 'PATH', e.properties.PATH], ['==', 'ROW', e.properties.ROW]];
        })]);
    }
    //??
    map.setFilter('PR_Highlighted', pr);
});

map.on('click', (e) => {
    $('.right-panel').addClass('in');
    $('.spin').removeClass('none');
    const features = map.queryRenderedFeatures(e.point, {layers: ['Grid']});

    if (features.length !== 0) {
        $('.map').addClass('in');
        $('.list-img').removeClass('none');
        map.resize();

        const pr =  [].concat.apply([], ['any', features.map(e => {
            return ['all', ['==', 'PATH', e.properties.PATH], ['==', 'ROW', e.properties.ROW]];
        })]);

        map.setFilter('PR_Selected', pr);

        buildQueryAndRequestCBERS(features);

        const geojson = {
          'type': 'FeatureCollection',
          'features': features
        };

        const extent = turf.bbox(geojson);
        const llb = mapboxgl.LngLatBounds.convert([[extent[0], extent[1]], [extent[2], extent[3]]]);
        map.fitBounds(llb, {padding: 50});

    } else {
        $('.spin').addClass('none');
        map.setFilter('PR_Selected', ['in', 'PATH', '']);
    }
});

map.on('load', () => {

    map.addSource('reference_grid', {
        'type': 'vector',
        'url': 'mapbox://vincentsarago.3a75bnx8'
    });

    map.addLayer({
        'id': 'Grid',
        'type': 'fill',
        'source': 'reference_grid',
        'source-layer': 'cbers_grid-41mvmk',
        'paint': {
            'fill-color': 'hsla(0, 0%, 0%, 0)',
            'fill-outline-color': {
                'base': 1,
                'stops': [
                    [0, 'hsla(207, 84%, 57%, 0.24)'],
                    [22, 'hsl(207, 84%, 57%)']
                ]
            },
            'fill-opacity': 1
        }
    }, 'admin-2-boundaries-bg');

    map.addLayer({
        'id': 'PR_Highlighted',
        'type': 'fill',
        'source': 'reference_grid',
        'source-layer': 'cbers_grid-41mvmk',
        'paint': {
            'fill-outline-color': '#1386af',
            'fill-color': '#0f6d8e',
            'fill-opacity': 0.3
        },
        'filter': ['in', 'PATH', '']
    }, 'admin-2-boundaries-bg');

    map.addLayer({
        'id': 'PR_Selected',
        'type': 'line',
        'source': 'reference_grid',
        'source-layer': 'cbers_grid-41mvmk',
        'paint': {
            'line-color': '#000',
            'line-width': 1
        },
        'filter': ['in', 'PATH', '']
    }, 'admin-2-boundaries-bg');

    $('.loading-map').addClass('off');
});

/// CBERS-4 sensor configuration

var sensor = {
    'MUX': {
        'natural_rgb': '7,6,5',
        'false_rgb': '8,6,7'
    },
    'AWFI': {
        'natural_rgb': '15,14,13',
        'false_rgb': '16,14,15'
    },
    'PAN10M': {
        'natural_rgb': '3,4,2',
        'false_rgb': '3,2,4'
    },
    'PAN5M': {
        'natural_rgb': '1,1,1',
        'false_rgb': '1,1,1'
    }    
};

var selectedsensor = $(".img-display-options .stoggle-group input:checked").attr("data");

