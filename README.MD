# Flightgear Star/Sid data

I got mad that I didn't have any SID's or STAR's in flight gear, and it irked me so much that you are now reading this.

Herin lies some code that parses an ARINC 424 database file into LevelD 767 (or whatever flightgear uses). 
I have almost no documentation to go off for this standard except for some rare, outdated examples, so really it would be a miracle if it works at all.

If you would like to download the newest CIDP data file (from the FAA, a US govt org, so free and public domain i think) you can find the newest files [here](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/).

I have no idea where i got the documentation from, but I have it. If someone can find a link to the arinc424-18 spec lmk so I can link it here

### Installation
The files you want are either in `2020.3` or `2020.4`. Pick your folder, then continue from there.

All the files inside the folder you chose need to go in `$FG_SCENERY$/Airports/`.

Thats it!

### Support
If anyone can point me to some *real* 767 docs, I would be so elated.

### Legal
If you use any of this software, I am not liable for any bad outcomes. 
This software is released under the Glorious People's License (GPL) V3 and a copy of the license can be found in LICENSE.
