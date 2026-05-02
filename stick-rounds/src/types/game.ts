
export interface PlayerStats {
  maxHealth: number;
  health: number;
  movementSpeed: number;
  jumpForce: number;
  attackSpeed: number;
  projectileCount: number;
  projectileSize: number;
  damage: number;
  bounceCount: number;
  isBouncy: boolean;
  isExplosive: boolean;
  isHeatSeeking: boolean;
  reloadSpeed: number;
  piercing: boolean;
  shieldDuration: number;
  gravityScale: number;
  jumpCooldown: number; // ms
  fireRate: number;      // ms delay between shots
  projectileSpeed: number;
  // NEW STATS
  lifesteal: number;     // 0 to 1
  poisonChance: number;  // 0 to 1
  burnChance: number;    // 0 to 1
  thorns: number;        // Damage reflected
  dodgeChance: number;   // 0 to 1
  necroChance: number;   // Chance to spawn a minion on kill
  extraJumps: number;
  armor: number;         // Flat damage reduction
  projectileGravity: number;
  recoilPropulsion: number;
  noAirContactDamage: boolean;
  wallWalk: boolean;
  echoStrikes: boolean;
  kineticBattery: boolean;
  storedKineticEnergy: number;
  // SOCKET SYSTEM
  coreSlot?: string;
  tacticalSlot?: string;
  utilitySlot?: string;
  // VISUALS
  neonGlow: boolean;
  trailEffect: boolean;
  entropyMode?: boolean;
  bulletTimeParry?: boolean;
  quantumSwap?: boolean;
  finalStandVisuals?: boolean;
  extraDebris?: boolean;
  stability: number;
}

export interface Card {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  apply: (stats: PlayerStats) => PlayerStats;
}

export type GamePhase = 'menu' | 'playerSelect' | 'multiplayer' | 'archetypeSelect' | 'customization' | 'levelVote' | 'playing' | 'drafting' | 'gameover';

export type Level = 'pyramid' | 'moon' | 'jungle' | 'space' | 'desert' | 'atlantis' | 'arctic' | 'radioactive' | 'cave' | 'volcano' | 'foundry' | 'data_center' | 'greenhouse' | 'metropolis' | 'laboratory' | 'inferno' | 'sky_castle' | 'crystal_crevasse' | 'steampunk_factory' | 'neon_cyber_city' | 'ancient_temple' | 'shroom_kingdom' | 'haunted_mansion' | 'underwater_base' | 'volcano_fortress' | 'cloud_city' | 'toxic_sewer' | 'frozen_wasteland' | 'cyber_void';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythical';

export type WeaponType = 
  | 'pistol' | 'smg' | 'bazooka' | 'snake_cannon' | 'bow' | 'sword' | 'bomb' | 'grenade' 
  | 'shield_potion' | 'health_potion' | 'force_field' | 'black_hole' | 'magnet'
  | 'boomerang' | 'damage_teleport' | 'railgun' | 'freeze_ray' | 'minigun' | 'laser'
  | 'orb_of_destruction' | 'time_stop' | 'dragon_breath' | 'eraser' | 'god_mode'
  | 'speed_boost' | 'gravity_grenade' | 'triple_shot'
  | 'arc_lightning' | 'vampire_bat' | 'meteor_strike' | 'turret' | 'poison_gas'
  | 'wind_blade' | 'ice_spike' | 'shadow_clone' | 'summon_minion' | 'plasma_rifle'
  | 'gravity_well' | 'shrink_ray' | 'reflect_shield' | 'hammer' | 'sniper_rifle'
  | 'shotgun' | 'flamethrower' | 'chainsaw'
  | 'rocket_launcher' | 'heat_seeking_missile' | 'attack_drone' | 'nuke' | 'sentry' | 'portal_gun'
  // 50 NEW WEAPONS (approx)
  | 'necro_staff' | 'lifesteal_dagger' | 'poison_dart_gun' | 'flame_staff' | 'ice_wall'
  | 'gravity_boots' | 'teleport_grenade' | 'orbital_laser' | 'void_cannon' | 'light_saber'
  | 'chain_mace' | 'acid_spitter' | 'thunder_bow' | 'meteor_hammer' | 'soul_reaper'
  | 'healing_aura' | 'vampire_claws' | 'toxic_cloud' | 'fireball_launcher' | 'frost_giant_axe'
  | 'shuriken_storm' | 'boomerang_blade' | 'gravity_hammer' | 'electric_whip' | 'shadow_step'
  | 'blood_spear' | 'venom_strike' | 'inferno_cannon' | 'glacier_crash' | 'nebula_ray'
  | 'pulsar_rifle' | 'dimension_tearing_blade' | 'starlight_wand' | 'chaos_orb' | 'arcane_missile'
  | 'druid_staff' | 'earthquake_hammer' | 'tsunami_scroll' | 'cyclone_ring' | 'phoenix_feather'
  | 'wraith_scythe' | 'lich_king_crown' | 'goblin_bomb' | 'mecha_suit' | 'nanobot_swarm'
  | 'singularity_grenade' | 'warp_drive' | 'mirror_image_potion' | 'disintegration_ray' | 'omega_cannon' | 'gravity_cannon'
  | 'gravity_pulse' | 'shatter_ray' | 'vampire_bat_gun' | 'meteor_rain' | 'void_sabre' 
  | 'quantum_rifle' | 'stardust_wand' | 'nuclear_sniper' | 'tesla_coil' | 'photon_blaster' 
  | 'reaper_darts' | 'emerald_staff' | 'ruby_repeater' | 'sapphire_bow' | 'diamond_launcher' 
  | 'obsidian_mace' | 'phantom_pistol' | 'ghost_grenade' | 'echo_cannon' | 'kinetic_blast' | 'stasis_field'
  | 'holy_grenade' | 'plasma_sword' | 'void_bow' | 'world_slayer' | 'reality_warper';

export interface Weapon {
  id: string;
  type: WeaponType;
  rarity: Rarity;
  ammo: number;
  maxAmmo: number;
  fireRate: number;
  damage: number;
  projectileSpeed: number;
  isMelee?: boolean;
}

export type GodModeColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export interface Player {
  id: number;
  name: string;
  stats: PlayerStats;
  score: number;
  color: string;
  currentWeapon?: Weapon;
  hasForceField?: boolean;
  forceFieldEnd?: number;
  invisibilityEnd?: number;
  speedBoostEnd?: number;
  godModeEnd?: number;
  freezeEnd?: number;
  poisonEnd?: number;
  burnEnd?: number;
  isStuckEnd?: number;
  lastDamageDealer?: number;
  isDead: boolean;
  isGhost: boolean;
  ghostCharge: number; // For Quantum Swap
  godPellets: Record<GodModeColor, number>;
  activeGodMode?: GodModeColor;
  archetypeId?: string;
  controllerId: string;
}
