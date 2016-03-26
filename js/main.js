/*
 * © 2015-2016 Code for Karlsruhe and contributors.
 * See the file LICENSE for details.
 */

var TILES_URL = '//cartodb-basemaps-a.global.ssl.fastly.net/light_all/' +
                '{z}/{x}/{y}.png';
var ATTRIBUTION = 'Map data &copy; <a href="http://openstreetmap.org">' +
                  'OpenStreetMap</a> contributors, ' +
                  '<a href="http://creativecommons.org/licenses/by-sa/2.0/">' +
                  'CC-BY-SA</a>. Tiles &copy; ' +
                  '<a href="http://cartodb.com/attributions">CartoDB</a>';
var DEFAULT_CITY = 'karlsruhe';
var CITY_LIST_API_URL = '//api.github.com/repos/wo-ist-markt/' +
                        'wo-ist-markt.github.io/contents/cities';
var DEFAULT_MARKET_TITLE = 'Markt';

var map;
var nowGroup = L.layerGroup();
var todayGroup = L.layerGroup();
var otherGroup = L.layerGroup();
var unclassifiedGroup = L.layerGroup();

var now = new Date();

L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';
var nowIcon = L.AwesomeMarkers.icon({markerColor: 'green',
                                     icon: 'shopping-cart'});
var todayIcon = L.AwesomeMarkers.icon({markerColor: 'darkgreen',
                                       icon: 'shopping-cart'});
var otherIcon = L.AwesomeMarkers.icon({markerColor: 'cadetblue',
                                       icon: 'shopping-cart'});
var unclassifiedIcon = L.AwesomeMarkers.icon({markerColor: 'darkpurple',
                                              icon: 'shopping-cart'});


/*
 * Moves the map to its initial position.
 */
function positionMap(mapInitialization) {
    var coordinates = mapInitialization.coordinates;
    var zoomLevel = mapInitialization.zoom_level;
    map.setView(L.latLng(coordinates[1], coordinates[0]), zoomLevel);
}


/*
 * Initialize layer controls.
 *
 * Controls which serve no purpose are disabled. For example, if
 * currently no markets are open then the corresponding radio
 * button is disabled.
 */
function initControls() {
    var todayCount = todayGroup.getLayers().length;
    if (todayCount === 0) {
        // No markets today or all of today's markets currently open
        $('#today').attr('disabled', true);
    }
    if (nowGroup.getLayers().length > 0) {
        $('#now').attr('checked', true);
    } else {
        $('#now').attr('disabled', true);
        if (todayCount > 0) {
            $('#today').attr('checked', true);
        } else {
            $('#other').attr('checked', true);
        }
    }
    $('input[name=display]').change(updateLayers);
}


/*
 * Update layer visibility according to layer control settings.
 */
function updateLayers() {
    var value = document.querySelector('[name=display]:checked').value;
    switch (value) {
        case 'now':
            map.removeLayer(todayGroup);
            map.removeLayer(otherGroup);
            break;
        case 'today':
            map.addLayer(todayGroup);
            map.removeLayer(otherGroup);
            break;
        case 'other':
            map.addLayer(todayGroup);
            map.addLayer(otherGroup);
            break;
    }
}


/*
 * Create map markers from JSON market data.
 */
function initMarkers(featureCollection) {
    nowGroup.clearLayers();
    todayGroup.clearLayers();
    otherGroup.clearLayers();
    unclassifiedGroup.clearLayers();
    L.geoJson(featureCollection, {
        onEachFeature: initMarker
    });
}


function initMarker(feature) {
    var properties = feature.properties;
    var openingHoursStrings = properties.opening_hours;
    if (openingHoursStrings === undefined) {
        throw "Missing property 'opening_hours' for " + properties.title +
              ' (' + properties.location + ').';
    }
    var todayOpeningRange;
    var timeTableHtml;
    var openingHoursUnclassified;
    if (openingHoursStrings === null || openingHoursStrings.length === 0) {
        openingHoursUnclassified = properties.openingHoursUnclassified;
    } else {
        var openingRanges = getOpeningRanges(openingHoursStrings);
        todayOpeningRange = getOpeningRangeForDate(openingRanges, now);
        timeTableHtml = getTimeTable(openingRanges);
    }

    var coordinates = feature.geometry.coordinates;
    var marker = L.marker(L.latLng(coordinates[1], coordinates[0]));
    var where = properties.location;
    if (where === undefined) {
        throw "Missing property 'location' for " + properties.title + '.';
    }
    if (where !== null) {
        where = '<p>' + where + '</p>';
    } else {
        where = '';
    }
    var title = properties.title;
    if (title === undefined) {
        throw "Missing property 'title'.";
    }
    if (title === null || title.length === 0) {
        title = DEFAULT_MARKET_TITLE;
    }
    var popupHtml = '<h1>' + title + '</h1>' + where;
    if (openingHoursUnclassified !== undefined) {
        popupHtml += '<p class="unclassified">' + openingHoursUnclassified +
                     '</p>';
    } else {
        popupHtml += timeTableHtml;
    }
    marker.bindPopup(popupHtml);
    if (todayOpeningRange !== undefined) {
        if (openingRangeContainsTime(todayOpeningRange, now)) {
            marker.setIcon(nowIcon);
            nowGroup.addLayer(marker);
        } else {
            marker.setIcon(todayIcon);
            todayGroup.addLayer(marker);
        }
    } else {
        if (openingHoursUnclassified !== undefined) {
            marker.setIcon(unclassifiedIcon);
            unclassifiedGroup.addLayer(marker);
        } else {
            marker.setIcon(otherIcon);
            otherGroup.addLayer(marker);
        }
    }
}


