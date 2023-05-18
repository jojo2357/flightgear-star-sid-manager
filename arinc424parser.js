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

const RouteType = {
    PD: {
        "0": "Engine Out SID",
        "1": "SID Runway Transition",
        "2": "SID or SID Common Route",
        "3": "SID Enroute Transition",
        "4": "RNAV SID Runway Transition",
        "5": "RNAV SID or SID Common Route",
        "6": "RNAV SID Enroute Transition",
        "F": "FMS SID Runway Transition",
        "M": "FMS SID or SID Common Route",
        "S": "FMS SID Enroute Transition",
        "T": "Vector SID Runway Transition",
        "V": "Vector SID Enroute Transition",
    },
    PE: {
        "1": "STAR Enroute Transition",
        "2": "STAR or STAR Common Route",
        "3": "STAR Runway Transition",
        "4": "RNAV STAR Enroute Transition",
        "5": "RNAV STAR or STAR Common Route",
        "6": "RNAV STAR Runway Transition",
        "7": "Profile Descent STAR Enroute Transition",
        "8": "Profile Descent STAR Common Route",
        "9": "Profile Descent STAR Runway Transition",
        "F": "FMS STAR Enroute Transition",
        "M": "FMS STAR or STAR Common Route",
        "S": "FMS STAR Runway Transition",
    },
    PF: {
        "A": "Approach Transition",
        "B": "Localizer/Backcourse Approach",
        "D": "VORDME Approach",
        "F": "Flight Management System (FMS) Approach",
        "G": "Instrument Guidance System (IGS) Approach",
        "H": "Unknown Landing",
        "I": "Instrument Landing System (ILS) Approach",
        "J": "GNSS Landing System (GLS)Approach ",
        "L": "Localizer Only (LOC) Approach",
        "M": "Microwave Landing System (MLS) Approach",
        "N": "Non-Directional Beacon (NDB) Approach",
        "P": "Global Positioning System (GPS) Approach",
        "Q": "Non-Directional Beacon + DME (NDB+DME) Approach",
        "R": "Area Navigation (RNAV) Approach",
        "S": "VOR Approach using VORDME/VORTAC",
        "T": "TACAN Approach",
        "U": "Simplified Directional Facility (SDF) Approach",
        "V": "VOR Approach",
        "W": "Microwave Landing System (MLS), Type A Approach",
        "X": "Localizer Directional Aid (LDA) Approach",
        "Y": "Microwave Landing System (MLS), Type B and C Approach",
        "Z": "Missed Approach",
    }
};

class ParseResult {
    static regexp = /^.*$/m;
    static regexpMeanings = [];

    /**
     * @type boolean
     */
    completed = false;

    /**
     * @type boolean
     */
    recognizedLine = false;

    static ERROR = new ParseResult();

    /** @type Header */
    header;

    /** @type Footer */
    footer;

    /** @type String */
    source;

    /** @type ParseResult[] */
    continuationRecords;

    /**
     * @param {String} dataIn
     * @return {String}
     */
    local_parse(dataIn) {
        this.header = Header.parse(dataIn);
        this.footer = Footer.parse(dataIn);

        return dataIn.replace(Header.regexp, "").replace(Footer.regexp, "");
    }

    /**
     * @param {String} dataIn
     * @return ParseResult
     */
    static parse(dataIn) {
        throw new Error("Dont do that");
    }
}

class Header {
    static regexp = /^([ST])([A-Z]{3})(?:(A)(S)|(D)([ B])|(E)([AMPRTUV])|(H)([ACDEFKSV])|(P)([A-GIK-NPRSTV ])|(R)([ A])|(T)([CGN])|(U)([CFR]))/m;

    /** @type String */
    record_type;

    /** @type String */
    areaCode;

    /** @type String */
    section;

    /** @type String */
    subsection;

