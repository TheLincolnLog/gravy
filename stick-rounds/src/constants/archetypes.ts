export interface Archetype {
  id: string;
  name: string;
  description: string;
  color: string;
  stats: {
    mobility: number;
    stability: number;
    power: number;
    speed: number;
  };
  passive: string;
  passiveName: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'titan',
    name: 'The Titan',
    description: 'A heavy-duty defensive unit that sacrifices speed for absolute control.',
    color: '#ef4444', // Red
    stats: {
      mobility: 40,
      stability: 150,
      power: 90,
      speed: 80
    },
    passiveName: 'Unstoppable',
    passive: 'Cannot be knocked back by small-caliber bullets.'
  },
  {
    id: 'wraith',
    name: 'The Wraith',
    description: 'An ethereal combatant that moves like a ghost and strikes with precision.',
    color: '#a855f7', // Purple
    stats: {
      mobility: 100,
      stability: 70,
      power: 60,
      speed: 130
    },
    passiveName: 'Phase Shift',
    passive: 'Your block/parry allows you to pass through geometry for 0.5s.'
  },
  {
    id: 'gunner',
    name: 'The Gunner',
    description: 'A balanced weapons expert with peerless reflex and reload timing.',
    color: '#eab308', // Yellow
    stats: {
      mobility: 80,
      stability: 100,
      power: 100,
      speed: 100
    },
    passiveName: 'Fast Hands',
    passive: '20% faster reload and weapon swap speed.'
  },
  {
    id: 'acrobat',
    name: 'The Acrobat',
    description: 'Master of air combat with unparalleled horizontal and vertical range.',
    color: '#22d3ee', // Cyan
    stats: {
      mobility: 150,
      stability: 80,
      power: 50,
      speed: 120
    },
    passiveName: 'Air Control',
    passive: 'Triple jump and 50% more horizontal movement while in the air.'
  }
];
