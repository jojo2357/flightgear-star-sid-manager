# Flightgear Star/Sid/Approach data

I got mad that I didn't have any SID's or STAR's in flight gear, and it irked me so much that you are now reading this.

## What is this place?
If you are reading this, you probably really want to know what is going on here. Let me explain.

The FAA provides a product called the Codified Instrument Flight Procedures (CIFP) which can be found [here](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/). Unfortunately, some greedy people twisted the FAA's arm into providing this data is a weird format: ARINC 424. This format is not good for anything, so in order to use it, one must first transcode it. That is what this repository aims to do.

By transcoding the FAA's data, we can load it into flightgear so that your autopilot-equipped airplane can follow these procedures which are like directions into and out of airports.

The drawback, though, is that only airports under the purview of the FAA is included here. In theory, if you have ARINC 424-encoded data for other airports, you should be able to feed it in and transcode it all the same, but that information is not freely and widely available.

## Installation
First, a question:

Does your flightgear use outdated runway designators? (Ex: KSNA today has runway 20R, 2L, but my flightgear running 2020.3.18 says KSNA has 19R, 1L)

- Yes, runways are outdated:
  - Does your version support runway renames?
    - No: You will use the 2020.3 files
    - Yes: You will use 2020.4 files
    - Idk: Use 2020.3 files
- No, runways are *all* correct:
  - You will be using the files in the 2020.4 folder

### Download
With the folder in mind, clone the repo. 

Not sure what cloning is? See [github's tutorial](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository). Note that you can just download the zip.

### Finding a home for your files
Now, locate where your `FLIGHTGEAR SCENERY` folder is located. [Wiki](https://wiki.flightgear.org/$FG_SCENERY)

Some common places to look are:

#### Windows
`%ProgramFiles%/FlightGear/data/Scenery`
#### Mac OS X
`Applications/FlightGear.app/Contents/Resources/data/Scenery`
#### Linux (Flatpak)
`~/.local/share/flatpak/app/org.flightgear.FlightGear/x86_64/stable/active/files/share/flightgear/Scenery`
#### Built from source
Goto your fg root, and from there, find
`dnc-managed/install/flightgear/fgdata/Scenery`

### Placing your files
In the scenery directory should be a folder called `Airports`, open it.

Now, take the contents of the folder you chose to use earlier (2020.3/4) and place the subfolders in the Airports folder. If you are in the `Airports` folder, it should have 5 folders inside of it when you are done, namely `C`, `K`, `N`, `P`, `T`

And that should be it!

### My Airport doesn't work!!1!
First, this is ***not*** a complete dataset for the whole world, only airports under the purview of the FAA. To check if your airport is supported, use this website `https://www.airnav.com/airport`. They get their data from the same place as me, so if they don't have it, I won't either

## How do I run it?
This does not run out of the box, unfortunately. You need to download the CIFP, extract it, and then point a variable in `index.js` to the meat in the folder you just unzipped.

Next, we need an `apt.dat` from flightgear in order to handle runways that have moved (with respect to earth's shifting magnetic field). This should be under `fgdata/Airports` in your flightgear install. It will come as a tarball, so windows users will need extra software to uncompress it.

With the uncompressed `apt.dat` placed next to `index.js`, we can run it all with `node index.js`. However, you may need to allocate more memory than default, and you can do so (at least in 12.19 which I am running, long story) by adding `--max-old-space-size=1000000000` which should be enough. You may want to comment out all references to `Airports` and `realairports`, as those are local symlinks to my installs so I can automagically just have my fg data updated when i run it.

### Please python?
No. If I am going to translate, I am going to c(\\+\\+)? for compat with fg and performance reasons.

### Legal
If you use any of this software, I am not liable for any bad outcomes. 
This software is released under the Glorious People's License (GPL) V3 and a copy of the license can be found in LICENSE.