    /**
     * @param {String} line
     *
     * @return {Header|undefined}
     */
    static parse(line) {
        let match = line.match(this.regexp);
        if (match) {
            match = match.filter(mat => mat);
            const out = new Header();

            match.shift();

            out.record_type = match[0];
            out.areaCode = match[1];
            out.section = match[2];
            out.subsection = match[3];

            return out;
        } else {
            return;
        }
    }
}

class Footer {
    static regexp = /(\d{5})(\d{2})(0\d|1[0-4])$/m;

    /** @type number */
    record_number;

    /** @type number */
    cycle_year;

    /** @type number */
    cycle_number;

    /**
     * @param {String} line
     *
     * @return {Footer|undefined}
     */
    static parse(line) {
        const match = line.match(this.regexp);
        if (match) {
            const out = new Footer();

            match.shift();

            out.record_number = Number.parseInt(match[0]);
            out.cycle_year = Number.parseInt(match[1]);
            out.cycle_number = Number.parseInt(match[2]);

            return out;
        } else {
            return;
        }
    }
}

class Latongitude {
    /** @type number */
    value;

    /** @type String */
    hemisphere;

    /**
     * @param {Latongitude} lata
     * @param {Latongitude} lona
     * @param {Latongitude} latb
     * @param {Latongitude} lonb
     */
    static distance(lata, lona, latb, lonb) {
        return (Math.pow(lata.value - latb.value, 2) + Math.pow(lona.value - lonb.value, 2));
    }

    /**
     * @param {String} hemisphere
     * @param {number|number[]} value
     */
    constructor(hemisphere, value) {
        if (value instanceof Array) {
            this.value = value.shift();
            this.value += value.shift() / 60;
            this.value += value.shift() / 3600;
            this.value += value.shift() / 360000;
        } else this.value = value;
        this.hemisphere = hemisphere;
    }
}

class SID_STAR extends ParseResult {
    static regexp = /^([A-Z]{4})([\dA-Z]{2})([DEF])([A-Z\d\-]{4}.{2})(.|[\dFMSTV])(.{5}) (\d{3})([\dA-Z ]{5})([\dA-Z ][\dA-Z ])([ADEHPRTU ][A-Z ])([\dA-Z])([A-Z ]{4})([LRE ])([\d ]{3})([A-Z ]{2})([Y ])([\dA-Z ]{4})([A-Z\d ]{2})(.{6})(.{4})(.{4})(.{4})(.{4})(.)(.) {2}(.)([AS ])(FL\d{3}|[\-\d ]{5})(FL\d{3}|[\-\d ]{5})(FL\d{3}|[\-\d ]{5})([F\d ]{3})([-\d .]{4})([A-Z\d ]{5})(.)([A-Z\d ]{2})(.)(.)(.)(.)(.)(.) {3}$/m;

    /** @type String */
    airportIDENT;

    /** @type String */
    ICAO_Code;

    /**
     * This requires all of Section Code, Subsection Type and Route Type
     * @type String
     */
    routeType;

    /** @type String */
    SID_STAR_Ident;

    /** @type String */
    TRANS_IDENT;

    /** @type String */
    sequence_number;

    /** @type String */
    fix_ident;

    /** @type String */
    fix_ICAO;

    /** @type String */
    fix_type;

    /** @type String */
    fix_sequence;

    /** @type String */
    fix_description;

    /** @type String */
    fix_turn_direction;

    /** @type String  */
    fix_navigation_precision;

    /** @type String */
    fix_path_termination;

    /** @type String */
    fix_direction_valid;

    /** @type String */
    fix_path_navaid;

    /** @type String */
    fix_path_icao;

    /** @type String */
    fix_arc_radius;

    /** @type String */
    fix_theta;

    /** @type String */
    fix_rho;

    /** @type String */
    fix_magnetic_course;

    /** @type String */
    fix_distance;

    /** @type String */
    nav_type;

    /** @type String */
    nav_altitude;

    /** @type String */
    nav_atc_indicator;

    /** @type String */
    nav_altitude_1;

