import { useEffect, useRef, useState } from "react";
import {
  COUNTRY_PATHS,
  LAND_PATH,
  MAP_HEIGHT,
  MAP_POINTS,
  MAP_WIDTH,
  MAP_WINDOWS,
} from "@/data/worldMap";

// A flat vector sketch of the world: continent silhouettes, no borders, no
// labels, no grid. The outlines are projected ahead of time (see
// scripts/gen-worldmap.mjs), so a continent view is the same drawing panned and
// scaled — and CSS animates between the two.

const EASE = "transform 900ms cubic-bezier(0.45, 0, 0.25, 1), opacity 900ms ease";

const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

// Whole world: fit it on screen. A continent: fill the screen with its window,
// centred on the trip's country — a narrow screen only shows a slice of a
// continent, and that slice has to be the part with the country in it.
function viewFor(continent, width, height, at) {
  const box = MAP_WINDOWS[continent];
  if (!box) {
    // The world is twice as wide as it is tall, so fitting it whole onto a
    // portrait phone leaves a thin strip. There, fill the width and half the
    // height instead and let the far edges crop. Landscape is unaffected.
    const k =
      width < height
        ? Math.max(width / MAP_WIDTH, (height * 0.5) / MAP_HEIGHT)
        : Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
    return { k, x: (width - MAP_WIDTH * k) / 2, y: (height - MAP_HEIGHT * k) / 2 };
  }
  const [x0, y0, x1, y1] = box;
  const k = Math.max(width / (x1 - x0), height / (y1 - y0));
  const cx = at ? clamp(at[0], x0 + width / (2 * k), x1 - width / (2 * k)) : (x0 + x1) / 2;
  const cy = at ? clamp(at[1], y0 + height / (2 * k), y1 - height / (2 * k)) : (y0 + y1) / 2;
  return { k, x: width / 2 - k * cx, y: height / 2 - k * cy };
}

/**
 * The size to draw at. Mobile browsers grow and shrink the viewport as the
 * address bar hides on scroll; re-fitting the map on every one of those would
 * make it drift under the page. So the tallest height seen for a given width
 * wins, and the bar just covers a sliver of the map when it comes back.
 */
function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize((prev) => {
        if (prev.width === width && height <= prev.height) return prev;
        // A new width means a rotation or a resized window: start over.
        return { width, height: prev.width === width ? Math.max(prev.height, height) : height };
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/**
 * The map behind every screen. No `continent` draws the whole world; naming one
 * zooms to it with `highlightCcn3` painted in accent.
 */
export default function WorldMapBackground({ continent = null, highlightCcn3 = null }) {
  const hostRef = useRef(null);
  const { width, height } = useSize(hostRef);

  // Hold on to the last country so it fades out during the zoom back out.
  const [held, setHeld] = useState(highlightCcn3);
  useEffect(() => {
    if (highlightCcn3) setHeld(highlightCcn3);
  }, [highlightCcn3]);

  if (!width || !height) return <div ref={hostRef} className="absolute inset-0" />;

  const { k, x, y } = viewFor(continent, width, height, held && MAP_POINTS[held]);
  const countryPath = held && COUNTRY_PATHS[held];
  // Countries too small to have an outline at this resolution get a pin instead.
  const pin = held && !countryPath && MAP_POINTS[held];

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="h-full w-full">
        <g style={{ transform: `translate(${x}px, ${y}px) scale(${k})`, transition: EASE }}>
          <path d={LAND_PATH} fill="#1d3b5c" fillOpacity={0.12} />
          {countryPath && (
            <path
              d={countryPath}
              fill="#c4623a"
              fillOpacity={continent ? 0.28 : 0}
              stroke="#a8451f"
              strokeOpacity={continent ? 0.5 : 0}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              style={{ transition: EASE }}
            />
          )}
        </g>
        {pin && (
          // Outside the zoomed group, so the pin keeps its size on screen.
          <g
            opacity={continent ? 1 : 0}
            style={{
              transform: `translate(${x + k * pin[0]}px, ${y + k * pin[1]}px)`,
              transition: EASE,
            }}
          >
            <circle r={16} fill="#c4623a" fillOpacity={0.22} />
            <circle r={6} fill="#c4623a" fillOpacity={0.75} />
          </g>
        )}
      </svg>
    </div>
  );
}
