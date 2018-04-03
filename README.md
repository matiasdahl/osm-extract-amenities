# Extracting amenities from OpenStreetMap data exports

`extract-amenities` is a small script that exports all map elements tagged as amenities from an [OpenStreetMap](https://www.openstreetmap.org) data file. The script is written in Node.js/JavaScript using the [node-osmium](https://github.com/osmcode/node-osmium) library, and should therefore work with common OSM file formats. For input, it supports both snapshots and full history dumps (with element histories and deleted entries). A complete list of all amenity tags currently in use and their use numbers can be found on the OSM wiki, see [this link](https://wiki.openstreetmap.org/wiki/Key:amenity). 

More specifically, the script reads an OSM input file and extracts all map elements  that has an `amenity=..` tag. If the input file contains multiple versions of the same element (as with history exports), the selection criterion is to include all versions **after** the element has been tagged as an amenity. For example, if an `amenity=water_point`-tag is added to an element in version 3, the tag changed to `amenity=drinking_water` in version 5, the tag is dropped in version 10, and the element is deleted in version 12, then the script will extract versions 3 to 12. 

A motivation for extracting this information is to analyze amenity tags and their growth/evolution in the OSM project. 

## Running the script

### Step 1. Download a data export

- Some OSM data export sources are:
   - [Export of whole planet](https://planet.openstreetmap.org/planet/full-history/): Full history with old versions and deleted elements. From the link one can also find smaller regional exports with full version history. 
   - [Latest snapshot](https://wiki.openstreetmap.org/wiki/Planet.osm): The link also gives mirrors with regional snapshots.

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

There are two scripts: `extract-amenity-type` and `extract-amenities`. The first one is run as:

```
node extract-amenity-type.js [node|way|relation] input-osm-file
```

Here, the first parameter (`node`, `way` or `relation`) is the type of map elements to extract. The second parameter is the OSM input file. Output is to stdout. The second script, `extract-amenities` ([extract-amenities](extract-amenities)), is just a shell script thats extracts all three types (nodes, ways and relations). It is run as:

```
./extract-amenities input-osm-file output-directory
```

The output is written to files `amenities-nodes.txt`, `amenities-ways.txt` and `amenities-relations.txt` in the output directory. While running, `extract-amenities` will write some system, file and timing information to the output directory. This includes the MD5 checksum for the input file.

For large input files, the script can take some time to run. As of 8/2015, the full planet history export (as an osm.pbf -file) is 46 GB. 

## Output format

The output of `extract-amenity-type.js` is a UTF-8 text file with eight tab-separated columns, and with a first line giving the columns names:

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
- `name`: The value for the `name` tag; the name of the amenity. For example, the name of a school. In the last two columns, special characters like carriage return, newline, tab and backslash are escaped as `\r`, `\n`, `\t` and `\\`. See the source code for details.

The above columns do not represent all data stored for a map element in OSM data files. Amenities typically have a number of tags that describe different properties of the amenity. For example, a school might have an `contact`-tag with contact information. These are omitted. 

**Note.** When the input osm-file only contains the latest version of the map, the script `export-way-coordinates.js` can be used (after `extract-amenities` is finished) to extract the latitude/longitude coordinates for the exported ways. In detail, the way coordinates are determined by the first node in each way's node list. See the explanation for `pos1` above, and also the [source code](extract-way-coordinates.js) for `export-way-coordinates.js`. Alternatively, one can use the `osmosis` and `osmconvert` tools (with flags `--used-node` and `--all-to-nodes`) to export amenities and to find the coordinates for the way amenities. However, this [might](https://github.com/podolsir/osmosis-fastused) require a lot of CPU and swap space. 

The 10/2015 snapshop (30G) contains around 3 million way amenities. On this input, `export-way-coordinates` runs in around 2 hours (Intel(R) Xeon(R) CPU E5-2660 0 @ 2.2GHz, 3.5G ram).

**Note.** When working with OSM data, it is occasionally helpful to look up individual map elements. This can be done with the OSM web page. For example, [openstreetmap.org/node/123456789](https://www.openstreetmap.org/node/123456789) opens the map element of `type=node` and `id=123456789`. From this link one can also access XML exports and old versions of the node. Similar URLs also work for `way` and `relation` elements. Note that node 123, way 123 and relation 123 are not related even if they have the same `id`. It is, however, possible that two different ways refer to the same node in their id-lists, see for example [openstreetmap.org/node/3667617851](https://www.openstreetmap.org/node/3667617851). 

For general documentation regarding how map elements are represented, see the [OSM wiki](https://wiki.openstreetmap.org/wiki/Elements). The node-osmium [tutorial](https://github.com/osmcode/node-osmium/blob/master/doc/tutorial.md) is also helpful.

##Loading data into R

The below code shows how the exported amenity data can be loaded into R. The `sed` command replaces any control characters `\n`, `\r` and `\t` with spaces. 

```
fname <- input file, e.g. amenities-nodes.txt
Sys.setlocale(locale = "UTF-8")
reg_exp <- "'s/\\\\t/ /g;s/\\\\n/ /g;s/\\\\r/ /g'"
df <- read.csv(pipe(paste0("cat ", fname, " | sed -e ", reg_exp)),
               header = TRUE,
               sep = "\t",
               quote = "",
               # keep all columns as characters. 
               colClasses = 'character',
               allowEscapes = TRUE)
```


##Performance

Running the script (which is written using the `node-osmium` library) does not need a lot of memory. Essentially, the script loops over all map elements and writes amenities to disk. It is therefore possible to process big OSM files using only basic hardware. Some runtimes for `extract-amenities` are:

- snapshot of Great Britain (8/2015):
   - 0.7 GB osm.pbf file (7 minutes)
   - 1.2 GB osm.bz2 file (40 minutes)
- full planet with old version data (8/2015):
   - 45 GB osm.pbf file (9 hours)
   - 67 GB osm.bz2 file (62 hours)

These processing times are for a 1 core Intel Xeon CPU E5-2660 0 at 2.2 GHz with 3.5 GB memory. As the list shows, runtimes are much faster on pbf input. 

Note that the `extract-amenities`-script is not optimized for speed. For example, to extract all amenities, the input file is processed three times: one time for nodes, one time for ways and one time for relations. With one core, this is not optimal. The script neither uses the optimization options available in `node-osmium`. If processing time is critical, one might also consider a different library. For a comparison of different pbf parsers (from 1/2015) can be found [here](https://github.com/pelias/pbf-parser-comparison). In this comparison, [go-osmpbf](https://github.com/qedus/osmpbf) was approximately twice as fast as `node-osmium`. 


## License

This work is copyright 2015, Matias Dahl and released under the MIT license, see the [LICENSE](LICENSE.md)-file 

The OpenStreetMap map is © OpenStreetMap contributors. For the full licensing terms, see [here](https://www.openstreetmap.org/copyright). 
