export type AbilityType = 'FLIP' | 'MASS' | 'TIME' | 'PHASE' | 'PORTAL';

export interface Player {
  id: string;
  character: string;
  ready: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravityScale: number;
  isPhasing: boolean;
  portals: { x: number; y: number }[];
  color: string;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'static' | 'ghost' | 'moving' | 'kill' | 'button' | 'door' | 'goal';
  id?: string;
  triggerId?: string;
  isOpen?: boolean;
}

export interface LevelData {
  platforms: Platform[];
  spawn: { x: number; y: number };
}

export const CHARACTERS = [
  { id: 'flip', name: 'Gravity Flipper', power: 'FLIP', description: 'Can reverse their own gravity.', color: '#FF4444' },
  { id: 'mass', name: 'Weight Manipulator', power: 'MASS', description: 'Can become super heavy or weightless.', color: '#44FF44' },
  { id: 'time', name: 'Time Bender', power: 'TIME', description: 'Can slow down local physical objects.', color: '#4444FF' },
  { id: 'portal', name: 'Portal Master', power: 'PORTAL', description: 'Can place interconnected portals.', color: '#FFFF44' },
  { id: 'phase', name: 'Phaser', power: 'PHASE', description: 'Can pass through ghostly matter.', color: '#FF44FF' },
];
