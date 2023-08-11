/*
 * This file is a part of flightgear-star-sid-manager, a tool to extract sid/star data from ARINC 424
 *
 * Copyright (c) 2022-2023 jojo2357
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
const fs = require('fs');
const {parseLine, RouteType, Latongitude} = require('./arinc424parser');
const path = require("path");

const simpleRunwayNames = ["R", "L", "C", " "];

let oldData = fs.readFileSync("apt.dat").toString().split(/\r?\n/g).filter(it => it.trim().length);

const isJojo = require("os").userInfo().username === "jojo2357";

let debugAirports = ["KLAS", "KLAX", "KABQ", "KSNA", "KHOU"];
let debug = false;

const copyrightString = `<!--
 ~ This file is a part of flightgear-star-sid-manager, a tool to extract sid/star data from ARINC 424
 ~
 ~ Copyright (c) ${new Date().getFullYear()} jojo2357
 ~
 ~  This program is free software: you can redistribute it and/or modify
 ~  it under the terms of the GNU General Public License as published by
 ~  the Free Software Foundation, either version 3 of the License, or
 ~  (at your option) any later version.
 ~
 ~  This program is distributed in the hope that it will be useful,
 ~  but WITHOUT ANY WARRANTY; without even the implied warranty of
 ~  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 ~  GNU General Public License for more details.
 ~
 ~  You should have received a copy of the GNU General Public License
 ~  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 -->\n`;

// let guessUsingUpdatedXplane = true;

let airpourtCode;
// let oldXtonewXMap = {};
// let newXRunways = {};
let oldRunways = {};

const runwayRegex = /^100\s+\d+(?:\.\d+)?\s+\d+\s+\d+\s+\d+(?:\.\d+)?\s+\d\s+\d\s+\d\s+([0-3]?\d{0,2}[A-Z]?)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)(?:\s+\d+\.\d+\s+\d+\.\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+([0-3]?\d{0,2}[A-Z]?)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+))?/;
for (let i = 2; i < oldData.length; i++) {
    if (oldData[i].match(/^1\s/)) {
        let exploded = oldData[i].match(/^1\s+(-?\d+)\s+\d\s+\d\s+([A-Z]{0,4})\s/);
        if (!exploded) {
            airpourtCode = undefined;
            continue;
        }
        airpourtCode = exploded[2];
        if (debug && !debugAirports.includes(airpourtCode))
            continue;

        oldRunways[airpourtCode] = [];
    } else if (!airpourtCode) {
        continue;
    } else if (oldData[i].match(/^100\s/)) {
        if (debug && !debugAirports.includes(airpourtCode))
            continue;
        let exploded = oldData[i].match(runwayRegex);
        if (oldRunways[airpourtCode].every(rwy => rwy.ident !== exploded[1])) {
            let latnum = Number.parseFloat(exploded[2]);
            let lonnum = Number.parseFloat(exploded[3]);
            oldRunways[airpourtCode].push({
                ident: exploded[1],
                lat: new Latongitude(latnum > 0 ? "N" : "S", Math.abs(latnum)),
                lon: new Latongitude(lonnum > 0 ? "E" : "W", Math.abs(lonnum)),
            });
            if (exploded.filter(it => it).length > 4) {
                latnum = Number.parseFloat(exploded[5]);
                lonnum = Number.parseFloat(exploded[6]);
                oldRunways[airpourtCode].push({
                    ident: exploded[4],
                    lat: new Latongitude(latnum > 0 ? "N" : "S", Math.abs(latnum)),
                    lon: new Latongitude(lonnum > 0 ? "E" : "W", Math.abs(lonnum)),
                })
            }
        }
    }
}

oldData = undefined;

if (global.gc) {
    try {
        global.gc();
    } catch (e) {
    }
}

let data = fs.readFileSync("current_cifp/FAACIFP18").toString().split(/\r?\n/g);

let realRunways = {};
let knownWaypoints = {};

let awfullyNamedWaypoints = {};

let understoodLines = 0;

let movedRunways = {};


const worldDist = 0.00005;
const xplaneDist = 0.00001;

/** @type {ParseResult[]} */
let pointsForFurtherProcessing = data.reduce((out, dater) => {
    let vahl = parseLine(dater);
    if (vahl.recognizedLine) {
        understoodLines++;
        if (vahl.magbearing) {
            if (!realRunways[vahl.parentident])
                realRunways[vahl.parentident] = [];
            realRunways[vahl.parentident].push(vahl.ident.slice(2).trim());

            knownWaypoints[vahl.parentident + vahl.ident] = vahl;

            if (oldRunways[vahl.parentident] && vahl.ident.match(/\d{2}([^WG]$|$)/)) {
                if (!movedRunways[vahl.parentident]) {
                    movedRunways[vahl.parentident] = [];
                }
                oldRunways[vahl.parentident].map(it => Latongitude.distance(it.lat, it.lon, vahl.rwylatitude, vahl.rwylongitude));

                if (oldRunways[vahl.parentident].some(other => Latongitude.distance(other.lat, other.lon, vahl.rwylatitude, vahl.rwylongitude) < worldDist)) {
                    if (oldRunways[vahl.parentident].filter(other => Latongitude.distance(other.lat, other.lon, vahl.rwylatitude, vahl.rwylongitude) < worldDist).some(thing => thing.ident === vahl.ident.substring(2).trim())) {
                        // console.log("Close cousin");
                    } else {
                        // different ident?
                        if (oldRunways[vahl.parentident].filter(other => Latongitude.distance(other.lat, other.lon, vahl.rwylatitude, vahl.rwylongitude) < worldDist).some(thing => thing.ident.length === vahl.ident.trim().length - 2 && ((thing.ident.length === 3) ? (thing.ident.charAt(2) === vahl.ident.charAt(4)) : true) && ((Math.abs((Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(vahl.ident.substring(2, 4)))) + 4) % 36) - 4 < 4)) {
                            // console.log("I moved");
                            movedRunways[vahl.parentident].push({
                                orig: oldRunways[vahl.parentident].filter(other => Latongitude.distance(other.lat, other.lon, vahl.rwylatitude, vahl.rwylongitude) < worldDist).find(thing => thing.ident.length === vahl.ident.trim().length - 2 && ((thing.ident.length === 3) ? (thing.ident.charAt(2) === vahl.ident.charAt(4)) : true) && ((Math.abs((Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(vahl.ident.substring(2, 4)))) + 4) % 36) - 4 < 4).ident,
                                neww: vahl.ident.substring(2).trim()
                            });
                        } else {
                            if (oldRunways[vahl.parentident].some(thing => ((thing.ident.length === 3) ? (thing.ident.charAt(2) === vahl.ident.charAt(4)) : true) && ((Math.abs(Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(vahl.ident.substring(2, 4))) + 4) % 36) - 4 < 4)) {
                                // console.log("???");
                                movedRunways[vahl.parentident].push({
                                    orig: oldRunways[vahl.parentident].filter(thing => ((thing.ident.length === 3) ? (thing.ident.charAt(2) === vahl.ident.charAt(4)) : true) && ((Math.abs(Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(vahl.ident.substring(2, 4))) + 4) % 36) - 4 < 4).sort((a, b) => ((Math.abs(Number.parseInt(a.ident.substring(0, 2)) - Number.parseInt(vahl.ident.substring(2, 4))) + 4) % 36) - 4 - ((Math.abs(Number.parseInt(b.ident.substring(0, 2)) - Number.parseInt(vahl.ident.substring(2, 4))) + 4) % 36) - 4)[0].ident,
                                    neww: vahl.ident.substring(2).trim()
                                });
                            } else {
                                console.log("Im missing");
                            }
                        }
                    }
                } else if (oldRunways[vahl.parentident].some(thing => ((thing.ident.length === 3) ? (thing.ident.charAt(2) === vahl.ident.charAt(4)) : true) && ((Math.abs(Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(vahl.ident.substring(2, 4))) + 4) % 36) - 4 < 4)) {
                    movedRunways[vahl.parentident].push({
                        orig: oldRunways[vahl.parentident].find(thing => ((thing.ident.length === 3) ? (thing.ident.charAt(2) === vahl.ident.charAt(4)) : true) && ((Math.abs(Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(vahl.ident.substring(2, 4))) + 4) % 36) - 4 < 4).ident,
                        neww: vahl.ident.substring(2).trim()
                    });
                } else {
                    console.log("Unrelated?");
                }
                if (movedRunways[vahl.parentident].length && !movedRunways[vahl.parentident][movedRunways[vahl.parentident].length - 1].neww.match(/^\d{2}\w?$/)) {
                    console.log("Thats not a runway!");
                }
                if (movedRunways[vahl.parentident].some(thing => movedRunways[vahl.parentident].some(other => thing !== other && other.neww === thing.orig))) {
                    console.log("I did a bad thing");
                }
            }
        } else if (vahl.canBeNavigatedTo) {
            if (awfullyNamedWaypoints[vahl.ident.trim()]) {
                awfullyNamedWaypoints[vahl.ident.trim()].push(vahl);
            } else {
                if (knownWaypoints[vahl.ident.trim()]) {
                    awfullyNamedWaypoints[vahl.ident.trim()] = [vahl, knownWaypoints[vahl.ident.trim()]];
                    knownWaypoints[vahl.ident.trim()] = undefined;
                } else {
                    knownWaypoints[vahl.ident.trim()] = vahl;
                }
            }
            if (vahl.airportIDENT) out.push(vahl);
        } else {
            if (vahl.airportIDENT) out.push(vahl);
        }
    }
    return out;
}, []);

