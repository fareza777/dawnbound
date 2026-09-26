/** Shared virtual-controller state written by the HUD (touch) or keyboard, read by gameplay scenes. */
export interface ControlState {
  moveX: number;
  moveY: number;
  attackHeld: boolean;
  dash: boolean;
  skill: boolean;
  flare: boolean;
  potion: boolean;
  interact: boolean;
}

export const controls: ControlState = {
  moveX: 0,
  moveY: 0,
  attackHeld: false,
  dash: false,
  skill: false,
  flare: false,
  potion: false,
  interact: false,
};

export function resetControls(): void {
  controls.moveX = 0;
  controls.moveY = 0;
  controls.attackHeld = false;
  controls.dash = false;
  controls.skill = false;
  controls.flare = false;
  controls.potion = false;
  controls.interact = false;
}

/** Consume a one-shot button press. */
export function take(key: 'dash' | 'skill' | 'flare' | 'potion' | 'interact'): boolean {
  const v = controls[key];
  controls[key] = false;
  return v;
}
