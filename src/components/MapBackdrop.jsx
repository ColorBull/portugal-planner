import { useMatch } from "react-router-dom";
import { useTrips } from "@/lib/TripContext";
import { tripCountry } from "@/lib/countries";
import WorldMapBackground from "@/components/WorldMapBackground";
import { useAuth } from "@/lib/AuthContext";
import { canSeeTrip, useTripLockChanges } from "@/lib/tripLock";

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
  const { user } = useAuth();
  useTripLockChanges();
  const trip = match ? trips.find((t) => t.id === match.params.tripId) : null;
  // A private trip doesn't give its country away by zooming to it.
  const country = canSeeTrip(trip, user?.email) ? tripCountry(trip) : null;

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
