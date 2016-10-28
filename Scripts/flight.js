
// start speed generally about 0.5rad/h. speed range(0, 2)
var direction = 0, manual = false, speed = 0.01, locking = true;
var drone = new Drone();
drone.direction = direction;
drone.speed = speed;
drone.point = point;

var point = {
    "type":"Point",
    "coordinates": [121.321,30.112]
};

function setPosition() {
    // direction in Rad. Generally, 1 Rad stands for 100km
    var current_rotate = map.getBearing();

    point.coordinates[0] += speed * Math.sin(direction) / 100;
    point.coordinates[1] += speed * Math.cos(direction) / 100;
    map.getSource('drone').setData(point);

    current_rotate = (-current_rotate) + direction * (180 / Math.PI);
    map.setLayoutProperty('drone', 'icon-rotate', current_rotate);
    if (!manual && Math.random() > 0.95) {
        direction += (Math.random() - 0.5) /2;
    }
    if (window.locking) {
        map.setCenter(point.coordinates);
    }

    // sync drone status..
    drone.direction = direction;
    drone.speed = speed;
    drone.point = point;
    // console.log("drone direction: " + drone.direction);
}

mapboxgl.accessToken = false;
var map = new mapboxgl.Map({
    container: 'map',
    // style: 'mapbox://styles/mapbox/light-v9',
    style: {
        "version": 8,
        "sprite": './Asset/sprite',
        "glyphs": "./{fontstack}/{range}.pbf",
        "sources": {
            "custom-tms": {   
                'type': 'raster',
                'tiles': [
                    // "http://127.0.0.1:8080/Tiles/{z}/{x}/{y}.png"
                    "http://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                ],
                'tileSize': 256
            }
        },
        "layers": [{
        'id': 'custom-tms',
        'type': 'raster',
        'source': 'custom-tms',
        'paint': {}
        }]
    },
    "transition": {
        "duration": 400,
        "delay": 0
    },
    // bearing: 45,
    pitch: 30,
    light: {
        'anchor':'viewport',
        'color':'white',
        'intensity':0.4
    },
    zoom: 10,
    center: [121.00, 31.0892]
});

function turnLeft() {
    direction -= 0.1;
    manual = true;
}

function turnRight() {
    direction += 0.1;
        manual = true;
}

function accelerate(e) {
    speed = Math.min(speed + 0.01, 1);
        manual = true;
        e.preventDefault();
}

function brake(e) {
    speed = Math.max(speed - 0.01, 0);
        manual = true;
        e.preventDefault();
}

function fire(e) {
    var target = {}, pointCopy = {"type": "Point", 'coordinates': [0, 0]};
    var audio = document.querySelector("#fireBgm");
    audio.src = "Asset/fire.mp3";
    target = drone.fire();
    pointCopy.coordinates[0] = drone.point.coordinates[0];
    pointCopy.coordinates[1] = drone.point.coordinates[1];
    renderTarget(pointCopy, target, drone.direction, 400);
        e.preventDefault();
}

function renderTarget(start, target, direction, duration) {
    // target is geojson POINT, add Temp point in layer.. 
    var interval = 10, ratio = interval/duration, real_point = start, range = 0.2, count = 0;
    if (target.coordinates) {
        var targetSource = map.getSource('drone-target');
        window.setInterval(function(){
            if (count > duration/interval) {

            } else {
                real_point.coordinates[0] += Math.sin(direction)*ratio*range;
                real_point.coordinates[1] += Math.cos(direction)*ratio*range;
                targetSource.setData(real_point);
                count += 1;
            }
        }, interval);
    } else {
        console.log('something wrong with args');
    }
}

// add control interaction or event listener.
document.body.addEventListener('keydown', function(e) {
    if (e.which === 37||e.which === 65) {
        turnLeft();
    }
    if (e.which === 39||e.which === 68) {
        turnRight();
    }
    if (e.which === 38 ||e.which === 87) { // faster
        accelerate(e);
    }
    if (e.which === 40||e.which === 83) { // slower
        brake(e);
    }
    if (e.which === 32) {
        fire(e);
    }
    if (e.which === 66) {
        drone.bomb(e);
    }
    // console.log(e.which);
})



// sprite contain json and png.
map.on('load', function() {
    var nav = new mapboxgl.NavigationControl({position: 'top-left'}); // position is optional
    map.addControl(nav);
    map.addControl(new mapboxgl.GeolocateControl({position: 'bottom-left'}));

    map.addSource('drone', {
        type: 'geojson',
        data: point
    });
    map.addSource('drone-target', {
        type: 'geojson',
        data: point
    })

    map.addLayer({
        'id' :'drone-glow-strong',
        'type': 'circle',
        'source': 'drone',
        'paint': {
            "circle-radius": 18,
            "circle-color": "#fff",
            "circle-opacity": 0.4
        }
    })
    map.addLayer({
        "id": "drone-glow",
        "type": "circle",
        "source": "drone",
        "paint": {
            "circle-radius": 40,
            "circle-color": "#fff",
            "circle-opacity": 0.1
        }
    });
    map.addLayer({
        "id": "drone",
        "type": "symbol",
        "source": "drone",
        "layout": {
            "icon-image": "airport-15"
        }
    });
    map.addLayer({
        "id": "drone-fire",
        "type": "circle",
        "source": "drone-target",
        "paint": {
            // make circles larger as the user zooms from z12 to z22
            'circle-radius': 4,
            // color circles by ethnicity, using data-driven styles
            'circle-color': '#f00',
            'circle-opacity':0.8
        }
    });
    map.addLayer({
        "id": "drone-fire2",
        "type": "circle",
        "source": "drone-target",
        "paint": {
            // make circles larger as the user zooms from z12 to z22
            'circle-radius': 6,
            // color circles by ethnicity, using data-driven styles
            'circle-color': '#f00',
            'circle-opacity':0.4
        }
    });
    window.setInterval(setPosition, 10);
    
    // sourcetype: ['geojson', 'vector', 'raster', 'image', 'video']
    // use 'data' for geojson, 'url' and 'tiles' for vector|raster to set the datasource.
    map.addSource("locations", {
        "type":"geojson",
        // for geojson. set Opts.buffer for extent preCache, Opts.tolerance for simply,
        // Opts.cluster, clusterRadius
        "data": {
            "type": "FeatureCollection",
            "features": [{
              "type": "Feature",
              "geometry": {
                "type": "Point",
                "coordinates": [121.2454, 31.2]
              },
              "properties": {
                "title": "上海",
                "icon": "monument"
              }
              }, {
              "type": "Feature",
              "geometry": {
                "type": "Point",
                "coordinates": [120.414, 29.976]
              },
              "properties": {
                "title": "Mapbox Zhejiang",
                "icon": "harbor"
              }
              }]
          }
    });

    // layertype: ['fill', 'line', 'symbol', 'circle', 'raster']
    /**
     * paint layout.visibility, fill.fill-opacity, fill-color,  fill-pattern(Name of image in sprite).
     * symbol layout.symbol-placement(point, line), symbol-spacing, icon-image, icon-rotate
     * icon-offset, text-field({title}), paint.icon-color, icon-halo-color,
     */
    map.addLayer({
        'id': 'location',
        'type': 'symbol',
        'source': 'locations',
        'paint': {
            "text-halo-width": 2,
            "text-halo-blur": 1,
            "text-halo-color": "rgba(255,255,255,0.4)",
            "text-color": "#4466AA"
        },
        'layout': {
            "icon-image": "{icon}-15",
            "icon-size": 2,
            "text-field": "{title}",
            "text-font": ["Noto Sans Hans Light"],
            "text-offset": [0, 0.6],
            "text-anchor": "top"
        }
    });

    map.addLayer({
        "id":'location-hover',
        "type": "symbol",
        'source': 'locations',
        'layout':{
            "text-field": "{title}",
            // Noto Sans Hans Light, Open Sans Regular
            "text-font": ["Noto Sans Hans Light"],
            "text-offset": [0.2, 0.8],
            "text-anchor": "top"
        },
        'paint': {},
        "filter": ["==", "title", ""]
    });

    // map.addSource('population', {
    //     type: 'vector',
    //     url: 'mapbox://examples.8fgz4egr'
    // });
    // map.addLayer({
    //     'id': 'population',
    //     'type': 'circle',
    //     'source': 'population',
    //     'source-layer': 'sf2010',
    //     'paint': {
    //         // make circles larger as the user zooms from z12 to z22
    //         'circle-radius': {
    //             'base': 1.75,
    //             'stops': [[12, 2], [22, 180]]
    //         },
    //         // color circles by ethnicity, using data-driven styles
    //         'circle-color': {
    //             property: 'ethnicity',
    //             type: 'categorical',
    //             stops: [
    //                 ['White', '#fbb03b'],
    //                 ['Black', '#223b53'],
    //                 ['Hispanic', '#e55e5e'],
    //                 ['Asian', '#3bb2d0'],
    //                 ['Other', '#ccc']]
    //         }
    //     }
    // });

    map.on("mousedown", function(e) {
        var features = map.queryRenderedFeatures(e.point, {layers: ["location"]});
        if (features.length) {
            map.setFilter("location-hover", ["==", "title", features[0].properties.title]);
        } else {
            map.setFilter("location-hover", ["==", "title", ""]);
        }
    });

    // PosAnimation

});

var lockViewBtn = document.querySelector("#lockview");
lockViewBtn.addEventListener('click', function(){
    if (window.locking) {
        window.locking = false;
        this.innerHTML = "<span>锁定</span>";
    } else {
        window.locking = true;
        this.innerHTML = "<span>解锁</span>";
    }
}, false);

var strategy = {
    "up": accelerate,
    "down": brake,
    "left": turnLeft,
    "right": turnRight,
    "U": accelerate,
    "D": brake,
    "L": turnLeft,
    "R": turnRight
}

var controller = document.querySelector("#controller");
controller.addEventListener("click", function(evt){
    var btn = evt.target||evt.srcElement;
    var func;
    if (btn.id){
        func = strategy[btn.id];
    } else {
        func = strategy[btn.innerText];
    }
    console.log(btn.id);
    func(evt);
}, false);

var firebtn = document.querySelector("#fire");
firebtn.addEventListener('click', function(evt) {
    fire(evt);
})
