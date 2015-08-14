# Extracting amenities from OpenStreetMap data exports

`extract-amenities.js` is a small script that exports all map elements tagged as amenities from an [OpenStreetMap](https://www.openstreetmap.org) data file. The script is written in Node.js/JavaScript using the [node-osmium](https://github.com/osmcode/node-osmium) library, and should therefore work with common OSM file formats. For input, it supports both snapshots and full history dumps (with element histories and deleted entries). A complete list of all amenity tags currently in use and their use numbers can be found on the OSM wiki, see [this link](http://wiki.openstreetmap.org/wiki/Key:amenity). 

More specifically, the script reads an OSM input file and extracts all map elements  that has an `amenity=..` tag. If the input file contains multiple versions of the same element (as with history exports), the selection criterion is to include all versions **after** the element has been tagged as an amenity. For example, if an `amenity=water_point`-tag is added to an element in version 3, the tag changed to `amenity=drinking_water` in version 5, the tag is dropped in version 10, and the element is deleted in version 12, then the script will extract versions 3 to 12. 

A motivation for extracting this information is to analyze amenity tags and their growth/evolution in the OSM project. 

## Running the script

### Step 1. Download a data export

- Some OSM data export sources are:
   - [Export of whole planet](http://planet.openstreetmap.org/planet/full-history/): Full history with old versions and deleted elements. From the link one can also find smaller regional exports with full version history. 
   - [Latest snapshot](http://wiki.openstreetmap.org/wiki/Planet.osm): The link also gives mirrors with regional snapshots.

OSM data files can be very large. For downloading such files, the following `wget` command is  useful:

```
wget --tries 0 --continue url-for-file-to-download
```

The option `--tries 0` enable infinite retries, and if the network connection breaks, the `--continue` switch makes it possible to resume an interrupted download by running the command multiple times. 

### Step 2. Install Node.js and node-osmium

On Ubuntu:

```
sudo apt-get install nodejs-legacy
sudo apt-get install npm
npm install js-string-escape
npm install osmium-node
```

### Step 3. Running the script

The syntax of the script is 

```
node extract-amenities.js [node|way|relation] input-osm-file
```

The first parameter to the script (`node`, `way` or `relation`) is the type of map elements to extract. The second parameter is the OSM input file. Output is to stdout. The script [extract-script](extract-script) extracts all three element types and also saves some timing information.

For large input files, the script can take some time to run. As of 8/2015, the full planet history export (as an osm.pbf -file) is 46 GB. 

## Output format

The output is a UTF-8 text file with nine tab-separated columns, and with a first line giving the columns names:

|     id| version|visible |    sec1970|     pos1|       pos2|amenity_type |name                                         |
|------:|-------:|:-------|----------:|--------:|----------:|:------------|:--------------------------------------------|

After that each row represents one map element (or a version of a map element):

- `id`: The identifier for the element. Together with the `type`-column, these identify the element. 
- `version`: Element version.
- `sec1970`: Timestamp as seconds since midnight 1/1/1970.
- `pos1`, `pos2`: The values of these columns depend on the element type (the first parameter passed to `extract-amenities`):
   - `node`: `pos1` and `pos2` are latitude and longitude coordinates for the node.
   - `way`: The location of way elements is given by a list of nodes. For such elements, `pos1` gives the id for the first node in this list, and `pos2` is always `NA`. If the node list is empty (as for deleted elements), `pos1` is also `NA`. 
   - `relation`: **Position information is not supported for relation elements.** For relation elements, `pos1` and `pos2` are both `NA`.
- `visible` (true or false): The default is `visible=true`. To indicate that an element is deleted, one creates a revision with `visible=false`. (Note: For deleted entries, it seems that tag and position data are omitted to save space.)
- `amenity_type`: The value for the `amenity` tag. For example, `school`.
- `name`: The value for the `name` tag; the name of the amenity. For example, the name of a school. 

These columns do not represent all data stored for an element in the input file. Amenities typically have a number of tags that describe different properties of the amenity. For example, a school might have an `contact`-tag with contact information. These are omitted. 

**Note.** When working with OSM data, it is occasionally helpful to look up individual map elements. This can be done with the OSM web page. For example, [openstreetmap.org/node/123456789](http://www.openstreetmap.org/node/123456789) opens the map element of `type=node` and `id=123456789`. From this link one can also access XML exports and old versions of the node. Similar URLs also work for `way` and `relation` elements. Note that node 123, way 123 and relation 123 are not related even if they have the same `id`. It is, however, possible that two different ways refer to the same node in their id-lists, see for example [openstreetmap.org/node/3667617851](http://www.openstreetmap.org/node/3667617851). 

For general documentation regarding how map elements are represented, see the [OSM wiki](http://wiki.openstreetmap.org/wiki/Elements). The node-osmium [tutorial](https://github.com/osmcode/node-osmium/blob/master/doc/tutorial.md) is also helpful.

## License

This work is copyright 2015, Matias Dahl and released under the MIT license, see the [LICENSE](LICENSE.md)-file 

The OpenStreetMap map is © OpenStreetMap contributors. For the full licensing terms, see [here](http://www.openstreetmap.org/copyright). 
