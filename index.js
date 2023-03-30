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
const {parseLine, RouteType, altitudeToXML} = require('./arinc424parser');
const path = require("path");

const data = fs.readFileSync("CIFP_230323/FAACIFP18").toString().split(/\r?\n/g);
//^([ST])([A-Z]{3})([A-Z]) ([A-Z]{4})([\dA-Z]{2})([DEF])
//let starz = data.map(dater => dater.match(/^([ST])([A-Z]{3})(P) ([A-Z]{4})([\dA-Z]{2})([DEF])([A-Z\d]{6})/)).filter((dater) => dater);

/** @type {ParseResult[]} */
const it = data.reduce((out, dater) => {
    let vahl = parseLine(dater);
    if (vahl.recognizedLine)
        out.push(vahl);
    else
        console.log(dater);
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
        if (!curr.fix_ident.match(/RW\d{2}/)) {
            out[curr.airportIDENT][curr.SID_STAR_Ident][curr.routeType][curr.TRANS_IDENT].push({
                loc: it.some(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) ? it.find(val => val.ident && curr.fix_ident && val.ident.trim() === curr.fix_ident.trim()) : curr.fix_ident,
                obj: curr
            });
        }
        else {
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

for (const thingeyKey in thingey) {
    process.stdout.write(`Running on ${thingeyKey}  \r`);
    let oufile = path.join(...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`);
    let outstring = `<ProceduresDB build="By jojo2357, with FAA data. Data factor = ${(it.length / data.length).toFixed(4)}">\n\t<Airport ICAOcode="${thingeyKey}">\n`;
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

                //todo replace all with not all
                outstring += `${'\t'.repeat(depth++)}<Sid Name="${sidarname}" Runways="${Object.keys(trans.length ? trans[0] : commoners[0]).map(it => it.trim().replace("ALL", thingey[thingeyKey].runweys.join(",")).replace(/(\d{2})B/, "$1R,$1L")).join(",")}">\n`;
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

                            outstring += altitudeToXML(simps.obj, depth);

                            outstring += `${'\t'.repeat(--depth)}</Sid_Waypoint>\n`;
                        }
                    }
                }
                for (const translist of entrans) {
                    for (const simpsKey in translist) {
                        outstring += `${'\t'.repeat(depth++)}<Sid_Transition Name="${simpsKey}">\n`;
                        for (const simps of translist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                                // continue;
                                if (simps.obj.fix_path_termination === "VI") {
                                    outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                    outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                    // outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    // outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                    outstring += altitudeToXML(simps.obj, depth);

                                    outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                    outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                                }
                                continue;
                            }

                            outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                            outstring += altitudeToXML(simps.obj, depth);

                            outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                        }
                        outstring += `${'\t'.repeat(--depth)}</Sid_Transition>\n`;
                    }
                }
                for (const translist of trans) {
                    for (const simpsKey in translist) {
                        outstring += `${'\t'.repeat(depth++)}<RunwayTransition Runway="${simpsKey.trim().replace(/(\d{2})B/, "$1R,$1L")}">\n`;
                        for (const simps of translist[simpsKey]) {
                            if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                                // continue;
                                if (simps.obj.fix_path_termination === "VA") {
                                    outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                    outstring += `${'\t'.repeat(depth)}<Name>(${simps.obj.nav_altitude_1.substring(1)})</Name>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Type>ConstHdgtoAlt</Type>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                    outstring += altitudeToXML(simps.obj, depth);

                                    outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                    outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                    outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                                }
                                continue;
                            }

                            outstring += `${'\t'.repeat(depth++)}<SidTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                            outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                            outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                            outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                            outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                            outstring += altitudeToXML(simps.obj, depth);

                            outstring += `${'\t'.repeat(--depth)}</SidTr_Waypoint>\n`;
                        }
                        outstring += `${'\t'.repeat(--depth)}</RunwayTransition>\n`;
                    }
                }
                completedsids++;
            } catch (E) {
                console.error(`Something went wrong parsing ${sidarname} for ${thingeyKey}`);
            }
            outstring += `${'\t'.repeat(--depth)}</Sid>\n`;
        } else if (route.star) {
            stars++;
            /*if (!route[RouteType["PE"]["2"]] && !route[RouteType["PE"]["5"]]
                && !route[RouteType["PE"]["8"]] && !route[RouteType["PE"]["M"]]) {
                continue;
            }*/
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

                            outstring += altitudeToXML(simps.obj, depth);

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

                            outstring += altitudeToXML(simps.obj, depth);

                            outstring += `${'\t'.repeat(--depth)}</StarTr_Waypoint>\n`;
                        }
                        outstring += `${'\t'.repeat(--depth)}</Star_Transition>\n`;
                    }
                }
                completedstars++;
            } catch (E) {
                console.error(`Something went wrong parsing ${sidarname} for ${thingeyKey}`);
            }
            outstring += `${'\t'.repeat(--depth)}</Star>\n`;
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
            outstring += `${'\t'.repeat(depth++)}<Approach Name="${changedName.trim()}">\n`;
            for (const commonerlist of meatofit) {
                for (const simpsKey in commonerlist) {
                    for (const simps of commonerlist[simpsKey]) {
                        if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                            // continue;
                            if (simps.obj.fix_path_termination === "IF") {
                                outstring += `${'\t'.repeat(depth++)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                // outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                // outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                outstring += altitudeToXML(simps.obj, depth);

                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                continue
                            } else if (simps.obj.fix_path_termination === "CA") {
                                outstring += `${'\t'.repeat(depth++)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                outstring += `${'\t'.repeat(depth)}<Type>ConstHdgtoAlt</Type>\n`;
                                // outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                // outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                outstring += altitudeToXML(simps.obj, depth);

                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                continue
                            } else if (simps.obj.fix_path_termination === "VI") {
                                outstring += `${'\t'.repeat(depth++)}<App_Waypoint> <!-- ID="${simps.obj.sequence_number.charAt(1)}" -->\n`;

                                outstring += `${'\t'.repeat(depth)}<Name>DMEINTC</Name>\n`;
                                outstring += `${'\t'.repeat(depth)}<Type>DmeIntc</Type>\n`;
                                // outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                // outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                outstring += altitudeToXML(simps.obj, depth);

                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                outstring += `${'\t'.repeat(depth)}<Sp_Turn>${simps.obj.fix_turn_direction === "R" ? "Right" : simps.obj.fix_turn_direction === "L" ? "Left" : "Auto"}</Sp_Turn>\n`;

                                outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                continue;
                            } else if (simps.obj.fix_path_termination === "VR") {
                                outstring += `${'\t'.repeat(depth++)}<App_Waypoint> <!-- ID="${simps.obj.sequence_number.charAt(1)}" -->\n`;

                                outstring += `${'\t'.repeat(depth)}<Name>VORRAD</Name>\n`;
                                outstring += `${'\t'.repeat(depth)}<Type>VorRadialIntc</Type>\n`;

                                outstring += `${'\t'.repeat(depth)}<Latitude>${it.find(val => val.ident && simps.obj.fix_path_navaid && val.ident.trim() === simps.obj.fix_path_navaid.trim()).latitude().value}</Latitude>\n`;
                                outstring += `${'\t'.repeat(depth)}<Longitude>${it.find(val => val.ident && simps.obj.fix_path_navaid && val.ident.trim() === simps.obj.fix_path_navaid.trim()).longitude().value}</Longitude>\n`;

                                outstring += altitudeToXML(simps.obj, depth);

                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;
                                outstring += `${'\t'.repeat(depth)}<RadialtoIntercept>${simps.obj.fix_theta * 0.1}</RadialtoIntercept>\n`;

                                outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                                continue;
                            } else {
                                console.log("What the hell?");
                            }
                            continue;
                        }

                        outstring += `${'\t'.repeat(depth++)}<App_Waypoint> <!--ID="${simps.obj.sequence_number.charAt(1)}"-->\n`;

                        outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident.trim()}</Name>\n`;
                        outstring += `${'\t'.repeat(depth)}<Type>${simps.obj.fix_type === "PG" ? "Runway" : "Normal"}</Type>\n`;
                        outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                        outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                        outstring += altitudeToXML(simps.obj, depth);

                        outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                    }
                }
            }
            for (const translist of transitions) {
                for (const simpsKey in translist) {
                    outstring += `${'\t'.repeat(depth++)}<App_Transition Name="${simpsKey}">\n`;
                    for (const simps of translist[simpsKey]) {
                        if (typeof simps.loc === 'string' || simps.loc instanceof String) {
                            // continue;
                            if (simps.obj.fix_path_termination === "VI") {
                                outstring += `${'\t'.repeat(depth++)}<App_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                                outstring += `${'\t'.repeat(depth)}<Name>VECTORS</Name>\n`;
                                outstring += `${'\t'.repeat(depth)}<Type>Vectors</Type>\n`;
                                // outstring += `${'\t'.repeat(depth)}<Latitude>0.000000</Latitude>\n`;
                                // outstring += `${'\t'.repeat(depth)}<Longitude>0.000000</Longitude>\n`;

                                outstring += altitudeToXML(simps.obj, depth);

                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs>1</Hdg_Crs>\n`;
                                outstring += `${'\t'.repeat(depth)}<Hdg_Crs_value>${Number.parseInt(simps.obj.fix_magnetic_course) * (simps.obj.fix_magnetic_course.endsWith("T") ? 1 : 0.1)}</Hdg_Crs_value>\n`;

                                outstring += `${'\t'.repeat(--depth)}</App_Waypoint>\n`;
                            }
                            continue;
                        }

                        outstring += `${'\t'.repeat(depth++)}<AppTr_Waypoint ID="${simps.obj.sequence_number.charAt(1)}">\n`;

                        outstring += `${'\t'.repeat(depth)}<Name>${simps.loc.ident}</Name>\n`;
                        outstring += `${'\t'.repeat(depth)}<Type>Normal</Type>\n`;
                        outstring += `${'\t'.repeat(depth)}<Latitude>${simps.loc.latitude().value}</Latitude>\n`;
                        outstring += `${'\t'.repeat(depth)}<Longitude>-${simps.loc.longitude().value}</Longitude>\n`;

                        outstring += altitudeToXML(simps.obj, depth);

                        outstring += `${'\t'.repeat(--depth)}</AppTr_Waypoint>\n`;
                    }
                    outstring += `${'\t'.repeat(--depth)}</App_Transition>\n`;
                }
            }
            completedapproaches++;
            outstring += `${'\t'.repeat(--depth)}</Approach>\n`;
        } else {
            // bad
        }
    }
    outstring += `\t</Airport>\n</ProceduresDB>\n<!-- Completion Stats:\nSids: ${completedsids}/${sids}\nStars: ${completedstars}/${stars}\nAppch: ${completedapproaches}/${approaches}\n-->`;
    fs.mkdirSync(path.join(process.cwd(), "bild", ...thingeyKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "bild", ...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`), outstring);
    fs.mkdirSync(path.join(process.cwd(), "Airports", ...thingeyKey.split("").slice(0, -1)), {recursive: true});
    fs.writeFileSync(path.join(process.cwd(), "Airports", ...thingeyKey.split("").slice(0, -1), `${thingeyKey}.procedures.xml`), outstring);
}

//console.log(thing);

console.log();