const readLines = data.length;

data = undefined;

if (global.gc) {
    try {
        global.gc();
    } catch (e) {
    }
}

const masterDictionary = pointsForFurtherProcessing.reduce((out, curr) => {
    // process.stdout.write(`Parsing ${windex}/${array.length}\r`);
    if (curr.airportIDENT && oldRunways[curr.airportIDENT]) {
        if (!out[curr.airportIDENT])
            out[curr.airportIDENT] = {};
        if (!out[curr.airportIDENT][curr.SID_STAR_Ident])
            if (curr.is_SID)
                out[curr.airportIDENT][curr.SID_STAR_Ident] = {sid: true};
            else if (curr.is_STAR)
                out[curr.airportIDENT][curr.SID_STAR_Ident] = {star: true};
            else if (curr.is_APPROACH)
                out[curr.airportIDENT][curr.SID_STAR_Ident] = {approach: true};
        if (!out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType])
            out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType] = {};
        if (!out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType][curr.TRANS_IDENT])
            out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType][curr.TRANS_IDENT] = [];
        if (!curr.fix_ident.match(/RW\d{2}/)) {
            out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType][curr.TRANS_IDENT].push({
                loc: knownWaypoints[curr.fix_ident.trim()] ? knownWaypoints[curr.fix_ident.trim()] : curr.fix_ident,
                obj: curr
            });
        } else {
            out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType][curr.TRANS_IDENT].push({
                loc: knownWaypoints[curr.airportIDENT + curr.fix_ident] ? knownWaypoints[curr.airportIDENT + curr.fix_ident] : curr.fix_ident,
                obj: curr
            });
        }
    }
    return out;
}, {});

