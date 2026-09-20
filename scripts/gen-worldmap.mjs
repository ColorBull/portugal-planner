// Turns a Natural Earth TopoJSON into src/data/worldMap.js: ready-made SVG path
// strings in a fixed projected space, plus one zoom window per continent.
//
//   curl -sLO https://unpkg.com/world-atlas@2.0.2/countries-110m.json
//   node scripts/gen-worldmap.mjs ./countries-110m.json
//
// Projecting here instead of in the browser is what keeps d3-geo, topojson and
// world-atlas out of the app — at runtime it is only <path d="…"> being panned
// and scaled.
import { readFileSync, writeFileSync } from "node:fs";
import { COUNTRIES } from "../src/data/countries.js";

const source = process.argv[2] || "./countries-110m.json";
const topology = JSON.parse(readFileSync(source, "utf8"));

// ------------------------------------------------------------- topojson ----

const { scale: [sx, sy], translate: [tx, ty] } = topology.transform;

const arcs = topology.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * sx + tx, y * sy + ty];
  });
});

const ring = (indexes) => {
  const points = [];
  indexes.forEach((index) => {
    const arc = index < 0 ? arcs[~index].slice().reverse() : arcs[index];
    points.push(...(points.length ? arc.slice(1) : arc));
  });
  return points;
};

const polygons = (geometry) => {
  if (geometry.type === "Polygon") return [geometry.arcs.map(ring)];
  if (geometry.type === "MultiPolygon") return geometry.arcs.map((p) => p.map(ring));
  if (geometry.type === "GeometryCollection") return geometry.geometries.flatMap(polygons);
  return [];
};

// ----------------------------------------------------------- projection ----

// d3's geoNaturalEarth1, inlined: a plain polynomial, no library needed.
const RADIANS = Math.PI / 180;
function project([lon, lat]) {
  const l = lon * RADIANS;
  const p = lat * RADIANS;
  const p2 = p * p;
  const p4 = p2 * p2;
  return [
    l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
    p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
  ];
}

const WIDTH = 1000; // the projected space every path is written in

const world = polygons(topology.objects.land).flat().flat().map(project);
const minX = Math.min(...world.map((p) => p[0]));
const maxX = Math.max(...world.map((p) => p[0]));
const minY = Math.min(...world.map((p) => p[1]));
const maxY = Math.max(...world.map((p) => p[1]));

const k = WIDTH / (maxX - minX);
const HEIGHT = Math.round((maxY - minY) * k * 10) / 10;

// y is flipped: projected north is positive, screen north is not.
const place = (lonlat) => {
  const [x, y] = project(lonlat);
  return [Math.round((x - minX) * k * 10) / 10, Math.round((maxY - y) * k * 10) / 10];
};

// Natural Earth cuts rings at ±180°, so a shape straddling the antimeridian
// (Russia, Fiji, Antarctica) arrives as one ring that jumps the whole width of
// the map. Split the ring at each jump — and, since a ring is a loop, join the
// tail back onto the head, or the two ends get closed off with a chord right
// across the map.
const splitAtAntimeridian = (points) => {
  const pieces = [[]];
  points.forEach((lonlat, i) => {
    if (i > 0 && Math.abs(lonlat[0] - points[i - 1][0]) > 180) pieces.push([]);
    pieces[pieces.length - 1].push(lonlat);
  });
  if (pieces.length > 1) pieces[0] = pieces.pop().concat(pieces[0]);
  return pieces;
};

const subPath = (points) => {
  const out = [];
  let last = null;
  points.forEach((lonlat) => {
    const [x, y] = place(lonlat);
    // 0.1 units is well under a pixel — drop steps that land on the spot.
    if (last && last[0] === x && last[1] === y) return;
    out.push(`${out.length ? "L" : "M"}${x} ${y}`);
    last = [x, y];
  });
  return out.length > 2 ? `${out.join("")}Z` : "";
};

const toPath = (geometry) =>
  polygons(geometry).flat().flatMap(splitAtAntimeridian).map(subPath).join("");

// ---------------------------------------------------------------- output ----

const land = toPath(topology.objects.land);

const countries = {};
topology.objects.countries.geometries.forEach((geometry) => {
  countries[String(geometry.id).padStart(3, "0")] = toPath(geometry);
});

const WINDOWS = {
  europe: [-25, 33, 46, 71],
  africa: [-20, -36, 53, 39],
  asia: [25, -11, 148, 62],
  "north-america": [-170, 6, -52, 72],
  "south-america": [-84, -56, -33, 14],
  oceania: [110, -48, 179, 2],
};

// Each window as a box in the projected space. The edges are walked rather than
// just cornered, because the projection curves them.
const windows = {};
Object.entries(WINDOWS).forEach(([key, [w, s, e, n]]) => {
  const edge = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    edge.push(place([w + (e - w) * t, s]), place([w + (e - w) * t, n]));
    edge.push(place([w, s + (n - s) * t]), place([e, s + (n - s) * t]));
  }
  windows[key] = [
    Math.min(...edge.map((c) => c[0])),
    Math.min(...edge.map((c) => c[1])),
    Math.max(...edge.map((c) => c[0])),
    Math.max(...edge.map((c) => c[1])),
  ].map((v) => Math.round(v * 10) / 10);
});

const points = {};
COUNTRIES.forEach((c) => {
  points[c.ccn3] = place(c.lonlat);
});

const json = (v) => JSON.stringify(v);
writeFileSync(
  new URL("../src/data/worldMap.js", import.meta.url),
  `// Generated by scripts/gen-worldmap.mjs — do not edit by hand.\n` +
    `// SVG paths in a ${WIDTH}×${HEIGHT} projected space (Natural Earth I).\n` +
    `export const MAP_WIDTH = ${WIDTH};\n` +
    `export const MAP_HEIGHT = ${HEIGHT};\n` +
    `// Continent zoom windows: [x0, y0, x1, y1] in the same space.\n` +
    `export const MAP_WINDOWS = ${json(windows)};\n` +
    `// Where each country sits, for centring and for pinning tiny ones.\n` +
    `export const MAP_POINTS = ${json(points)};\n` +
    `export const COUNTRY_PATHS = ${json(countries)};\n` +
    `export const LAND_PATH = ${json(land)};\n`
);

console.log(`wrote ${Object.keys(countries).length} countries`);
