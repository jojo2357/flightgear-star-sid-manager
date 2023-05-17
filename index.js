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
const {parseLine, RouteType, altitudeToXML, Latongitude} = require('./arinc424parser');
const path = require("path");

const oldData = fs.readFileSync("apt.dat").toString().split(/\r?\n/g).filter(it => it.trim().length);

let airpourtCode;
let discoveredRunways = {};

for (let i = 2; i < oldData.length; i++) {
    if (oldData[i].match(/^1\s/)) {
        let exploded = oldData[i].match(/^1\s+(-?\d+)\s+\d\s+\d\s+([A-Z]{0,4})\s/);
        if (!exploded) {
            airpourtCode = undefined;
            continue;
        }
        airpourtCode = exploded[2];
        discoveredRunways[airpourtCode] = [];
    } else if (!airpourtCode) {
        continue;
    } else if (oldData[i].match(/^100\s/)) {
        let exploded = oldData[i].match(/^100\s+\d+(?:\.\d+)?\s+\d+\s+\d+\s+\d+(?:\.\d+)?\s+\d\s+\d\s+\d\s+([0-3]?\d{0,2}[A-Z]?)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)(?:\s+\d+\.\d+\s+\d+\.\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+([0-3]?\d{0,2}[A-Z]?)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+))?/);
        if (discoveredRunways[airpourtCode].every(rwy => rwy.ident !== exploded[1])) {
            let latnum = Number.parseFloat(exploded[2]);
            let lonnum = Number.parseFloat(exploded[3]);
            discoveredRunways[airpourtCode].push({
                ident: exploded[1],
                lat: new Latongitude(latnum > 0 ? "N" : "S", Math.abs(latnum)),
                lon: new Latongitude(lonnum > 0 ? "E" : "W", Math.abs(lonnum)),
            });
            if (exploded.filter(it => it).length > 4) {
                latnum = Number.parseFloat(exploded[5]);
                lonnum = Number.parseFloat(exploded[6]);
                discoveredRunways[airpourtCode].push({
                    ident: exploded[4],
                    lat: new Latongitude(latnum > 0 ? "N" : "S", Math.abs(latnum)),
                    lon: new Latongitude(lonnum > 0 ? "E" : "W", Math.abs(lonnum)),
                })
            }
        }
    }
}

const data = fs.readFileSync("CIFP_230323/FAACIFP18").toString().split(/\r?\n/g);
//^([ST])([A-Z]{3})([A-Z]) ([A-Z]{4})([\dA-Z]{2})([DEF])
//let starz = data.map(dater => dater.match(/^([ST])([A-Z]{3})(P) ([A-Z]{4})([\dA-Z]{2})([DEF])([A-Z\d]{6})/)).filter((dater) => dater);

/** @type {ParseResult[]} */
const it = data.reduce((out, dater) => {
    let vahl = parseLine(dater);
    if (vahl.recognizedLine)
        out.push(vahl);
    else ;
    // console.log(dater);
    return out;
}, []);

/*let starz = data.map(dater => dater.match(/^S([A-Z]{3})P ([A-Z]{4})([\dA-Z]{2})([DEF])([A-Z\d]{6})([\dFMSTV])(.{5}) (\d{3})([\dA-Z ]{5})([\dA-Z][\dA-Z ])([ADEHPRTU])([A-Z ])([\dA-Z]).*$/)).filter((dater) => dater);
console.log(starz[0]);
console.log(starz.filter(star => star.includes("LEENA7")).map(item => item[2]), starz.length);

/**
 * @type {SID_STAR[]}
 */
/*let bars = starz.filter(star => star.includes("LEENA7")).map(star => parseLine(star.input));
console.log(bars, bars.length, data.filter(line => line.includes("LEENA7")).length, data.filter(line => line.includes("LEENA7") && bars.every(bar => bar.source !== line)));
for (let i = 1; i <= 132; i++) {
    process.stdout.write(!(i % 10) ? (i / 10 % 10).toString() : " ");
}
console.log();
for (let i = 1; i <= 132; i++) {
    process.stdout.write((i % 10).toString());
}
console.log();
console.log(bars.map((bar, windex) => `${bar.source}`).join('\n'));

/*const thing = bars.reduce((out, curr) => {
    if (!out[curr.routeType])
        out[curr.routeType] = {};
    if (!out[curr.routeType][curr.TRANS_IDENT])
        out[curr.routeType][curr.TRANS_IDENT] = [];
    out[curr.routeType][curr.TRANS_IDENT].push(it.find(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) ? it.find(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) : curr.fix_ident);
    return out;
}, {});*/

let movedRunways = {};