/*
 * Returns the city name when present in the hash of the current URI;
 * otherwise the default city name;
 */
function getCityName() {
    var hash = decodeURIComponent(window.location.hash);
    if (hash === undefined || hash === '') {
        return DEFAULT_CITY;
    } else {
        hash = hash.toLowerCase();
        return hash.substring(1, hash.length);
    }
}


/*
 * Updates the URL hash in the browser.
 */
function updateUrlHash(cityName) {
    if (history.pushState) {
        history.pushState(null, null, '#' + cityName);
    } else {
        window.location.hash = cityName;
    }
}


/*
 * Updates the legend data source.
 */
function updateLegendDataSource(dataSource) {
    var title = dataSource.title;
    var url = dataSource.url;
    $('#legend #dataSource').html('<a href="' + url + '">' + title + '</a>');
}


$(window).on('hashchange',function() {
    console.log('Hash changed');
    setCity(getCityName());
});


$(document).ready(function() {
    var tiles = new L.TileLayer(TILES_URL, {attribution: ATTRIBUTION});
    map = new L.Map('map').addLayer(tiles);
    var legend = L.control({position: 'bottomright'});
    var dropDownCitySelection = $('#selectOtherCitiesDropdown');
    legend.onAdd = function () { return L.DomUtil.get('legend'); };

    // Deactivate event propagation
    // See http://stackoverflow.com/a/23139415
    dropDownCitySelection.mousedown(L.DomEvent.stopPropagation);
    dropDownCitySelection.dblclick(L.DomEvent.stopPropagation);

    dropDownCitySelection.change(function() { setCity(this.value); });

    // Populate dropdown
    loadCityIDs().done(function(cityIDs) {
        for (var i = 0; i < cityIDs.length; i++) {
            dropDownCitySelection.append(
                $('<option></option>').val(cityIDs[i])
                                      .html(toCamelCase(cityIDs[i]))
            );
        }
        setCity(getCityName());
    });

    legend.addTo(map);
});


/*
 * Set the current city.
 *
 * `city` is the city ID.
 */
function setCity(city) {
    console.log('Setting city "' + city + '"');
    var filename = 'cities/' + city + '.json';
    $.getJSON(filename, function(json) {
        positionMap(json.metadata.map_initialization);
        updateLegendDataSource(json.metadata.data_source);
        initMarkers(json);
        initControls();
        map.addLayer(unclassifiedGroup);
        map.addLayer(nowGroup);
        updateLayers();
        updateUrlHash(city);
        var title = 'Wo ist Markt in ' + toCamelCase(city) + '?';
        document.title = title;
        $('#legend h1').text(title);
        $('#selectOtherCitiesDropdown').val(city);
    }).fail(function() {
        console.log('Failure loading "' + filename + '".');
        if (city !== DEFAULT_CITY) {
            console.log('Loading default city "' + DEFAULT_CITY +
                        '" instead.');
            setCity(DEFAULT_CITY);
        }
    });
}


/*
 * Load the IDs of the available cities.
 *
 * Returns a jQuery `Deferred` object that resolves to an array of city IDs.
 */
function loadCityIDs() {
    console.log('Loading city IDs');
    var d = $.Deferred();
    $.get(CITY_LIST_API_URL, function(result) {
        var ids = [];
        $.each(result, function(_, file) {
            if (file.name.indexOf('.json', file.name.length - 5) !== -1) {
                ids.push(file.name.slice(0, -5));
            }
        });
        console.log('City IDs loaded.');
        d.resolve(ids);
    }).fail(function() {
        d.fail();
    });
    return d;
}

