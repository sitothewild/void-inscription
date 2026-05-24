// Shared input bus consumed by Hero (Rapier body) and GameLoop (AI/attacks).
// Populated by GameLoop's event listeners; read in Hero's useFrame.
import { Vector3 } from "three";

export const heroInput = {
  keys: new Set<string>(),
  mouseWorld: new Vector3(),
  attack: false,
  interact: false,
};