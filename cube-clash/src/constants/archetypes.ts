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
  price?: number;
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
    passive: 'Cannot be knocked back by small-caliber bullets.',
    price: 0
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
    passive: 'Your block/parry allows you to pass through geometry for 0.5s.',
    price: 0
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
    passive: '20% faster reload and weapon swap speed.',
    price: 0
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
    passive: 'Triple jump and 50% more horizontal movement while in the air.',
    price: 0
  },
  {
    id: 'neon_ninja',
    name: 'Neon Ninja',
    description: 'A cybernetic assassin built for extreme velocity and light-speed reactions.',
    color: '#34d399', // Emerald
    stats: { mobility: 140, stability: 60, power: 70, speed: 150 },
    passiveName: 'Light Trail',
    passive: 'Movement speed increases by 5% every second while running (max 30%).',
    price: 10
  },
  {
    id: 'molten_core',
    name: 'Molten Core',
    description: 'A burning engine of destruction that thrives in the heat of battle.',
    color: '#f97316', // Orange
    stats: { mobility: 70, stability: 120, power: 130, speed: 80 },
    passiveName: 'Blazing Trails',
    passive: 'Leave a trail of fire that damages enemies behind you.',
    price: 15
  },
  {
    id: 'frost_giant',
    name: 'Frost Giant',
    description: 'An ancient spirit of the arctic, capable of freezing time and space.',
    color: '#60a5fa', // Blue
    stats: { mobility: 50, stability: 180, power: 110, speed: 60 },
    passiveName: 'Absolute Zero',
    passive: 'Projectiles have a 15% chance to freeze enemies for 1s.',
    price: 20
  },
  {
    id: 'static_demon',
    name: 'Static Demon',
    description: 'A creature of pure energy that feeds on electrical discharges.',
    color: '#facc15', // Yellow
    stats: { mobility: 110, stability: 90, power: 80, speed: 140 },
    passiveName: 'Chain Surge',
    passive: 'Every 5th shot bounces to a secondary target with lightning.',
    price: 12
  },
  {
    id: 'bio_hazard',
    name: 'Bio Hazard',
    description: 'A walking extinction event spreading toxic spores across the map.',
    color: '#4ade80', // Green
    stats: { mobility: 90, stability: 100, power: 70, speed: 90 },
    passiveName: 'Toxic Spore',
    passive: 'Jump releases a small poison cloud that lasts for 2 seconds.',
    price: 18
  },
  {
    id: 'gravity_monarch',
    name: 'Gravity Monarch',
    description: 'The ruler of the void, warping the laws of physics at will.',
    color: '#c084fc', // Light Purple
    stats: { mobility: 120, stability: 60, power: 100, speed: 100 },
    passiveName: 'Event Horizon',
    passive: 'Projectiles pull nearby enemies 20% closer to the impact point.',
    price: 30
  },
  {
    id: 'echo_walker',
    name: 'Echo Walker',
    description: 'A temporal anomaly that exists in multiple moments simultaneously.',
    color: '#94a3b8', // Slate
    stats: { mobility: 100, stability: 100, power: 90, speed: 110 },
    passiveName: 'Temporal Echo',
    passive: 'Every 4th shot is fired twice from slightly different positions.',
    price: 25
  },
  {
    id: 'vampire_lord',
    name: 'Vampire Lord',
    description: 'A blood-thirsty noble who grows stronger as the arena bleeds.',
    color: '#991b1b', // Dark Red
    stats: { mobility: 90, stability: 80, power: 120, speed: 100 },
    passiveName: 'Blood Tithe',
    passive: 'Gain 10% lifesteal on all primary weapon damage.',
    price: 35
  },
  {
    id: 'iron_clover',
    name: 'Iron Clover',
    description: 'A lucky brawler with a core of solid steel and peerless grit.',
    color: '#16a34a', // Forest Green
    stats: { mobility: 80, stability: 200, power: 70, speed: 70 },
    passiveName: 'Immutable',
    passive: 'Immune to all minor knockback effects and explosions.',
    price: 20
  },
  {
    id: 'storm_herald',
    name: 'Storm Herald',
    description: 'The messenger of the gale, riding the winds to victory.',
    color: '#38bdf8', // Sky Blue
    stats: { mobility: 160, stability: 70, power: 60, speed: 130 },
    passiveName: 'Wind Rider',
    passive: 'Gain an additional air-dash that recharges every 3 seconds.',
    price: 22
  },
  {
    id: 'shadow_shade',
    name: 'Shadow Shade',
    description: 'A master of darkness who vanishes when the light hits wrong.',
    color: '#1e293b', // Navy
    stats: { mobility: 110, stability: 90, power: 100, speed: 120 },
    passiveName: 'Obsidian Veil',
    passive: 'Crouching for 1.5s makes you 70% transparent for 3s.',
    price: 28
  },
  {
    id: 'plasma_pulse',
    name: 'Plasma Pulse',
    description: 'A high-energy combatant using experimental core technology.',
    color: '#f43f5e', // Rose
    stats: { mobility: 100, stability: 110, power: 140, speed: 90 },
    passiveName: 'Overcharge',
    passive: 'Standing still recharges your next shot to do 50% more damage.',
    price: 40
  },
  {
    id: 'spirit_guide',
    name: 'Spirit Guide',
    description: 'A shamanic cube connected to the ancient life forces of the arena.',
    color: '#fbbf24', // Amber
    stats: { mobility: 90, stability: 130, power: 80, speed: 100 },
    passiveName: 'Ancestral Aegis',
    passive: 'Projectiles from enemies in a 50px radius move 20% slower.',
    price: 15
  },
  {
    id: 'mecha_prime',
    name: 'Mecha Prime',
    description: 'The pinnacle of automated combat technology.',
    color: '#52525b', // Zinc
    stats: { mobility: 60, stability: 160, power: 110, speed: 110 },
    passiveName: 'Lock-On',
    passive: 'Weapon accuracy increases by 30% if fire button is held.',
    price: 50
  },
  {
    id: 'quantum_quark',
    name: 'Quantum Quark',
    description: 'An unstable particle that can exist in two states at once.',
    color: '#ec4899', // Pink
    stats: { mobility: 130, stability: 120, power: 50, speed: 120 },
    passiveName: 'Entanglement',
    passive: 'Every jump has a 10% chance to teleport you forward 200px.',
    price: 45
  },
  {
    id: 'stellar_nova',
    name: 'Stellar Nova',
    description: 'A collapsing star contained within a geometric cage.',
    color: '#ffffff', // White
    stats: { mobility: 100, stability: 100, power: 150, speed: 80 },
    passiveName: 'Supernova',
    passive: 'Upon death, release a massive explosion (Visual only + pushback).',
    price: 60
  },
  {
    id: 'druid_root',
    name: 'Druid Root',
    description: 'A nature spirit that draws strength from the very ground.',
    color: '#3f6212', // Olive
    stats: { mobility: 80, stability: 140, power: 110, speed: 90 },
    passiveName: 'Rooted',
    passive: 'Standing on ground regenerates 0.5 HP per second.',
    price: 12
  },
  {
    id: 'chaos_glitch',
    name: 'Chaos Glitch',
    description: 'A programming error that learned how to fight.',
    color: '#000000', // Black
    stats: { mobility: 110, stability: 110, power: 110, speed: 110 },
    passiveName: 'RNG Shield',
    passive: '10% chance for incoming damage to be converted to healing.',
    price: 75
  },
  {
    id: 'sun_stepper',
    name: 'Sun Stepper',
    description: 'A celestial dancer following the path of the morning sun.',
    color: '#fdba74', // Peach
    stats: { mobility: 130, stability: 80, power: 90, speed: 130 },
    passiveName: 'Solar Flare',
    passive: 'Air movement is 40% more responsive.',
    price: 10
  },
  {
    id: 'void_reaper',
    name: 'Void Reaper',
    description: 'The final outcome of all things in the universe.',
    color: '#000000', // True Black
    stats: { mobility: 100, stability: 100, power: 180, speed: 100 },
    passiveName: 'Obliteration',
    passive: 'Projectiles deal true damage (ignores 50% of armor).',
    price: 100
  }
];