pointsForFurtherProcessing = undefined;

if (global.gc) {
    try {
        global.gc();
    } catch (e) {
    }
}

for (const movedRunwaysKey in movedRunways) {
    movedRunways[movedRunwaysKey] = movedRunways[movedRunwaysKey].filter(thing => thing.orig !== thing.neww);
    if (!(movedRunways[movedRunwaysKey].length))
        continue;
    if (movedRunways[movedRunwaysKey].some(thing => movedRunways[movedRunwaysKey].some(other => thing !== other && Math.abs(Number.parseInt(thing.orig.substring(0, 2)) - Number.parseInt(other.orig.substring(0, 2))) <= 1)))
        console.log(movedRunways[movedRunwaysKey]);

    let outstring = `${copyrightString}<PropertyList build="By jojo2357, with FAA data.">\n\t<runway-rename>\n${movedRunways[movedRunwaysKey].map(thing => `${"\t".repeat(2)}<runway>\n${"\t".repeat(3)}<old-ident>${thing.orig}</old-ident>\n${"\t".repeat(3)}<new-ident>${thing.neww}</new-ident>\n${"\t".repeat(2)}</runway>`).join('\n')}\n\t</runway-rename>\n</PropertyList>`;

    fs.mkdirSync(path.join(process.cwd(), "2020.4/Airports", ...movedRunwaysKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "2020.4/Airports", ...movedRunwaysKey.split("").slice(0, -1), `${movedRunwaysKey}.runway_rename.xml`), outstring);
    isJojo && fs.mkdirSync(path.join(process.cwd(), "realairports", ...movedRunwaysKey.split("").slice(0, -1)), {recursive: true});
    isJojo && fs.writeFileSync(path.join(process.cwd(), "realairports", ...movedRunwaysKey.split("").slice(0, -1), `${movedRunwaysKey}.runway_rename.xml`), outstring);
}

console.log("Wrote renames");

let maxDist = 0;

let errantOutstring = "";

const baseTabs = "\t".repeat(2);

if (fs.existsSync("errantFiles.out"))
    fs.unlinkSync("errantFiles.out");