    /** @type String */
    nav_altitude_2;

    /** @type String */
    nav_transition_altitude;

    /** @type String */
    nav_speed_limit;

    /** @type String */
    nav_vert_angle;

    /** @type String */
    nav_fix;

    /** @type String */
    nav_sector;

    /** @type String */
    nav_icao;

    /** @type String */
    appendix_type;

    /** @type String */
    appendix_speed_limit;

    /** @type String */
    appendix_route_1;

    /** @type String */
    appendix_route_2;

    /** @type boolean */
    is_SID = false;

    /** @type boolean */
    is_STAR = false;

    /** @type boolean */
    is_APPROACH = false;

    static parse(dataIn) {
        let out = new SID_STAR();
        dataIn = out.local_parse(dataIn);
        if (!out.header || out.header.section !== "P" || out.header.subsection !== " ") {
            return ParseResult.ERROR;
        } else {
            let splitData = dataIn.match(this.regexp);
            if (!splitData)
                return ParseResult.ERROR;
            else {
                out.source = splitData.shift();

                out.airportIDENT = splitData[0];
                out.ICAO_Code = splitData[1];

                out.routeType = RouteType[`P${splitData[2]}`][splitData[4]];

                if (!out.routeType)
                    return ParseResult.ERROR;

                if (splitData[2] === "E")
                    out.is_STAR = true;
                else if (splitData[2] === "D")
                    out.is_SID = true;
                else if (splitData[2] === "F")
                    out.is_APPROACH = true;
                else
                    console.log("Unrecognized");

                out.SID_STAR_Ident = splitData[3];
                out.TRANS_IDENT = splitData[5];

                if (out.is_SID) {
                    out.TRANS_IDENT = out.TRANS_IDENT.replace("RW", "")
                }

                out.sequence_number = splitData[6];
                out.fix_ident = splitData[7];
                out.fix_ICAO = splitData[8];
                out.fix_type = splitData[9];
                out.fix_sequence = splitData[10];
                if (splitData[10] === "1")
                    out.continuationRecords = [];
                else if (splitData[10] !== "0")
                    return ParseResult.ERROR;
                out.fix_description = splitData[11];
                out.fix_turn_direction = splitData[12];
                out.fix_navigation_precision = splitData[13];

                out.fix_path_termination = splitData[14];
                out.fix_direction_valid = splitData[15];
                out.fix_path_navaid = splitData[16];
                out.fix_path_icao = splitData[17];
                out.fix_arc_radius = splitData[18];
                out.fix_theta = splitData[19];
                out.fix_rho = splitData[20];
                out.fix_magnetic_course = splitData[21];
                out.fix_distance = splitData[22];
                out.nav_type = splitData[23] + splitData[24];
                out.nav_altitude = splitData[25];
                out.nav_atc_indicator = splitData[26];
                out.nav_altitude_1 = splitData[27];
                out.nav_altitude_2 = splitData[28];
                out.nav_transition_altitude = splitData[29];
                out.nav_speed_limit = splitData[30];
                out.nav_vert_angle = splitData[31];
                out.nav_fix = splitData[32];
                out.nav_sector = splitData[33];
                out.nav_icao = splitData[34];
                out.appendix_type = splitData[35];
                out.appendix_speed_limit = splitData[36];
                out.appendix_route_1 = splitData[37];
                out.appendix_route_2 = splitData[38];

                out.completed = true;
                out.recognizedLine = true;

                return out;
            }
        }
    }
}

