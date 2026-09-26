import type { Rng } from '@/core/rng';
import type { Element } from '@/data/types';
import type { StatusKind } from '@/systems/combat';
import type { RunContext } from './RunContext';
import type { Player } from '@/entities/Player';
import type { Enemy } from '@/entities/Enemy';
import type { Fx } from './Fx';

export interface ProjectileSpec {
  x: number;
  y: number;
  angle: number;
  speed: number;
  friendly: boolean;
  /** Friendly: multiplier on player attack. Hostile: flat damage. */
  damage: number;
  element: Element;
  kind: 'arrow' | 'orb' | 'star' | 'wave' | 'bolt' | 'thorn' | 'spore' | 'fire' | 'ice' | 'shadow';
  tint?: number;
  radius?: number;
  pierce?: number;
  homing?: number;
  range?: number;
  status?: [StatusKind, number];
  scale?: number;
  bounce?: number;
  /** Lob projectiles arc and explode where they land. */
  lob?: boolean;
  isSkill?: boolean;
}

export interface MeleeSpec {
  x: number;
  y: number;
  angle: number;
  radius: number;
  arc: number;
  mult: number;
  knock: number;
  element?: Element;
  isSkill?: boolean;
  status?: [StatusKind, number];
  /** Hit everything regardless of angle. */
  full?: boolean;
}

export interface World {
  rng: Rng;
  ctx: RunContext;
  player: Player;
  enemies: Enemy[];
  roomWidth: number;
  roomHeight: number;
  depth: number;
  melee(spec: MeleeSpec): number;
  fire(spec: ProjectileSpec): void;
  nearestEnemy(x: number, y: number, maxDist: number): Enemy | null;
  damagePlayer(amount: number, element: Element, source?: { x: number; y: number }, status?: [StatusKind, number]): void;
  explode(x: number, y: number, radius: number, damage: number, element: Element, friendly: boolean, status?: [StatusKind, number]): void;
  spawnEnemy(id: string, x: number, y: number, elite?: boolean): Enemy | null;
  killEnemy(e: Enemy): void;
  dotEnemy(e: Enemy, amount: number): void;
  isWalkableAt(px: number, py: number, flying: boolean): boolean;
  /** Direction (unit vector) towards the player following the flow field. */
  flowDir(px: number, py: number): { x: number; y: number };
  hasLineOfSight(ax: number, ay: number, bx: number, by: number): boolean;
  shake(intensity: number, ms: number): void;
  hitStop(ms: number): void;
  light(x: number, y: number, radius: number, tint: number, ms: number): void;
  sfx(key: string, volume?: number): void;
  onPlayerAttack(): void;
  hudEvent(name: string, payload?: unknown): void;
  bossDefeated(): void;
  onDash(): void;
  addFlare(amount: number): void;
  floatText(x: number, y: number, text: string, color: number, big?: boolean): void;
  /** Visual effects (slashes, rings, streaks) for skills and attacks. */
  fx: Fx;
}