const worldDist = 0.00005;
const thingey = it.reduce((out, curr, windex, array) => {
    if (curr.parentident) {
        if (!out[curr.parentident])
            out[curr.parentident] = {};
        if (!out[curr.parentident].runweys)
            out[curr.parentident].runweys = [];
        curr.ident.substring(2).replace(/(\d{2})B/, "$1R,$1L").split(",").map(val => val.trim()).forEach(thin => {
            if (!out[curr.parentident].runweys.includes(thin))
                out[curr.parentident].runweys.push(thin);
        });
    }
    if (curr.parentident && discoveredRunways[curr.parentident] && curr.ident.match(/\d{2}([^WG]$|$)/)) {
        if (!movedRunways[curr.parentident]) {
            movedRunways[curr.parentident] = [];
        }
        discoveredRunways[curr.parentident].map(it => Latongitude.distance(it.lat, it.lon, curr.rwylatitude, curr.rwylongitude));

        if (discoveredRunways[curr.parentident].some(other => Latongitude.distance(other.lat, other.lon, curr.rwylatitude, curr.rwylongitude) < worldDist)) {
            if (discoveredRunways[curr.parentident].filter(other => Latongitude.distance(other.lat, other.lon, curr.rwylatitude, curr.rwylongitude) < worldDist).some(thing => thing.ident === curr.ident.substring(2).trim())) {
                // console.log("Close cousin");
            } else {
                // different ident?
                if (discoveredRunways[curr.parentident].filter(other => Latongitude.distance(other.lat, other.lon, curr.rwylatitude, curr.rwylongitude) < worldDist).some(thing => thing.ident.length === curr.ident.trim().length - 2 && ((thing.ident.length === 3) ? (thing.ident.charAt(2) === curr.ident.charAt(4)) : true) && ((Math.abs((Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(curr.ident.substring(2, 4)))) + 4) % 36) - 4 < 4)) {
                    // console.log("I moved");
                    movedRunways[curr.parentident].push({
                        orig: discoveredRunways[curr.parentident].filter(other => Latongitude.distance(other.lat, other.lon, curr.rwylatitude, curr.rwylongitude) < worldDist).find(thing => thing.ident.length === curr.ident.trim().length - 2 && ((thing.ident.length === 3) ? (thing.ident.charAt(2) === curr.ident.charAt(4)) : true) && ((Math.abs((Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(curr.ident.substring(2, 4)))) + 4) % 36) - 4 < 4).ident,
                        neww: curr.ident.substring(2).trim()
                    });
                } else {
                    if (discoveredRunways[curr.parentident].some(thing => ((thing.ident.length === 3) ? (thing.ident.charAt(2) === curr.ident.charAt(4)) : true) && ((Math.abs(Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(curr.ident.substring(2, 4))) + 4) % 36) - 4 < 4)) {
                        // console.log("???");
                        movedRunways[curr.parentident].push({
                            orig: discoveredRunways[curr.parentident].filter(thing => ((thing.ident.length === 3) ? (thing.ident.charAt(2) === curr.ident.charAt(4)) : true) && ((Math.abs(Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(curr.ident.substring(2, 4))) + 4) % 36) - 4 < 4).sort((a,b) => ((Math.abs(Number.parseInt(a.ident.substring(0, 2)) - Number.parseInt(curr.ident.substring(2, 4))) + 4) % 36) - 4 - ((Math.abs(Number.parseInt(b.ident.substring(0, 2)) - Number.parseInt(curr.ident.substring(2, 4))) + 4) % 36) - 4)[0].ident,
                            neww: curr.ident.substring(2).trim()
                        });
                    } else {
                        console.log("Im missing");
                    }
                }
            }
        } else if (discoveredRunways[curr.parentident].some(thing => ((thing.ident.length === 3) ? (thing.ident.charAt(2) === curr.ident.charAt(4)) : true) && ((Math.abs(Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(curr.ident.substring(2, 4))) + 4) % 36) - 4 < 4)) {
            movedRunways[curr.parentident].push({
                orig: discoveredRunways[curr.parentident].find(thing => ((thing.ident.length === 3) ? (thing.ident.charAt(2) === curr.ident.charAt(4)) : true) && ((Math.abs(Number.parseInt(thing.ident.substring(0, 2)) - Number.parseInt(curr.ident.substring(2, 4))) + 4) % 36) - 4 < 4).ident,
                neww: curr.ident.substring(2).trim()
            });
        } else {
            console.log("Unrelated?");
        }
        if (movedRunways[curr.parentident].length && !movedRunways[curr.parentident][movedRunways[curr.parentident].length - 1].neww.match(/^\d{2}\w?$/)) {
            console.log("Thats not a runway!");
        }
        if (movedRunways[curr.parentident].some(thing => movedRunways[curr.parentident].some(other => thing !== other && other.neww === thing.orig))) {
            console.log("I did a bad thing");
        }
    }
    process.stdout.write(`Parsing ${windex}/${array.length}\r`);
    if (curr.airportIDENT && discoveredRunways[curr.airportIDENT]) {
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
                loc: it.some(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) ? it.find(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) : curr.fix_ident,
                obj: curr
            });
        } else {
            out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType][curr.TRANS_IDENT].push({
                loc: it.some(val => val.ident && val.parentident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim() && val.parentident.trim() === curr.airportIDENT) ? it.find(val => val.ident && val.parentident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim() && val.parentident.trim() === curr.airportIDENT) : curr.fix_ident,
                obj: curr
            });
            if (!out[curr.airportIDENT].runweys)
                out[curr.airportIDENT].runweys = [];
            curr.fix_ident.substring(2).replace(/(\d{2})B/, "$1R,$1L").split(",").map(val => val.trim()).forEach(thin => {
                if (!out[curr.airportIDENT].runweys.includes(thin))
                    out[curr.airportIDENT].runweys.push(thin);
            });
        }
    }
    return out;
}, {});