const childClasses = [
    /*class SID_STAR_CONTINUATION extends ParseResult {
        static regexp = /^([A-Z]{4})([\dA-Z]{2})([DEF])([A-Z\d]{5}.)(.|[\dFMSTV])(.{5}) (\d{3})([\dA-Z ]{5})([\dA-Z ][\dA-Z ])([ADEHPRTU ][A-Z ])([\dA-Z])([A-Z ]{4})([LRE ])([\d ]{3})([A-Z ]{2})([Y ])([\dA-Z ]{4})([A-Z\d ]{2})(.{6})(.{4})(.{4})(.{4})(.{4})(.)(.)  (.)([AS ])([\-\d ]{5})([\-\d ]{5})([\-\d ]{5})([F\d ]{3})([-\d .]{4})([A-Z\d ]{5})(.)([A-Z\d ]{2})(.)(.)(.)(.)(.)(.)   $/m;

    },*/
    SID_STAR,
    class SID_STAR_ALTERNATIVE_RECORD extends SID_STAR {
        static regexp = /^([A-Z]{4})([\dA-Z]{2})([DEF])(.{6})(.)([\dA-Z ]{5}) (\d{3})(.{5})([\dA-Z ][\dA-Z ])([ADEHPRTU ][A-Z ])([\dA-Z])([A-Z ]{4})([LRE ])([\d ]{3})([A-Z ]{2})([Y ])([\dA-Z ]{4})([A-Z\d ]{2})(.{6})(.{4})(.{4})(.{4})(.{4})(.)(.)  (.)(.)(FL\d{3}|[\-\d ]{5})(FL\d{3}|[\-\d ]{5})(FL\d{3}|[\-\d ]{5})([F\d ]{3})([-\d .]{4})([A-Z\d ]{5})(.)([A-Z\d ]{2})(.)(.)(.)(.)(.)(.) {3}$/m;

        static parse(dataIn) {
            let out = new SID_STAR();
            dataIn = out.local_parse(dataIn);
            if (!out.header || out.header.section !== "P" || out.header.subsection !== " ") {
                return ParseResult.ERROR;
            } else {
                let splitData = dataIn.match(this.regexp);
                if (!splitData)
                    return ParseResult.ERROR;
                else {
                    out.source = splitData.shift();

                    out.airportIDENT = splitData[0];
                    out.ICAO_Code = splitData[1];

                    out.routeType = RouteType[`P${splitData[2]}`][splitData[4]];

                    if (!out.routeType)
                        return ParseResult.ERROR;

                    if (splitData[2] === "E")
                        out.is_STAR = true;
                    else if (splitData[2] === "D")
                        out.is_SID = true;
                    else if (splitData[2] === "F")
                        out.is_APPROACH = true;
                    else
                        console.log("Unrecognized");

                    out.SID_STAR_Ident = splitData[3];
                    out.TRANS_IDENT = splitData[5];

                    if (out.is_SID) {
                        out.TRANS_IDENT = out.TRANS_IDENT.replace("RW", "")
                    }

                    out.sequence_number = splitData[6];
                    out.fix_ident = splitData[7];
                    out.fix_ICAO = splitData[8];
                    out.fix_type = splitData[9];
                    out.fix_sequence = splitData[10];
                    if (splitData[10] === "1")
                        out.continuationRecords = [];
                    else if (splitData[10] !== "0")
                        return ParseResult.ERROR;
                    out.fix_description = splitData[11];
                    out.fix_turn_direction = splitData[12];
                    out.fix_navigation_precision = splitData[13];

                    out.fix_path_termination = splitData[14];
                    out.fix_direction_valid = splitData[15];
                    out.fix_path_navaid = splitData[16];
                    out.fix_path_icao = splitData[17];
                    out.fix_arc_radius = splitData[18];
                    out.fix_theta = splitData[19];
                    out.fix_rho = splitData[20];
                    out.fix_magnetic_course = splitData[21];
                    out.fix_distance = splitData[22];
                    out.nav_type = splitData[23] + splitData[24];
                    out.nav_altitude = splitData[25];
                    out.nav_atc_indicator = splitData[26];
                    out.nav_altitude_1 = splitData[27];
                    out.nav_altitude_2 = splitData[28];
                    out.nav_transition_altitude = splitData[29];
                    out.nav_speed_limit = splitData[30];
                    out.nav_vert_angle = splitData[31];
                    out.nav_fix = splitData[32];
                    out.nav_sector = splitData[33];
                    out.nav_icao = splitData[34];
                    out.appendix_type = splitData[35];
                    out.appendix_speed_limit = splitData[36];
                    out.appendix_route_1 = splitData[37];
                    out.appendix_route_2 = splitData[38];

                    out.completed = true;
                    out.recognizedLine = true;

                    return out;
                }
            }
        }
    },
    class ENROUTE_WAYPOINT extends ParseResult {
        static regexp = /^(.{4})(.{2}).([A-Z\d ]{5}) (.{2})(.) {4}(.{3})(.{2}) ([NS])(\d{2})(\d{2})(\d{2})(\d{2})([EW])(\d{3})(\d{2})(\d{2})(\d{2}) {23}([EWT])(\d{4}) {5}([A-Z ]{3}) {8}([A-Z ]{3})(.{25})$/m;

        /** @type String */
        ident;
        /** @type String */
        ICAO;

        /** @type Latongitude */
        reallatitude;

        /** @type Latongitude */
        reallongtude;

        latitude = () => {
            return this.reallatitude ? this.reallatitude : new Error("No latitude on the books")
        }

        longitude = () => {
            return this.reallongtude ? this.reallongtude : new Error("No longitude on the books")
        }

        static parse(dataIn) {
            let out = new ENROUTE_WAYPOINT();
            dataIn = out.local_parse(dataIn);
            if (!out.header || (!(out.header.section === "E" && out.header.subsection === "A") && !(out.header.section === "P" && dataIn.charAt(6) === "C"))) {
                return ParseResult.ERROR;
            } else {
                let splitData = dataIn.match(this.regexp);
                if (!splitData)
                    return ParseResult.ERROR;
                else {
                    out.source = splitData.shift();

                    out.ICAO = splitData[1]
                    out.ident = splitData[2];

                    out.reallatitude = new Latongitude(splitData[7], splitData.slice(8, 8 + 4).map(val => Number.parseInt(val)));
                    out.reallongtude = new Latongitude(splitData[12], splitData.slice(13, 13 + 4).map(val => Number.parseInt(val)));

                    out.recognizedLine = true;
                    out.completed = true;
                    return out;
                }
            }
        }
    },
    class NAVAID extends ParseResult {
        static regexp = /^(.{4})(.{2}) ([A-Z\d ]{4}) {2}(.{2})(.)([\d ]{5})(.{5})(?:([NS])(\d{2})(\d{2})(\d{2})(\d{2})| {9})(?:([EW])(\d{3})(\d{2})(\d{2})(\d{2})| {10})(.{4})(?:([NS])(\d{2})(\d{2})(\d{2})(\d{2})| {9})(?:([EW])(\d{3})(\d{2})(\d{2})(\d{2})| {10})([EWTG])(\d{4})([-\d]\d{4}| {5})(.)([\d ]{2})(.{3})([A-Z ]{3})(.{30})$/m;

        /** @type String */
        ident;
        /** @type String */
        ICAO;

        /** @type Latongitude */
        vorLatitude;

        /** @type Latongitude */
        vorLongitude;

        /** @type Latongitude */
        DMELatitude;

        /** @type Latongitude */
        DMELongitude;

        latitude = () => {
            return this.vorLatitude ? this.vorLatitude : this.DMELatitude ? this.DMELatitude : new Error("No latitude on the books")
        }

        longitude = () => {
            return this.vorLongitude ? this.vorLongitude : this.DMELongitude ? this.DMELongitude : new Error("No longitude on the books")
        }

        static parse(dataIn) {
            let out = new NAVAID();
            dataIn = out.local_parse(dataIn);
            if (!out.header || (!(out.header.section === "D" && (out.header.subsection === " " || out.header.subsection === "B")))) {
                return ParseResult.ERROR;
            } else {
                let splitData = dataIn.match(this.regexp);
                if (!splitData)
                    return ParseResult.ERROR;
                else {
                    out.source = splitData.shift();

                    out.ICAO = splitData[1]
                    out.ident = splitData[2];

                    if (splitData[7])
                        out.vorLatitude = new Latongitude(splitData[7], splitData.slice(8, 8 + 4).map(val => Number.parseInt(val)));
                    if (splitData[12])
                        out.vorLongitude = new Latongitude(splitData[12], splitData.slice(13, 13 + 4).map(val => Number.parseInt(val)));

                    if (splitData[18])
                        out.DMELatitude = new Latongitude(splitData[18], splitData.slice(19, 19 + 4).map(val => Number.parseInt(val)));
                    if (splitData[23])
                        out.DMELongitude = new Latongitude(splitData[23], splitData.slice(24, 24 + 4).map(val => Number.parseInt(val)));

                    out.recognizedLine = true;
                    out.completed = true;
                    return out;
                }
            }
        }
    },
    class RUNWAY extends ParseResult {
        static regexp = /^(.{4})(.{2})G([A-Z\d ]{5}) {3}(.)([\dA-Z ]{5})([\dA-Z ]{4}) ([NS])(\d{2})(\d{2})(\d{2})(\d{2})([EW])(\d{3})(\d{2})(\d{2})(\d{2})([\dA-Z ]{5}) {4}(.{6})(.{5})(.{4})(.{2})(.{3})(.)(.{4})(.)(.{4})(.{4})(.) {6}(.{22})$/m;

        parentident;
        ICAO;
        ident;
        length;
        magbearing;

        latitude() { return this.rwylatitude}
        longitude() { return this.rwylongitude}

        rwylatitude;
        rwylongitude;
        static parse(dataIn) {
            let out = new RUNWAY();
            dataIn = out.local_parse(dataIn);
            if (!out.header || !(out.header.section === "P" && out.header.subsection === " ")) {
                return ParseResult.ERROR;
            } else {
                let splitData = dataIn.match(this.regexp);
                if (!splitData)
                    return ParseResult.ERROR;
                else {
                    out.source = splitData.shift();

                    out.parentident = splitData[0];
                    out.ICAO = splitData[1];
                    out.ident = splitData[2];
                    out.length = splitData[4];
                    out.magbearing = splitData[5];

                    if (splitData[6])
                        out.rwylatitude = new Latongitude(splitData[6], splitData.slice(7, 7 + 4).map(val => Number.parseInt(val)));
                    if (splitData[11])
                        out.rwylongitude = new Latongitude(splitData[11], splitData.slice(12, 12 + 4).map(val => Number.parseInt(val)));

                    out.recognizedLine = true;
                    out.completed = true;
                    return out;
                }
            }
        }
    },
/*    class HEADER extends ParseResult {
        static regexp = /^HDR\d+/m;

        /!**
         * @type {string}
         *!/
        source;

        static parse(dataIn) {
            if (dataIn.match(this.regexp)) {
                let out = new Header();
                out.source = dataIn;
                out.recognizedLine = true;
                return out;
            }
            return ParseResult.ERROR;
        }
    },
    class MORA extends ParseResult {
        static regexp = /^S {3}AS {7}[SN]\d{2}[EW]\d{3} {10}(UNK|\d{3})+ {3}\d+$/m;

        /!**
         * @type {string}
         *!/
        source;

        static parse(dataIn) {
            if (dataIn.match(this.regexp)) {
                let out = new Header();
                out.source = dataIn;
                out.recognizedLine = true;
                return out;
            }
            return ParseResult.ERROR;
        }
    },
    class ENROUTE_AIRWAYS extends ParseResult {
        static regexp = /^S[A-Z]{3}ER {7}[A-Z]{5}. {6}[SN]\d{2}[EW]\d{3} {10}(UNK|\d{3})+ {3}\d+$/m;

        /!**
         * @type {string}
         *!/
        source;

        static parse(dataIn) {
            if (dataIn.match(this.regexp)) {
                let out = new ENROUTE_AIRWAYS();
                out.source = dataIn;
                out.recognizedLine = true;
                return out;
            }
            return ParseResult.ERROR;
        }
    },
    class AIRSPACE extends ParseResult {
        static regexp = /^S[A-Z]U/m;

        /!**
         * @type {string}
         *!/
        source;

        static parse(dataIn) {
            if (dataIn.match(this.regexp)) {
                let out = new AIRSPACE();
                out.source = dataIn;
                out.recognizedLine = true;
                return out;
            }
            return ParseResult.ERROR;
        }
    },*/
];

