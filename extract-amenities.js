"use strict";

var js_escape = require('js-string-escape')

/**
 *  Error messages
 */

var print_usage_and_exit = function() {
    console.log('Usage: node extract-amenities.js [node|way|relation] <osm input-filename>');
    process.exit();
};

var fatal_abort = function() {
    console.log('Internal consistency error. Element handler does not receive map elements in sorted order.');
    process.exit();
};

/**
 * Read in command line
 */

var element_type = process.argv[2];
if (['node', 'way', 'relation'].indexOf(element_type) == -1) print_usage_and_exit();

var filename = process.argv[3];
if (!filename) print_usage_and_exit();

/**
 *  Program output
 */

console.log(['id', 'version', 'visible', 'sec1970', 'type', 'pos1', 'pos2', 'amenity_type', 'name'].join(','));

// Escape newlines, remove leading/trailing spaces and enclose the string in quotes.
var cleanup_string = function(str) {
    return str ? ('"' + js_escape(str).trim() + '"') : '""';
};

// Return array with values for the 'pos1' and 'pos2' columns.
var position = function (map_obj) {
    if (map_obj.type == 'node') {
        return [map_obj.lat, map_obj.lon];
    } else if (map_obj.type == 'way') {
        var pos1 = map_obj.nodes_count > 0 ? map_obj.node_refs(0) : 'NA';
        return [pos1, 'NA'];
    }
    return ['NA', 'NA'];
};

var output = function(map_obj) {
    var node_tags = map_obj.tags();
    var amenity_type = node_tags['amenity'];
    var out_array = [map_obj.id,
                     map_obj.version,
                     map_obj.visible,
                     map_obj.timestamp_seconds_since_epoch,
                     map_obj.type,
                     position(map_obj).join(','),
                     cleanup_string(amenity_type),
                     cleanup_string(node_tags['name'])];
    console.log(out_array.join(','));
};

/**
 *  The logic in the object handler will not work if the elements do not
 *  arrive ordered by 'id' and 'version':
 *
 *  When a new element arrive, its relation to the previous should satisfy:
 *  previous.id <= new.id and if previous.id = new.id, then
 *  previous.version < new.version. In practice, data exports seem
 *  to order the elements in the above way. However, I was unable to find
 *  a documentation for this. The script will abort if the above condition
 *  is not true.
 *
 */

var last_id = -1;
var last_version = -1;

var assert_order = function(new_obj) {
    if (new_obj.id < last_id) {
        fatal_abort();
    } else if (new_obj.id == last_id) {
        if (new_obj.version <= last_version) {
            fatal_abort();
        }
    }
    last_id = new_obj.id;
    last_version = new_obj.version;
};

/**
 *  Main part. Handle map elements.
 */

var osmium = require('osmium');
var reader = new osmium.Reader(filename);
var handler = new osmium.Handler();

var last_amenity_id = -1;

var object_handler = function(map_obj) {
    assert_order(map_obj);

    if (last_amenity_id != map_obj.id) {
        // Unseen element id.
        if (!('amenity' in map_obj.tags())) return;
        // Element is tagged as amenity. Remember its id and output all future versions.
        last_amenity_id = map_obj.id;
    }
    output(map_obj);
};

handler.on(element_type, object_handler);
osmium.apply(reader, handler);
