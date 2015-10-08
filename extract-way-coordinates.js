"use strict";

/*
 * extract-way-coordinates.js
 *
 * Usage:
 *    node extract-way-coordinates.js \
 *         <osm-export-file> \
 *         <way element csv from extract-amenity-type.js>
 *
 * Output to stdout is of the form (with tab as separator):
 *
 * ---
 * id       latitide       longitude
 * 12345    123.45         -98.76
 * ...
 * ...
 * ---
 *
 * Here, the first row would indicate that 123.45, -98.76
 * are the latitude/longitude coordinates for the first node
 * element referenced by the way element with id=12345. This
 * data can be combined with the original csv file to assign
 * latitude/longitude coordinates to the ways. Note that each
 * id in the output can be found in the input csv file, but
 * the reverse need be true. Say, in a regional export, it
 * might be that the first node referenced by a way is not
 * included in the nodes for the export.
 *
 */

var fs = require('fs');
var assert = require('assert');
var osmium = require('osmium');

var hist_filename = process.argv[2];
var amenity_filename = process.argv[3];

if (!hist_filename || !amenity_filename) {
  console.log("Input filenames missing.");
  process.exit(1);
}

var find_way_coordinates = function(wanted_nodes) {
  console.log(['id', 'latitude', 'longitude'].join('\t'))

  var reader = new osmium.Reader(hist_filename, {node: true});

  var handler = new osmium.Handler();
  var node_handler = function(node) {
    if (wanted_nodes.find(node.id)) {
      console.log([node.id, node.lat, node.lon].join('\t'));
    }
  };

  handler.on('node', node_handler);
  osmium.apply(reader, handler);
};

var process_way_csv = function(amenity_filename) {

  // See: https://github.com/vadimg/js_bintrees
  var RBTree = require('bintrees').RBTree;
  var wanted_nodes = new RBTree(function(a, b) { return a - b; });

  var line_handler = function(txt) {
    // last line of file might be empty
    if (txt === '') return;

    var line_split = txt.split('\t');
    assert(line_split.length === 8)

    var visible = line_split[2];
    var pos1 = line_split[4];
    var pos2 = line_split[5];

    // Only support for snapshot files containing ways. Then all
    // elements are visible. For deleted entries and for relations,
    // we have pos1 = pos2 = 'NA'. Abort in these cases.
    assert(visible === 'true')
    assert(!((pos1 === 'NA') &&
             (pos2 === 'NA')))

    wanted_nodes.insert(parseInt(pos1));
  };

  fs.readFile(amenity_filename, 'UTF8',
              function(err, data) {
                if (err) throw err;
                data.split('\n')
                    .slice(1)
                    .forEach(line_handler); // synchronous
                find_way_coordinates(wanted_nodes);
              });
};

process_way_csv(amenity_filename);