/**
 * @param line {String}
 * @returns { ParseResult }
 */
function parseLine(line) {
    for (const childClass of childClasses) {
        let res = childClass.parse(line);
        if (res !== ParseResult.ERROR)
            return res;
    }
    return ParseResult.ERROR;
}

/**
 * @param dataIn {String}
 */
function parse(dataIn) {
    dataIn.split(/\r?\n/g).map(parseLine);
}

function altitudeToXML(obj, depth) {
    let out = "";
    let dispalt1 = obj.nav_altitude_1;
    dispalt1 = dispalt1.match(/(FL)?(\d+)/) ? dispalt1.match(/(FL)?(\d+)/)[2] + (dispalt1.match(/(FL)?(\d+)/)[1] ? "00" : "") : "";
    let dispalt2 = obj.nav_altitude_2;
    dispalt2 = dispalt2.match(/(FL)?(\d+)/) ? dispalt2.match(/(FL)?(\d+)/)[2] + (dispalt2.match(/(FL)?(\d+)/)[1] ? "00" : "") : "";
    switch (obj.nav_altitude) {
        case "B": {
            out += `${'\t'.repeat(depth)}<AltitudeRestriction>between</AltitudeRestriction>\n`;
            out += `${'\t'.repeat(depth)}<Altitude>${dispalt1}</Altitude>\n`;
            out += `${'\t'.repeat(depth)}<Altitude>${dispalt2}</Altitude>\n`;
            break;
        }
        case "G":
        case "H":
        case "V":
            out += `${'\t'.repeat(depth)}<AltitudeRestriction>between</AltitudeRestriction>\n`;
            out += `${'\t'.repeat(depth)}<Altitude>${dispalt1}</Altitude>\n`;
            out += `${'\t'.repeat(depth)}<Altitude>${dispalt2}</Altitude>\n`;
            break;
        // glide slope intersect at 2, floor at 1
        case "J": {
            out += `${'\t'.repeat(depth)}<Altitude>${dispalt2}</Altitude>\n`;
            out += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
            break;
        }
        case "+": {
            out += `${'\t'.repeat(depth)}<Altitude>${dispalt1}</Altitude>\n`;
            out += `${'\t'.repeat(depth)}<AltitudeRestriction>above</AltitudeRestriction>\n`;
            break;
        }
        case "-": {
            out += `${'\t'.repeat(depth)}<Altitude>${dispalt1}</Altitude>\n`;
            out += `${'\t'.repeat(depth)}<AltitudeRestriction>below</AltitudeRestriction>\n`;
            break;
        }
        case "I":
        case " ": {
            if (dispalt1.trim().length) {
                out += `${'\t'.repeat(depth)}<Altitude>${dispalt1}</Altitude>\n`;
                out += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
            } else {
                out += `${'\t'.repeat(depth)}<Altitude>0</Altitude>\n`;
                out += `${'\t'.repeat(depth)}<AltitudeCons>0</AltitudeCons>\n`;
                out += `${'\t'.repeat(depth)}<AltitudeRestriction>at</AltitudeRestriction>\n`;
            }
            break;
        }

        default:
            console.log("Unrecognized ", obj.nav_altitude);
    }
    return out;
}

module.exports = {
    parseLine: parseLine,
    RouteType: RouteType,
    altitudeToXML: altitudeToXML,
    Latongitude: Latongitude,
};