for (const currentAirport in masterDictionary) {
    if (Object.keys(masterDictionary[currentAirport]).length <= 1)
        continue;
    let erroredThisAirport = false;
    process.stdout.write(`Running on ${currentAirport}  \r`);
    let future_branch_outstring = `${copyrightString}<ProceduresDB build="By jojo2357, with FAA data.">\n\t<Airport ICAOcode="${currentAirport}">\n`;
    let current_branch_outstring = `${copyrightString}<ProceduresDB build="By jojo2357, with FAA data.">\n\t<Airport ICAOcode="${currentAirport}">\n`;
    let namedRoute = masterDictionary[currentAirport];
    for (const sidarname in namedRoute) {
        let route = namedRoute[sidarname];

        let runwayTransitions;
        let regularTransitions;
        let commonPoints;

        let mainTag;
        let transitionTag;
        let transitionWaypointTag;
        let wayptTag;

        let oldName = sidarname;
        let newName = sidarname;

        if (route.sid) {
            wayptTag = "Sid_Waypoint";
            transitionWaypointTag = "SidTr_Waypoint";
            mainTag = "Sid";
            transitionTag = "Sid_Transition";

            regularTransitions = [route["3"], route["6"],
                route["S"], route["V"]].reduce((out, arr) => {
                if (arr) for (const key of Object.keys(arr)) {
                    out[key] = arr[key];
                }
                return out;
            }, {});
            runwayTransitions = [route["1"], route["4"],
                route["F"], route["T"]].reduce((out, arr) => {
                if (arr) for (const key of Object.keys(arr)) {
                    out[key] = arr[key];
                }
                return out;
            }, {});
            commonPoints = [route["2"], route["5"],
                route["8"], route["M"]].filter(it => it).reduce((out, curr) => {
                for (const currKey in curr) {
                    out.push(...curr[currKey]);
                }
                return out;
            }, []);
        } else if (route.star) {
            wayptTag = "Star_Waypoint";
            transitionWaypointTag = "StarTr_Waypoint";
            mainTag = "Star";
            transitionTag = "Star_Transition";

            regularTransitions = [route["1"], route["4"],
                route["7"], route["F"]].reduce((out, arr) => {
                if (arr) for (const key of Object.keys(arr)) {
                    out[key] = arr[key];
                }
                return out;
            }, {});
            runwayTransitions = [route["3"], route["6"],
                route["9"], route["S"]].reduce((out, arr) => {
                if (arr) for (const key of Object.keys(arr)) {
                    out[key.slice(2)] = arr[key];
                }
                return out;
            }, {});
            commonPoints = [route["2"], route["5"],
                route["8"], route["M"]].filter(it => it).reduce((out, curr) => {
                for (const currKey in curr) {
                    out.push(...curr[currKey]);
                }
                return out;
            }, []);
        } else if (route.approach) {
            wayptTag = "App_Waypoint";
            transitionWaypointTag = "AppTr_Waypoint";
            mainTag = "Approach";
            transitionTag = "App_Transition";

            regularTransitions = [route["A"]].reduce((out, arr) => {
                if (arr) for (const key of Object.keys(arr)) {
                    out[key] = arr[key];
                }
                return out;
            }, {});

            runwayTransitions = {};

            commonPoints = [
                "B", "D", "F", "G", "H", "I", "J", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
            ].map(it => route[it]).filter(it => it).reduce((out, curr) => {
                for (const currKey in curr) {
                    out.push(...curr[currKey]);
                }
                return out;
            }, []);

            let changedName = "";
            let runwayName = sidarname.slice(1, 4);
            if (!simpleRunwayNames.includes(runwayName.charAt(2)))
                runwayName = runwayName.slice(0, 2);
            switch (sidarname.charAt(0)) {
                case "H":
                    changedName = `RNV${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "I":
                    changedName = `ILS${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "L":
                    changedName = `VDM${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "R":
                    changedName = `RNV${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "V":
                case "S":
                    changedName = `VOR${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "B":
                    changedName = `LBC${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "N":
                    changedName = `NDB${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "Q":
                    changedName = `NDM${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "D":
                    changedName = `TAC${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "X":
                    changedName = `LDA${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "P":
                    changedName = `GPS${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                case "U":
                    changedName = `SDF${sidarname.charAt(4) === " " ? !simpleRunwayNames.includes(sidarname.charAt(3)) ? sidarname.charAt(3) : "" : sidarname.charAt(4)}`;
                    break;
                default:
                    changedName = sidarname;
            }
            oldName = changedName + newRunwayToOld(currentAirport, runwayName.trim());
            newName = changedName + runwayName;
        } else {
            // bad
            continue
        }

        let runTransKeys = Object.keys(runwayTransitions);
        let onlyNone = runTransKeys.length === 0;
        if (onlyNone) {
            if (route.approach)
                runTransKeys = [(simpleRunwayNames.includes(sidarname.slice(1, 4).charAt(2)) ? sidarname.slice(1, 4) : sidarname.slice(1, 3)).trim()];
            else
                runTransKeys = ["ALL"];
        }

        for (const runwayTransKey of runTransKeys) {
            let repeatsFor;
            if (onlyNone || runwayTransKey.trim().length === 2) {
                if (route.approach)
                    repeatsFor = [runwayTransKey.charAt(2)];
                else
                    repeatsFor = [""];
            } else if (runwayTransKey.endsWith("B")) {
                repeatsFor = realRunways[currentAirport].filter(it => it.slice(0, 2) === runwayTransKey.slice(0, 2)).map(it => it.charAt(2));
            } else {
                repeatsFor = [runwayTransKey.charAt(2)];
            }

            let specificDesignator = runwayTransKey.charAt(2);

            // we dont need this because if, say, 1L and 1R are different, we wont ever see 1B.
            // for (const specificDesignator of repeatsFor) {
            let newRunway;
            if (onlyNone)
                newRunway = "ALL";
            else
                newRunway = runwayTransKey.slice(0, 2) + specificDesignator;
            let oldRunway;
            if (onlyNone)
                oldRunway = "ALL";
            else
                oldRunway = newRunway.endsWith("B") ? newRunwayToOld(currentAirport, newRunway.slice(0, 2) + "R").slice(0, 2) + "B" : newRunwayToOld(currentAirport, newRunway);

            current_branch_outstring += baseTabs + `<${mainTag} Name="${oldName.trim()}${route.approach || runTransKeys.length <= 1 ? "" : `.${oldRunway.trim()}`}"${!route.approach && oldRunway !== "ALL" ? ` Runways="${repeatsFor.map(it => newRunwayToOld(currentAirport, runwayTransKey.slice(0, 2) + it)).join(',')}"` : ""}>\n`;
            future_branch_outstring += baseTabs + `<${mainTag} Name="${newName.trim()}${route.approach || runTransKeys.length <= 1 ? "" : `.${newRunway.trim()}`}"${!route.approach && newRunway !== "ALL" ? ` Runways="${repeatsFor.map(it => runwayTransKey.slice(0, 2) + it).join(',')}"` : ""}>\n`;

            let runwayArray = onlyNone ? [] : runwayTransitions[runwayTransKey];

            if (runwayArray.length && commonPoints.length) {
                if (route.sid) {
                    if (runwayArray[runwayArray.length - 1].loc.ident && commonPoints[0].loc.ident && runwayArray[runwayArray.length - 1].loc.ident.trim() === commonPoints[0].loc.ident.trim())
                        runwayArray = runwayArray.concat(commonPoints.slice(1));
                    else
                        runwayArray = runwayArray.concat(commonPoints);
                } else if (route.star) {
                    if (runwayArray[0].loc.ident && commonPoints[commonPoints.length - 1].loc.ident && runwayArray[0].loc.ident.trim() === commonPoints[commonPoints.length - 1].loc.ident.trim())
                        runwayArray = commonPoints.slice(0, -1).concat(runwayArray);
                    else
                        runwayArray = commonPoints.concat(runwayArray);
                }
            } else {
                if (route.sid)
                    runwayArray = runwayArray.concat(commonPoints);
                else if (route.star || route.approach)
                    runwayArray = commonPoints.concat(runwayArray);
            }

            for (let i = 0; i < runwayArray.length; i++) {
                current_branch_outstring += wayptToString(runwayArray[i], wayptTag, 3, true, i === runwayArray.length - 1 ? undefined : runwayArray[i + 1]);
                future_branch_outstring += wayptToString(runwayArray[i], wayptTag, 3, false, i === runwayArray.length - 1 ? undefined : runwayArray[i + 1]);
            }

            for (const regularTransitionsKey in regularTransitions) {
                let runwayArr = regularTransitions[regularTransitionsKey];

                if (route.sid && runwayArr[0].loc.ident === runwayArray[runwayArray.length - 1].loc.ident && !["HM", "HF", "HA"].includes(runwayArr[0].obj.fix_path_termination)) {
                    runwayArr = runwayArr.slice(1);
                } else if ((route.star || route.approach) && runwayArr[runwayArr.length - 1].loc.ident === runwayArray[0].loc.ident && !["HM", "HF", "HA"].includes(runwayArr[runwayArr.length - 1].obj.fix_path_termination)) {
                    runwayArr = runwayArr.slice(0, -1);
                }
                if (runwayArr.length === 0) {
                    continue;
                }
                current_branch_outstring += `${baseTabs}\t<${transitionTag} Name="${regularTransitionsKey.trim()}">\n`;
                future_branch_outstring += `${baseTabs}\t<${transitionTag} Name="${regularTransitionsKey.trim()}">\n`;
                for (let i = 0; i < runwayArr.length; i++) {
                    current_branch_outstring += wayptToString(runwayArr[i], transitionWaypointTag, 4, true, i === runwayArr.length - 1 ? undefined : runwayArr[i + 1]);
                    future_branch_outstring += wayptToString(runwayArr[i], transitionWaypointTag, 4, false, i === runwayArr.length - 1 ? undefined : runwayArr[i + 1]);
                }

                current_branch_outstring += `${baseTabs}\t</${transitionTag}>\n`;
                future_branch_outstring += `${baseTabs}\t</${transitionTag}>\n`;
            }

            current_branch_outstring += `${baseTabs}</${mainTag}>\n`;
            future_branch_outstring += `${baseTabs}</${mainTag}>\n`;
            // }
        }
    }
    future_branch_outstring += `\t</Airport>\n</ProceduresDB>\n`;
    current_branch_outstring += `\t</Airport>\n</ProceduresDB>\n`;
    fs.mkdirSync(path.join(process.cwd(), "2020.4/Airports", ...currentAirport.split("").slice(0, -1)), {recursive: true});
    fs.mkdirSync(path.join(process.cwd(), "2020.3/Airports", ...currentAirport.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "2020.4/Airports", ...currentAirport.split("").slice(0, -1), `${currentAirport}.procedures.xml`), future_branch_outstring);
    fs.writeFileSync(path.join(process.cwd(), "2020.3/Airports", ...currentAirport.split("").slice(0, -1), `${currentAirport}.procedures.xml`), current_branch_outstring);
    if (future_branch_outstring.match(/<(?<TagName>[A-Z_]+)( Name="\w+")?>(\s)+<\/\k<TagName>>/) || current_branch_outstring.match(/<(?<TagName>[A-Z_]+)( Name="\w+")?>(\s)+<\/\k<TagName>>/)) {
        fs.appendFileSync("errantFiles.out", currentAirport);
    }
    isJojo && fs.mkdirSync(path.join(process.cwd(), "LocalAirports", ...currentAirport.split("").slice(0, -1)), {recursive: true});
    isJojo && fs.writeFileSync(path.join(process.cwd(), "LocalAirports", ...currentAirport.split("").slice(0, -1), `${currentAirport}.procedures.xml`), current_branch_outstring);
    isJojo && fs.mkdirSync(path.join(process.cwd(), "realairports", ...currentAirport.split("").slice(0, -1)), {recursive: true});
    isJojo && fs.writeFileSync(path.join(process.cwd(), "realairports", ...currentAirport.split("").slice(0, -1), `${currentAirport}.procedures.xml`), future_branch_outstring);
}

//console.log(thing);

console.log();

function getAltitudeRestriction(nav_altitude) {
    let out = "<AltitudeRestriction>";
    switch (nav_altitude) {
        case "B":
        case "G":
        case "H":
        case "V":
            out += `between`;
            break;
        case "+": {
            out += `above`;
            break;
        }
        case "-": {
            out += `below`;
            break;
        }
        case "X":
        case "J":
        case "I":
        case " ": {
            out += `at`;
            break;
        }

        default:
            console.log("Unrecognized nav alt", nav_altitude);
    }
    return out + '</AltitudeRestriction>\n';
}

function getAltitudes(obj, tabs = "") {
    let out = "";

    let dispalt1 = obj.nav_altitude_1;
    dispalt1 = (dispalt1.match(/(FL)?(\d+)/) ? dispalt1.match(/(FL)?(\d+)/)[2] + (dispalt1.match(/(FL)?(\d+)/)[1] ? "00" : "") : "").trim();
    let dispalt2 = obj.nav_altitude_2;
    dispalt2 = (dispalt2.match(/(FL)?(\d+)/) ? dispalt2.match(/(FL)?(\d+)/)[2] + (dispalt2.match(/(FL)?(\d+)/)[1] ? "00" : "") : "").trim();

    if (dispalt1.length === 0) dispalt1 = "0";
    if (dispalt2.length === 0) dispalt2 = "0";

    out += `${tabs}<Altitude>${dispalt1}</Altitude>\n`;
    out += `${tabs}<AltitudeCons>${dispalt2}</AltitudeCons>\n`;

    return out;
}

function wayptToString(waypt, tagName, tabDepth = 0, useOldRunway = false, nextWaypt) {
    // RF way be special
    if (waypt.obj.fix_path_termination === "FM") {
        return specialWaypt(waypt, tagName, tabDepth, useOldRunway);
    }
    let out = `${'\t'.repeat(tabDepth)}<${tagName}>\n`;

    // name
    const tabs = '\t'.repeat(tabDepth + 1);
    out += `${tabs}<Name>`;
    switch (waypt.obj.fix_path_termination) {
        case "TF":
            if (useOldRunway && waypt.obj.fix_ident.match(/RW\d{2}/)) {
                out += "RW" + newRunwayToOld(waypt.obj.airportIDENT, waypt.obj.fix_ident.slice(2)).trim()
            } else {
                out += waypt.obj.fix_ident.trim();
            }
            break;
        case "DF":
        case "RF":
        case "IF":
        case "AF":
        case "FC":
        case "PI":
            out += waypt.obj.fix_ident.trim();
            break;
        case "VA":
        case "FA":
        case "CA":
            out += `(${waypt.obj.nav_altitude_1.length ? waypt.obj.nav_altitude_1 : waypt.obj.nav_altitude_2})`;
            break;
        case "VI":
            if (waypt.obj.airportIDENT === "KSEA" && waypt.obj.SID_STAR_Ident === "I34R ")
                console.log(waypt);
            // else if (waypt.obj.airportIDENT === "KS")
            out += `(INTC)`; // this might be const hdg to alt with a split with intc
            break;
        case "CF":
            out += waypt.obj.fix_ident.trim(); // cousin of above, really the second half therin
            break;
        case "VM":
        case "VD":
            out += "(VECTORS)";
            break;
        case "CD":
            out += waypt.obj.nav_fix.trim();
            break;
        case "VR":
            out += waypt.obj.fix_path_navaid.trim();
            break;
        case "HM":
        case "HF":
        case "HA":
            out += waypt.obj.fix_ident.trim();
            break;
        case "CI":
            out += "(INTC)";
            break;
        default:
            console.log("Unrecognized:", waypt.obj.fix_path_termination);
    }
    out += `</Name><!-- ${waypt.obj.fix_path_termination} -->\n`;

    // type
    out += `${tabs}<Type>`;

    switch (waypt.obj.fix_path_termination) {
        case "TF":
        case "CF":
            if (waypt.obj.is_APPROACH) {
                if (!waypt.loc.ident) {
                    if (waypt.loc.match(/RW\d{2}/)) {
                        console.log("WHAT THE FUK");
                        out += "Runway";
                    } else {
                        out += "Normal";
                    }
                } else if (waypt.loc.ident.match(/RW\d{2}/)) {
                    out += "Runway";
                } else out += 'Normal';
            } else out += 'Normal';
            break;
        case "IF":
        case "DF":
        case "RF":
        case "AF":
        case "FC":
        case "PI":
            out += 'Normal';
            break;
        case "VA":
        case "CA":
        case "FA":
            out += 'ConstHdgtoAlt';
            break;
        case "VI":
            out += 'Intc';
            break;
        case "VM":
        case "VD":
            out += "Vectors";
            break;
        case "CD":
            out += "DmeInc";
            break;
        case "VR":
            out += "VorRadialIntc";
            break;
        case "HM":
        case "HF":
        case "HA":
            out += "Hold";
    }
    out += "</Type>\n";

    // lat/lon
    let latobj;
    let lonobj;
    // let latstr = `${tabs}<Latitude>`;
    // let lonstr = `${tabs}<Longitude>`;

    switch (waypt.obj.fix_path_termination) {
        case "IF":
        case "DF":
        case "RF":
        case "TF":
        case "AF":
        case "PI":
        case "FC":
        case "HM":
        case "HF":
        case "HA":
        case "CF": // see above comments
            if (waypt.loc.reallatitude) {
                latobj = waypt.loc.reallatitude;
                lonobj = waypt.loc.reallongtude;
            } else if (waypt.loc.vorLatitude) {
                latobj = waypt.loc.vorLatitude;
                lonobj = waypt.loc.vorLongitude;
            } else if (waypt.loc.DMELatitude) {
                latobj = waypt.loc.DMELatitude;
                lonobj = waypt.loc.DMELongitude;
            } else if (waypt.loc.rwylatitude) {
                latobj = waypt.loc.rwylatitude;
                lonobj = waypt.loc.rwylongitude;
            } else if (waypt.loc.airpotLatitude) {
                latobj = waypt.loc.airpotLatitude;
                lonobj = waypt.loc.airpotLongitude;
            } else {
                let best = findClosestPoorlyNamedWaypoint(waypt.loc, knownWaypoints[waypt.obj.airportIDENT.trim()].latitude(), knownWaypoints[waypt.obj.airportIDENT.trim()].longitude());
                if (best) {
                    latobj = best.latitude();
                    lonobj = best.longitude();
                } else
                    console.log("FUUUUUCK", waypt.loc);
            }
            break;
        case "VR":
        case "CD":
        case "VD": {
            let loc = knownWaypoints[waypt.obj.fix_path_navaid.trim()];

            if (!loc) {
                console.log("Couldnt find", waypt.obj.fix_path_navaid.trim(), "and", waypt.obj.fix_ident);
                break;
            }

            if (loc.vorLatitude) {
                latobj = loc.vorLatitude;
                lonobj = loc.vorLongitude;
            } else if (loc.DMELatitude) {
                latobj = loc.DMELatitude;
                lonobj = loc.DMELongitude;
            } else if (loc.reallatitude) {
                latobj = loc.reallatitude;
                lonobj = loc.reallongtude;
            } else if (loc.airpotLatitude) {
                latobj = loc.airpotLatitude;
                lonobj = loc.airpotLongitude;
            } else if (loc.rwylatitude) {
                latobj = loc.rwylatitude;
                lonobj = loc.rwylongitude;
            } else {
                let best = findClosestPoorlyNamedWaypoint(loc, knownWaypoints[waypt.obj.airportIDENT.trim()].latitude(), knownWaypoints[waypt.obj.airportIDENT.trim()].longitude());
                if (best) {
                    latobj = best.latitude();
                    lonobj = best.longitude();
                } else
                    console.log("FUUUUUCK", loc);
            }
            break;
        }
        case "FA":
        case "VA":
        case "CA":
        case "CI":
            // latstr += "0";
            // lonstr += "0";
            break;
        case "VI":
        case "VM":
            if (!nextWaypt) {
                // latstr += '0.0';
                // lonstr += '0.0';
            } else if (nextWaypt.loc.vorLatitude) {
                latobj = nextWaypt.loc.vorLatitude;
                lonobj = nextWaypt.loc.vorLongitude;
            } else if (nextWaypt.loc.DMELatitude) {
                latobj = nextWaypt.loc.DMELatitude;
                lonobj = nextWaypt.loc.DMELongitude;
            } else if (nextWaypt.loc.reallatitude) {
                latobj = nextWaypt.loc.reallatitude;
                lonobj = nextWaypt.loc.reallongtude;
            } else if (nextWaypt.loc.airpotLatitude) {
                latobj = nextWaypt.loc.airpotLatitude;
                lonobj = nextWaypt.loc.airpotLongitude;
            } else if (nextWaypt.loc.rwylatitude) {
                latobj = nextWaypt.loc.rwylatitude;
                lonobj = nextWaypt.loc.rwylongitude;
            } else {
                let best = findClosestPoorlyNamedWaypoint(nextWaypt.loc, knownWaypoints[waypt.obj.airportIDENT.trim()].latitude(), knownWaypoints[waypt.obj.airportIDENT.trim()].longitude());
                if (best) {
                    latobj = best.latitude();
                    lonobj = best.longitude();
                } else
                    console.log("FUUUUUCK", nextWaypt.loc);
            }
            break;
        default:
            console.log("Fuck", waypt.obj.fix_path_termination);
    }

    /*    if (latobj && lonobj) {
            let dist = Latongitude.realDistance(latobj.value, lonobj.value, knownWaypoints[waypt.obj.airportIDENT].latitude().value, knownWaypoints[waypt.obj.airportIDENT].longitude().value);

            if (dist > maxDist) {
                maxDist = dist;
                console.log("New Record", waypt.obj.airportIDENT, "on", waypt.obj.SID_STAR_Ident, "at", waypt.loc.ident, dist, "nm");
            } else if (dist > 300) {
                console.log("Far Awaey", waypt.obj.airportIDENT, "on", waypt.obj.SID_STAR_Ident, "at", waypt.loc.ident, dist, "nm");
            }
        }*/

    out += `${tabs}<Latitude>${Latongitude.toAbsNumber(latobj)}</Latitude>\n${tabs}<Longitude>${Latongitude.toAbsNumber(lonobj)}</Longitude>\n`;

    // Speed
    if (waypt.obj.nav_speed_limit.trim().length === 0)
        out += `${tabs}<Speed>0</Speed>\n`;
    else
        out += `${tabs}<Speed>${waypt.obj.nav_speed_limit.trim()}</Speed>\n`;

    // Altitude
    out += getAltitudes(waypt.obj, tabs);

    // Altitude Restriction
    out += tabs + getAltitudeRestriction(waypt.obj.nav_altitude);

    if (waypt.obj.fix_description.charAt(1) === "Y") {
        out += `${tabs}<Flytype>Fly-over</Flytype>\n`;
    } else {
        out += `${tabs}<Flytype>Fly-by</Flytype>\n`;
    }

    // Speed
    // if (waypt.obj.nav_speed_limit.trim().length)
    //     out += `${tabs}<Speed>${waypt.obj.nav_speed_limit.trim()}</Speed>\n`;

    // Hdg
    if (waypt.obj.fix_path_termination === "VA" || waypt.obj.fix_path_termination === "FA" || waypt.obj.fix_path_termination === "VM" || waypt.obj.fix_path_termination === "VD") {
        out += `${tabs}<Hdg_Crs>1</Hdg_Crs>\n`;
        out += `${tabs}<Hdg_Crs_value>${(Number.parseInt(waypt.obj.fix_magnetic_course) * (waypt.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)).toFixed(1)}</Hdg_Crs_value>\n`;
        /*        if (waypt.obj.fix_path_termination === "VI" && nextWaypt) {
                    out += `${tabs}<RadialtoIntercept>${2 * (Number.parseInt(nextWaypt.obj.fix_magnetic_course) * 0.1 % 180) - (Number.parseInt(nextWaypt.obj.fix_magnetic_course) * 0.1 % 360) + 180}</RadialtoIntercept>\n`
                }*/
    } else if (waypt.obj.fix_path_termination === "CA" || waypt.obj.fix_path_termination === "VI") {
        out += `${tabs}<Hdg_Crs>0</Hdg_Crs>\n`;
        out += `${tabs}<Hdg_Crs_value>${(Number.parseInt(waypt.obj.fix_magnetic_course) * (waypt.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)).toFixed(1)}</Hdg_Crs_value>\n`;
    } else if (waypt.obj.fix_path_termination === "HM" || waypt.obj.fix_path_termination === "HF" || waypt.obj.fix_path_termination === "HA") {
        out += `${tabs}<Hld_Rad_value>${(Number.parseInt(waypt.obj.fix_magnetic_course) * (waypt.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)).toFixed(1)}</Hld_Rad_value>\n`;
        out += `${tabs}<Hld_Time_or_Dist>${waypt.obj.fix_distance.startsWith("T") ? "Time" : "Dist"}</Hld_Time_or_Dist>\n`;
        out += `${tabs}<Hld_td_value>${(waypt.obj.fix_distance.match(/\d+/) * 0.1).toFixed(1)}</Hld_td_value>\n`;
        out += `${tabs}<Hld_Rad_or_Inbd>Inbd</Hld_Rad_or_Inbd>\n`;
    } else if (waypt.obj.fix_path_termination === "VR") {
        // console.log();
        out += `${tabs}<Hdg_Crs>1</Hdg_Crs>\n`;
        out += `${tabs}<Hdg_Crs_value>${(Number.parseInt(waypt.obj.fix_magnetic_course) * (waypt.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)).toFixed(1)}</Hdg_Crs_value>\n`;
        out += `${tabs}<RadialtoIntercept>${(Number.parseInt(waypt.obj.fix_theta) * 0.1).toFixed(1)}</RadialtoIntercept>\n`;
        // RadialtoIntercept
    }

    // turn dir
    if (waypt.obj.fix_path_termination === "HA" || waypt.obj.fix_path_termination === "HM" || waypt.obj.fix_path_termination === "HF") {
        out += `${tabs}<Hld_Turn>${waypt.obj.fix_turn_direction.trim().length === 0 ? "Auto" : waypt.obj.fix_turn_direction === "R" ? "Right" : "Left"}</Hld_Turn>\n`;
    } else
        out += `${tabs}<Sp_Turn>${waypt.obj.fix_turn_direction.trim().length === 0 ? "Auto" : waypt.obj.fix_turn_direction === "R" ? "Right" : "Left"}</Sp_Turn>\n`;

    return out + `${'\t'.repeat(tabDepth)}</${tagName}>\n`;
}

function specialWaypt(waypt, tagName, tabDepth, useOldRunway, nextWaypt) {
    const tabs = '\t'.repeat(tabDepth + 1);

    let out = `${'\t'.repeat(tabDepth)}<${tagName}>\n`;

    out += `${tabs}<Name>${waypt.obj.fix_ident}</Name>\n`;
    out += `${tabs}<Type>Normal</Type>\n`;

    let latstr = `${tabs}<Latitude>`;
    let lonstr = `${tabs}<Longitude>`;

    latstr += Latongitude.toAbsNumber(waypt.loc.reallatitude);
    lonstr += Latongitude.toAbsNumber(waypt.loc.reallongtude);

    out += `${latstr}</Latitude>\n${lonstr}</Longitude>\n`;

    if (waypt.obj.nav_speed_limit.trim().length)
        out += `${tabs}<Speed>${waypt.obj.nav_speed_limit.trim()}</Speed>\n`;
    else
        out += `${tabs}<Speed>0</Speed>\n`;

    out += getAltitudes(waypt.obj, tabs);
    out += tabs + getAltitudeRestriction(waypt.obj.nav_altitude);

    out += `${'\t'.repeat(tabDepth)}</${tagName}>\n`;
    out += `${'\t'.repeat(tabDepth)}<${tagName}>\n`;

    out += `${tabs}<Name>(VECTORS)</Name>\n`;
    out += `${tabs}<Type>Vectors</Type>\n`;

    out += `${tabs}<Latitude>0</Latitude>\n${tabs}<Longitude>0</Longitude>\n`;

    out += `${tabs}<Hdg_Crs>0</Hdg_Crs>\n`;
    out += `${tabs}<Hdg_Crs_value>${(Number.parseInt(waypt.obj.fix_magnetic_course) * (waypt.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)).toFixed(1)}</Hdg_Crs_value>\n`

    out += `${'\t'.repeat(tabDepth)}</${tagName}>\n`;

    return out;
}

function newRunwayToOld(airport, currentRunway) {
    return movedRunways[airport].some(renameObj => renameObj.neww === currentRunway.trim()) ? movedRunways[airport].find(renameObj => renameObj.neww === currentRunway.trim()).orig : currentRunway;
}

function oldRunwayToNew(airport, oldRunway) {
    return movedRunways[airport].some(renameObj => renameObj.orig === oldRunway.trim()) ? movedRunways[airport].find(renameObj => renameObj.orig === oldRunway.trim()).neww : oldRunway;
}

function findClosestPoorlyNamedWaypoint(name, locLat, locLon) {
    let distarr = awfullyNamedWaypoints[name.trim()].map(waypt => Latongitude.distance(waypt.latitude(), waypt.longitude(), locLat, locLon));

    let minDist = Math.min(...distarr);

    return awfullyNamedWaypoints[name.trim()][distarr.findIndex(thing => thing === minDist)];
}