for (const movedRunwaysKey in movedRunways) {
    movedRunways[movedRunwaysKey] = movedRunways[movedRunwaysKey].filter(thing => thing.orig !== thing.neww);
    if (!(movedRunways[movedRunwaysKey].length))
        continue;
    if (movedRunways[movedRunwaysKey].some(thing => movedRunways[movedRunwaysKey].some(other => thing !== other && Math.abs(Number.parseInt(thing.orig.substring(0, 2)) - Number.parseInt(other.orig.substring(0, 2))) <= 1)))
        console.log(movedRunways[movedRunwaysKey]);

    let outstring = `<PropertyList build="By jojo2357, with FAA data. Data factor = ${(it.length / data.length).toFixed(4)}">\n\t<runway-rename>\n${movedRunways[movedRunwaysKey].map(thing => `${"\t".repeat(2)}<runway>\n${"\t".repeat(3)}<old-ident>${thing.orig}</old-ident>\n${"\t".repeat(3)}<new-ident>${thing.neww}</new-ident>\n${"\t".repeat(2)}</runway>`).join('\n')}\n\t</runway-rename>\n</PropertyList>`;

    fs.mkdirSync(path.join(process.cwd(), "2020.4", ...movedRunwaysKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "2020.4", ...movedRunwaysKey.split("").slice(0, -1), `${movedRunwaysKey}.runway_rename.xml`), outstring);
    fs.mkdirSync(path.join(process.cwd(), "Airports", ...movedRunwaysKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "Airports", ...movedRunwaysKey.split("").slice(0, -1), `${movedRunwaysKey}.runway_rename.xml`), outstring);
    fs.mkdirSync(path.join(process.cwd(), "realairports", ...movedRunwaysKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "realairports", ...movedRunwaysKey.split("").slice(0, -1), `${movedRunwaysKey}.runway_rename.xml`), outstring);
}

console.log("Wrote renames");

