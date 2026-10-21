import { memo } from "react";
import PolyhouseArt from "./PolyhouseArt";
<<<<<<< HEAD
import SpeedBreedingArt from "./SpeedBreedingArt";
import PhenotypingArt from "./PhenotypingArt";

const SCENES = {
  polyhouse: PolyhouseArt,
=======
import GrowChamberArt from "./GrowChamberArt";
import SpeedBreedingArt from "./SpeedBreedingArt";
import PhenotypingArt from "./PhenotypingArt";
import BreedingArt from "./BreedingArt";

const SCENES = {
  polyhouse: PolyhouseArt,
  grow_chamber: GrowChamberArt,
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  speed_breeding: SpeedBreedingArt,
  phenotyping: PhenotypingArt,
};

// Memoised: dashboards refresh every 20 s, and a scene only depends on the
// facility type, so its SVG never needs to re-render on a data refresh.
function FacilityArt({ type, ...props }) {
  const Scene = SCENES[type] || PolyhouseArt;
  return <Scene {...props} />;
}

export default memo(FacilityArt);

<<<<<<< HEAD
export { PolyhouseArt, SpeedBreedingArt, PhenotypingArt };
=======
export { PolyhouseArt, GrowChamberArt, SpeedBreedingArt, PhenotypingArt, BreedingArt };
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
