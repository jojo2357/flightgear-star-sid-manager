/*
 * This file is a part of flightgear-star-sid-manager, a tool to extract sid/star data from ARINC 424
 *
 * Copyright (c) 2022 jojo2357
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
const {parseLine, RouteType} = require('./arinc424parser');
const path = require("path");

const data = fs.readFileSync("FAACIFP18").toString().split(/\r?\n/g);
//^([ST])([A-Z]{3})([A-Z]) ([A-Z]{4})([\dA-Z]{2})([DEF])
//let starz = data.map(dater => dater.match(/^([ST])([A-Z]{3})(P) ([A-Z]{4})([\dA-Z]{2})([DEF])([A-Z\d]{6})/)).filter((dater) => dater);

/** @type {ParseResult[]} */
const it = data.reduce((out, dater) => {
    let vahl = parseLine(dater);
    if (vahl.recognizedLine)
        out.push(vahl);
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

const thingey = it.reduce((out, curr, windex, array) => {
    process.stdout.write(`Parsing ${windex}/${array.length}\r`);
    if (curr.airportIDENT) {
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
        // if (!curr.is_APPROACH)
            out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType][curr.TRANS_IDENT].push({
                loc: it.some(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) ? it.find(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) : curr.fix_ident,
                obj: curr
            });
        // else
        //     out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType][curr.TRANS_IDENT].push({
        //         loc: it.find(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) ? it.find(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) : curr.fix_ident,
        //         obj: curr
        //     });
    }
    return out;
}, {});

for (const thingeyKey in thingey) {
    process.stdout.write(`Running on ${thingeyKey}  \r`);
    let oufile = path.join(...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`);
    let outstring = `<ProceduresDB build="By jojo2357, with FAA data. Data factor = ${(it.length / data.length).toFixed(4)}">\n\t<Airport ICAOcode="${thingeyKey}">\n`;
    let depth = 2;
    let namedRoute = thingey[thingeyKey];
    for (const sidarname in namedRoute) {
        let route = namedRoute[sidarname];
        if (route.sid) {
            if (!route[RouteType["PD"]["2"]] && !route[RouteType["PD"]["5"]]
                && !route[RouteType["PD"]["8"]] && !route[RouteType["PD"]["M"]]) {
                continue;
            }
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
                outstring += `${'\t'.repeat(depth++)}<Sid Name="${sidarname}" Runways="${Object.keys(trans.length ? trans[0] : commoners[0]).join(",")}">\n`;
                for (const commonerlist of commoners) {
                    for (const simpsKey in commonerlist) {
                        for (const simps of commonerlist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                continue;

                            outstring += `${'\t'.repeat(depth++)}<Sid_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                            switch (simps.obj.nav_altitude) {
                                case "B": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_2}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "+": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "-": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    break;
                                }
                                case " ": {
                                    if (simps.obj.nav_altitude_1.trim().length) {
                                        outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                        outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
                                    }
                                    break;
                                }

                                default:
                                    console.log("Unrecognized ", simps.obj.nav_altitude);
                            }

                            outstring += `${'\t'.repeat(--depth)}</Sid_Waypoint>\n`;
                        }
                    }
                }
                for (const translist of entrans) {
                    for (const simpsKey in translist) {
                        outstring += `${'\t'.repeat(depth++)}<Sid_Transition Name="${simpsKey}">\n`;
                        for (const simps of translist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                continue;

                            outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                            switch (simps.obj.nav_altitude) {
                                case "B": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_2}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "+": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "-": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    break;
                                }
                                case " ": {
                                    if (simps.obj.nav_altitude_1.trim().length) {
                                        outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                        outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
                                    }
                                    break;
                                }

                                default:
                                    console.log("Unrecognized ", simps.obj.nav_altitude);
                            }

                            outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                        }
                        outstring += `${'\t'.repeat(--depth)}</Sid_Transition>\n`;
                    }
                }
                for (const translist of trans) {
                    for (const simpsKey in translist) {
                        outstring += `${'\t'.repeat(depth++)}<RunwayTransition Runway="${simpsKey}">\n`;
                        for (const simps of translist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                                continue
                                if (simps.obj.fix_path_termination === "VA") {
                                    outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                    outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Type>vectors</Type>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;
                                    switch (simps.obj.nav_altitude) {
                                        case "B": {
                                            outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                            outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                            outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_2}</Altitude>\n`;
                                            outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                            break;
                                        }
                                        case "+": {
                                            outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                            outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                            break;
                                        }
                                        case "-": {
                                            outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                            outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                            break;
                                        }
                                        case " ": {
                                            if (simps.obj.nav_altitude_1.trim().length) {
                                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
                                            }
                                            break;
                                        }

                                        default:
                                            console.log("Unrecognized ", simps.obj.nav_altitude);
                                    }

                                    outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    outstring +=`${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`

                                    outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                                }
                                continue;
                            }

                            outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                            switch (simps.obj.nav_altitude) {
                                case "B": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_2}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "+": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "-": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    break;
                                }
                                case " ": {
                                    if (simps.obj.nav_altitude_1.trim().length) {
                                        outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                        outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
                                    }
                                    break;
                                }

                                default:
                                    console.log("Unrecognized ", simps.obj.nav_altitude);
                            }

                            outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                        }
                        outstring += `${'\t'.repeat(--depth)}</RunwayTransition>\n`;
                    }
                }
            } catch (E) {
                console.error(`Something went wrong parsing ${sidarname} for ${thingeyKey}`);
            }
            outstring += `${'\t'.repeat(--depth)}</Sid>\n`;
        } else if (route.star) {
            if (!route[RouteType["PE"]["2"]] && !route[RouteType["PE"]["5"]]
                && !route[RouteType["PE"]["8"]] && !route[RouteType["PE"]["M"]]) {
                continue;
            }
            outstring += `${'\t'.repeat(depth++)}<Star Name="${sidarname}">\n`;
            try {
                let trans = [route[RouteType["PE"]["1"]]].reduce((out, arr) => {
                    if (arr) out.push(arr);
                    return out;
                }, []);
                let commoners = [route[RouteType["PE"]["2"]], route[RouteType["PE"]["5"]],
                    route[RouteType["PE"]["8"]], route[RouteType["PE"]["M"]]].reduce((out, arr) => {
                    if (arr) out.push(arr);
                    return out;
                }, []);
                for (const commonerlist of commoners) {
                    for (const simpsKey in commonerlist) {
                        for (const simps of commonerlist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                continue;

                            outstring += `${'\t'.repeat(depth++)}<Star_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                            switch (simps.obj.nav_altitude) {
                                case "B": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_2}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "+": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "-": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    break;
                                }
                                case " ": {
                                    if (simps.obj.nav_altitude_1.trim().length) {
                                        outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                        outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
                                    }
                                    break;
                                }

                                default:
                                    console.log("Unrecognized ", simps.obj.nav_altitude);
                            }

                            outstring += `${'\t'.repeat(--depth)}</Star_Waypoint>\n`;
                        }
                    }
                }
                for (const translist of trans) {
                    for (const simpsKey in translist) {
                        outstring += `${'\t'.repeat(depth++)}<Star_Transition Name="${simpsKey}">\n`;
                        for (const simps of translist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String)
                                continue;

                            outstring += `${'\t'.repeat(depth++)}<StarTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                            switch (simps.obj.nav_altitude) {
                                case "B": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_2}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "+": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                    break;
                                }
                                case "-": {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                    break;
                                }
                                case " ": {
                                    if (simps.obj.nav_altitude_1.trim().length) {
                                        outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                        outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
                                    }
                                    break;
                                }

                                default:
                                    console.log("Unrecognized ", simps.obj.nav_altitude);
                            }

                            outstring += `${'\t'.repeat(--depth)}</StarTr_Waypoint>\n`;
                        }
                        outstring += `${'\t'.repeat(--depth)}</Star_Transition>\n`;
                    }
                }
            } catch (E) {
                console.error(`Something went wrong parsing ${sidarname} for ${thingeyKey}`);
            }
            outstring += `${'\t'.repeat(--depth)}</Star>\n`;
        } else if (route.approach) {
            // continue;
            let transitions = [route[RouteType["PF"]["A"]]].reduce((out, arr) => {
                if (arr) out.push(arr);
                return out;
            }, []);
            let meatofit = [
                "B", "D", "F", "G", "I", "J", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
            ].map(it => route[RouteType["PF"][it]]).reduce((out, arr) => {
                if (arr) out.push(arr);
                return out;
            }, []);
            outstring += `${'\t'.repeat(depth++)}<Approach Name="${sidarname.trim()}">\n`;
            for (const commonerlist of meatofit) {
                for (const simpsKey in commonerlist) {
                    for (const simps of commonerlist[simpsKey]) {
                        if (typeof simps.loc === 'string' || simps.loc instanceof String)
                            continue;

                        outstring += `${'\t'.repeat(depth++)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                        outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                        outstring += `${'\t'.repeat(depth)}<Type>${simps.obj.fix_type === "PG" ? "Runway": "Normal"}</Type>\n`;
                        outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                        outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                        switch (simps.obj.nav_altitude) {
                            case "B": {
                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_2}</Altitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                break;
                            }
                            case "+": {
                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                break;
                            }
                            case "-": {
                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                break;
                            }
                            case " ": {
                                if (simps.obj.nav_altitude_1.trim().length) {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
                                }
                                break;
                            }

                            default:
                                console.log("Unrecognized ", simps.obj.nav_altitude);
                        }

                        outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                    }
                }
            }
            for (const translist of transitions) {
                for (const simpsKey in translist) {
                    outstring += `${'\t'.repeat(depth++)}<App_Transition Name="${simpsKey}">\n`;
                    for (const simps of translist[simpsKey]) {
                        if (typeof simps.loc === 'string' || simps.loc instanceof String)
                            continue;

                        outstring += `${'\t'.repeat(depth++)}<AppTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                        outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                        outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                        outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                        outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;
                        switch (simps.obj.nav_altitude) {
                            case "B": {
                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_2}</Altitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                break;
                            }
                            case "+": {
                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
                                break;
                            }
                            case "-": {
                                outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
                                break;
                            }
                            case " ": {
                                if (simps.obj.nav_altitude_1.trim().length) {
                                    outstring += `${'\t'.repeat(depth)}<Altitude>${simps.obj.nav_altitude_1}</Altitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
                                }
                                break;
                            }

                            default:
                                console.log("Unrecognized ", simps.obj.nav_altitude);
                        }

                        outstring += `${'\t'.repeat(--depth)}</AppTr_Waypoint>\n`;
                    }
                    outstring += `${'\t'.repeat(--depth)}</App_Transition>\n`;
                }
            }
            outstring += `${'\t'.repeat(--depth)}</Approach>\n`;
        } else {
            // bad
        }
    }
    outstring += "\t</Airport>\n</ProceduresDB>";
    fs.mkdirSync(path.join(process.cwd(), "bild", ...thingeyKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "bild", ...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`), outstring);
    fs.mkdirSync(path.join(process.cwd(), "mygame", ...thingeyKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "mygame", ...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`), outstring);
}

//console.log(thing);

console.log();