for (const thingeyKey in thingey) {
    if (Object.keys(thingey[thingeyKey]).length <= 1)
        continue;
    process.stdout.write(`Running on ${thingeyKey}  \r`);
    let oufile = path.join(...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`);
    let future_branch_outstring = `<ProceduresDB build="By jojo2357, with FAA data. Data factor = ${(it.length / data.length).toFixed(4)}">\n\t<Airport ICAOcode="${thingeyKey}">\n`;
    let current_branch_outstring = `<ProceduresDB build="By jojo2357, with FAA data. Data factor = ${(it.length / data.length).toFixed(4)}">\n\t<Airport ICAOcode="${thingeyKey}">\n`;
    let depth = 2;
    let namedRoute = thingey[thingeyKey];
    let sids = 0, stars = 0, approaches = 0;
    let completedsids = 0, completedstars = 0, completedapproaches = 0;
    for (const sidarname in namedRoute) {
        let route = namedRoute[sidarname];
        if (route.sid) {
            sids++;
            /*if (!route[RouteType["PD"]["2"]] && !route[RouteType["PD"]["5"]]
                && !route[RouteType["PD"]["8"]] && !route[RouteType["PD"]["M"]]) {
                continue;
            }*/
            let sidplaced = false;
            try {
                let entrans = [route[RouteType["PD"]["3"]], route[RouteType["PD"]["6"]], route[RouteType["PD"]["S"]], route[RouteType["PD"]["V"]]].reduce((out, arr) => {
                    if (arr) out.push(arr);
                    return out;
                }, []);
                let trans = [route[RouteType["PD"]["1"]], route[RouteType["PD"]["4"]], route[RouteType["PD"]["F"]], route[RouteType["PD"]["T"]]].reduce((out, arr) => {
                    if (arr) out.push(arr);
                    return out;
                }, []);
                let commoners = [route[RouteType["PD"]["2"]], route[RouteType["PD"]["5"]],
                    route[RouteType["PD"]["8"]], route[RouteType["PD"]["M"]]].reduce((out, arr) => {
                    if (arr) out.push(arr);
                    return out;
                }, []);

                sidplaced = true;

                future_branch_outstring += `${'\t'.repeat(depth)}<Sid Name="${sidarname}" Runways="${Object.keys(trans.length ? trans[0] : commoners[0]).map(it => it.trim().replace("ALL", thingey[thingeyKey].runweys.join(",")).replace(/(\d{2})B/, "$1R,$1L")).join(",")}">\n`;
                current_branch_outstring += `${'\t'.repeat(depth++)}<Sid Name="${sidarname}" Runways="${Object.keys(trans.length ? trans[0] : commoners[0]).map(it => it.trim().replace("ALL", thingey[thingeyKey].runweys.join(",")).replace(/(\d{2})B/, "$1R,$1L")).join(",")}">\n`;
                for (const commonerlist of commoners) {
                    for (const simpsKey in commonerlist) {
                        for (const simps of commonerlist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                continue;

                            future_branch_outstring += `${'\t'.repeat(depth)}<Sid_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                            current_branch_outstring += `${'\t'.repeat(depth++)}<Sid_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                            future_branch_outstring += altitudeToXML(simps.obj, depth);
                            current_branch_outstring += altitudeToXML(simps.obj, depth);

                            future_branch_outstring += `${'\t'.repeat(--depth)}</Sid_Waypoint>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}</Sid_Waypoint>\n`;
                        }
                    }
                }
                for (const translist of entrans) {
                    for (const simpsKey in translist) {
                        future_branch_outstring += `${'\t'.repeat(depth)}<Sid_Transition Name="${simpsKey}">\n`;
                        current_branch_outstring += `${'\t'.repeat(depth++)}<Sid_Transition Name="${simpsKey}">\n`;
                        for (const simps of translist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                                // continue;
                                if (simps.obj.fix_path_termination === "VI") {
                                    future_branch_outstring += `${'\t'.repeat(depth)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                    // future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    // future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                    future_branch_outstring += altitudeToXML(simps.obj, depth);
                                    current_branch_outstring += altitudeToXML(simps.obj, depth);

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                    future_branch_outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}</SidTr_Waypoint>\n`;
                                }
                                continue;
                            }

                            future_branch_outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                            future_branch_outstring += altitudeToXML(simps.obj, depth);
                            current_branch_outstring += altitudeToXML(simps.obj, depth);

                            future_branch_outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}</SidTr_Waypoint>\n`;
                        }
                        future_branch_outstring += `${'\t'.repeat(--depth)}</Sid_Transition>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}</Sid_Transition>\n`;
                    }
                }
                for (const translist of trans) {
                    for (const simpsKey in translist) {
                        future_branch_outstring += `${'\t'.repeat(depth)}<RunwayTransition Runway="${simpsKey.match(/(?:RW)?(.*)$/)[1].trim().replace(/(\d{2})B/, "$1R,$1L")}">\n`;
                        current_branch_outstring += `${'\t'.repeat(depth++)}<RunwayTransition Runway="${simpsKey.match(/(?:RW)?(.*)$/)[1].trim().replace(/(\d{2})B/, "$1R,$1L").split(",").map(rwy => movedRunways[thingeyKey].some(mapping => mapping.neww === rwy) ? movedRunways[thingeyKey].find(mapping => mapping.neww === rwy).orig : rwy).join(",")}">\n`;
                        for (const simps of translist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                                // continue;
                                //todo add more terminations
                                if (simps.obj.fix_path_termination === "VA") {
                                    future_branch_outstring += `${'\t'.repeat(depth)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Name>(${simps.obj.nav_altitude_1.substring(1)})</Name>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Name>(${simps.obj.nav_altitude_1.substring(1)})</Name>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Type>ConstHdgtoAlt</Type>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Type>ConstHdgtoAlt</Type>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                    future_branch_outstring += altitudeToXML(simps.obj, depth);
                                    current_branch_outstring += altitudeToXML(simps.obj, depth);

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                    future_branch_outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}</SidTr_Waypoint>\n`;
                                } else if (simps.obj.fix_path_termination === "VM") {
                                    future_branch_outstring += `${'\t'.repeat(depth)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                    // future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    // future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                    future_branch_outstring += altitudeToXML(simps.obj, depth);
                                    current_branch_outstring += altitudeToXML(simps.obj, depth);

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                    future_branch_outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}</SidTr_Waypoint>\n`;
                                } else
                                if (translist[simpsKey].length === 1)
                                    console.log("NOOO, bad");
                                continue;
                            }

                            future_branch_outstring += `${'\t'.repeat(depth)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                            current_branch_outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                            future_branch_outstring += altitudeToXML(simps.obj, depth);
                            current_branch_outstring += altitudeToXML(simps.obj, depth);

                            future_branch_outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}</SidTr_Waypoint>\n`;
                        }
                        future_branch_outstring += `${'\t'.repeat(--depth)}</RunwayTransition>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}</RunwayTransition>\n`;
                    }
                }
                completedsids++;
            } catch (E) {
                console.error(`Something went wrong parsing ${sidarname} for ${thingeyKey}`, E);
            }
            if (sidplaced)
                future_branch_outstring += `${'\t'.repeat(--depth)}</Sid>\n`;
                current_branch_outstring += `${'\t'.repeat(depth)}</Sid>\n`;
        } else if (route.star) {
            stars++;
            /*if (!route[RouteType["PE"]["2"]] && !route[RouteType["PE"]["5"]]
                && !route[RouteType["PE"]["8"]] && !route[RouteType["PE"]["M"]]) {
                continue;
            }*/
            try {
                let trans = [route[RouteType["PE"]["1"]], route[RouteType["PE"]["4"]], route[RouteType["PE"]["7"]], route[RouteType["PE"]["F"]]].reduce((out, arr) => {
                    if (arr) out.push(arr);
                    return out;
                }, []);
                let commoners = [route[RouteType["PE"]["2"]], route[RouteType["PE"]["5"]],
                    route[RouteType["PE"]["8"]], route[RouteType["PE"]["M"]]].reduce((out, arr) => {
                    if (arr) out.push(arr);
                    return out;
                }, []);
                //unused and i dont know how. makes me sadge :(
                let rwyTrans = [route[RouteType["PE"]["3"]], route[RouteType["PE"]["6"]],
                    route[RouteType["PE"]["9"]], route[RouteType["PE"]["S"]]].reduce((out, arr) => {
                    if (arr) out.push(arr);
                    return out;
                }, []);
                if (rwyTrans.length) {
                    for (const rwyTran of rwyTrans) {
                        future_branch_outstring += `${'\t'.repeat(depth)}<Star Name="${sidarname}" Runways="${Object.keys(rwyTran)[0].match(/(?:RW)?(.*)$/)[1].trim().replace(/(\d{2})B/, "$1R,$1L")}">\n`;
                        current_branch_outstring += `${'\t'.repeat(depth++)}<Star Name="${sidarname}" Runways="${Object.keys(rwyTran)[0].match(/(?:RW)?(.*)$/)[1].trim().replace(/(\d{2})B/, "$1R,$1L")}">\n`;
                        for (const commonerlist of commoners) {
                            for (const simpsKey in commonerlist) {
                                for (const simps of commonerlist[simpsKey]) {
                                    if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                        continue;

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Star_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth++)}<Star_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                                    future_branch_outstring += altitudeToXML(simps.obj, depth);
                                    current_branch_outstring += altitudeToXML(simps.obj, depth);

                                    future_branch_outstring += `${'\t'.repeat(--depth)}</Star_Waypoint>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}</Star_Waypoint>\n`;
                                }
                            }
                        }
                        for (const translist of trans) {
                            for (const simpsKey in translist) {
                                future_branch_outstring += `${'\t'.repeat(depth)}<Star_Transition Name="${simpsKey}">\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<Star_Transition Name="${simpsKey}">\n`;
                                for (const simps of translist[simpsKey]) {
                                    if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                        continue;

                                    future_branch_outstring += `${'\t'.repeat(depth)}<StarTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth++)}<StarTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                    future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                    future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                                    future_branch_outstring += altitudeToXML(simps.obj, depth);
                                    current_branch_outstring += altitudeToXML(simps.obj, depth);

                                    future_branch_outstring += `${'\t'.repeat(--depth)}</StarTr_Waypoint>\n`;
                                    current_branch_outstring += `${'\t'.repeat(depth)}</StarTr_Waypoint>\n`;
                                }
                                future_branch_outstring += `${'\t'.repeat(--depth)}</Star_Transition>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</Star_Transition>\n`;
                            }
                        }
                        for (const rwyTranKey in rwyTran) {
                            for (const simps of rwyTran[rwyTranKey]) {
                                if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                    continue;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Star_Waypoint> <!--ID="${simps.obj.sequence_number.charAt(1)}"-->\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<Star_Waypoint> <!--ID="${simps.obj.sequence_number.charAt(1)}"-->\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                                future_branch_outstring += altitudeToXML(simps.obj, depth);
                                current_branch_outstring += altitudeToXML(simps.obj, depth);

                                future_branch_outstring += `${'\t'.repeat(--depth)}</Star_Waypoint>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</Star_Waypoint>\n`;
                            }
                            // console.log(rwyTranKey);
                        }
                        future_branch_outstring += `${'\t'.repeat(--depth)}</Star>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}</Star>\n`;
                    }
                } else {
                    future_branch_outstring += `${'\t'.repeat(depth)}<Star Name="${sidarname}">\n`;
                    current_branch_outstring += `${'\t'.repeat(depth++)}<Star Name="${sidarname}">\n`;
                    for (const commonerlist of commoners) {
                        for (const simpsKey in commonerlist) {
                            for (const simps of commonerlist[simpsKey]) {
                                if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                    continue;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Star_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<Star_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                                future_branch_outstring += altitudeToXML(simps.obj, depth);
                                current_branch_outstring += altitudeToXML(simps.obj, depth);

                                future_branch_outstring += `${'\t'.repeat(--depth)}</Star_Waypoint>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</Star_Waypoint>\n`;
                            }
                        }
                    }
                    for (const translist of trans) {
                        for (const simpsKey in translist) {
                            future_branch_outstring += `${'\t'.repeat(depth)}<Star_Transition Name="${simpsKey}">\n`;
                            current_branch_outstring += `${'\t'.repeat(depth++)}<Star_Transition Name="${simpsKey}">\n`;
                            for (const simps of translist[simpsKey]) {
                                if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                    continue;

                                future_branch_outstring += `${'\t'.repeat(depth)}<StarTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<StarTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                                future_branch_outstring += altitudeToXML(simps.obj, depth);
                                current_branch_outstring += altitudeToXML(simps.obj, depth);

                                future_branch_outstring += `${'\t'.repeat(--depth)}</StarTr_Waypoint>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</StarTr_Waypoint>\n`;
                            }
                            future_branch_outstring += `${'\t'.repeat(--depth)}</Star_Transition>\n`;
                            current_branch_outstring += `${'\t'.repeat(depth)}</Star_Transition>\n`;
                        }
                    }
                    future_branch_outstring += `${'\t'.repeat(--depth)}</Star>\n`;
                    current_branch_outstring += `${'\t'.repeat(depth)}</Star>\n`;
                }
                completedstars++;
            } catch (E) {
                console.error(`Something went wrong parsing ${sidarname} for ${thingeyKey}`);
            }
        } else if (route.approach) {
            approaches++;
            // continue;
            let transitions = [route[RouteType["PF"]["A"]]].reduce((out, arr) => {
                if (arr) out.push(arr);
                return out;
            }, []);
            let meatofit = [
                "B", "D", "F", "G", "H", "I", "J", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
            ].map(it => route[RouteType["PF"][it]]).reduce((out, arr) => {
                if (arr) out.push(arr);
                return out;
            }, []);
            let changedName = "";
            switch (sidarname.charAt(0)) {
                case "I":
                    changedName = `ILS${sidarname.substring(1, 4)}`;
                    break;
                case "S":
                    changedName = `VOR${sidarname.substring(1, 4)}`;
                    break;
                case "D":
                    changedName = `VOR${sidarname.substring(1, 4)}`;
                    break;
                case "L":
                    changedName = `LOC${sidarname.substring(1, 4)}`;
                    break;
                case "N":
                    changedName = `NDB${sidarname.substring(1, 4)}`;
                    break;
                case "X":
                    changedName = `LDA${sidarname.substring(1, 4)}`;
                    break;
                case "Q":
                    changedName = `NDB${sidarname.substring(1, 4)}`;
                    break;
                case "R":
                    switch (sidarname.charAt(4)) {
                        case " ":
                            changedName = `RNV${sidarname.substring(1, 4)}`;
                            break;
                        case "Y":
                            changedName = `GPS${sidarname.substring(1, 4)}`;
                            break;
                        case "Z":
                            changedName = `RNP${sidarname.substring(1, 4)}`;
                            break;
                        case "X":
                            changedName = `GPS${sidarname.substring(1, 4)}`;
                            break;
                        default:
                            console.error("Did not recognize ", sidarname.charAt(4));
                    }
                    break;
                case "H" :
                    switch (sidarname.charAt(4)) {
                        case " ":
                            changedName = `RNV${sidarname.substring(1, 4)}`;
                            break;
                        case "Y":
                            changedName = `GPS${sidarname.substring(1, 4)}`;
                            break;
                        case "Z":
                            changedName = `RNP${sidarname.substring(1, 4)}`;
                            break;
                        case "X":
                            changedName = `GPS${sidarname.substring(1, 4)}`;
                            break;
                        default:
                            console.error("Did not recognize ", sidarname.charAt(4));
                    }
                    // changedName = `ILS${sidarname.substring(1, 4)}`;
                    // I think this is helleychoppers
                    break;
                default:
                    console.error("Did not recognize ", sidarname.charAt(0));
            }
            changedName = changedName.replace('-', '')
            if (changedName === "")
                continue;
            future_branch_outstring += `${'\t'.repeat(depth)}<Approach Name="${changedName.trim()}">\n`;
            current_branch_outstring += `${'\t'.repeat(depth++)}<Approach Name="${(changedName.substring(0, 3) + (movedRunways[thingeyKey].some(change => change.neww === changedName.substring(3)) ? movedRunways[thingeyKey].find(change => change.neww === changedName.substring(3)).orig : changedName.substring(3))).trim()}">\n`;
            for (const commonerlist of meatofit) {
                for (const simpsKey in commonerlist) {
                    for (const simps of commonerlist[simpsKey]) {
                        if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                            // continue;
                            if (simps.obj.fix_path_termination === "IF") {
                                future_branch_outstring += `${'\t'.repeat(depth)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                // future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                // future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                future_branch_outstring += altitudeToXML(simps.obj, depth);
                                current_branch_outstring += altitudeToXML(simps.obj, depth);

                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                future_branch_outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</App_Waypoint>\n`;
                                continue
                            } else if (simps.obj.fix_path_termination === "CA") {
                                future_branch_outstring += `${'\t'.repeat(depth)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Type>ConstHdgtoAlt</Type>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Type>ConstHdgtoAlt</Type>\n`;
                                // future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                // future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                future_branch_outstring += altitudeToXML(simps.obj, depth);
                                current_branch_outstring += altitudeToXML(simps.obj, depth);

                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                future_branch_outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</App_Waypoint>\n`;
                                continue
                            } else if (simps.obj.fix_path_termination === "VI") {
                                future_branch_outstring += `${'\t'.repeat(depth)}<App_Waypoint> <!-- ID="${simps.obj.sequence_number.charAt(1)}" -->\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<App_Waypoint> <!-- ID="${simps.obj.sequence_number.charAt(1)}" -->\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Name>DMEINTC</Name>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Name>DMEINTC</Name>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Type>DmeIntc</Type>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Type>DmeIntc</Type>\n`;
                                // future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                // future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                future_branch_outstring += altitudeToXML(simps.obj, depth);
                                current_branch_outstring += altitudeToXML(simps.obj, depth);

                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Sp_Turn>${simps.obj.fix_turn_direction === "R" ? "Right" : simps.obj.fix_turn_direction === "L" ? "Left" : "Auto"}</Sp_Turn>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Sp_Turn>${simps.obj.fix_turn_direction === "R" ? "Right" : simps.obj.fix_turn_direction === "L" ? "Left" : "Auto"}</Sp_Turn>\n`;

                                future_branch_outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</App_Waypoint>\n`;
                                continue;
                            } else if (simps.obj.fix_path_termination === "VR") {
                                future_branch_outstring += `${'\t'.repeat(depth)}<App_Waypoint> <!-- ID="${simps.obj.sequence_number.charAt(1)}" -->\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<App_Waypoint> <!-- ID="${simps.obj.sequence_number.charAt(1)}" -->\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Name>VORRAD</Name>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Name>VORRAD</Name>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Type>VorRadialIntc</Type>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Type>VorRadialIntc</Type>\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${it.find(val => val.ident && simps.obj.fix_path_navaid && val.ident.trim() === simps.obj.fix_path_navaid.trim()).latitude().value}</Latitude>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${it.find(val => val.ident && simps.obj.fix_path_navaid && val.ident.trim() === simps.obj.fix_path_navaid.trim()).latitude().value}</Latitude>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>${it.find(val => val.ident && simps.obj.fix_path_navaid && val.ident.trim() === simps.obj.fix_path_navaid.trim()).longitude().value}</Longitude>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>${it.find(val => val.ident && simps.obj.fix_path_navaid && val.ident.trim() === simps.obj.fix_path_navaid.trim()).longitude().value}</Longitude>\n`;

                                future_branch_outstring += altitudeToXML(simps.obj, depth);
                                current_branch_outstring += altitudeToXML(simps.obj, depth);

                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<RadialtoIntercept>${simps.obj.fix_theta * 0.1}</RadialtoIntercept>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<RadialtoIntercept>${simps.obj.fix_theta * 0.1}</RadialtoIntercept>\n`;

                                future_branch_outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</App_Waypoint>\n`;
                                continue;
                            } else {
                                console.log("What the hell?");
                            }
                            continue;
                        }

                        future_branch_outstring += `${'\t'.repeat(depth)}<App_Waypoint> <!--ID="${simps.obj.sequence_number.charAt(1)}"-->\n`;
                        current_branch_outstring += `${'\t'.repeat(depth++)}<App_Waypoint> <!--ID="${simps.obj.sequence_number.charAt(1)}"-->\n`;

                        future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident.trim()}</Name>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.obj.fix_type === "PG" ? movedRunways[thingeyKey].some(change => change.neww === simps.loc.ident.trim()) ? movedRunways[thingeyKey].find(change => change.neww === simps.loc.ident.trim()).orig : simps.loc.ident.trim() : simps.loc.ident.trim()}</Name>\n`;
                        future_branch_outstring += `${'\t'.repeat(depth)}<Type>${simps.obj.fix_type === "PG" ? "Runway" : "Normal"}</Type>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}<Type>${simps.obj.fix_type === "PG" ? "Runway" : "Normal"}</Type>\n`;
                        future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                        future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                        future_branch_outstring += altitudeToXML(simps.obj, depth);
                        current_branch_outstring += altitudeToXML(simps.obj, depth);

                        future_branch_outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}</App_Waypoint>\n`;
                    }
                }
            }
            for (const translist of transitions) {
                for (const simpsKey in translist) {
                    future_branch_outstring += `${'\t'.repeat(depth)}<App_Transition Name="${simpsKey}">\n`;
                    current_branch_outstring += `${'\t'.repeat(depth++)}<App_Transition Name="${simpsKey}">\n`;
                    for (const simps of translist[simpsKey]) {
                        if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                            // continue;
                            if (simps.obj.fix_path_termination === "VI") {
                                future_branch_outstring += `${'\t'.repeat(depth)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                                current_branch_outstring += `${'\t'.repeat(depth++)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                future_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                // future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                // future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                future_branch_outstring += altitudeToXML(simps.obj, depth);
                                current_branch_outstring += altitudeToXML(simps.obj, depth);

                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                future_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                future_branch_outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                current_branch_outstring += `${'\t'.repeat(depth)}</App_Waypoint>\n`;
                            }
                            continue;
                        }

                        future_branch_outstring += `${'\t'.repeat(depth)}<AppTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;
                        current_branch_outstring += `${'\t'.repeat(depth++)}<AppTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                        future_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                        future_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                        future_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                        future_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                        future_branch_outstring += altitudeToXML(simps.obj, depth);
                        current_branch_outstring += altitudeToXML(simps.obj, depth);

                        future_branch_outstring += `${'\t'.repeat(--depth)}</AppTr_Waypoint>\n`;
                        current_branch_outstring += `${'\t'.repeat(depth)}</AppTr_Waypoint>\n`;
                    }
                    future_branch_outstring += `${'\t'.repeat(--depth)}</App_Transition>\n`;
                    current_branch_outstring += `${'\t'.repeat(depth)}</App_Transition>\n`;
                }
            }
            completedapproaches++;
            future_branch_outstring += `${'\t'.repeat(--depth)}</Approach>\n`;
            current_branch_outstring += `${'\t'.repeat(depth)}</Approach>\n`;
        } else {
            // bad
        }
    }
    future_branch_outstring += `\t</Airport>\n</ProceduresDB>\n<!-- Completion Stats:\nSids: ${completedsids}/${sids}\nStars: ${completedstars}/${stars}\nAppch: ${completedapproaches}/${approaches}\n-->`;
    current_branch_outstring += `\t</Airport>\n</ProceduresDB>\n<!-- Completion Stats:\nSids: ${completedsids}/${sids}\nStars: ${completedstars}/${stars}\nAppch: ${completedapproaches}/${approaches}\n-->`;
    fs.mkdirSync(path.join(process.cwd(), "2020.4", ...thingeyKey.split("").slice(0, -1)), {recursive: true});
    fs.mkdirSync(path.join(process.cwd(), "2020.3", ...thingeyKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "2020.4", ...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`), future_branch_outstring);
    fs.writeFileSync(path.join(process.cwd(), "2020.3", ...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`), current_branch_outstring);
    fs.mkdirSync(path.join(process.cwd(), "Airports", ...thingeyKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "Airports", ...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`), future_branch_outstring);
    fs.mkdirSync(path.join(process.cwd(), "realairports", ...thingeyKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "realairports", ...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`), future_branch_outstring);
}

//console.log(thing);

console.log();