import SpeedBreedingArt from "./SpeedBreedingArt";
import PhenotypingArt from "./PhenotypingArt";

// Speed breeding and phenotyping as one picture: the breeding room, with the
// imaging rig that measures each generation inset in the corner.
export default function BreedingArt({ animated = true }) {
  return (
    <div className="breeding-art">
      <SpeedBreedingArt animated={animated} />
      <div className="breeding-art-inset">
        <PhenotypingArt animated={animated} />
      </div>
    </div>
  );
}
