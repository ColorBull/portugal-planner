import { useMatch } from "react-router-dom";
import { useTrips } from "@/lib/TripContext";
import { tripCountry } from "@/lib/countries";
import WorldMapBackground from "@/components/WorldMapBackground";

const PAPER =
  "radial-gradient(120% 120% at 15% 10%, #fdfaf4 0%, #f5ecdd 45%, #ead9c2 100%)";

/**
 * The one map in the app, mounted above the router so it survives navigation:
 * the trip list shows the whole world, opening a trip zooms into its continent,
 * and going back zooms out again.
 */
export default function MapBackdrop() {
  const match = useMatch("/trip/:tripId");
  const { trips } = useTrips();
  const trip = match ? trips.find((t) => t.id === match.params.tripId) : null;
  const country = tripCountry(trip);

  return (
    <div
      className="viewport-tall fixed left-0 top-0 z-0 w-full overflow-hidden"
      style={{ background: PAPER }}
    >
      <WorldMapBackground
        continent={country?.continent || null}
        highlightCcn3={country?.ccn3 || null}
      />
    </div>
  );
}
