import Matter from "matter-js";
import { CubeCharacter } from "./CubeCharacter";
import {
  Player,
  Level,
  Weapon,
  WeaponType,
  Rarity,
  GodModeColor,
} from "../types/game";

const { Engine, World, Bodies, Composite, Events, Body, Vector } = Matter;

export class GameEngine {
  private engine: Matter.Engine;
  private players: { figure: CubeCharacter; data: Player; wasGrounded: boolean }[] =
    [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private projectiles: Matter.Body[] = [];
  private weaponDrops: Matter.Body[] = [];
  private godPellets: Matter.Body[] = [];
  private lastPelletTime: number = 0;
  private effects: {
    x: number;
    y: number;
    radius: number;
    life: number;
    maxLife: number;
    color: string;
  }[] = [];
  private trails: {
    points: { x: number; y: number }[];
    color: string;
    alpha: number;
  }[] = [];
  private particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    drag: number;
    gravity: number;
    rotation?: number;
    vRotation?: number;
    type?: "spark" | "smoke" | "petal" | "circle" | "fluid" | "glow";
    vSize?: number;
    alpha?: number;
    additive?: boolean;
    flicker?: boolean;
    noise?: number;
  }[] = [];
  private magnets: {
    id: string;
    body: Matter.Body | { x: number; y: number; isPoint: true };
    ownerId: number;
  }[] = [];
  private snakeSensors: {
    body: Matter.Body;
    target: Matter.Body | null;
    expires: number;
  }[] = [];
  private rarityColors: Record<Rarity, string> = {
    common: "#9ca3af",
    uncommon: "#4ade80",
    rare: "#38bdf8",
    epic: "#a855f7",
    legendary: "#fbbf24",
    mythical: "#ef4444",
  };
  private level: Level;
  private platforms: Matter.Body[] = [];
  private fireflies: Matter.Body[] = [];
  private drones: { body: Matter.Body; ownerId: number; lastFire: number }[] =
    [];
  private sentries: { body: Matter.Body; ownerId: number; lastFire: number }[] =
    [];
  private portals: {
    body: Matter.Body;
    ownerId: number;
    type: "orange" | "blue";
    lastUse: number;
  }[] = [];
  private clones: { body: Matter.Body; ownerId: number; life: number }[] = [];
  private delayedAttacks: { ownerId: number; time: number }[] = [];
  private lastStageHazardTime: number = 0;
  private gravityWells: {
    body: Matter.Body;
    mode: "push" | "pull";
    nextSwitch: number;
    expires?: number;
  }[] = [];
  private entropyTimer: number = 0;
  private slowMoEnd: number = 0;
  private timeScale: number = 1.0;
  private floorModifier: "lava" | "ice" | "glue" | "portals" | "normal" =
    "normal";
  private vines: {
    points: { x: number; y: number }[];
    length: number;
    isBurned?: boolean;
  }[] = [];
  private shrubs: {
    x: number;
    y: number;
    width: number;
    height: number;
    isTech?: boolean;
    isCactus?: boolean;
  }[] = [];
  private lastFireTimes: { [id: number]: number } = {};
  private lastDropTime: number = 0;
  private lastGravityFlip = 0;
  private dropInterval: number = 5000; // 5 seconds
  private roundOver: boolean = false;
  private deathOrder: number[] = [];

  private camera = {
    x: 1750,
    y: 1000,
    zoom: 0.6,
    targetZoom: 0.6,
    targetX: 1750,
    targetY: 1000,
    shake: 0,
    rotation: 0,
    targetRotation: 0,
  };

  private bgLayers: {
    x: number;
    y: number;
    parallax: number;
    size: number;
    color: string;
    type: "star" | "bubble" | "cloud" | "glow";
  }[] = [];
  private lightSources: {
    x: number;
    y: number;
    radius: number;
    color: string;
    intensity: number;
  }[] = [];

  private worldBounds = {
    width: 3500,
    height: 2000,
  };

  public onWin: (winnerId: number, deathOrder: number[]) => void = () => {};
  public onHealthChange: (playerId: number, health: number) => void = () => {};
  public onWeaponChange: (
    playerId: number,
    weapon: Weapon | undefined,
  ) => void = () => {};
  public onForceFieldChange: (playerId: number, active: boolean) => void =
    () => {};
  public onGodModeChange: (
    playerId: number,
    godPellets: any,
    activeGodMode?: GodModeColor,
    godModeEnd?: number,
  ) => void = () => {};
  public onUpdatePlayer: (playerId: number, updates: Partial<Player>) => void =
    () => {};

  constructor(canvas: HTMLCanvasElement, level: Level = "pyramid") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.engine = Engine.create();
    this.level = level;
    this.engine.gravity.y =
      level === "moon" || level === "space" || level === "atlantis" ? 0.4 : 1.1;
    this.entropyTimer = Date.now() + 10000;

    this.setupRoom();
    this.setupCollision();
    this.godPellets = [];
    this.lastPelletTime = Date.now();
  }

  public syncPlayers(players: Player[]) {
    players.forEach((p) => {
      const local = this.players.find((lp) => lp.data.id === p.id);
      if (local) {
        local.data.stats = { ...p.stats };
      }
    });
  }

  private setupRoom() {
    const width = this.worldBounds.width;
    const height = this.worldBounds.height;
    const thickness = 150;

    const colors = {
      platform: "#1a1d23",
      neon: "#00f2fe",
      lava: "#ff4d4d",
    };

    const platforms: Matter.Body[] = [];

    const addPlat = (
      x: number,
      y: number,
      w: number,
      h: number,
      options: any = {},
    ) => {
      const p = Bodies.rectangle(x, y, w, h, {
        isStatic: true,
        render: { fillStyle: colors.platform },
        ...options,
      });
      if (options.moving) {
        (p as any).isMoving = true;
        (p as any).originX = x;
        (p as any).originY = y;
        (p as any).moveRange = options.range || 200;
        (p as any).moveSpeed = options.speed || 2;
        (p as any).moveAxis = options.axis || "x";
      }
      if (options.neon) {
        (p as any).isNeon = true;
        (p as any).neonColor = options.neonColor || colors.neon;
      }
      if (options.hazard) (p as any).isHazard = true;
      if (options.isLaser) {
        (p as any).isLaser = true;
        p.isSensor = true;
      }
      if (options.isGravPad) {
        (p as any).isGravPad = true;
        p.isSensor = true;
      }
      (p as any).platformWidth = w;
      (p as any).platformHeight = h;
      (p as any).hasTopping = options.topping !== false;
      platforms.push(p);
    };

    // Fractured Floor (Base with gaps)
    const platformHeight = 100;
    const floorY = height - platformHeight / 2;
    const sectionWidth = 800;
    const gapWidth = 250;

    for (let x = sectionWidth / 2; x < width; x += sectionWidth + gapWidth) {
      addPlat(x, floorY, sectionWidth, platformHeight, { topping: true });
    }

    if (this.level === "pyramid" || this.level === "desert") {
      const baseWidth = 1800 + Math.random() * 400;
      // Main bottom tier
      addPlat(width / 2, height - 300, baseWidth, 100);
      addPlat(width / 2, height - 600, baseWidth * 0.7, 60);
      addPlat(width / 2, height - 900, baseWidth * 0.4, 60);

      // Dynamic traps: Sand spouts (moving hazards)
      for (let i = 0; i < 3; i++) {
        addPlat(400 + i * 1000, height - 150, 40, 300, {
          moving: true,
          axis: "y",
          range: 100,
          hazard: true,
          topping: false,
        });
      }

      // Moving side platforms
      const sideX = 400 + Math.random() * 200;
      addPlat(sideX, height - 450, 250, 30, {
        moving: true,
        axis: "x",
        range: 300,
        speed: 1.5,
      });
      addPlat(width - sideX, height - 450, 250, 30, {
        moving: true,
        axis: "x",
        range: 300,
        speed: 1.5,
      });

      // Neon structural decor
      addPlat(width / 2, height - 1200, 50, 400, {
        neon: true,
        topping: false,
      });
      const wingX = 300 + Math.random() * 100;
      addPlat(width / 2 - wingX, height - 1100, 200, 20, {
        neon: true,
        neonColor: "#f0f",
      });
      addPlat(width / 2 + wingX, height - 1100, 200, 20, {
        neon: true,
        neonColor: "#f0f",
      });

      // Hazard areas
      addPlat(width / 2, height - 150, 400 + Math.random() * 400, 20, {
        hazard: true,
        topping: false,
      });
    } else if (this.level === "moon" || this.level === "space") {
      // Floating platform clusters
      for (let i = 0; i < 15; i++) {
        const x = 500 + Math.random() * (width - 1000);
        const y = 400 + Math.random() * (height - 800);
        const isMoving = Math.random() > 0.5;
        addPlat(x, y, 200 + Math.random() * 300, 40, {
          moving: isMoving,
          axis: Math.random() > 0.5 ? "x" : "y",
          range: 150 + Math.random() * 200,
          speed: 1 + Math.random(),
        });
      }
      // Grav Pads - Spread across the map
      // Top Left
      addPlat(width * 0.2, height * 0.2 + Math.random() * 200, 100, 20, {
        isGravPad: true,
        neon: true,
        neonColor: "#a855f7",
      });
      // Top Right
      addPlat(width * 0.8, height * 0.2 + Math.random() * 200, 100, 20, {
        isGravPad: true,
        neon: true,
        neonColor: "#a855f7",
      });
      // Bottom Left
      addPlat(width * 0.15, height * 0.7 + Math.random() * 200, 100, 20, {
        isGravPad: true,
        neon: true,
        neonColor: "#a855f7",
      });
      // Bottom Right
      addPlat(width * 0.85, height * 0.7 + Math.random() * 200, 100, 20, {
        isGravPad: true,
        neon: true,
        neonColor: "#a855f7",
      });
      // Upper center
      addPlat(width / 2, 400, 100, 20, {
        isGravPad: true,
        neon: true,
        neonColor: "#a855f7",
      });
      // Central low-g hub
      addPlat(width / 2, height / 2, 600, 80, {
        neon: true,
        neonColor: "#00f2fe",
      });

      // LEVEL BOUNDARIES (Ceiling and Walls) for Moon
      const wallThickness = 100;
      // Ceiling
      addPlat(width / 2, wallThickness / 2, width, wallThickness, {
        topping: false,
      });
      // Side Walls
      addPlat(wallThickness / 2, height / 2, wallThickness, height, {
        topping: false,
      });
      addPlat(width - wallThickness / 2, height / 2, wallThickness, height, {
        topping: false,
      });
    } else if (this.level === "atlantis") {
      // Underwater ruins layout
      for (let i = 0; i < 5; i++) {
        const x = (i + 1) * (width / 6);
        addPlat(x, height - 300, 400, 600, { topping: false }); // Pillars
        addPlat(x, 400 + Math.random() * 300, 300, 40, {
          moving: true,
          range: 100,
        });
      }
      addPlat(width / 2, height - 700, 800, 60, {
        neon: true,
        neonColor: "#0ef",
      });
    } else if (this.level === "arctic") {
      // Staggered ice blocks
      for (let y = 400; y < height - 200; y += 300) {
        for (let x = 400; x < width - 400; x += 800) {
          addPlat(x + (y % 600 === 0 ? 300 : 0), y, 500, 50, { topping: true });
        }
      }
    } else if (this.level === "cave") {
      // Enclosed feel with stalagmites
      for (let i = 0; i < 12; i++) {
        const x = 300 + Math.random() * (width - 600);
        const y = 300 + Math.random() * (height - 600);
        addPlat(x, y, 300 + Math.random() * 200, 60, { topping: true });
      }
      // Ceiling bits
      for (let x = 500; x < width; x += 1000) {
        addPlat(x, 100, 600, 100, { topping: false });
      }
    } else if (this.level === "radioactive" || this.level === "volcano") {
      // Hazardous environments
      for (let i = 0; i < 8; i++) {
        const x = (i + 0.5) * (width / 8);
        const move = true; // Always moving to ensure connectivity
        // Higher platforms with much larger range
        addPlat(x, height - 800 + (Math.random() - 0.5) * 600, 350, 50, {
          moving: move,
          axis: "y",
          range: 400,
          speed: 1 + Math.random(),
          topping: true,
        });
      }
      // Higher "weapons platform" that catches drops
      addPlat(width / 2, 400, 800, 40, {
        neon: true,
        neonColor: "#4ade80",
        topping: true,
      });

      // Hazard floor pools
      addPlat(width / 2, height - 50, width - 200, 40, {
        hazard: true,
        topping: false,
      });
    } else if (this.level === "foundry") {
      const floorY = height - 100;
      addPlat(width / 2, floorY, width, 200);
      // Moving pistons
      for (let i = 0; i < 4; i++) {
        const px = 600 + i * 800;
        const py = height - 500;
        addPlat(px, py, 150, 400, {
          moving: true,
          axis: "y",
          range: 400,
          speed: 5,
          hazard: true,
        });
        this.spawnDebris(px, py - 300, "crate");
      }
      addPlat(width / 2, 500, 1200, 60, { neon: true, neonColor: "#f97316" });
      for (let i = 0; i < 10; i++)
        this.spawnDebris(Math.random() * width, 200, "crate");
    } else if (this.level === "data_center") {
      // Digital blocks that vanish
      for (let i = 0; i < 20; i++) {
        const x = 500 + Math.random() * (width - 1000);
        const y = 200 + Math.random() * (height - 400);
        addPlat(x, y, 160, 30, {
          isVanish: true,
          neon: true,
          neonColor: "#38bdf8",
        });
      }
      for (let i = 0; i < 5; i++)
        this.spawnDebris(Math.random() * width, 100, "lamp");
    } else if (this.level === "greenhouse") {
      // Overgrown with burnable vines
      for (let i = 0; i < 10; i++) {
        const x = 300 + i * 350;
        const y = 400 + Math.random() * 800;
        addPlat(x, y, 300, 40, { topping: true });

        // Vines hanging from platforms
        const vlen = 200 + Math.random() * 400;
        const points = [];
        for (let j = 0; j < 6; j++)
          points.push({
            x: x + (Math.random() - 0.5) * 100,
            y: y + (j / 5) * vlen,
          });
        this.vines.push({ points, length: vlen });
      }
      for (let i = 0; i < 10; i++)
        this.spawnDebris(Math.random() * width, 200, "chair");
    } else if (this.level === "metropolis") {
      // High density neon city
      for (let i = 0; i < 4; i++) {
        const px = 600 + i * 800;
        // Elevators
        addPlat(px, height / 2, 250, 40, {
          moving: true,
          axis: "y",
          range: 600,
          speed: 6,
          neon: true,
          neonColor: "#06b6d4",
        });
      }
      // Skyscrapers
      addPlat(400, height - 400, 300, 800, { topping: true });
      addPlat(width - 400, height - 400, 300, 800, { topping: true });
      addPlat(width / 2, 300, 800, 40, { neon: true, neonColor: "#f0f" });
    } else if (this.level === "laboratory") {
      // Toxic vats and pipes
      addPlat(width / 2, height - 50, width - 400, 100, {
        hazard: true,
        topping: false,
      });
      for (let i = 0; i < 8; i++) {
        const x = 500 + i * 400;
        const y = 400 + (i % 2 === 0 ? 200 : 600);
        addPlat(x, y, 250, 30, {
          isVanish: true,
          neon: true,
          neonColor: "#4ade80",
        });
        // Hanging pipes
        this.vines.push({
          points: [
            { x: x, y: y },
            { x: x, y: y + 150 },
          ],
          length: 150,
          isPipe: true,
        } as any);
      }
      addPlat(width / 2, 400, 600, 40, { topping: true });
    } else if (this.level === "inferno") {
      // Lava everywhere
      addPlat(width / 2, height - 50, width, 100, {
        hazard: true,
        topping: false,
      });
      for (let i = 0; i < 10; i++) {
        const x = 400 + Math.random() * (width - 800);
        const y = 300 + Math.random() * (height - 600);
        addPlat(x, y, 200 + Math.random() * 200, 40, { isMagma: true });
      }
      // Fire beams
      for (let i = 0; i < 3; i++) {
        addPlat(800 + i * 900, 500, 40, 400, {
          moving: true,
          axis: "y",
          range: 200,
          hazard: true,
          topping: false,
        });
      }
    } else if (this.level === "sky_castle") {
      // Floating islands
      this.engine.gravity.y = 0.5;
      for (let i = 0; i < 12; i++) {
        const x = 400 + Math.random() * (width - 800);
        const y = 200 + Math.random() * (height - 400);
        addPlat(x, y, 300 + Math.random() * 200, 50, {
          moving: Math.random() > 0.5,
          axis: "x",
          range: 200,
          topping: true,
        });
      }
      // Central keep
      addPlat(width / 2, height / 2, 800, 100, { topping: true });
    } else if (this.level === "crystal_crevasse") {
      this.engine.gravity.y = 0.6;
      for (let i = 0; i < 15; i++) {
        const x = 500 + Math.random() * (width - 1000);
        const y = 200 + Math.random() * (height - 400);
        addPlat(x, y, 200, 40, {
          neon: true,
          neonColor: "#a855f7",
          isRock: true,
        });
      }
    } else if (this.level === "steampunk_factory") {
      for (let i = 0; i < 6; i++) {
        const px = 400 + i * 600;
        addPlat(px, height / 2, 300, 40, {
          moving: true,
          axis: "y",
          range: 400,
          speed: 4,
          fillStyle: "#422006",
        });
        this.vines.push({
          points: [
            { x: px, y: 0 },
            { x: px, y: 200 },
          ],
          length: 200,
          isPipe: true,
        } as any);
      }
    } else if (this.level === "neon_cyber_city") {
      for (let i = 0; i < 10; i++) {
        const x = 400 + Math.random() * (width - 800);
        addPlat(x, 200 + i * 150, 400, 30, {
          isBouncy: true,
          neon: true,
          neonColor: "#f472b6",
        });
      }
    } else if (this.level === "ancient_temple") {
      for (let i = 0; i < 12; i++) {
        const x = 300 + Math.random() * (width - 600);
        const y = 200 + Math.random() * (height - 400);
        addPlat(x, y, 350, 60, { hasTopping: true });
        if (Math.random() > 0.5) {
          const vx = x + (Math.random() - 0.5) * 200;
          this.vines.push({
            points: [
              { x: vx, y: y },
              { x: vx, y: y + 300 },
            ],
            length: 300,
          } as any);
        }
      }
    } else if (this.level === "shroom_kingdom") {
      for (let i = 0; i < 10; i++) {
        const x = 400 + i * 400;
        const y = 600 + (i % 2) * 200;
        addPlat(x, y, 200, 60, { isBouncy: true, fillStyle: "#e11d48" });
      }
    } else if (this.level === "haunted_mansion") {
      // Spooky hallways and vanishing floors
      for (let i = 0; i < 15; i++) {
        const x = 400 + Math.random() * (width - 800);
        const y = 200 + i * 150;
        addPlat(x, y, 300, 40, { isVanish: true, fillStyle: "#1e293b" });
      }
      // Floating candles
      for (let i = 0; i < 20; i++) {
        this.createParticles(
          Math.random() * width,
          Math.random() * height,
          "#fde047",
          1,
          0.2,
        );
      }
    } else if (this.level === "underwater_base") {
      this.engine.gravity.y = 0.2;
      addPlat(width / 2, height - 100, width, 200, { fillStyle: "#0f172a" });
      for (let i = 0; i < 8; i++) {
        addPlat(400 + i * 500, height / 2, 400, 40, {
          moving: true,
          axis: "x",
          range: 300,
        });
      }
    } else if (this.level === "volcano_fortress") {
      addPlat(width / 2, height - 50, width, 100, { hazard: true });
      addPlat(200, height / 2, 40, 800, { topping: true });
      addPlat(width - 200, height / 2, 40, 800, { topping: true });
      for (let i = 0; i < 6; i++) {
        addPlat(width / 2, 200 + i * 200, 800, 40, { isMagma: true });
      }
    } else if (this.level === "cloud_city") {
      this.engine.gravity.y = 0.4;
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        addPlat(x, y, 200 + Math.random() * 200, 40, {
          moving: true,
          axis: "x",
          range: 400,
          speed: 2,
          fillStyle: "#f0f9ff",
        });
      }
    } else if (this.level === "toxic_sewer") {
      addPlat(width / 2, height - 50, width, 150, {
        hazard: true,
        fillStyle: "#14532d",
      });
      for (let i = 0; i < 12; i++) {
        const x = 400 + i * 300;
        const y = 300 + (i % 3) * 200;
        addPlat(x, y, 200, 40, {
          isVanish: true,
          neon: true,
          neonColor: "#4ade80",
        });
        this.vines.push({
          points: [
            { x, y: 0 },
            { x, y: 400 },
          ],
          length: 400,
          isPipe: true,
        } as any);
      }
    } else if (this.level === "frozen_wasteland") {
      for (let i = 0; i < 10; i++) {
        const x = 500 + i * 400;
        addPlat(x, height - 200 - (i % 2) * 100, 400, 60, {
          isIce: true,
          fillStyle: "#bae6fd",
        });
      }
      // Blizzard effect
      this.createParticles(width / 2, height / 2, "#ffffff", 100, 1);
    } else if (this.level === "cyber_void") {
      this.engine.gravity.y = 0; // Pure flight/jetpack map?
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        addPlat(x, y, 100, 100, {
          neon: true,
          neonColor: "#f472b6",
          isVanish: true,
        });
      }
    } else {
      // Jungle
      const centers = [width * 0.2, width * 0.5, width * 0.8];
      centers.forEach((cx) => {
        // Main trunks
        addPlat(cx, height / 2 + 200, 100, height - 400, { topping: false });
        // Branches - Static staggered platforms
        for (let py = 500; py < height - 300; py += 400) {
          addPlat(cx - 300, py, 400, 40, { topping: true });
          addPlat(cx + 300, py + 200, 400, 40, { topping: true });
        }
      });
    }

    // Add particles (Space: Stars, Desert: Dust, Jungle: Fireflies, Atlantis: Bubbles, Arctic: Snow, Volcano: Embers)
    const isSpace = this.level === "space" || this.level === "moon";
    const isDesert = this.level === "desert" || this.level === "pyramid";
    const isJungle =
      this.level === "jungle" ||
      this.level === "cave" ||
      this.level === "radioactive";
    const isAtlantis = this.level === "atlantis";
    const isArctic = this.level === "arctic";
    const isVolcano = this.level === "volcano";

    const particleCount = isSpace ? 60 : isAtlantis ? 40 : 30;
    for (let i = 0; i < particleCount; i++) {
      const size = isSpace ? 2 : isAtlantis ? 5 : 4;
      const ff = Bodies.circle(
        Math.random() * width,
        Math.random() * height,
        size,
        {
          isSensor: true,
          isStatic: true,
          label: "particle",
        },
      );
      const speedMult = isArctic ? 0.5 : isVolcano ? 2 : 1.5;
      (ff as any).wanderVel = {
        x: (Math.random() - 0.5) * speedMult,
        y: isAtlantis
          ? -Math.random() * 2
          : isArctic
            ? Math.random() * 2
            : (Math.random() - 0.5) * speedMult,
      };
      this.fireflies.push(ff);
      World.add(this.engine.world, ff);
    }

    // Parallax Background Layers
    this.bgLayers = [];
    for (let i = 0; i < 100; i++) {
      const parallax = 0.1 + Math.random() * 0.4;
      const size = 1 + Math.random() * 5 * (1 - parallax);
      let color = "#fff";
      let type: "star" | "bubble" | "cloud" | "glow" = "star";

      if (isAtlantis) {
        type = "bubble";
        color = `rgba(165, 243, 252, ${0.1 + Math.random() * 0.3})`;
      } else if (isVolcano) {
        type = "glow";
        color = `rgba(249, 115, 22, ${0.1 + Math.random() * 0.2})`;
      } else if (isArctic) {
        type = "cloud";
        color = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.1})`;
      } else {
        color = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.5})`;
      }

      this.bgLayers.push({
        x: Math.random() * width * 2,
        y: Math.random() * height * 2,
        parallax,
        size,
        color,
        type,
      });
    }

    // Decor and Traps - Modularly placed on staggered floating platforms
    const decorHazards: Matter.Body[] = [];
    platforms.forEach((p) => {
      // Broaden range for decor: more platforms get stuff
      const isFloatingBranch =
        p.isStatic &&
        !(p as any).isNeon &&
        (p as any).hasTopping &&
        p.position.y > 300 &&
        p.position.y < height - 100;

      if (isFloatingBranch) {
        const b = p.bounds;
        const pWidth = b.max.x - b.min.x;

        if (isJungle) {
          // Jungle: Shrubs, Vines, Spikes
          if (Math.random() > 0.25 && pWidth > 120) {
            this.shrubs.push({
              x: p.position.x + (Math.random() - 0.5) * (pWidth - 80),
              y: b.min.y - 20,
              width: 80 + Math.random() * 80,
              height: 40,
            });
          }
          if (Math.random() > 0.35 && pWidth > 80) {
            const vx = p.position.x + (Math.random() - 0.5) * (pWidth - 20);
            const vlen = 100 + Math.random() * 250;
            const points = [];
            for (let j = 0; j < 5; j++)
              points.push({ x: vx, y: b.max.y + (j / 5) * vlen });
            this.vines.push({ points, length: vlen });
          }
          if (Math.random() > 0.5) {
            const sx = p.position.x + (Math.random() - 0.5) * (pWidth - 40);
            const spike = Bodies.rectangle(sx, b.min.y - 5, 30, 10, {
              isStatic: true,
              isSensor: true,
            });
            (spike as any).isHazard = true;
            decorHazards.push(spike);
          }
        } else if (isSpace) {
          // Space: Tech bits, Moon rocks
          if (Math.random() > 0.35 && pWidth > 80) {
            this.shrubs.push({
              // Using shrubs as "Tech bits/Panels"
              x: p.position.x + (Math.random() - 0.5) * (pWidth - 60),
              y: b.min.y - 15,
              width: 40 + Math.random() * 40,
              height: 30,
              isTech: true,
            });
          }
          if (Math.random() > 0.6) {
            const sx = p.position.x + (Math.random() - 0.5) * (pWidth - 30);
            const rock = Bodies.rectangle(sx, b.min.y - 8, 24, 16, {
              isStatic: true,
              isSensor: true,
            });
            (rock as any).isRock = true;
            decorHazards.push(rock);
          }
        } else if (isDesert) {
          // Desert: Cacti, Sand mounds
          if (Math.random() > 0.35 && pWidth > 80) {
            this.shrubs.push({
              // Using shrubs as Cacti
              x: p.position.x + (Math.random() - 0.5) * (pWidth - 40),
              y: b.min.y - 30,
              width: 25 + Math.random() * 25,
              height: 50 + Math.random() * 30,
              isCactus: true,
            });
          }
          if (Math.random() > 0.5) {
            const sx = p.position.x + (Math.random() - 0.5) * (pWidth - 40);
            const sand = Bodies.rectangle(sx, b.min.y - 8, 45, 16, {
              isStatic: true,
              isSensor: true,
            });
            (sand as any).isSandMound = true;
            decorHazards.push(sand);
          }
        } else if (isAtlantis) {
          // Atlantis: Coral, Seaweed
          if (Math.random() > 0.3) {
            const vx = p.position.x + (Math.random() - 0.5) * (pWidth - 20);
            const vlen = 50 + Math.random() * 150;
            const points = [];
            for (let j = 0; j < 5; j++)
              points.push({ x: vx, y: b.min.y - (j / 5) * vlen });
            this.vines.push({ points, length: vlen, isSeaweed: true } as any);
          }
          if (Math.random() > 0.4) {
            this.shrubs.push({
              x: p.position.x + (Math.random() - 0.5) * (pWidth - 40),
              y: b.min.y - 20,
              width: 30 + Math.random() * 30,
              height: 30 + Math.random() * 20,
              isCoral: true,
            } as any);
          }
        } else if (this.level === "cave") {
          // Cave: Stalactites, Gems
          if (Math.random() > 0.4) {
            const gemX = p.position.x + (Math.random() - 0.5) * pWidth;
            this.shrubs.push({
              x: gemX,
              y: b.min.y - 15,
              width: 20,
              height: 30,
              isGem: true,
            } as any);
          }
          const vx = p.position.x + (Math.random() - 0.5) * (pWidth - 20);
          const points = [
            { x: vx, y: b.max.y },
            { x: vx, y: b.max.y + 40 + Math.random() * 60 },
          ];
          this.vines.push({ points, length: 50, isStalactite: true } as any);
        } else if (this.level === "radioactive") {
          // Radioactive: Barrels, Pipes
          if (Math.random() > 0.5) {
            this.shrubs.push({
              x: p.position.x + (Math.random() - 0.5) * (pWidth - 40),
              y: b.min.y - 25,
              width: 40,
              height: 50,
              isBarrel: true,
            } as any);
          }
          const vx = p.position.x + (Math.random() - 0.5) * (pWidth - 20);
          this.vines.push({
            points: [
              { x: vx, y: b.max.y },
              { x: vx, y: b.max.y + 100 },
            ],
            length: 100,
            isPipe: true,
          } as any);
        } else if (isVolcano) {
          // Volcano: Magma Rocks, Lava
          if (Math.random() > 0.6) {
            const sx = p.position.x + (Math.random() - 0.5) * (pWidth - 50);
            const rock = Bodies.rectangle(sx, b.min.y - 15, 60, 30, {
              isStatic: true,
              isSensor: true,
            });
            (rock as any).isMagma = true;
            decorHazards.push(rock);
          }
        }
      }
    });
    platforms.push(...decorHazards);

    if (isJungle) {
      // Canopy neon lights - No decor here
      addPlat(width / 2, 300, width - 1000, 20, {
        neon: true,
        neonColor: "#2d6a4f",
        topping: false,
      });
    }

    const anyHasDebris = this.players.some((p) => p.data.stats.extraDebris);
    if (anyHasDebris) {
      for (let i = 0; i < 20; i++) {
        const types: ("crate" | "chair" | "lamp")[] = [
          "crate",
          "chair",
          "lamp",
        ];
        this.spawnDebris(
          Math.random() * width,
          200,
          types[Math.floor(Math.random() * 3)],
        );
      }
    }

    this.platforms = platforms;
    World.add(this.engine.world, platforms);
  }

  public resetLevel(level?: Level) {
    if (level) this.level = level;
    this.roundOver = false;
    this.deathOrder = [];

    // Clear old platforms
    World.remove(this.engine.world, this.platforms);
    this.platforms = [];

    // Re-setup
    this.fireflies.forEach((ff) => World.remove(this.engine.world, ff));
    this.fireflies = [];
    this.vines = [];
    this.shrubs = [];
    this.setupRoom();
    this.engine.gravity.y =
      this.level === "moon" ||
      this.level === "space" ||
      this.level === "atlantis"
        ? 0.4
        : 1.1;

    // Reset player positions to top
    this.players.forEach((p) => {
      const x = 500 + Math.random() * (this.worldBounds.width - 1000);
      Body.setPosition(p.figure.torso, { x, y: 300 });
      Body.setVelocity(p.figure.torso, { x: 0, y: 0 });
    });

    // Clear projectiles and drops
    this.projectiles.forEach((p) => World.remove(this.engine.world, p));
    this.projectiles = [];
    this.weaponDrops.forEach((w) => World.remove(this.engine.world, w));
    this.weaponDrops = [];
    this.godPellets.forEach((p) => World.remove(this.engine.world, p));
    this.godPellets = [];
    this.drones.forEach((d) => World.remove(this.engine.world, d.body));
    this.drones = [];
    this.sentries.forEach((s) => World.remove(this.engine.world, s.body));
    this.sentries = [];
    this.clones.forEach((c) => World.remove(this.engine.world, c.body));
    this.clones = [];
    this.portals.forEach((p) => World.remove(this.engine.world, p.body));
    this.portals = [];
    this.gravityWells.forEach((w) => World.remove(this.engine.world, w.body));
    this.gravityWells = [];
    this.magnets = [];
    this.effects = [];
    this.particles = [];
  }

  private createParticles(
    x: number,
    y: number,
    color: string,
    count: number = 10,
    speedMult: number = 1,
    options: {
      drag?: number;
      gravity?: number;
      size?: number;
      vSize?: number;
      life?: number;
      type?: "spark" | "smoke" | "petal" | "circle" | "fluid" | "glow";
      spread?: number;
      additive?: boolean;
      flicker?: boolean;
      vx?: number;
      vy?: number;
      noise?: number;
    } = {},
  ) {
    for (let i = 0; i < count; i++) {
      const spread = options.spread !== undefined ? options.spread : Math.PI * 2;
      const angle =
        Math.random() * spread -
        spread / 2 +
        (options.spread !== undefined ? -Math.PI / 2 : 0);
      const speed = (Math.random() * 5 + 2) * speedMult;
      const life = options.life || 1.0;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (options.vx || 0) + Math.cos(angle) * speed,
        vy: (options.vy || 0) + Math.sin(angle) * speed,
        maxLife: life,
        life,
        color,
        size: options.size || Math.random() * 3 + 2,
        vSize: options.vSize || 0,
        drag: options.drag !== undefined ? options.drag : 0.98,
        gravity: options.gravity !== undefined ? options.gravity : 0.1,
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.2,
        type: options.type || "circle",
        additive: options.additive !== undefined ? options.additive : false,
        flicker: options.flicker || false,
        noise: options.noise || 0,
      });
    }
  }

  private handleDamage(
    hitPlayer: { figure: CubeCharacter; data: Player },
    damage: number,
    ownerId: number,
  ) {
    if (
      hitPlayer.data.hasForceField ||
      hitPlayer.data.isGhost ||
      this.roundOver
    )
      return; // Immune OR already over!

    const now = Date.now();
    const stats = hitPlayer.data.stats;

    // Dodge check
    if (Math.random() < stats.dodgeChance) {
      this.createParticles(
        hitPlayer.figure.torso.position.x,
        hitPlayer.figure.torso.position.y,
        "#fff",
        5,
        2,
      );
      return;
    }

    // Armor reduction
    const actualDamage = Math.max(1, damage - stats.armor);
    stats.health -= actualDamage;
    hitPlayer.data.lastDamageDealer = ownerId;

    // Thorns
    if (ownerId !== -1 && stats.thorns > 0) {
      const attacker = this.players.find((p) => p.data.id === ownerId);
      if (attacker) {
        attacker.data.stats.health -= stats.thorns;
        this.onHealthChange(attacker.data.id, attacker.data.stats.health);
      }
    }

    // Lifesteal
    if (ownerId !== -1) {
      const attacker = this.players.find((p) => p.data.id === ownerId);
      if (attacker && attacker.data.stats.lifesteal > 0) {
        const steal = actualDamage * attacker.data.stats.lifesteal;
        attacker.data.stats.health = Math.min(
          attacker.data.stats.maxHealth,
          attacker.data.stats.health + steal,
        );
        this.onHealthChange(attacker.data.id, attacker.data.stats.health);
      }
    }

    // Kinetic Battery
    if (stats.kineticBattery) {
      stats.storedKineticEnergy += damage * 0.5;
      // Reduce knockback to simulate absorption
      // Knockback is handled by physics engine on collision, but we can store the "value" here
    }

        // Status Application
        if (ownerId !== -1) {
          const attacker = this.players.find((p) => p.data.id === ownerId);
          if (attacker) {
            if (Math.random() < attacker.data.stats.poisonChance) {
              const end = now + 5000;
              hitPlayer.data.poisonEnd = end;
              this.onUpdatePlayer(hitPlayer.data.id, { poisonEnd: end });
            }
            if (Math.random() < attacker.data.stats.burnChance) {
              const end = now + 3000;
              hitPlayer.data.burnEnd = end;
              this.onUpdatePlayer(hitPlayer.data.id, { burnEnd: end });
            }

            // Weapon Specific Status Application
            const wType = attacker.data.currentWeapon?.type;
            if (wType === "poison_dart_gun" || wType === "toxic_cloud") {
              const end = now + 6000;
              hitPlayer.data.poisonEnd = end;
              this.onUpdatePlayer(hitPlayer.data.id, { poisonEnd: end });
            }
            if (wType === "flamethrower" || wType === "inferno_cannon") {
              const end = now + 4000;
              hitPlayer.data.burnEnd = end;
              this.onUpdatePlayer(hitPlayer.data.id, { burnEnd: end });
            }
            if (wType === "electric_whip") {
              if (Math.random() > 0.6) {
                const end = now + 1500;
                hitPlayer.data.stunEnd = end;
                this.onUpdatePlayer(hitPlayer.data.id, { stunEnd: end });
              }
            }

            // Sticky Friction
            if (attacker.data.stats.wallWalk) {
              const end = now + 2000;
              hitPlayer.data.isStuckEnd = end;
              this.onUpdatePlayer(hitPlayer.data.id, { isStuckEnd: end });
            }
          }
        }

      this.createParticles(
        hitPlayer.figure.torso.position.x,
        hitPlayer.figure.torso.position.y,
        hitPlayer.data.color || "#f00",
        25,
        2.5,
        {
          type: "fluid",
          size: 6,
          gravity: 0.4,
          drag: 0.95,
          additive: true,
          vSize: -0.1
        },
      );
      this.createParticles(
        hitPlayer.figure.torso.position.x,
        hitPlayer.figure.torso.position.y,
        "rgba(255, 100, 100, 0.5)",
        15,
        1,
        {
          type: "glow",
          size: 30,
          gravity: 0.05,
          additive: true,
          life: 1.0,
        },
      );
    this.camera.shake = Math.max(this.camera.shake, 12);
    this.onHealthChange(hitPlayer.data.id, hitPlayer.data.stats.health);

    if (hitPlayer.data.stats.health <= 0) {
      hitPlayer.data.isDead = true;
      if (!this.deathOrder.includes(hitPlayer.data.id)) {
        this.deathOrder.push(hitPlayer.data.id);
      }

      // Ghost Transition if player has card
      const livingPlayers = this.players.filter(
        (p) => !p.data.isGhost && p.data.stats.health > 0,
      );
      const livingCount = livingPlayers.length;
      let willBeGhost = false;

      if (hitPlayer.data.stats.quantumSwap && livingCount > 0) {
        hitPlayer.data.isGhost = true;
        hitPlayer.data.ghostCharge = 1;
        hitPlayer.figure.isVisible = true; // KEEP VISIBLE FOR GHOSTS
        Body.setInertia(hitPlayer.figure.torso, Infinity);
        hitPlayer.figure.torso.isSensor = true;
        willBeGhost = true;
      }

      // Hide player and remove physics if in 3+ player mode and NOT a ghost
      if (this.players.length >= 3 && !willBeGhost) {
        hitPlayer.figure.isVisible = false;
        Body.setInertia(hitPlayer.figure.torso, Infinity);
        hitPlayer.figure.torso.isSensor = true;
        // Move it far away just in case
        Body.setPosition(hitPlayer.figure.torso, { x: -20000, y: -20000 });
      }

      // Necro Chance - Summon Clones
      if (ownerId !== -1) {
        const attacker = this.players.find((p) => p.data.id === ownerId);
        if (attacker && Math.random() < attacker.data.stats.necroChance) {
          this.spawnClone(
            hitPlayer.figure.torso.position.x,
            hitPlayer.figure.torso.position.y,
            ownerId,
          );
        }
      }

      // Death drop!
      this.spawnWeaponDrop(undefined, "epic", hitPlayer.figure.torso.position);
      this.camera.shake = 30;

      // Count living players (exclude dead players who aren't ghosts)
      const living = this.players.filter(
        (p) => !p.data.isGhost && p.data.stats.health > 0,
      );
      if (living.length <= 1) {
        this.roundOver = true;
        const winner = living.length === 1 ? living[0].data.id : ownerId;
        this.onWin(winner, this.deathOrder);
      }
    }
  }

  private updateStatusEffects() {
    const now = Date.now();
    this.players.forEach((p) => {
      if (p.data.isDead || p.data.isGhost) return;
      const stats = p.data.stats;

      // 1. Poison (Green Bubbles/Sickly Glow)
      if (p.data.poisonEnd && now < p.data.poisonEnd) {
        p.data.stats.health -= 0.15;
        if (Math.random() > 0.85) {
          const bubbleX =
            p.figure.torso.position.x + (Math.random() - 0.5) * 40;
          const bubbleY = p.figure.torso.position.y - 20;
          this.createParticles(bubbleX, bubbleY, "#4d7c0f", 1, 0.5, {
            type: "smoke",
            size: 15,
            gravity: -0.05,
            drag: 0.98,
            life: 0.8,
          });
        }
      }

      // 2. Burn (Intense Fire Sparks)
      if (p.data.burnEnd && now < p.data.burnEnd) {
        p.data.stats.health -= 0.4;
        if (Math.random() > 0.7) {
          const sparkX = p.figure.torso.position.x + (Math.random() - 0.5) * 50;
          const sparkY = p.figure.torso.position.y + (Math.random() - 0.5) * 50;
          this.createParticles(sparkX, sparkY, "#ea580c", 2, 2, {
            type: "spark",
            size: 3,
            gravity: 0.1,
            drag: 0.95,
          });
          if (Math.random() > 0.8) {
            this.createParticles(sparkX, sparkY, "#f97316", 1, 0.5, {
              type: "smoke",
              size: 20,
              gravity: -0.1,
              life: 1.5,
            });
          }
        }
      }

      // 3. Passive Regeneration
      if (stats.maxHealth > 100 && now % 1500 < 50) {
        p.data.stats.health = Math.min(stats.maxHealth, stats.health + 1.5);
        if (Math.random() > 0.9)
          this.createParticles(
            p.figure.torso.position.x,
            p.figure.torso.position.y,
            "#4ade80",
            1,
            0.1,
          );
      }

      // 4. Status Regeneration (Regen Effect)
      if (p.data.regenEnd && now < p.data.regenEnd) {
        p.data.stats.health = Math.min(stats.maxHealth, stats.health + 0.35);
        if (Math.random() > 0.85) {
          const rx = p.figure.torso.position.x + (Math.random() - 0.5) * 40;
          const ry = p.figure.torso.position.y + 20;
          this.createParticles(rx, ry, "#22c55e", 1, 1, {
            type: "smoke",
            size: 25,
            gravity: -0.1,
            life: 1.2,
          });
        }
      }

      // 5. Healing Aura (Weapon/Card specific)
      if (p.data.currentWeapon?.type === "healing_aura") {
        this.players.forEach((other) => {
          if (other.data.isDead || other.data.isGhost) return;
          const dist = Vector.magnitude(
            Vector.sub(p.figure.torso.position, other.figure.torso.position),
          );
          if (dist < 300) {
            other.data.stats.health = Math.min(
              other.data.stats.maxHealth,
              other.data.stats.health + 0.2,
            );
            if (now % 600 < 50) {
              this.createParticles(
                other.figure.torso.position.x,
                other.figure.torso.position.y,
                "#4ade80",
                2,
                0.3,
              );
            }
          }
        });
      }

      // Freeze Effect Logic (Visual only here, logic is in update)
      if (p.data.freezeEnd && now < p.data.freezeEnd) {
        if (Math.random() > 0.9)
          this.createParticles(
            p.figure.torso.position.x,
            p.figure.torso.position.y,
            "#e0f2fe",
            1,
            0.2,
          );
      }

      // Health boundary check
      if (p.data.stats.health <= 0 && !p.data.isDead) {
        this.handleDamage(p, 0, -1);
      }
    });

    if (now % 250 < 40) {
      this.players.forEach((p) =>
        this.onHealthChange(p.data.id, p.data.stats.health),
      );
    }
  }

  private explode(
    x: number,
    y: number,
    radius: number,
    damage: number,
    ownerId: number,
  ) {
    // Vivid Visual Flash
    this.effects.push({
      x,
      y,
      radius: radius * 1.5,
      life: 20,
      maxLife: 20,
      color: "rgba(255, 255, 255, 0.8)",
    });

    // Intense multi-layered explosion
    const explosionColor = "#f59e0b";
    
    // 1. Fluid Cores (High density, bright, additive)
    this.createParticles(x, y, explosionColor, 20, 3, {
      drag: 0.94,
      gravity: 0.1,
      type: "fluid", // Custom fluid type for render
      size: 15,
      vSize: -0.2, // Shrinks
      additive: true,
      life: 1.2
    });

    // 2. Bright Shockwave Sparks
    this.createParticles(x, y, "#fff", 15, 6, {
      drag: 0.9,
      gravity: 0.3,
      type: "spark",
      size: 5,
      additive: true,
      life: 0.5
    });

    // 3. Trailing Embers
    this.createParticles(x, y, "#ea580c", 25, 4, {
      drag: 0.96,
      gravity: 0.05,
      type: "glow",
      size: 6,
      additive: true,
      life: 1.5
    });

    // 4. Large Soft Smoke Clouds
    this.createParticles(x, y, "rgba(50, 50, 50, 0.15)", 8, 0.8, {
      drag: 0.98,
      gravity: -0.05,
      type: "smoke",
      size: 15,
      vSize: 0.3, // Slower growth
      life: 2.0
    });

    // Shockwave Rings
    for (let i = 0; i < 4; i++) {
      this.effects.push({
        x,
        y,
        radius: radius * (0.8 + i * 0.4),
        life: 10 + i * 8,
        maxLife: 10 + i * 8,
        color: i % 2 === 0 ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 165, 0, 0.2)",
      });
    }

    const shakeAmount = (radius / 100) * 45;
    this.camera.shake = Math.max(this.camera.shake, shakeAmount);

    this.players.forEach((p) => {
      const dist = Vector.magnitude(
        Vector.sub(p.figure.torso.position, { x, y }),
      );
      if (dist < radius) {
        const ratio = 1 - dist / radius;
        this.handleDamage(p, damage * ratio, ownerId);
        const stabilityMult = 1 / ((p.data.stats.stability || 100) / 100);
        const forceDir = Vector.normalise(
          Vector.sub(p.figure.torso.position, { x, y }),
        );
        Body.applyForce(
          p.figure.torso,
          p.figure.torso.position,
          Vector.mult(forceDir, 0.8 * ratio * stabilityMult),
        );
      }
    });
  }

  private setupCollision() {
    Events.on(this.engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const projectile = this.projectiles.find(
          (p) => p === bodyA || p === bodyB,
        );

        const player = this.players.find(
          (p) => p.figure.torso === bodyA || p.figure.torso === bodyB,
        );
        const weaponDrop = this.weaponDrops.find(
          (w) => w === bodyA || w === bodyB,
        );
        const godPellet = this.godPellets.find(
          (w) => w === bodyA || w === bodyB,
        );

        if (godPellet && player) {
          this.pickupGodPellet(player, godPellet);
        }

        const staticObj = bodyA.isStatic
          ? bodyA
          : bodyB.isStatic
            ? bodyB
            : null;
        if (staticObj && player) {
          if ((staticObj as any).isLaser) {
            this.handleDamage(
              { figure: player.figure, data: player.data },
              5,
              -1,
            );
          }
          if (
            (staticObj as any).isGravPad &&
            Date.now() - this.lastGravityFlip > 1000
          ) {
            this.engine.gravity.y *= -1;
            this.lastGravityFlip = Date.now();
            this.createParticles(
              player.figure.torso.position.x,
              player.figure.torso.position.y,
              "#a855f7",
              15,
              1,
            );
          }
        }

        if (weaponDrop && player) {
          this.pickupWeapon(player, weaponDrop);
        }

        if (player) {
          const other = player.figure.torso === bodyA ? bodyB : bodyA;
          const otherPlayer = this.players.find(
            (p) => p.figure.torso === other,
          );

          // Player to Player Contact
          if (otherPlayer) {
            // Contact damage removed as per user request
          }

          if ((other as any).isPortal) {
            this.usePortal(player, other);
          }
          if (other.isStatic) {
            const side =
              player.figure.torso.position.x < other.position.x ? 1 : -1;
            player.figure.setOnWall(side);

            // Vanishing Blocks (Data Center)
            if ((other as any).isVanish) {
              (other as any).expires = Date.now() + 2000;
              (other as any).isFading = true;
            }

            if ((other as any).isHazard) {
              this.handleDamage(player, 20, -1);
            }
          }
        }

        if (projectile) {
          const pData = projectile as any;
          const other = projectile === bodyA ? bodyB : bodyA;

          // Bullet Time Parry: Projectile hit Projectile
          if (this.projectiles.includes(other)) {
            const anyHasBulletTime = this.players.some(
              (p) => p.data.stats.bulletTimeParry,
            );
            if (anyHasBulletTime) {
              this.slowMoEnd = Date.now() + 1500;
              this.camera.shake = 10;
              this.createParticles(
                projectile.position.x,
                projectile.position.y,
                "#fff",
                15,
                2,
              );
              this.removeProjectile(projectile);
              this.removeProjectile(other);
              return;
            }
          }

          const hitPlayer = this.players.find((p) => p.figure.torso === other);

          if (pData.label === "sword_hitbox") {
            if (
              hitPlayer &&
              hitPlayer.data.id !== (projectile as any).ownerId
            ) {
              this.handleDamage(
                hitPlayer,
                (projectile as any).damage,
                (projectile as any).ownerId,
              );
            }
            return;
          }

          if (hitPlayer) {
            const damage = pData.damage || 10;
            const ownerId = pData.ownerId;
            if (hitPlayer.data.id !== ownerId) {
              if (pData.isHighKnockback) {
                const forceDir = Vector.normalise(
                  Vector.sub(
                    hitPlayer.figure.torso.position,
                    projectile.position,
                  ),
                );
                Body.applyForce(
                  hitPlayer.figure.torso,
                  hitPlayer.figure.torso.position,
                  Vector.mult(forceDir, 0.8),
                );
                this.camera.shake = 15;
              }
              if (pData.isStasis) {
                hitPlayer.data.freezeEnd = Date.now() + 1500;
                this.camera.shake = 8;
              }
              if (pData.isEcho) {
                pData.lastEcho = Date.now();
                pData.echoed = false;
              }
              if (pData.lifesteal) {
                const attacker = this.players.find(
                  (pl) => pl.data.id === ownerId,
                );
                if (attacker) {
                  attacker.data.stats.health = Math.min(
                    attacker.data.stats.maxHealth,
                    attacker.data.stats.health + pData.damage * pData.lifesteal,
                  );
                  this.onHealthChange(
                    attacker.data.id,
                    attacker.data.stats.health,
                  );
                }
              }

              if (pData.isExplosive) {
                const radius = 150 * (pData.radiusMult || 1);
                const damage = 60 * (pData.radiusMult || 1);
                this.explode(
                  projectile.position.x,
                  projectile.position.y,
                  radius,
                  damage,
                  ownerId,
                );
              } else if (pData.isPortalShot) {
                this.createPortal(
                  projectile.position.x,
                  projectile.position.y,
                  ownerId,
                );
              } else if (pData.isDroneSpawn) {
                this.spawnDrone(
                  projectile.position.x,
                  projectile.position.y,
                  ownerId,
                );
              } else if (pData.isCloneSpawn) {
                this.spawnClone(
                  projectile.position.x,
                  projectile.position.y,
                  ownerId,
                );
              } else if (pData.isSentrySpawn) {
                this.spawnSentry(
                  projectile.position.x,
                  projectile.position.y,
                  ownerId,
                );
              } else if (pData.isTeleport) {
                const owner = this.players.find((pl) => pl.data.id === ownerId);
                if (owner) {
                  const tempPos = {
                    x: hitPlayer.figure.torso.position.x,
                    y: hitPlayer.figure.torso.position.y,
                  };
                  Body.setPosition(
                    hitPlayer.figure.torso,
                    owner.figure.torso.position,
                  );
                  Body.setPosition(owner.figure.torso, tempPos);
                }
                this.handleDamage(hitPlayer, damage, ownerId);
              } else if (pData.isFreezing) {
                hitPlayer.data.freezeEnd = Date.now() + 2000;
                this.handleDamage(hitPlayer, damage, ownerId);
              } else if (pData.isPoison) {
                const end = Date.now() + 5000;
                hitPlayer.data.poisonEnd = end;
                this.onUpdatePlayer(hitPlayer.data.id, { poisonEnd: end });
                this.handleDamage(hitPlayer, damage, ownerId);
              } else if (pData.isBurn) {
                const end = Date.now() + 3000;
                hitPlayer.data.burnEnd = end;
                this.onUpdatePlayer(hitPlayer.data.id, { burnEnd: end });
                this.handleDamage(hitPlayer, damage, ownerId);
              } else {
                this.handleDamage(hitPlayer, damage, ownerId);
              }

              // Greenhouse: Burn vines
              if (this.level === "greenhouse" && pData.isBurn) {
                this.vines.forEach((v) => {
                  v.points.forEach((pt) => {
                    if (
                      Vector.magnitude(Vector.sub(pt, projectile.position)) <
                      100
                    ) {
                      v.isBurned = true;
                    }
                  });
                });
              }

              this.removeProjectile(projectile);
            }
          } else if (other.isStatic) {
            if (pData.isEraser) {
              World.remove(this.engine.world, other);
              this.platforms = this.platforms.filter((p) => p !== other);
              this.createParticles(
                projectile.position.x,
                projectile.position.y,
                "#000",
                30,
                2,
              );
              return;
            }
            // Vivid Fluid Splash Impact (ROUNDS style)
            const impactColor = (projectile.render.fillStyle as string) || "#fff";
            const impactVel = projectile.velocity;
            
            // 1. Fluid Wisps (Expanding mist that swirls)
            this.createParticles(
              projectile.position.x,
              projectile.position.y,
              impactColor,
              10,
              1.5,
              {
                type: "smoke",
                drag: 0.96,
                gravity: -0.05,
                size: 8,
                vSize: 0.3, // Much slower expansion
                additive: true,
                life: 1.0,
                noise: 0.2, 
                vx: -impactVel.x * 0.3,
                vy: -impactVel.y * 0.3,
              },
            );

            // 2. High-intensity Fluid Blobs (Bright cores)
            this.createParticles(
              projectile.position.x,
              projectile.position.y,
              "#ffffff",
              6,
              3.0,
              {
                type: "fluid",
                drag: 0.94,
                gravity: 0.2,
                size: 6,
                vSize: -0.15,
                additive: true,
                life: 0.5,
                noise: 0.1,
                vx: -impactVel.x * 0.4,
                vy: -impactVel.y * 0.4,
              },
            );

            // 3. Diffusion Glow (Ambient splash light)
            this.createParticles(
              projectile.position.x,
              projectile.position.y,
              impactColor,
              4,
              0.8,
              {
                type: "glow",
                drag: 0.98,
                gravity: 0,
                size: 20,
                vSize: 0.8,
                additive: true,
                life: 0.8,
              },
            );
            if (pData.isMagnet) {
              this.magnets.push({
                id: Math.random().toString(),
                body: {
                  x: projectile.position.x,
                  y: projectile.position.y,
                  isPoint: true,
                },
                ownerId: pData.ownerId,
              });
              this.removeProjectile(projectile);
              return;
            }
            if (pData.isExplosive) {
              const radius = 150 * (pData.radiusMult || 1);
              const damage = 60 * (pData.radiusMult || 1);
              this.explode(
                projectile.position.x,
                projectile.position.y,
                radius,
                damage,
                pData.ownerId,
              );
              this.removeProjectile(projectile);
            } else if (pData.isPortalShot) {
              this.createPortal(
                projectile.position.x,
                projectile.position.y,
                pData.ownerId,
              );
              this.removeProjectile(projectile);
            } else if (pData.isDroneSpawn) {
              this.spawnDrone(
                projectile.position.x,
                projectile.position.y,
                pData.ownerId,
              );
              this.removeProjectile(projectile);
            } else if (pData.isCloneSpawn) {
              this.spawnClone(
                projectile.position.x,
                projectile.position.y,
                pData.ownerId,
              );
              this.removeProjectile(projectile);
            } else if (pData.isSentrySpawn) {
              this.spawnSentry(
                projectile.position.x,
                projectile.position.y,
                pData.ownerId,
              );
              this.removeProjectile(projectile);
            } else if (pData.id === "gravity_cannon" || pData.isGravityCannon) {
              this.spawnGravityWell(
                projectile.position.x,
                projectile.position.y,
                "pull",
                30000,
              );
              this.removeProjectile(projectile);
            } else {
              if ((pData.bounceCount || 0) > 0) pData.bounceCount--;
              else this.removeProjectile(projectile);
            }
          }
        }
      });
    });
  }

  public getPlayerPosVel(id: number) {
    const p = this.players.find((p) => p.data.id === id);
    if (!p) return null;
    return {
      pos: { x: p.figure.torso.position.x, y: p.figure.torso.position.y },
      vel: { x: p.figure.torso.velocity.x, y: p.figure.torso.velocity.y },
    };
  }

  public syncNetworkPlayer(
    id: number,
    pos: { x: number; y: number },
    vel: { x: number; y: number },
    health: number,
    status: Partial<Player> = {},
  ) {
    const p = this.players.find((p) => p.data.id === id);
    if (!p || p.data.isDead) return;

    // Apply status updates
    Object.assign(p.data, status);
    p.data.stats.health = health;

    // Smooth position syncing with lerp
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const currentPos = p.figure.torso.position;

    // If drift is extreme, snap, otherwise lerp to catch up.
    const dist = Vector.magnitude(Vector.sub(currentPos, pos));
    if (dist > 350) {
      Body.setPosition(p.figure.torso, pos);
    } else {
      Body.setPosition(p.figure.torso, {
        x: lerp(currentPos.x, pos.x, 0.4),
        y: lerp(currentPos.y, pos.y, 0.4),
      });
    }

    // Velocity sync
    Body.setVelocity(p.figure.torso, {
      x: lerp(p.figure.torso.velocity.x, vel.x, 0.5),
      y: lerp(p.figure.torso.velocity.y, vel.y, 0.5),
    });

    // Health syncing (authoritative from sender)
    if (Math.abs(p.data.stats.health - health) > 0.5) {
      p.data.stats.health = health;
      this.onHealthChange(id, health);
    }
  }

  public addPlayer(player: Player, x: number, y: number) {
    const figure = new CubeCharacter(
      x,
      y,
      player.color,
      player.stats,
      player.id,
      player.archetypeId,
    );
    this.players.push({
      figure,
      data: player,
      wasGrounded: false,
      lastJumpCount: 0,
    } as any);
    World.add(this.engine.world, figure.composite);
  }

  private createPortal(x: number, y: number, ownerId: number) {
    const existing = this.portals.filter((p) => p.ownerId === ownerId);
    const type = existing.length % 2 === 0 ? "orange" : "blue";

    const portalBody = Bodies.circle(x, y, 50, {
      isSensor: true,
      isStatic: true,
    });
    (portalBody as any).isPortal = true;
    (portalBody as any).portalType = type;
    (portalBody as any).ownerId = ownerId;

    this.portals.push({ body: portalBody, ownerId, type, lastUse: 0 });
    World.add(this.engine.world, portalBody);

    // Max 2 portals per player (FIFO)
    if (existing.length >= 2) {
      const oldest = existing[0];
      this.portals = this.portals.filter((p) => p !== oldest);
      World.remove(this.engine.world, oldest.body);
    }
    this.createParticles(
      x,
      y,
      type === "orange" ? "#f97316" : "#3b82f6",
      20,
      1.5,
    );
  }

  private usePortal(
    player: { figure: CubeCharacter; data: Player },
    portalBody: Matter.Body,
  ) {
    const now = Date.now();
    const portalData = this.portals.find((p) => p.body === portalBody);
    if (!portalData || now - portalData.lastUse < 1000) return;

    const otherPortal = this.portals.find(
      (p) => p.ownerId === portalData.ownerId && p.type !== portalData.type,
    );
    if (otherPortal) {
      portalData.lastUse = now;
      otherPortal.lastUse = now;

      Body.setPosition(player.figure.torso, {
        x: otherPortal.body.position.x,
        y: otherPortal.body.position.y,
      });
      this.createParticles(
        portalData.body.position.x,
        portalData.body.position.y,
        portalData.type === "orange" ? "#f97316" : "#3b82f6",
        15,
        1,
      );
      this.createParticles(
        otherPortal.body.position.x,
        otherPortal.body.position.y,
        otherPortal.type === "orange" ? "#f97316" : "#3b82f6",
        15,
        1,
      );
    }
  }

  private spawnGravityWell(
    x: number,
    y: number,
    mode: "push" | "pull" = "pull",
    duration: number = 30000,
  ) {
    const body = Bodies.circle(x, y, 10, { isStatic: true, isSensor: true });
    this.gravityWells.push({
      body,
      mode,
      nextSwitch: Date.now() + 3000,
      expires: Date.now() + duration,
    });
    World.add(this.engine.world, body);
    this.createParticles(x, y, "#8b5cf6", 20, 2);
  }

  private spawnDrone(x: number, y: number, ownerId: number) {
    const body = Bodies.circle(x, y - 50, 15, { frictionAir: 0.1 });
    (body as any).isDrone = true;
    (body as any).ownerId = ownerId;
    (body as any).life = Date.now() + 15000;
    this.drones.push({ body, ownerId, lastFire: 0 });
    World.add(this.engine.world, body);
  }

  private spawnSentry(x: number, y: number, ownerId: number) {
    const body = Bodies.rectangle(x, y, 40, 40, { isStatic: true });
    (body as any).isSentry = true;
    (body as any).ownerId = ownerId;
    (body as any).life = Date.now() + 20000;
    this.sentries.push({ body, ownerId, lastFire: 0 });
    World.add(this.engine.world, body);
  }

  private spawnClone(x: number, y: number, ownerId: number) {
    const body = Bodies.circle(x, y, 20, {
      frictionAir: 0.05,
      restitution: 0.5,
    });
    (body as any).isClone = true;
    (body as any).ownerId = ownerId;
    (body as any).life = Date.now() + 20000;
    this.clones.push({ body, ownerId, life: (body as any).life });
    World.add(this.engine.world, body);
    this.createParticles(x, y, "#4d7c0f", 15, 1);
  }

  private spawnDebris(x: number, y: number, type: "crate" | "chair" | "lamp") {
    const body =
      type === "crate"
        ? Bodies.rectangle(x, y, 40, 40, { restitution: 0.1, friction: 0.5 })
        : type === "chair"
          ? Bodies.rectangle(x, y, 30, 45, { restitution: 0.2, friction: 0.4 })
          : Bodies.circle(x, y, 15, { restitution: 0.8, friction: 0.1 });

    (body as any).isDebris = true;
    (body as any).debrisType = type;
    World.add(this.engine.world, body);
  }

  private triggerEntropy() {
    // Explode unequipped weapons
    this.weaponDrops.forEach((w) => {
      this.explode(w.position.x, w.position.y, 250, 40, -1);
      World.remove(this.engine.world, w);
    });
    this.weaponDrops = [];
    this.createParticles(
      this.worldBounds.width / 2,
      this.worldBounds.height / 2,
      "#ef4444",
      50,
      3,
    );
  }

  private pickupWeapon(
    player: { figure: CubeCharacter; data: Player },
    drop: Matter.Body,
  ) {
    const weapon = (drop as any).weapon as Weapon;
    const now = Date.now();

    if (weapon.type === "health_potion") {
      player.data.stats.health = Math.min(
        player.data.stats.maxHealth,
        player.data.stats.health + 40,
      );
      this.onHealthChange(player.data.id, player.data.stats.health);
    } else if (weapon.type === "shield_potion") {
      player.data.stats.health += 50;
      this.onHealthChange(player.data.id, player.data.stats.health);
    } else if (weapon.type === "force_field") {
      player.data.hasForceField = true;
      player.data.forceFieldEnd = now + 8000;
      this.onForceFieldChange(player.data.id, true);
    } else if (weapon.type === "speed_boost") {
      player.data.speedBoostEnd = now + 10000;
    } else if (weapon.type === "god_mode") {
      player.data.godModeEnd = now + 5000;
      player.data.hasForceField = true;
      player.data.forceFieldEnd = now + 5000;
      this.onForceFieldChange(player.data.id, true);
    } else if (weapon.type === "time_stop") {
      this.players.forEach((p) => {
        if (p.data.id !== player.data.id) p.data.freezeEnd = now + 3000;
      });
    } else if (weapon.type === "healing_aura") {
      player.data.regenEnd = now + 12000;
      this.onUpdatePlayer(player.data.id, { regenEnd: player.data.regenEnd });
    } else if (weapon.type === "shadow_step") {
      player.data.invisibilityEnd = now + 5000;
      player.data.speedBoostEnd = now + 5000;
    } else if (weapon.type === "warp_drive") {
      player.data.speedBoostEnd = now + 8000;
      player.data.godModeEnd = now + 2000;
    } else if (weapon.type === "mirror_image_potion") {
      player.data.invisibilityEnd = now + 3000;
      player.data.hasForceField = true;
      player.data.forceFieldEnd = now + 3000;
      this.onForceFieldChange(player.data.id, true);
    } else if (weapon.type === "lich_king_crown") {
      player.data.stats.necroChance = 1.0;
      player.data.stats.maxHealth += 100;
      player.data.stats.health += 100;
      this.onHealthChange(player.data.id, player.data.stats.health);
    } else {
      player.data.currentWeapon = weapon;
      this.onWeaponChange(player.data.id, weapon);
    }
    this.removeWeaponDrop(drop);
  }

  private removeWeaponDrop(drop: Matter.Body) {
    this.weaponDrops = this.weaponDrops.filter((w) => w !== drop);
    World.remove(this.engine.world, drop);
  }

  private pickupGodPellet(
    player: { figure: CubeCharacter; data: Player },
    pellet: Matter.Body,
  ) {
    const color = (pellet as any).pelletColor as GodModeColor;
    player.data.godPellets[color] = (player.data.godPellets[color] || 0) + 1;

    this.createParticles(
      pellet.position.x,
      pellet.position.y,
      (pellet as any).colorHex,
      20,
      2,
    );

    if (player.data.godPellets[color] >= 3) {
      player.data.activeGodMode = color;
      player.data.godModeEnd = Date.now() + 60000;
      // Reset ALL pellets as requested
      Object.keys(player.data.godPellets).forEach(
        (k) => (player.data.godPellets[k as GodModeColor] = 0),
      );
      this.createParticles(
        player.figure.torso.position.x,
        player.figure.torso.position.y,
        "#fff",
        50,
        3,
      );
      this.camera.shake = 20;

      // Instant effects
      const now = Date.now();
      if (color === "blue") {
        this.players.forEach((p) => {
          if (p.data.id !== player.data.id) p.data.freezeEnd = now + 3000;
        });
      }
    }

    this.onGodModeChange(
      player.data.id,
      { ...player.data.godPellets },
      player.data.activeGodMode,
      player.data.godModeEnd,
    );

    this.godPellets = this.godPellets.filter((p) => p !== pellet);
    World.remove(this.engine.world, pellet);
  }

  private updateGodModes() {
    const now = Date.now();
    this.players.forEach((p) => {
      if (p.data.activeGodMode && p.data.godModeEnd) {
        if (now > p.data.godModeEnd) {
          p.data.activeGodMode = undefined;
          p.data.godModeEnd = undefined;
          this.onGodModeChange(
            p.data.id,
            { ...p.data.godPellets },
            undefined,
            undefined,
          );
          this.createParticles(
            p.figure.torso.position.x,
            p.figure.torso.position.y,
            "#fff",
            20,
            1,
          );
        } else {
          const mode = p.data.activeGodMode;
          const pos = p.figure.torso.position;

          if (mode === "orange" && Math.random() > 0.8) {
            this.explode(
              pos.x + (Math.random() - 0.5) * 150,
              pos.y + (Math.random() - 0.5) * 150,
              60,
              5,
              p.data.id,
            );
          }
          if (mode === "purple") {
            this.projectiles.forEach((proj) => {
              if ((proj as any).ownerId !== p.data.id) {
                const diff = Vector.sub(pos, proj.position);
                Body.applyForce(
                  proj,
                  proj.position,
                  Vector.mult(Vector.normalise(diff), 0.002),
                );
              }
            });
          }
          if (mode === "pink" && Math.random() > 0.9) {
            this.players.forEach((other) => {
              if (other.data.id !== p.data.id) {
                const diff = Vector.sub(pos, other.figure.torso.position);
                if (Vector.magnitude(diff) < 250) {
                  this.handleDamage(other, 1, p.data.id);
                  p.data.stats.health = Math.min(
                    p.data.stats.maxHealth,
                    p.data.stats.health + 0.5,
                  );
                }
              }
            });
          }
        }
      }
    });
  }

  private spawnGodPellet() {
    const colors: GodModeColor[] = [
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
      "pink",
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const colorHex = {
      red: "#ef4444",
      orange: "#f97316",
      yellow: "#facc15",
      green: "#22c55e",
      blue: "#3b82f6",
      purple: "#d946ef",
      pink: "#f472b6",
    }[color] as string;

    const x = 500 + Math.random() * (this.worldBounds.width - 1000);
    const pellet = Bodies.circle(x, -100, 15, {
      restitution: 0.6,
      friction: 0.1,
      label: "god_pellet",
    });
    (pellet as any).pelletColor = color;
    (pellet as any).colorHex = colorHex;
    this.godPellets.push(pellet);
    World.add(this.engine.world, pellet);
  }

  private spawnWeaponDrop(
    forcedType?: WeaponType,
    forcedRarity?: Rarity,
    pos?: { x: number; y: number },
  ) {
    const rarityRoll = Math.random();
    let rarity: Rarity = "common";
    if (forcedRarity) {
      rarity = forcedRarity;
    } else {
      if (rarityRoll > 0.99) rarity = "mythical";
      else if (rarityRoll > 0.95) rarity = "legendary";
      else if (rarityRoll > 0.85) rarity = "epic";
      else if (rarityRoll > 0.65) rarity = "rare";
      else if (rarityRoll > 0.35) rarity = "uncommon";
    }

    let pool: Record<Rarity, WeaponType[]> = {
      common: [
        "pistol",
        "smg",
        "health_potion",
        "shield_potion",
        "boomerang",
        "grenade",
        "shotgun",
        "poison_dart_gun",
        "shuriken_storm",
        "ice_spike",
        "phantom_pistol",
        "reaper_darts",
      ],
      uncommon: [
        "sword",
        "bow",
        "bomb",
        "force_field",
        "speed_boost",
        "triple_shot",
        "poison_gas",
        "flamethrower",
        "lifesteal_dagger",
        "teleport_grenade",
        "chain_mace",
        "thunder_bow",
        "healing_aura",
        "toxic_cloud",
        "electric_whip",
        "goblin_bomb",
        "stardust_wand",
        "photon_blaster",
      ],
      rare: [
        "bazooka",
        "snake_cannon",
        "magnet",
        "damage_teleport",
        "gravity_grenade",
        "sniper_rifle",
        "flame_staff",
        "acid_spitter",
        "vampire_claws",
        "fireball_launcher",
        "gravity_hammer",
        "blood_spear",
        "arcane_missile",
        "cyclone_ring",
        "gravity_cannon",
        "gravity_pulse",
        "echo_cannon",
      ],
      epic: [
        "black_hole",
        "railgun",
        "freeze_ray",
        "minigun",
        "plasma_rifle",
        "turret",
        "chainsaw",
        "rocket_launcher",
        "heat_seeking_missile",
        "portal_gun",
        "necro_staff",
        "orbital_laser",
        "void_cannon",
        "shadow_step",
        "pulsar_rifle",
        "druid_staff",
        "tsunami_scroll",
        "nanobot_swarm",
        "shatter_ray",
        "vampire_bat_gun",
        "void_sabre",
        "kinetic_blast",
      ],
      legendary: [
        "laser",
        "orb_of_destruction",
        "time_stop",
        "dragon_breath",
        "meteor_strike",
        "arc_lightning",
        "attack_drone",
        "sentry",
        "light_saber",
        "soul_reaper",
        "glacier_crash",
        "nebula_ray",
        "starlight_wand",
        "chaos_orb",
        "phoenix_feather",
        "wraith_scythe",
        "mecha_suit",
        "singularity_grenade",
        "quantum_rifle",
        "meteor_rain",
        "obsidian_mace",
        "holy_grenade",
        "plasma_sword",
        "void_bow",
      ],
      mythical: [
        "eraser",
        "god_mode",
        "gravity_well",
        "summon_minion",
        "nuke",
        "dimension_tearing_blade",
        "lich_king_crown",
        "omega_cannon",
        "disintegration_ray",
        "warp_drive",
        "nuclear_sniper",
        "tesla_coil",
        "stasis_field",
        "world_slayer",
        "reality_warper",
      ],
    };

    // Filter gravity weapons if not in moon or space
    if (this.level !== "moon" && this.level !== "space") {
      pool.rare = pool.rare.filter((w) => !w.includes("gravity"));
      pool.mythical = pool.mythical.filter((w) => !w.includes("gravity"));
    }

    const type =
      forcedType ||
      pool[rarity][Math.floor(Math.random() * pool[rarity].length)];

    const x = pos
      ? pos.x
      : 500 + Math.random() * (this.worldBounds.width - 1000);
    const y = pos ? pos.y : -100;

    // Custom ammo and damage for new weapons
    const weaponSettings: Partial<Record<WeaponType, Partial<Weapon>>> = {
      shotgun: {
        ammo: 8,
        maxAmmo: 8,
        fireRate: 800,
        damage: 15,
        projectileSpeed: 20,
      },
      sniper_rifle: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 1500,
        damage: 70,
        projectileSpeed: 50,
      },
      flamethrower: {
        ammo: 200,
        maxAmmo: 200,
        fireRate: 50,
        damage: 5,
        projectileSpeed: 10,
      },
      plasma_rifle: {
        ammo: 30,
        maxAmmo: 30,
        fireRate: 150,
        damage: 25,
        projectileSpeed: 35,
      },
      chainsaw: {
        ammo: 500,
        maxAmmo: 500,
        fireRate: 30,
        damage: 10,
        isMelee: true,
      },
      arc_lightning: {
        ammo: 3,
        maxAmmo: 3,
        fireRate: 1000,
        damage: 40,
        projectileSpeed: 60,
      },
      rocket_launcher: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 1200,
        damage: 60,
        projectileSpeed: 20,
      },
      heat_seeking_missile: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 1500,
        damage: 50,
        projectileSpeed: 15,
      },
      attack_drone: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 2000,
        damage: 30,
        projectileSpeed: 25,
      },
      sentry: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 2000,
        damage: 20,
        projectileSpeed: 25,
      },
      portal_gun: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 500,
        damage: 0,
        projectileSpeed: 40,
      },
      nuke: {
        ammo: 1,
        maxAmmo: 1,
        fireRate: 5000,
        damage: 500,
        projectileSpeed: 10,
      },
      // NEW WEAPONS
      necro_staff: {
        ammo: 10,
        maxAmmo: 10,
        fireRate: 1200,
        damage: 30,
        projectileSpeed: 15,
      },
      lifesteal_dagger: {
        ammo: 15,
        maxAmmo: 15,
        fireRate: 400,
        damage: 25,
        isMelee: true,
      },
      poison_dart_gun: {
        ammo: 20,
        maxAmmo: 20,
        fireRate: 300,
        damage: 10,
        projectileSpeed: 40,
      },
      flame_staff: {
        ammo: 30,
        maxAmmo: 30,
        fireRate: 400,
        damage: 40,
        projectileSpeed: 20,
      },
      light_saber: {
        ammo: 50,
        maxAmmo: 50,
        fireRate: 300,
        damage: 100,
        isMelee: true,
      },
      chain_mace: {
        ammo: 20,
        maxAmmo: 20,
        fireRate: 600,
        damage: 45,
        isMelee: true,
      },
      acid_spitter: {
        ammo: 40,
        maxAmmo: 40,
        fireRate: 200,
        damage: 15,
        projectileSpeed: 30,
      },
      thunder_bow: {
        ammo: 12,
        maxAmmo: 12,
        fireRate: 800,
        damage: 50,
        projectileSpeed: 45,
      },
      soul_reaper: {
        ammo: 1,
        maxAmmo: 1,
        fireRate: 1000,
        damage: 150,
        isMelee: true,
      },
      toxic_cloud: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 1000,
        damage: 5,
        projectileSpeed: 10,
      },
      fireball_launcher: {
        ammo: 15,
        maxAmmo: 15,
        fireRate: 500,
        damage: 45,
        projectileSpeed: 25,
      },
      shuriken_storm: {
        ammo: 25,
        maxAmmo: 25,
        fireRate: 150,
        damage: 15,
        projectileSpeed: 40,
      },
      gravity_hammer: {
        ammo: 10,
        maxAmmo: 10,
        fireRate: 1000,
        damage: 80,
        isMelee: true,
      },
      electric_whip: {
        ammo: 30,
        maxAmmo: 30,
        fireRate: 400,
        damage: 30,
        isMelee: true,
      },
      blood_spear: {
        ammo: 12,
        maxAmmo: 12,
        fireRate: 700,
        damage: 60,
        projectileSpeed: 45,
      },
      inferno_cannon: {
        ammo: 10,
        maxAmmo: 10,
        fireRate: 1500,
        damage: 100,
        projectileSpeed: 15,
      },
      nebula_ray: {
        ammo: 50,
        maxAmmo: 50,
        fireRate: 100,
        damage: 15,
        projectileSpeed: 50,
      },
      pulsar_rifle: {
        ammo: 25,
        maxAmmo: 25,
        fireRate: 200,
        damage: 35,
        projectileSpeed: 40,
      },
      dimension_tearing_blade: {
        ammo: 20,
        maxAmmo: 20,
        fireRate: 500,
        damage: 120,
        isMelee: true,
      },
      chaos_orb: {
        ammo: 8,
        maxAmmo: 8,
        fireRate: 1200,
        damage: 70,
        projectileSpeed: 15,
      },
      druid_staff: {
        ammo: 15,
        maxAmmo: 15,
        fireRate: 800,
        damage: 40,
        projectileSpeed: 20,
      },
      earthquake_hammer: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 2000,
        damage: 100,
        isMelee: true,
      },
      wraith_scythe: {
        ammo: 10,
        maxAmmo: 10,
        fireRate: 600,
        damage: 90,
        isMelee: true,
      },
      omega_cannon: {
        ammo: 3,
        maxAmmo: 3,
        fireRate: 3000,
        damage: 300,
        projectileSpeed: 10,
      },
      nanobot_swarm: {
        ammo: 10,
        maxAmmo: 10,
        fireRate: 500,
        damage: 10,
        projectileSpeed: 30,
      },
      gravity_cannon: {
        ammo: 8,
        maxAmmo: 8,
        fireRate: 800,
        damage: 10,
        projectileSpeed: 15,
      },
      gravity_pulse: {
        ammo: 10,
        maxAmmo: 10,
        fireRate: 1000,
        damage: 5,
        projectileSpeed: 10,
      },
      shatter_ray: {
        ammo: 12,
        maxAmmo: 12,
        fireRate: 500,
        damage: 30,
        projectileSpeed: 40,
      },
      vampire_bat_gun: {
        ammo: 15,
        maxAmmo: 15,
        fireRate: 600,
        damage: 20,
        projectileSpeed: 25,
      },
      meteor_rain: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 2000,
        damage: 80,
        projectileSpeed: 10,
      },
      void_sabre: {
        ammo: 30,
        maxAmmo: 30,
        fireRate: 400,
        damage: 90,
        isMelee: true,
      },
      quantum_rifle: {
        ammo: 20,
        maxAmmo: 20,
        fireRate: 400,
        damage: 40,
        projectileSpeed: 50,
      },
      stardust_wand: {
        ammo: 40,
        maxAmmo: 40,
        fireRate: 200,
        damage: 15,
        projectileSpeed: 30,
      },
      nuclear_sniper: {
        ammo: 3,
        maxAmmo: 3,
        fireRate: 3000,
        damage: 200,
        projectileSpeed: 60,
      },
      tesla_coil: {
        ammo: 100,
        maxAmmo: 100,
        fireRate: 100,
        damage: 5,
        projectileSpeed: 10,
      },
      photon_blaster: {
        ammo: 50,
        maxAmmo: 50,
        fireRate: 150,
        damage: 20,
        projectileSpeed: 45,
      },
      reaper_darts: {
        ammo: 30,
        maxAmmo: 30,
        fireRate: 200,
        damage: 25,
        projectileSpeed: 35,
      },
      obsidian_mace: {
        ammo: 20,
        maxAmmo: 20,
        fireRate: 600,
        damage: 110,
        isMelee: true,
      },
      phantom_pistol: {
        ammo: 30,
        maxAmmo: 30,
        fireRate: 300,
        damage: 30,
        projectileSpeed: 40,
      },
      ghost_grenade: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 800,
        damage: 40,
        projectileSpeed: 15,
      },
      echo_cannon: {
        ammo: 15,
        maxAmmo: 15,
        fireRate: 700,
        damage: 50,
        projectileSpeed: 30,
      },
      kinetic_blast: {
        ammo: 10,
        maxAmmo: 10,
        fireRate: 1000,
        damage: 60,
        projectileSpeed: 20,
      },
      stasis_field: {
        ammo: 5,
        maxAmmo: 5,
        fireRate: 1500,
        damage: 5,
        projectileSpeed: 10,
      },
      holy_grenade: {
        ammo: 3,
        maxAmmo: 3,
        fireRate: 2000,
        damage: 150,
        projectileSpeed: 15,
      },
      plasma_sword: {
        ammo: 50,
        maxAmmo: 50,
        fireRate: 300,
        damage: 130,
        isMelee: true,
      },
      void_bow: {
        ammo: 20,
        maxAmmo: 20,
        fireRate: 500,
        damage: 70,
        projectileSpeed: 40,
      },
      world_slayer: {
        ammo: 1,
        maxAmmo: 1,
        fireRate: 5000,
        damage: 500,
        projectileSpeed: 5,
      },
      reality_warper: {
        ammo: 10,
        maxAmmo: 10,
        fireRate: 1000,
        damage: 100,
        projectileSpeed: 20,
      },
    };

    const settings = weaponSettings[type] || {};

    const weapon: Weapon = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      rarity,
      ammo:
        settings.ammo ||
        (type === "smg" || type === "minigun"
          ? 100
          : type === "pistol"
            ? 20
            : 5),
      maxAmmo:
        settings.maxAmmo ||
        (type === "smg" || type === "minigun"
          ? 100
          : type === "pistol"
            ? 20
            : 5),
      fireRate:
        settings.fireRate ||
        (type === "smg"
          ? 100
          : type === "minigun"
            ? 50
            : type === "railgun"
              ? 300
              : 300),
      damage:
        settings.damage ||
        (type === "bazooka" ? 60 : type === "railgun" ? 80 : 20),
      projectileSpeed:
        settings.projectileSpeed ||
        (type === "railgun" ? 60 : type === "bazooka" ? 15 : 25),
      isMelee: settings.isMelee || type === "sword",
    };

    const drop = Bodies.rectangle(x, y, 40, 20, {
      friction: 0.5,
      restitution: 0.2,
      label: "weapon_drop",
    });
    (drop as any).weapon = weapon;

    this.weaponDrops.push(drop);
    World.add(this.engine.world, drop);
  }

  public shoot(
    playerId: number,
    isMainShot: boolean = true,
    targetX?: number,
    targetY?: number,
  ) {
    const player = this.players.find((p) => p.data.id === playerId);
    if (!player) return;

    const now = Date.now();
    const weapon = player.data.currentWeapon;
    const isRadiationMode = player.data.activeGodMode === "green";
    const fireMultiplier = isRadiationMode ? 0.3 : 1;
    const fireRate =
      (weapon ? weapon.fireRate : player.data.stats.fireRate || 400) *
      fireMultiplier;

    if (
      this.lastFireTimes[playerId] &&
      now - this.lastFireTimes[playerId] < fireRate
    )
      return;
    this.lastFireTimes[playerId] = now;

    if (weapon && weapon.ammo <= 0 && !weapon.isMelee) {
      player.data.currentWeapon = undefined;
      this.onWeaponChange(player.data.id, undefined);
      return;
    }

    if (weapon && !weapon.isMelee) {
      weapon.ammo--;
      this.onWeaponChange(player.data.id, weapon);
    }

    const pos = player.figure.torso.position;
    let angle = player.figure.facing === 1 ? 0 : Math.PI;

    if (!isMainShot && targetX !== undefined && targetY !== undefined) {
      angle = Math.atan2(targetY - pos.y, targetX - pos.x);
    }

    // Recoil Propulsion & Muzzle Flash
    if (player.data.stats.recoilPropulsion > 0) {
      const recoilForce = 0.02 * player.data.stats.recoilPropulsion;
      Body.applyForce(player.figure.torso, player.figure.torso.position, {
        x: -Math.cos(angle) * recoilForce,
        y: -Math.sin(angle) * recoilForce,
      });

      // Muzzle Flash / Blast (Vivid Fluid Particles)
      this.createParticles(
        pos.x + Math.cos(angle) * 35,
        pos.y + Math.sin(angle) * 15,
        "#fff",
        8,
        4,
        {
          type: "fluid", // Custom fluid type
          spread: 0.6,
          life: 0.25,
          size: 8,
          additive: true,
          vSize: -0.5
        },
      );
      this.createParticles(
        pos.x + Math.cos(angle) * 35,
        pos.y + Math.sin(angle) * 15,
        "#fdba74",
        8,
        2,
        {
          type: "glow",
          spread: 1.0,
          life: 0.6,
          size: 20,
          additive: true,
          vSize: 0.5
        },
      );
    }

    // Echo Strikes
    if (player.data.stats.echoStrikes && isMainShot) {
      this.delayedAttacks.push({
        ownerId: playerId,
        time: Date.now() + 500,
      });
    }

    if (weapon?.isMelee) {
      // Melee logic: create a short lived sensor body
      const swordHitbox = Bodies.rectangle(
        pos.x + Math.cos(angle) * 60,
        pos.y,
        80,
        40,
        {
          isSensor: true,
          label: "sword_hitbox",
        },
      );
      (swordHitbox as any).damage = weapon.damage || 40;
      (swordHitbox as any).ownerId = playerId;
      (swordHitbox as any).expires = Date.now() + 100;
      World.add(this.engine.world, swordHitbox);

      // Visual feedback
      this.effects.push({
        x: pos.x + Math.cos(angle) * 40,
        y: pos.y,
        radius: 50,
        life: 10,
        maxLife: 10,
        color: "rgba(255, 255, 255, 0.4)",
      });

      this.projectiles.push(swordHitbox);
      return;
    }

    const spray = weapon?.type === "smg" ? (Math.random() - 0.5) * 0.2 : 0;
    const finalAngle = angle + spray;

    const isSnake = weapon?.type === "snake_cannon";
    const isBlackHole = weapon?.type === "black_hole";
    const isMagnet = weapon?.type === "magnet";
    const isRailgun = weapon?.type === "railgun";
    const isEraser =
      weapon?.type === "eraser" || player.data.activeGodMode === "red";
    const isOrb = weapon?.type === "orb_of_destruction";
    const isBoomerang = weapon?.type === "boomerang";
    const isShotgun = weapon?.type === "shotgun";
    const isMeteor = weapon?.type === "meteor_strike";
    const isWindBlade = weapon?.type === "wind_blade";

    const count =
      weapon?.type === "bow"
        ? 1
        : isSnake
          ? 5
          : isShotgun
            ? 6
            : player.data.stats.projectileCount;
    let finalDamage = weapon ? weapon.damage : player.data.stats.damage;

    // Kinetic Battery discharge
    if (
      player.data.stats.kineticBattery &&
      player.data.stats.storedKineticEnergy > 0
    ) {
      finalDamage += player.data.stats.storedKineticEnergy;
      player.data.stats.storedKineticEnergy = 0;
      this.createParticles(pos.x, pos.y, "#f59e0b", 10, 2);
    }

    const speed = weapon ? weapon.projectileSpeed : 20;

    for (let i = 0; i < count; i++) {
      let spread =
        (i - (count - 1) / 2) * (isSnake ? 0.3 : isShotgun ? 0.2 : 0.15);
      const radius = isBlackHole
        ? 30
        : weapon?.type === "bazooka"
          ? 12
          : isEraser
            ? 60
            : 6;

      const rColors: Record<string, string> = {
        snake_cannon: "#4ade80",
        black_hole: "#a855f7",
        magnet: "#ef4444",
        railgun: "#38bdf8",
        eraser: "#000000",
        orb_of_destruction: "#f59e0b",
        freeze_ray: "#e0f2fe",
        laser: "#f43f5e",
        boomerang: "#fbbf24",
        damage_teleport: "#ec4899",
        dragon_breath: "#fb923c",
        arc_lightning: "#fff",
        plasma_rifle: "#34d399",
        wind_blade: "#93c5fd",
        flamethrower: "#f97316",
        rocket_launcher: "#f97316",
        heat_seeking_missile: "#fb923c",
        nuke: "#fbbf24",
        portal_gun: "#38bdf8",
        attack_drone: "#94a3b8",
        sentry: "#475569",
        necro_staff: "#4d7c0f",
        poison_dart_gun: "#84cc16",
        flame_staff: "#ef4444",
        acid_spitter: "#d9f99d",
        thunder_bow: "#fde047",
        toxic_cloud: "#a3e635",
        fireball_launcher: "#f97316",
        inferno_cannon: "#7c2d12",
        nebula_ray: "#c084fc",
        pulsar_rifle: "#818cf8",
        chaos_orb: "#a21caf",
        arcane_missile: "#6366f1",
        druid_staff: "#166534",
        tsunami_scroll: "#3b82f6",
        cyclone_ring: "#94a3b8",
        nanobot_swarm: "#475569",
        disintegration_ray: "#000",
        omega_cannon: "#ef4444",
        gravity_pulse: "#a855f7",
        shatter_ray: "#38bdf8",
        vampire_bat_gun: "#ef4444",
        meteor_rain: "#f97316",
        quantum_rifle: "#3b82f6",
        stardust_wand: "#fde047",
        photon_blaster: "#0ea5e9",
        reaper_darts: "#4b5563",
        echo_cannon: "#94a3b8",
        stasis_field: "#3b82f6",
        holy_grenade: "#fef9c3",
        plasma_sword: "#ec4899",
        void_bow: "#7c3aed",
        world_slayer: "#de1d1d",
        reality_warper: "#f472b6",
        default: player.data.color,
      };
      const pColor = rColors[weapon?.type as WeaponType] || rColors.default;

      const spawnX =
        isMeteor || weapon?.type === "meteor_rain"
          ? Math.random() * this.worldBounds.width
          : pos.x + Math.cos(finalAngle) * 40;
      const spawnY =
        isMeteor || weapon?.type === "meteor_rain"
          ? -100
          : pos.y + Math.sin(finalAngle) * 40;

      const projectile = Bodies.circle(spawnX, spawnY, radius, {
        frictionAir: isBlackHole || isOrb ? 0.05 : 0.001,
        restitution: player.data.stats.isBouncy ? 0.95 : 0.1,
        render: { fillStyle: pColor },
      });

      const pData = projectile as any;
      pData.damage = finalDamage;
      pData.ownerId = playerId;
      pData.bounceCount = player.data.stats.bounceCount;

      if (
        weapon?.type === "bazooka" ||
        isMeteor ||
        weapon?.type === "rocket_launcher" ||
        weapon?.type === "heat_seeking_missile" ||
        weapon?.type === "fireball_launcher" ||
        weapon?.type === "inferno_cannon" ||
        weapon?.type === "meteor_rain" ||
        weapon?.type === "holy_grenade" ||
        weapon?.type === "world_slayer"
      )
        pData.isExplosive = true;
      if (
        weapon?.type === "nuke" ||
        weapon?.type === "omega_cannon" ||
        weapon?.type === "world_slayer" ||
        weapon?.type === "holy_grenade"
      ) {
        pData.isExplosive = true;
        pData.isNuke = true;
        pData.radiusMult =
          weapon?.type === "omega_cannon"
            ? 3
            : weapon?.type === "world_slayer"
              ? 6
              : weapon?.type === "holy_grenade"
                ? 4
                : 4;
      }
      if (
        weapon?.type === "heat_seeking_missile" ||
        weapon?.type === "nanobot_swarm" ||
        weapon?.type === "vampire_bat_gun"
      )
        pData.isHeatSeeking = true;
      if (weapon?.type === "portal_gun") pData.isPortalShot = true;

      if (
        weapon?.type === "necro_staff" ||
        weapon?.type === "soul_reaper" ||
        weapon?.type === "wraith_scythe"
      )
        pData.isCloneSpawn = true;
      if (
        weapon?.type === "poison_dart_gun" ||
        weapon?.type === "toxic_cloud" ||
        weapon?.type === "nuclear_sniper" ||
        Math.random() < player.data.stats.poisonChance
      )
        pData.isPoison = true;
      if (
        weapon?.type === "flame_staff" ||
        weapon?.type === "fireball_launcher" ||
        Math.random() < player.data.stats.burnChance
      )
        pData.isBurn = true;
      if (weapon?.type === "tsunami_scroll") pData.radiusMult = 2;
      if (weapon?.type === "disintegration_ray") pData.isEraser = true;
      if (weapon?.type === "gravity_cannon") pData.isGravityCannon = true;
      if (weapon?.type === "gravity_pulse") pData.isHighKnockback = true;
      if (weapon?.type === "shatter_ray") pData.isPiercing = true;
      if (weapon?.type === "vampire_bat_gun") pData.lifesteal = 0.5;
      if (weapon?.type === "quantum_rifle") pData.isPiercing = true;
      if (weapon?.type === "stardust_wand") {
        pData.isBouncy = true;
        pData.bounceCount = 10;
      }
      if (weapon?.type === "echo_cannon") pData.isEcho = true;
      if (weapon?.type === "stasis_field") pData.isStasis = true;
      if (weapon?.type === "void_bow") pData.isPiercing = true;
      if (weapon?.type === "reality_warper") pData.isRealityWarp = true;

      if (isSnake) {
        pData.isSnake = true;
        this.snakeSensors.push({
          body: projectile,
          target: null,
          expires: Date.now() + 15000,
        });
      }
      if (isBlackHole) pData.isBlackHole = true;
      if (isMagnet) pData.isMagnet = true;
      if (isRailgun) pData.isRailgun = true;
      if (isEraser) pData.isEraser = true;
      if (isOrb) {
        pData.isOrb = true;
        pData.targetTime = Date.now() + 10000;
      }
      if (isBoomerang) {
        pData.isBoomerang = true;
        pData.startPos = { ...projectile.position };
        pData.returning = false;
      }
      if (weapon?.type === "freeze_ray" || weapon?.type === "ice_spike")
        pData.isFreezing = true;
      if (weapon?.type === "damage_teleport") pData.isTeleport = true;
      if (weapon?.type === "dragon_breath" || weapon?.type === "flamethrower")
        pData.isDragonBreath = true;
      if (isWindBlade) pData.isPiercing = true;
      if (weapon?.type === "poison_gas") pData.isPoison = true;

      if (
        weapon?.type === "bomb" ||
        weapon?.type === "grenade" ||
        weapon?.type === "gravity_grenade"
      ) {
        pData.isExplosive = true;
        pData.isGravity = weapon.type === "gravity_grenade";
        pData.timer = Date.now() + 2000;
      }

      const angleForVel = isMeteor ? Math.PI / 2 : finalAngle + spread;
      Body.setVelocity(projectile, {
        x: Math.cos(angleForVel) * speed,
        y: Math.sin(angleForVel) * speed,
      });
      pData.prevPos = { x: projectile.position.x, y: projectile.position.y };
      pData.trailPoints = [];
      this.projectiles.push(projectile);
      World.add(this.engine.world, projectile);
    }

    // Muzzle Flash Effect
    const flashColor = weapon
      ? this.rarityColors[weapon.rarity]
      : player.data.color;
    
    this.createParticles(
      pos.x + Math.cos(angle) * 45,
      pos.y + Math.sin(angle) * 40,
      flashColor,
      8,
      2,
      {
        type: "glow",
        spread: 1.2,
        life: 0.4,
        size: 30,
        additive: true,
        vSize: 0.5
      }
    );
  }

  private removeProjectile(projectile: Matter.Body) {
    this.projectiles = this.projectiles.filter((p) => p !== projectile);
    World.remove(this.engine.world, projectile);
  }

  public update(inputs: { [id: number]: any }) {
    const now = Date.now();

    // Slow Motion Logic
    const anyHasBulletTime = this.players.some(
      (p) => p.data.stats.bulletTimeParry,
    );
    if (anyHasBulletTime && now < this.slowMoEnd) {
      this.timeScale = 0.3;
    } else {
      this.timeScale = 1.0;
    }
    this.engine.timing.timeScale = this.timeScale;

    // Entropy Mode Logic
    const anyHasEntropy = this.players.some((p) => p.data.stats.entropyMode);
    if (anyHasEntropy && now > this.entropyTimer) {
      this.triggerEntropy();
      this.entropyTimer = now + 10000;
    }

    Engine.update(this.engine, 1000 / 60);

    if (now - this.lastDropTime > this.dropInterval) {
      this.spawnWeaponDrop();
      this.lastDropTime = now;
    }

    if (now - this.lastPelletTime > 15000) {
      this.spawnGodPellet();
      this.lastPelletTime = now;
    }

    this.updateGodModes();
    this.updateStatusEffects();

    // Expired Bodies Cleanup
    this.engine.world.bodies.forEach((b) => {
      if ((b as any).expires && Date.now() > (b as any).expires) {
        World.remove(this.engine.world, b);
      }
    });

    // Echo Strikes check
    this.delayedAttacks = this.delayedAttacks.filter((da) => {
      if (now > da.time) {
        this.shoot(da.ownerId, false);
        return false;
      }
      return true;
    });

    // Gravity Wells logic
    this.gravityWells = this.gravityWells.filter((well) => {
      if (well.expires && now > well.expires) {
        World.remove(this.engine.world, well.body);
        return false;
      }
      if (now > well.nextSwitch) {
        well.mode = well.mode === "pull" ? "push" : "pull";
        well.nextSwitch = now + 5000;
      }
      return true;
    });

    this.gravityWells.forEach((well) => {
      this.players.forEach((pl) => {
        const diff = Vector.sub(well.body.position, pl.figure.torso.position);
        const dist = Vector.magnitude(diff);
        if (dist < 500) {
          const forceMag =
            (well.mode === "pull" ? 0.005 : -0.005) * (1 - dist / 500);
          Body.applyForce(
            pl.figure.torso,
            pl.figure.torso.position,
            Vector.mult(Vector.normalise(diff), forceMag),
          );
        }
      });
      this.projectiles.forEach((proj) => {
        const diff = Vector.sub(well.body.position, proj.position);
        const dist = Vector.magnitude(diff);
        if (dist < 400) {
          const forceMag =
            (well.mode === "pull" ? 0.002 : -0.002) * (1 - dist / 400);
          Body.applyForce(
            proj,
            proj.position,
            Vector.mult(Vector.normalise(diff), forceMag),
          );
        }
      });
      // Particles for visualization
      if (Math.random() > 0.8) {
        this.createParticles(
          well.body.position.x,
          well.body.position.y,
          well.mode === "pull" ? "#a855f7" : "#ec4899",
          1,
          0.5,
        );
      }
    });

    this.engine.world.bodies.forEach((b) => {
      if ((b as any).isMoving) {
        const time = Date.now() / 1000;
        const offset =
          Math.sin(time * (b as any).moveSpeed) * (b as any).moveRange;
        if ((b as any).moveAxis === "x")
          Body.setPosition(b, {
            x: (b as any).originX + offset,
            y: b.position.y,
          });
        else
          Body.setPosition(b, {
            x: b.position.x,
            y: (b as any).originY + offset,
          });
      }
    });

    this.players.forEach((p) => {
      const input = inputs[p.data.id] || {
        left: false,
        right: false,
        jump: false,
        fire: false,
        up: false,
        down: false,
      };
      const now = Date.now();

      if (p.data.isGhost) {
        // Ghost movement: Fly around
        const ghostSpeed = 4;
        Body.setVelocity(p.figure.torso, {
          x: input.left ? -ghostSpeed : input.right ? ghostSpeed : 0,
          y: input.up ? -ghostSpeed : input.down ? ghostSpeed : 0,
        });

        if (input.fire && p.data.ghostCharge > 0) {
          // Quantum Swap: Find nearest living player and swap
          const others = this.players.filter(
            (pl) => !pl.data.isDead && !pl.data.isGhost,
          );
          if (others.length > 0) {
            const closest = others.reduce((prev, curr) => {
              const d1 = Vector.magnitude(
                Vector.sub(p.figure.torso.position, prev.figure.torso.position),
              );
              const d2 = Vector.magnitude(
                Vector.sub(p.figure.torso.position, curr.figure.torso.position),
              );
              return d1 < d2 ? prev : curr;
            });

            const dist = Vector.magnitude(
              Vector.sub(
                p.figure.torso.position,
                closest.figure.torso.position,
              ),
            );
            if (dist < 400) {
              const tempPos = {
                x: closest.figure.torso.position.x,
                y: closest.figure.torso.position.y,
              };
              Body.setPosition(closest.figure.torso, p.figure.torso.position);
              Body.setPosition(p.figure.torso, tempPos);

              p.data.ghostCharge = 0;
              this.createParticles(
                p.figure.torso.position.x,
                p.figure.torso.position.y,
                p.data.color,
                30,
                2,
              );
              this.createParticles(
                closest.figure.torso.position.x,
                closest.figure.torso.position.y,
                closest.data.color,
                30,
                2,
              );
              this.camera.shake = 15;
            }
          }
        }
        return;
      }

      // Update forces/state
      if (
        p.data.hasForceField &&
        p.data.forceFieldEnd &&
        now > p.data.forceFieldEnd
      ) {
        p.data.hasForceField = false;
        this.onForceFieldChange(p.data.id, false);
      }

      const isFrozen = p.data.freezeEnd ? now < p.data.freezeEnd : false;
      const isStunned = p.data.stunEnd ? now < p.data.stunEnd : false;

      // Landing detection
      const isGrounded = Math.abs(p.figure.torso.velocity.y) < 0.1;
      if (isGrounded && !p.wasGrounded && Math.abs(p.figure.torso.velocity.y) > 0.5) {
        this.createParticles(
          p.figure.torso.position.x,
          p.figure.torso.position.y + 20,
          "rgba(150, 150, 150, 0.5)",
          12,
          0.8,
          { type: "smoke", size: 15, gravity: -0.05, life: 0.8, spread: Math.PI }
        );
      }
      p.wasGrounded = isGrounded;

      // Jump detection (CubeCharacter manages jumpCount)
      const currentJumpCount = (p.figure as any).jumpCount;
      if (currentJumpCount > (p as any).lastJumpCount && currentJumpCount > 0) {
        this.createParticles(
          p.figure.torso.position.x,
          p.figure.torso.position.y + 10,
          "#fff",
          15,
          1,
          { type: "spark", size: 3, life: 0.3, spread: Math.PI }
        );
      }
      (p as any).lastJumpCount = currentJumpCount;

      const isGodMode =
        (p.data.godModeEnd ? now < p.data.godModeEnd : false) ||
        p.data.activeGodMode !== undefined;
      const hasSpeedBoost =
        (p.data.speedBoostEnd ? now < p.data.speedBoostEnd : false) ||
        p.data.activeGodMode === "yellow";
      const isCloaked = p.data.invisibilityEnd
        ? now < p.data.invisibilityEnd
        : false;
      const isStuck = p.data.isStuckEnd ? now < p.data.isStuckEnd : false;

      const moveMult = p.data.activeGodMode === "yellow" ? 2 : 1;
      const effectiveStats = {
        ...p.data.stats,
        movementSpeed: p.data.stats.movementSpeed * moveMult,
      };

      // Invisibility in shrubs or Yellow Light Mode or status or being dead in multiplayer
      let isInvisible =
        p.data.activeGodMode === "yellow" ||
        isCloaked ||
        (p.data.isDead && this.players.length >= 3 && !p.data.isGhost);
      if (this.level === "jungle" && !isInvisible) {
        const torsoPos = p.figure.torso.position;
        isInvisible = this.shrubs.some(
          (s) =>
            torsoPos.x > s.x - s.width / 2 &&
            torsoPos.x < s.x + s.width / 2 &&
            torsoPos.y > s.y - s.height / 2 &&
            torsoPos.y < s.y + s.height / 2,
        );
      }

      p.figure.setExternalState(
        effectiveStats,
        p.data.currentWeapon,
        p.data.hasForceField,
        isFrozen,
        isGodMode,
        hasSpeedBoost,
        !isInvisible,
        p.data.activeGodMode,
        isStunned,
      );

      if (!isFrozen && !isStuck && !isStunned) {
        p.figure.update(input, this.engine.gravity.y);

        // Speed Trails & Dust
        const vel = p.figure.torso.velocity;
        const speed = Vector.magnitude(vel);
        if (speed > 12) {
          if (Math.random() > 0.6) {
            this.createParticles(
              p.figure.torso.position.x,
              p.figure.torso.position.y + 30,
              "rgba(200, 200, 200, 0.4)",
              1,
              0.5,
              {
                type: "smoke",
                size: 12,
                gravity: -0.05,
                life: 0.6,
              },
            );
          }
          if (speed > 25) {
            this.createParticles(
              p.figure.torso.position.x,
              p.figure.torso.position.y,
              p.data.color,
              2,
              speed * 0.1,
              {
                type: "spark",
                size: 2,
                life: 0.3,
                drag: 0.9,
              },
            );
          }
        }
      }

      if (isStuck) {
        Body.setVelocity(p.figure.torso, {
          x: 0,
          y: p.figure.torso.velocity.y,
        });
        if (Math.random() > 0.8)
          this.createParticles(
            p.figure.torso.position.x,
            p.figure.torso.position.y,
            "#fff",
            1,
            0.5,
          );
      }

      if (input.fire && !isStunned && !isFrozen) {
        this.shoot(p.data.id, true);
      }

      if (
        !p.data.isDead &&
        (p.figure.torso.position.y > this.worldBounds.height + 200 ||
          p.figure.torso.position.y < -500)
      ) {
        p.data.stats.health = 0;
        this.handleDamage(p as any, 0, -1);
        Body.setPosition(p.figure.torso, { x: 0, y: -5000 });
      }
    });

    this.projectiles.forEach((p) => {
      const pData = p as any;

      // Trail effects
      if (!pData.trailPoints) pData.trailPoints = [];
      pData.trailPoints.push({ x: p.position.x, y: p.position.y });
      if (pData.trailPoints.length > 10) pData.trailPoints.shift();

      if (Math.random() > 0.4) {
        const pColor = pData.isDragonBreath
          ? "#f97316"
          : (p.render.fillStyle as string);
        this.createParticles(p.position.x, p.position.y, pColor, 1, 1.2, {
          type: pData.isDragonBreath ? "smoke" : "fluid",
          size: pData.isDragonBreath ? 35 : (pData.circleRadius || 8),
          gravity: pData.isDragonBreath ? -0.15 : 0.02,
          life: pData.isDragonBreath ? 1.5 : 0.6,
          drag: 0.97,
          additive: true,
          vSize: -0.1
        });

        if (pData.isElectricity || pData.isPlasma) {
          this.createParticles(p.position.x, p.position.y, "#fff", 2, 3, {
            type: "glow",
            size: 8,
            life: 0.2,
            additive: true
          });
        }
      }

      // Newton's Nightmare: Bullet Gravity
      const shooter = this.players.find((pl) => pl.data.id === pData.ownerId);
      if (shooter && shooter.data.stats.projectileGravity > 0) {
        this.players.forEach((pl) => {
          if (pl.data.id !== pData.ownerId) {
            const diff = Vector.sub(p.position, pl.figure.torso.position);
            const dist = Vector.magnitude(diff);
            if (dist < 400) {
              const pullForce =
                0.002 * shooter.data.stats.projectileGravity * (1 - dist / 400);
              Body.applyForce(
                pl.figure.torso,
                pl.figure.torso.position,
                Vector.mult(Vector.normalise(diff), pullForce),
              );
            }
          }
        });
      }

      if (pData.isHeatSeeking) {
        const others = this.players.filter(
          (pl) => pl.data.id !== pData.ownerId,
        );
        if (others.length > 0) {
          const closest = others.reduce((prev, curr) => {
            const d1 = Vector.magnitude(
              Vector.sub(p.position, prev.figure.torso.position),
            );
            const d2 = Vector.magnitude(
              Vector.sub(p.position, curr.figure.torso.position),
            );
            return d1 < d2 ? prev : curr;
          });
          const diff = Vector.sub(closest.figure.torso.position, p.position);
          const currentVel = p.velocity;
          const speed = Vector.magnitude(currentVel);
          const targetDir = Vector.normalise(diff);
          const newVel = Vector.mult(
            Vector.normalise(
              Vector.add(
                Vector.normalise(currentVel),
                Vector.mult(targetDir, 0.15),
              ),
            ),
            speed,
          );
          Body.setVelocity(p, newVel);
        }
      }

      if (pData.isSnake) {
        const sensor = this.snakeSensors.find((s) => s.body === p);
        if (sensor) {
          if (Date.now() > sensor.expires) {
            this.removeProjectile(p);
            this.snakeSensors = this.snakeSensors.filter((s) => s.body !== p);
            return;
          }
          // Target selection
          if (!sensor.target || sensor.target.isStatic) {
            const others = this.players.filter(
              (pl) => pl.data.id !== pData.ownerId,
            );
            if (others.length > 0) {
              sensor.target =
                others[Math.floor(Math.random() * others.length)].figure.torso;
            }
          }
          if (sensor.target) {
            const diff = Vector.sub(sensor.target.position, p.position);
            const force = Vector.mult(Vector.normalise(diff), 0.001);
            Body.applyForce(p, p.position, force);
          }
        }
      }

      if (pData.isBlackHole) {
        this.players.forEach((pl) => {
          const diff = Vector.sub(p.position, pl.figure.torso.position);
          const dist = Vector.magnitude(diff);
          if (dist < 600) {
            const force = Vector.mult(
              Vector.normalise(diff),
              0.005 * (1 - dist / 600),
            );
            Body.applyForce(pl.figure.torso, pl.figure.torso.position, force);
          }
        });
        // Black hole death timer
        if (!pData.deathTime) pData.deathTime = Date.now() + 5000;
        if (Date.now() > pData.deathTime) this.removeProjectile(p);
      }

      if (pData.isRealityWarp && Math.random() > 0.98) {
        Body.setPosition(p, {
          x: Math.random() * this.worldBounds.width,
          y: Math.random() * this.worldBounds.height,
        });
        this.createParticles(p.position.x, p.position.y, "#f472b6", 20, 1);
      }

      if (pData.isMagnet) {
        // Check collision with player to stick
        this.players.forEach((pl) => {
          const dist = Vector.magnitude(
            Vector.sub(p.position, pl.figure.torso.position),
          );
          if (dist < 40) {
            this.magnets.push({
              id: Math.random().toString(),
              body: pl.figure.torso,
              ownerId: pData.ownerId,
            });
            this.removeProjectile(p);
          }
        });
      }

      if (
        pData.isEcho &&
        !pData.echoed &&
        pData.lastEcho &&
        Date.now() - pData.lastEcho > 500
      ) {
        // Pulse effect
        this.explode(p.position.x, p.position.y, 100, 20, pData.ownerId);
        pData.echoed = true;
      }

      if (pData.isStasis) {
        this.players.forEach((pl) => {
          const diff = Vector.sub(p.position, pl.figure.torso.position);
          const dist = Vector.magnitude(diff);
          if (dist < 300) {
            Body.setVelocity(
              pl.figure.torso,
              Vector.mult(pl.figure.torso.velocity, 0.5),
            );
          }
        });
      }

      if (pData.isOrb) {
        const others = this.players.filter(
          (pl) => pl.data.id !== pData.ownerId,
        );
        if (others.length > 0) {
          const closest = others.reduce((prev, curr) => {
            const d1 = Vector.magnitude(
              Vector.sub(p.position, prev.figure.torso.position),
            );
            const d2 = Vector.magnitude(
              Vector.sub(p.position, curr.figure.torso.position),
            );
            return d1 < d2 ? prev : curr;
          });
          const diff = Vector.sub(closest.figure.torso.position, p.position);
          Body.applyForce(
            p,
            p.position,
            Vector.mult(Vector.normalise(diff), 0.002),
          );
        }
        if (Date.now() > pData.targetTime) this.removeProjectile(p);
      }

      if (pData.isBoomerang) {
        const owner = this.players.find((pl) => pl.data.id === pData.ownerId);
        if (owner) {
          const distFromStart = Vector.magnitude(
            Vector.sub(p.position, pData.startPos),
          );
          if (distFromStart > 400) pData.returning = true;
          if (pData.returning) {
            const diff = Vector.sub(owner.figure.torso.position, p.position);
            Body.setVelocity(p, Vector.mult(Vector.normalise(diff), 15));
            if (Vector.magnitude(diff) < 30) this.removeProjectile(p);
          }
        } else {
          this.removeProjectile(p);
        }
      }

      if (pData.isGravity && pData.timer) {
        this.players.forEach((pl) => {
          const diff = Vector.sub(p.position, pl.figure.torso.position);
          const dist = Vector.magnitude(diff);
          if (dist < 300) {
            Body.applyForce(
              pl.figure.torso,
              pl.figure.torso.position,
              Vector.mult(Vector.normalise(diff), 0.01),
            );
          }
        });
      }

      if (
        (p as any).label === "sword_hitbox" &&
        Date.now() > (p as any).expires
      ) {
        this.removeProjectile(p);
      } else if ((p as any).timer && Date.now() > (p as any).timer) {
        this.explode(p.position.x, p.position.y, 150, 60, (p as any).ownerId);
        this.removeProjectile(p);
      }

      if (
        p.position.y > this.worldBounds.height + 500 ||
        p.position.y < -500 ||
        p.position.x > this.worldBounds.width + 500 ||
        p.position.x < -500
      ) {
        this.removeProjectile(p);
      }
    });

    // Portal Logic
    this.players.forEach((p) => {
      this.portals.forEach((portal) => {
        if (
          Vector.magnitude(
            Vector.sub(p.figure.torso.position, portal.body.position),
          ) < 50
        ) {
          const other = this.portals.find(
            (op) => op.ownerId === portal.ownerId && op !== portal,
          );
          if (other) {
            const now = Date.now();
            if (
              !(p.data as any).lastPortalTime ||
              now - (p.data as any).lastPortalTime > 1000
            ) {
              (p.data as any).lastPortalTime = now;
              Body.setPosition(p.figure.torso, {
                x: other.body.position.x,
                y: other.body.position.y,
              });
              this.effects.push({
                x: portal.body.position.x,
                y: portal.body.position.y,
                radius: 60,
                life: 15,
                maxLife: 15,
                color: "#0ef",
              });
              this.effects.push({
                x: other.body.position.x,
                y: other.body.position.y,
                radius: 60,
                life: 15,
                maxLife: 15,
                color: "#0ef",
              });
            }
          }
        }
      });
    });

    // Drone Logic
    this.drones = this.drones.filter((d) => {
      if (Date.now() > (d.body as any).life) {
        World.remove(this.engine.world, d.body);
        return false;
      }
      const owner = this.players.find((p) => p.data.id === d.ownerId);
      if (owner) {
        const targetPos = Vector.add(owner.figure.torso.position, {
          x: -50 * owner.figure.facing,
          y: -60,
        });
        const diff = Vector.sub(targetPos, d.body.position);
        Body.setVelocity(d.body, Vector.mult(diff, 0.1));

        // Firing
        if (Date.now() - d.lastFire > 2000) {
          const others = this.players.filter((p) => p.data.id !== d.ownerId);
          if (others.length > 0) {
            const closest = others[0].figure.torso;
            const fDir = Vector.normalise(
              Vector.sub(closest.position, d.body.position),
            );
            this.shoot(
              d.ownerId,
              false,
              d.body.position.x + fDir.x * 20,
              d.body.position.y + fDir.y * 20,
            );
            d.lastFire = Date.now();
          }
        }
      }
      return true;
    });

    if (this.level === "haunted_mansion" && Math.random() > 0.9) {
      this.createParticles(
        Math.random() * this.worldBounds.width,
        Math.random() * this.worldBounds.height,
        "#94a3b8",
        1,
        0.5,
        { type: "smoke", size: 10, gravity: -0.01, life: 2.0 },
      );
    }
    if (this.level === "underwater_base" && Math.random() > 0.7) {
      this.createParticles(
        Math.random() * this.worldBounds.width,
        this.worldBounds.height,
        "#22d3ee",
        1,
        1,
        { type: "circle", size: 8, gravity: -0.2, life: 1.5 },
      );
    }
    if (this.level === "volcano_fortress" && Math.random() > 0.8) {
      this.createParticles(
        Math.random() * this.worldBounds.width,
        this.worldBounds.height,
        "#f97316",
        1,
        2,
        { type: "spark", size: 4, gravity: -0.5, life: 1.0 },
      );
    }
    if (this.level === "cyber_void" && Math.random() > 0.95) {
      this.createParticles(
        Math.random() * this.worldBounds.width,
        Math.random() * this.worldBounds.height,
        "#f472b6",
        1,
        5,
        { type: "spark", size: 2, life: 0.1, drag: 0.99 },
      );
    }
    this.sentries = this.sentries.filter((s) => {
      if (Date.now() > (s.body as any).life) {
        World.remove(this.engine.world, s.body);
        return false;
      }
      if (Date.now() - s.lastFire > 1500) {
        const others = this.players.filter((p) => p.data.id !== s.ownerId);
        if (others.length > 0) {
          const closest = others[0].figure.torso;
          const fDir = Vector.normalise(
            Vector.sub(closest.position, s.body.position),
          );
          this.shoot(
            s.ownerId,
            false,
            s.body.position.x + fDir.x * 30,
            s.body.position.y + fDir.y * 30,
          );
          s.lastFire = Date.now();
        }
      }
      return true;
    });

    // Clone Logic (Necromancy)
    this.clones = this.clones.filter((c) => {
      if (Date.now() > c.life) {
        World.remove(this.engine.world, c.body);
        return false;
      }
      const others = this.players.filter((pl) => pl.data.id !== c.ownerId);
      if (others.length > 0) {
        const closest = others.reduce((prev, curr) => {
          const d1 = Vector.magnitude(
            Vector.sub(c.body.position, prev.figure.torso.position),
          );
          const d2 = Vector.magnitude(
            Vector.sub(c.body.position, curr.figure.torso.position),
          );
          return d1 < d2 ? prev : curr;
        });
        const diff = Vector.sub(closest.figure.torso.position, c.body.position);
        const dist = Vector.magnitude(diff);
        Body.setVelocity(c.body, Vector.mult(Vector.normalise(diff), 6));

        if (dist < 45) {
          this.handleDamage(closest, 25, c.ownerId);
          this.createParticles(
            c.body.position.x,
            c.body.position.y,
            "#4d7c0f",
            20,
            1.5,
          );
          World.remove(this.engine.world, c.body);
          return false;
        }
      }
      return true;
    });

    this.camera.shake *= 0.9;
    if (this.camera.shake < 0.1) this.camera.shake = 0;

    this.platforms.forEach((p) => {
      const pAny = p as any;
      if (pAny.isFan) {
        this.players.forEach((pl) => {
          const diff = Vector.sub(pl.figure.torso.position, p.position);
          if (Math.abs(diff.x) < 50 && diff.y < 0 && diff.y > -400) {
            Body.applyForce(pl.figure.torso, pl.figure.torso.position, {
              x: 0,
              y: -0.015 * (1 - Math.abs(diff.y) / 400),
            });
          }
        });
        if (Math.random() > 0.7)
          this.createParticles(
            p.position.x,
            p.position.y - 10,
            "#38bdf8",
            1,
            0.5,
          );
      }
      if (pAny.isConveyor) {
        this.players.forEach((pl) => {
          const distY = pl.figure.torso.position.y - p.bounds.min.y;
          const distX = Math.abs(pl.figure.torso.position.x - p.position.x);
          if (
            distY > -10 &&
            distY < 30 &&
            distX < (p.bounds.max.x - p.bounds.min.x) / 2
          ) {
            Body.translate(pl.figure.torso, { x: pAny.convSpeed || 2, y: 0 });
          }
        });
      }
    });

    this.magnets.forEach((m, idx) => {
      // Pairs of magnets attract!
      for (let j = idx + 1; j < this.magnets.length; j++) {
        const m2 = this.magnets[j];
        const p1 = (m.body as any).position || m.body;
        const p2 = (m2.body as any).position || m2.body;
        const diff = Vector.sub(p1, p2);
        const dist = Vector.magnitude(diff);
        if (dist < 1000) {
          const f = Vector.mult(Vector.normalise(diff), 0.02);
          if (!(m.body as any).isPoint)
            Body.applyForce(m.body as Matter.Body, p1, Vector.neg(f));
          if (!(m2.body as any).isPoint)
            Body.applyForce(m2.body as Matter.Body, p2, f);
        }
      }
    });

    // Fireflies wandering (floating)
    this.fireflies.forEach((ff) => {
      const v = (ff as any).wanderVel;
      if (Math.random() > 0.98) {
        v.x = (Math.random() - 0.5) * 2;
        v.y = (Math.random() - 0.5) * 2;
      }

      Body.setPosition(ff, {
        x: ff.position.x + v.x,
        y: ff.position.y + v.y,
      });

      // Wrap around
      const pad = 100;
      if (ff.position.x < -pad)
        Body.setPosition(ff, {
          x: this.worldBounds.width + pad,
          y: ff.position.y,
        });
      if (ff.position.x > this.worldBounds.width + pad)
        Body.setPosition(ff, { x: -pad, y: ff.position.y });
      if (ff.position.y < -pad)
        Body.setPosition(ff, {
          x: ff.position.x,
          y: this.worldBounds.height + pad,
        });
      if (ff.position.y > this.worldBounds.height + pad)
        Body.setPosition(ff, { x: ff.position.x, y: -pad });
    });

    // Particles update
    const MAX_PARTICLES = 400;
    if (this.particles.length > MAX_PARTICLES) {
      this.particles = this.particles.slice(-MAX_PARTICLES);
    }

    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.noise) {
        const swirl = (Math.random() - 0.5) * p.noise;
        const cos = Math.cos(swirl);
        const sin = Math.sin(swirl);
        const newVx = p.vx * cos - p.vy * sin;
        const newVy = p.vx * sin + p.vy * cos;
        p.vx = newVx;
        p.vy = newVy;
      }

      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      if (p.vRotation) p.rotation = (p.rotation || 0) + p.vRotation;
      if (p.vSize) p.size = Math.max(0.1, p.size + p.vSize);
      p.life -= 0.02 / p.maxLife;
    });
    this.particles = this.particles.filter((p) => p.life > 0);

    this.trails.forEach((t) => (t.alpha -= 0.02));
    this.trails = this.trails.filter((t) => t.alpha > 0);

    this.effects.forEach((e) => e.life--);
    this.effects = this.effects.filter((e) => e.life > 0);

    if (this.players.length > 0) {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      this.players.forEach((p) => {
        const pos = p.figure.torso.position;
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      });
      const zoomX = this.canvas.width / (maxX - minX + 600);
      const zoomY = this.canvas.height / (maxY - minY + 500);
      this.camera.targetZoom = Math.max(
        0.4,
        Math.min(1.0, Math.min(zoomX, zoomY)),
      );
      this.camera.targetX = (minX + maxX) / 2;
      this.camera.targetY = (minY + maxY) / 2;
      this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
      this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;
      this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.05;
      this.camera.targetRotation = this.engine.gravity.y < 0 ? Math.PI : 0;
      this.camera.rotation +=
        (this.camera.targetRotation - this.camera.rotation) * 0.05;
      if (this.camera.shake > 0) this.camera.shake *= 0.9;
    }

    this.updateLighting();
  }

  private updateLighting() {
    this.lightSources = [];

    // Ambient point lights near central areas
    this.lightSources.push({
      x: this.worldBounds.width / 2,
      y: this.worldBounds.height / 2,
      radius: 800,
      color: "rgba(255, 255, 255, 0.05)",
      intensity: 0.2,
    });

    // Projectiles as light sources (only high energy ones)
    this.projectiles
      .filter((p) => (p as any).isHighEnergy)
      .forEach((p) => {
        const color = p.render.fillStyle as string;
        this.lightSources.push({
          x: p.position.x,
          y: p.position.y,
          radius: 80,
          color: color.replace(")", ", 0.15)").replace("rgb", "rgba"),
          intensity: 0.8,
        });
      });

    // Hazards as subtle glow
    this.engine.world.bodies
      .filter((b) => (b as any).isHazard)
      .forEach((b) => {
        this.lightSources.push({
          x: b.position.x,
          y: b.position.y,
          radius: 150,
          color: "rgba(255, 0, 0, 0.05)",
          intensity: 0.3,
        });
      });
  }

  private drawVignette() {
    this.ctx.save();
    const grad = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width / 2,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width,
    );
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, "rgba(0,0,0,0.3)");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  private drawBackground() {
    const bgGrad = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width,
    );

    const bgColors: Record<Level, [string, string, string]> = {
      pyramid: ["#1c1917", "#0c0a09", "#78350f"],
      desert: ["#2d1d11", "#0a0502", "#d97706"],
      moon: ["#1a1a2e", "#050510", "#3b82f6"],
      space: ["#0f0b29", "#020108", "#a855f7"],
      jungle: ["#0b1a0f", "#020502", "#22c55e"],
      atlantis: ["#042f2e", "#020617", "#0ea5e9"],
      arctic: ["#0f172a", "#020617", "#94a3b8"],
      radioactive: ["#022c22", "#020617", "#4ade80"],
      cave: ["#1e1b4b", "#020617", "#8b5cf6"],
      volcano: ["#450a0a", "#020617", "#ef4444"],
      foundry: ["#1a1a1a", "#0a0a0a", "#f97316"],
      data_center: ["#020617", "#020108", "#38bdf8"],
      greenhouse: ["#022c22", "#011c16", "#4ade80"],
      metropolis: ["#1e1b4b", "#020617", "#06b6d4"],
      laboratory: ["#062020", "#020108", "#4ade80"],
      inferno: ["#450a0a", "#0a0000", "#fbbf24"],
      sky_castle: ["#0ea5e9", "#020617", "#ffffff"],
      crystal_crevasse: ["#2e1065", "#020617", "#d8b4fe"],
      steampunk_factory: ["#422006", "#1a0e05", "#f59e0b"],
      neon_cyber_city: ["#020617", "#020108", "#f472b6"],
      ancient_temple: ["#064e3b", "#022c22", "#fbbf24"],
      shroom_kingdom: ["#4c1d95", "#1e1b4b", "#f9a8d4"],
      haunted_mansion: ["#0f172a", "#020617", "#94a3b8"],
      underwater_base: ["#083344", "#020617", "#22d3ee"],
      volcano_fortress: ["#450a0a", "#0a0000", "#f97316"],
      cloud_city: ["#0ea5e9", "#38bdf8", "#f0f9ff"],
      toxic_sewer: ["#062020", "#020617", "#4ade80"],
      frozen_wasteland: ["#0f172a", "#1e293b", "#38bdf8"],
      cyber_void: ["#020108", "#000000", "#f472b6"],
    };
    const [c1, c2, accent] = bgColors[this.level] || bgColors.pyramid;
    bgGrad.addColorStop(0, c1);
    bgGrad.addColorStop(1, c2);

    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Parallax Layers
    this.bgLayers.forEach((layer) => {
      const px =
        (layer.x - this.camera.x * layer.parallax) %
        (this.worldBounds.width * 2);
      const py =
        (layer.y - this.camera.y * layer.parallax) %
        (this.worldBounds.height * 2);

      const x = px < 0 ? px + this.worldBounds.width * 2 : px;
      const y = py < 0 ? py + this.worldBounds.height * 2 : py;

      this.ctx.fillStyle = layer.color;
      this.ctx.beginPath();
      if (layer.type === "bubble") {
        this.ctx.arc(
          x % this.canvas.width,
          y % this.canvas.height,
          layer.size,
          0,
          Math.PI * 2,
        );
        this.ctx.stroke();
      } else if (layer.type === "cloud") {
        this.ctx.ellipse(
          x % this.canvas.width,
          y % this.canvas.height,
          layer.size * 5,
          layer.size * 2,
          0,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      } else {
        this.ctx.arc(
          x % this.canvas.width,
          y % this.canvas.height,
          layer.size,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      }
    });

    this.ctx.save();
    this.ctx.globalAlpha = 0.05;
    this.ctx.fillStyle = accent;
    for (let i = 0; i < 20; i++) {
      const x = (i * 33333) % this.canvas.width;
      const y = (i * 77777) % this.canvas.height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawPlatformShadows() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    this.engine.world.bodies
      .filter(
        (b) => b.isStatic && b.label !== "particle" && b.label !== "firefly",
      )
      .forEach((b) => {
        const v = b.vertices;
        this.ctx.beginPath();
        // Consistent directional shadow
        const dx = 20;
        const dy = 20;
        this.ctx.moveTo(v[0].x, v[0].y);
        this.ctx.lineTo(v[0].x + dx, v[0].y + dy);
        for (let i = 1; i < v.length; i++) {
          this.ctx.lineTo(v[i].x + dx, v[i].y + dy);
        }
        this.ctx.lineTo(v[v.length - 1].x, v[v.length - 1].y);
        this.ctx.closePath();
        this.ctx.fill();
      });
    this.ctx.restore();
  }

  private drawLighting() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = "lighter";
    this.lightSources.forEach((light) => {
      const grad = this.ctx.createRadialGradient(
        light.x,
        light.y,
        0,
        light.x,
        light.y,
        light.radius,
      );
      grad.addColorStop(0, light.color);
      grad.addColorStop(1, "transparent");
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  private drawReflections() {
    if (this.level === "atlantis" || this.level === "volcano") {
      this.ctx.save();
      this.ctx.globalAlpha = 0.3;
      this.ctx.translate(0, this.worldBounds.height * 2 - 200);
      this.ctx.scale(1, -0.5);
      // This is a complex pass, just doing simplified reflection for now
      this.ctx.restore();
    }
  }

  public draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackground();

    this.ctx.save();
    // Final Stand Filter
    const finalStandPlayer = this.players.find(
      (p) => p.data.stats.finalStandVisuals && !p.data.isGhost,
    );
    const isFinalStand =
      finalStandPlayer &&
      finalStandPlayer.data.stats.health /
        finalStandPlayer.data.stats.maxHealth <
        0.3;

    if (isFinalStand) {
      const intensity =
        (0.3 -
          finalStandPlayer.data.stats.health /
            finalStandPlayer.data.stats.maxHealth) /
        0.3;
      this.ctx.filter = `saturate(${1 - intensity * 0.8}) contrast(${1 + intensity * 0.5})`;
      if (Math.random() > 0.95) {
        this.ctx.translate(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
        );
      }
    }

    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.rotate(this.camera.rotation);

    // Apply camera shake if any
    if (this.camera.shake > 0.5) {
      this.ctx.translate(
        (Math.random() - 0.5) * this.camera.shake,
        (Math.random() - 0.5) * this.camera.shake,
      );
    }

    this.ctx.translate(-this.camera.x, -this.camera.y);

    this.drawReflections();
    this.drawPlatformShadows();

    // Draw Static Platforms with Details
    this.engine.world.bodies
      .filter(
        (b) => b.isStatic && b.label !== "particle" && b.label !== "firefly",
      )
      .forEach((b) => {
        this.ctx.save();
        const w = b.bounds.max.x - b.bounds.min.x;
        const h = b.bounds.max.y - b.bounds.min.y;
        const v = b.vertices;

        // Main Body
        if ((b as any).isVanish || (b as any).isFading) {
          const timeLeft = ((b as any).expires - Date.now()) / 2000;
          this.ctx.globalAlpha = Math.max(0, timeLeft);
        }

        if ((b as any).isRock) {
          this.ctx.fillStyle = "#4b5563";
          this.ctx.beginPath();
          this.ctx.moveTo(v[0].x, v[0].y);
          for (let i = 1; i < v.length; i++) this.ctx.lineTo(v[i].x, v[i].y);
          this.ctx.closePath();
          this.ctx.fill();
        } else if ((b as any).isMagma) {
          this.ctx.fillStyle = "#ea580c";
          this.ctx.shadowBlur = 15;
          this.ctx.shadowColor = "#f97316";
          this.ctx.beginPath();
          this.ctx.moveTo(v[0].x, v[0].y);
          for (let i = 1; i < v.length; i++) this.ctx.lineTo(v[i].x, v[i].y);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
        } else {
          this.ctx.fillStyle = (
            b.render.fillStyle === "#111" || b.render.fillStyle === "#1a1d23"
              ? "#1c1917"
              : b.render.fillStyle
          ) as string;
          this.ctx.beginPath();
          this.ctx.moveTo(v[0].x, v[0].y);
          for (let i = 1; i < v.length; i++) this.ctx.lineTo(v[i].x, v[i].y);
          this.ctx.closePath();
          this.ctx.fill();
        }

        if ((b as any).hasTopping) {
          const isSpace = this.level === "space" || this.level === "moon";
          const isDesert = this.level === "desert" || this.level === "pyramid";

          const tColors: Record<string, [string, string]> = {
            jungle: ["#2d6a4f", "#1b4332"],
            space: ["#4ade80", "#14532d"],
            desert: ["#d97706", "#92400e"],
            radioactive: ["#86efac", "#166534"],
            atlantis: ["#22d3ee", "#155e75"],
            arctic: ["#f0f9ff", "#7dd3fc"],
            volcano: ["#ef4444", "#7f1d1d"],
            default: ["#4b5563", "#1f2937"],
          };
          const [cMain, cDark] =
            tColors[this.level] || (isSpace ? tColors.space : tColors.default);

          this.ctx.fillStyle = cMain;
          this.ctx.fillRect(b.position.x - w / 2, b.bounds.min.y, w, 12);

          // Texture/Wear
          this.ctx.globalAlpha = 0.2;
          this.ctx.fillStyle = "#000";
          for (let tx = -w / 2 + 10; tx < w / 2; tx += 25) {
            if (Math.random() > 0.5) {
              this.ctx.fillRect(b.position.x + tx, b.bounds.min.y + 4, 15, 6);
            }
          }
          this.ctx.globalAlpha = 1.0;
        }

        if ((b as any).isNeon) {
          this.ctx.shadowBlur = 20;
          this.ctx.shadowColor = (b as any).neonColor;
          this.ctx.strokeStyle = (b as any).neonColor;
          this.ctx.lineWidth = 4;
          this.ctx.stroke();
        }

        if ((b as any).isHazard) {
          const isRadioactive = this.level === "radioactive";
          const hColor = isRadioactive
            ? "rgba(74, 222, 128, 0.4)"
            : "rgba(239, 68, 68, 0.4)";
          const sColor = isRadioactive ? "#4ade80" : "#ef4444";

          const pulse = (Math.sin(Date.now() / 300) + 1) / 2;
          this.ctx.fillStyle = hColor;
          this.ctx.shadowBlur = 10 + pulse * 10;
          this.ctx.shadowColor = sColor;
          this.ctx.strokeStyle = sColor;
          this.ctx.lineWidth = 2;

          this.ctx.fillRect(b.position.x - w / 2, b.position.y - h / 2, w, h);
          this.ctx.strokeRect(b.position.x - w / 2, b.position.y - h / 2, w, h);

          // Danger stripes
          this.ctx.save();
          this.ctx.clip();
          this.ctx.strokeStyle = sColor;
          this.ctx.lineWidth = 10;
          this.ctx.globalAlpha = 0.3;
          for (let i = -w; i < w; i += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(b.position.x + i, b.bounds.min.y);
            this.ctx.lineTo(b.position.x + i + 20, b.bounds.max.y);
            this.ctx.stroke();
          }
          this.ctx.restore();
        }

        this.ctx.restore();
      });

    // Draw Floating Particles (Dynamic Wandering)
    const isSpace = this.level === "space" || this.level === "moon";
    const isDesert = this.level === "desert" || this.level === "pyramid";

    this.ctx.save();
    this.fireflies.forEach((ff) => {
      const pulse = (Math.sin(Date.now() / 200 + ff.id) + 1) / 2;
      if (isSpace) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.6})`;
        this.ctx.shadowBlur = 4 * pulse;
        this.ctx.shadowColor = "#fff";
      } else if (isDesert) {
        this.ctx.fillStyle = `rgba(217, 119, 6, ${0.2 + pulse * 0.3})`;
        this.ctx.shadowBlur = 0;
      } else if (this.level === "atlantis") {
        this.ctx.fillStyle = `rgba(165, 243, 252, ${0.3 + pulse * 0.3})`;
        this.ctx.shadowBlur = 5 * pulse;
        this.ctx.shadowColor = "#22d3ee";
      } else if (this.level === "arctic") {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.4})`;
        this.ctx.shadowBlur = 2;
      } else if (this.level === "radioactive" || this.level === "laboratory") {
        this.ctx.fillStyle = `rgba(74, 222, 128, ${0.5 + pulse * 0.5})`;
        this.ctx.shadowBlur = 8 * pulse;
        this.ctx.shadowColor = "#4ade80";
      } else if (this.level === "volcano" || this.level === "inferno") {
        this.ctx.fillStyle = `rgba(249, 115, 22, ${0.4 + pulse * 0.6})`;
        this.ctx.shadowBlur = 6 * pulse;
        this.ctx.shadowColor = "#f97316";
      } else if (this.level === "metropolis") {
        this.ctx.fillStyle = `rgba(6, 182, 212, ${0.5 + pulse * 0.5})`;
        this.ctx.shadowBlur = 10 * pulse;
        this.ctx.shadowColor = "#06b6d4";
      } else {
        this.ctx.fillStyle = `rgba(200, 255, 100, ${0.5 + pulse * 0.5})`;
        this.ctx.shadowBlur = 10 * pulse;
        this.ctx.shadowColor = "#c8ff64";
      }
      this.ctx.beginPath();
      this.ctx.arc(
        ff.position.x,
        ff.position.y,
        isSpace ? 2 : this.level === "atlantis" ? 5 : 4,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
    });
    this.ctx.restore();

    // Draw Vines (Dynamic Sway)
    if (
      this.level === "jungle" ||
      this.level === "atlantis" ||
      this.level === "cave" ||
      this.level === "radioactive" ||
      this.level === "greenhouse" ||
      this.level === "laboratory"
    ) {
      this.ctx.save();
      this.vines.forEach((v) => {
        const isSeaweed = (v as any).isSeaweed;
        const isStalactite = (v as any).isStalactite;
        const isPipe = (v as any).isPipe;
        const isBurned = v.isBurned;

        const swayMult = isSeaweed ? 30 : isPipe ? 0 : 15;
        const sway = isBurned
          ? 0
          : Math.sin(Date.now() / 1500 + v.points[0].x) * swayMult;

        this.ctx.strokeStyle = isBurned
          ? "#422006"
          : isSeaweed
            ? "#0891b2"
            : isStalactite
              ? "#4b5563"
              : isPipe
                ? "#1e293b"
                : "#2d6a4f";
        this.ctx.lineWidth = isPipe ? 10 : isBurned ? 2 : 5;
        if (isBurned) this.ctx.setLineDash([5, 5]);

        this.ctx.shadowBlur = isSeaweed ? 15 : 5;
        this.ctx.shadowColor = isSeaweed ? "#22d3ee" : "#4ade80";

        this.ctx.beginPath();
        this.ctx.moveTo(v.points[0].x, v.points[0].y);

        // Draw curved vine
        const end = v.points[v.points.length - 1];
        const cp1x = v.points[0].x + sway * 0.5;
        const cp1y = v.points[0].y + (end.y - v.points[0].y) * 0.3;
        const cp2x = end.x + sway;
        const cp2y = v.points[0].y + (end.y - v.points[0].y) * 0.7;

        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x + sway, end.y);
        this.ctx.stroke();

        if (!isStalactite && !isPipe) {
          // Organic leaves/foliage
          this.ctx.fillStyle = isSeaweed
            ? "rgba(8, 145, 178, 0.4)"
            : "rgba(45, 106, 79, 0.6)";
          for (let i = 1; i < v.points.length; i++) {
            const ratio = i / v.points.length;
            const leafX = v.points[i].x + sway * ratio;
            const leafY = v.points[i].y;

            this.ctx.beginPath();
            this.ctx.ellipse(
              leafX,
              leafY,
              12,
              6,
              Math.PI / 4 + ratio,
              0,
              Math.PI * 2,
            );
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.ellipse(
              leafX,
              leafY,
              12,
              6,
              -Math.PI / 4 + ratio,
              0,
              Math.PI * 2,
            );
            this.ctx.fill();
          }
        }
      });
      this.ctx.restore();
    }

    // Draw Shrubs/Cacti/Tech Bits
    this.ctx.save();
    this.shrubs.forEach((s) => {
      this.ctx.shadowBlur = 10;
      if ((s as any).isTech) {
        this.ctx.fillStyle = "#1e3a8a";
        this.ctx.strokeStyle = "#3b82f6";
        this.ctx.shadowColor = "#3b82f6";
        this.ctx.fillRect(
          s.x - s.width / 2,
          s.y - s.height / 2,
          s.width,
          s.height,
        );
        this.ctx.strokeRect(
          s.x - s.width / 2,
          s.y - s.height / 2,
          s.width,
          s.height,
        );
      } else if ((s as any).isCactus) {
        this.ctx.fillStyle = "#065f46";
        this.ctx.strokeStyle = "#10b981";
        this.ctx.shadowColor = "#10b981";
        this.ctx.beginPath();
        this.ctx.roundRect(
          s.x - s.width / 2,
          s.y - s.height / 2,
          s.width,
          s.height,
          10,
        );
        this.ctx.fill();
        this.ctx.stroke();
      } else if ((s as any).isCoral) {
        this.ctx.fillStyle = "#f43f5e";
        this.ctx.strokeStyle = "#fda4af";
        this.ctx.shadowColor = "#f43f5e";
        this.ctx.beginPath();
        this.ctx.roundRect(
          s.x - s.width / 2,
          s.y - s.height / 2,
          s.width,
          s.height,
          5,
        );
        this.ctx.fill();
        this.ctx.stroke();
      } else if ((s as any).isGem) {
        this.ctx.fillStyle = "#a855f7";
        this.ctx.strokeStyle = "#d8b4fe";
        this.ctx.shadowColor = "#a855f7";
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.moveTo(s.x, s.y - s.height / 2);
        this.ctx.lineTo(s.x + s.width / 2, s.y);
        this.ctx.lineTo(s.x, s.y + s.height / 2);
        this.ctx.lineTo(s.x - s.width / 2, s.y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      } else if ((s as any).isBarrel) {
        this.ctx.fillStyle = "#4d7c0f";
        this.ctx.strokeStyle = "#bef264";
        this.ctx.shadowColor = "#4ade80";
        this.ctx.fillRect(
          s.x - s.width / 2,
          s.y - s.height / 2,
          s.width,
          s.height,
        );
        this.ctx.strokeRect(
          s.x - s.width / 2,
          s.y - s.height / 2,
          s.width,
          s.height,
        );
      } else {
        this.ctx.fillStyle = "rgba(74, 222, 128, 0.15)";
        this.ctx.strokeStyle = "#22c55e";
        this.ctx.shadowColor = "#22c55e";
        this.ctx.beginPath();
        this.ctx.roundRect(
          s.x - s.width / 2,
          s.y - s.height / 2,
          s.width,
          s.height,
          8,
        );
        this.ctx.fill();
        this.ctx.stroke();
      }
    });
    this.ctx.restore();

    this.players.forEach((p) => {
      if (!p.figure.isVisible && !p.data.isGhost) return;
      this.ctx.save();
      if (p.data.isGhost) {
        // Ghostly pulse without expensive shadowBlur
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
        this.ctx.globalAlpha = 0.2 + pulse * 0.2;
        this.ctx.globalCompositeOperation = "lighter";
      }

      // Speed Trail Visual Enhancement (Efficient lighter blending instead of shadowBlur)
      const speed = Vector.magnitude(p.figure.torso.velocity);
      if (speed > 10) {
        this.ctx.globalCompositeOperation = "lighter";
        this.ctx.globalAlpha = Math.min(0.3, (speed - 10) / 20);
        p.figure.draw(this.ctx);
        this.ctx.globalCompositeOperation = "source-over";
      }

      this.ctx.globalAlpha = p.data.isGhost ? 0.3 : 1.0;
      p.figure.draw(this.ctx);
      this.ctx.restore();
    });

    // Draw Particles
    this.ctx.save();
    
    // Group particles by blending mode to minimize state changes
    const normalParticles = this.particles.filter(p => !p.additive);
    const additiveParticles = this.particles.filter(p => p.additive);

    const renderParticleBatch = (batch: any[], isAdditive: boolean) => {
      if (isAdditive) {
        this.ctx.globalCompositeOperation = "lighter";
      } else {
        this.ctx.globalCompositeOperation = "source-over";
      }

      batch.forEach((p) => {
        this.ctx.globalAlpha = p.life;
        this.ctx.fillStyle = p.color;
        
        const hasTransform = p.rotation || (p.x !== 0 || p.y !== 0);
        
        if (hasTransform) {
          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          if (p.rotation) this.ctx.rotate(p.rotation);
        }

        if (p.type === "spark") {
          // Optimized spark: simple line, avoid shadowBlur
          this.ctx.beginPath();
          this.ctx.moveTo(-p.size * 2, 0);
          this.ctx.lineTo(p.size * 2, 0);
          this.ctx.lineWidth = 2;
          this.ctx.strokeStyle = p.color;
          this.ctx.stroke();
        } else if (p.type === "smoke") {
          this.ctx.beginPath();
          this.ctx.arc(hasTransform ? 0 : p.x, hasTransform ? 0 : p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (p.type === "fluid" || p.type === "glow") {
          // High-performance glow: additive blending handles the "intensity"
          // We draw a large faint circle for the glow and a small bright core
          const size = p.size;
          
          // Outer glow (faint)
          this.ctx.globalAlpha = p.life * 0.3;
          this.ctx.beginPath();
          this.ctx.arc(hasTransform ? 0 : p.x, hasTransform ? 0 : p.y, size * (p.type === "glow" ? 2.5 : 1.5), 0, Math.PI * 2);
          this.ctx.fill();
          
          // Core
          this.ctx.globalAlpha = p.life;
          this.ctx.beginPath();
          this.ctx.arc(hasTransform ? 0 : p.x, hasTransform ? 0 : p.y, size * 0.8, 0, Math.PI * 2);
          this.ctx.fill();

          if (p.type === "fluid") {
            this.ctx.fillStyle = "#fff";
            this.ctx.globalAlpha = p.life * 0.5;
            this.ctx.beginPath();
            this.ctx.arc((hasTransform ? 0 : p.x) - size * 0.2, (hasTransform ? 0 : p.y) - size * 0.2, size * 0.25, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = p.color; // Reset for next particle
          }
        } else {
          this.ctx.beginPath();
          this.ctx.arc(hasTransform ? 0 : p.x, hasTransform ? 0 : p.y, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }

        if (hasTransform) {
          this.ctx.restore();
        }
      });
    };

    renderParticleBatch(normalParticles, false);
    renderParticleBatch(additiveParticles, true);
    
    this.ctx.restore();

    // Draw Portals
    this.portals.forEach((p) => {
      const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
      this.ctx.save();
      this.ctx.shadowBlur = 15 + pulse * 10;
      this.ctx.shadowColor = p.type === "orange" ? "#f97316" : "#3b82f6";
      this.ctx.strokeStyle = p.type === "orange" ? "#f97316" : "#3b82f6";
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.ellipse(
        p.body.position.x,
        p.body.position.y,
        25,
        45,
        0,
        0,
        Math.PI * 2,
      );
      this.ctx.stroke();

      this.ctx.globalAlpha = 0.3;
      this.ctx.fillStyle = p.type === "orange" ? "#ffedd5" : "#dbeafe";
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw Clones
    this.clones.forEach((c) => {
      this.ctx.save();
      this.ctx.translate(c.body.position.x, c.body.position.y);
      this.ctx.globalAlpha = 0.4;
      this.ctx.strokeStyle = "#4d7c0f";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, -20, 8, 0, Math.PI * 2);
      this.ctx.moveTo(0, -12);
      this.ctx.lineTo(0, 5);
      this.ctx.moveTo(-10, -5);
      this.ctx.lineTo(10, -5);
      this.ctx.moveTo(0, 5);
      this.ctx.lineTo(-8, 15);
      this.ctx.moveTo(0, 5);
      this.ctx.lineTo(8, 15);
      this.ctx.stroke();
      this.ctx.restore();
    });

    // Draw Projectile Trails
    this.ctx.save();
    this.ctx.globalCompositeOperation = "lighter";
    this.projectiles.forEach((p) => {
      const pData = p as any;
      if (pData.trailPoints && pData.trailPoints.length > 1) {
        const color = (p.render.fillStyle as string) || "#fff";
        
        // Draw glow layer (thicker, more transparent)
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        
        pData.trailPoints.forEach((point: any, i: number) => {
          const ratio = i / pData.trailPoints.length;
          this.ctx.lineWidth = (pData.circleRadius || 8) * ratio * 4; // Thick glow
          this.ctx.globalAlpha = ratio * 0.2;
          if (i === 0) this.ctx.moveTo(point.x, point.y);
          else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();

        // Draw core layer (thinner, more opaque)
        this.ctx.beginPath();
        pData.trailPoints.forEach((point: any, i: number) => {
          const ratio = i / pData.trailPoints.length;
          this.ctx.lineWidth = (pData.circleRadius || 8) * ratio * 1.5;
          this.ctx.globalAlpha = ratio * 0.8;
          if (i === 0) this.ctx.moveTo(point.x, point.y);
          else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();
      }
    });
    this.ctx.restore();

    // Draw Effects (Explosions)
    this.ctx.save();
    this.ctx.globalCompositeOperation = "lighter";
    this.effects.forEach((e) => {
      const ratio = e.life / e.maxLife;
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius * (0.2 + (1 - ratio) * 1.3), 0, Math.PI * 2);
      this.ctx.fillStyle = e.color;
      this.ctx.globalAlpha = ratio * 0.7;
      this.ctx.fill();

      // Sharp white inner ring
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius * (0.1 + (1 - ratio) * 1.1), 0, Math.PI * 2);
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 3 * ratio;
      this.ctx.globalAlpha = ratio * 0.5;
      this.ctx.stroke();
    });
    this.ctx.restore();

    this.weaponDrops.forEach((w) => {
      const weapon = (w as any).weapon as Weapon;
      const color = this.rarityColors[weapon.rarity];
      const pulse = (Math.sin(Date.now() / 200) + 1) / 2;

      // Background Glow
      this.ctx.save();
      this.ctx.shadowBlur = 20 + pulse * 10;
      this.ctx.shadowColor = color;
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.1 + pulse * 0.1;
      this.ctx.beginPath();
      this.ctx.arc(w.position.x, w.position.y, 40 + pulse * 10, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.fillStyle = "#fff";
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3 + pulse;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = color;

      this.ctx.save();
      this.ctx.translate(w.position.x, w.position.y);
      this.ctx.rotate(w.angle + Math.sin(Date.now() / 500) * 0.1);
      this.ctx.fillRect(-22, -12, 44, 24);
      this.ctx.strokeRect(-22, -12, 44, 24);

      this.ctx.fillStyle = "#111";
      this.ctx.font = "black 9px Inter";
      this.ctx.textAlign = "center";
      this.ctx.fillText(weapon.type.toUpperCase(), 0, 4);

      // Rarity indicator
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(0, -12, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      this.ctx.shadowBlur = 0;

      // Rising particles for high rarity
      if (
        ["legendary", "mythical"].includes(weapon.rarity) &&
        Math.random() > 0.8
      ) {
        this.createParticles(
          w.position.x + (Math.random() - 0.5) * 40,
          w.position.y,
          color,
          1,
          0.5,
          {
            type: "smoke",
            size: 15,
            gravity: -0.1,
            life: 0.8,
          },
        );
      }
    });

    // Draw God Pellets
    this.godPellets.forEach((gp) => {
      const color = (gp as any).colorHex;
      const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
      this.ctx.save();
      this.ctx.shadowBlur = 20 + pulse * 10;
      this.ctx.shadowColor = color;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(
        gp.position.x,
        gp.position.y,
        15 + pulse * 3,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();

      // Inner white shine
      this.ctx.fillStyle = "#fff";
      this.ctx.globalAlpha = 0.8;
      this.ctx.beginPath();
      this.ctx.arc(gp.position.x - 4, gp.position.y - 4, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw Portals
    this.ctx.save();
    this.portals.forEach((p) => {
      const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
      this.ctx.beginPath();
      this.ctx.ellipse(
        p.body.position.x,
        p.body.position.y,
        25 + pulse * 5,
        45 + pulse * 10,
        0,
        0,
        Math.PI * 2,
      );
      this.ctx.fillStyle = p.type === "orange" ? "#f97316" : "#38bdf8";
      this.ctx.shadowBlur = 25;
      this.ctx.shadowColor = this.ctx.fillStyle as string;
      this.ctx.fill();

      // Inner black hole part
      this.ctx.beginPath();
      this.ctx.ellipse(
        p.body.position.x,
        p.body.position.y,
        18,
        35,
        0,
        0,
        Math.PI * 2,
      );
      this.ctx.fillStyle = "#000";
      this.ctx.fill();

      // Sparkle
      if (Math.random() > 0.9) {
        this.createParticles(
          p.body.position.x,
          p.body.position.y,
          p.type === "orange" ? "#f97316" : "#38bdf8",
          1,
          0.5,
        );
      }
    });
    this.ctx.restore();

    // Draw Moving Lasers
    this.ctx.save();
    this.platforms.forEach((p) => {
      if ((p as any).isLaser) {
        const pulse = (Math.sin(Date.now() / 100) + 1) / 2;
        const color = (p as any).neonColor || "#ff4d4d";
        this.ctx.shadowBlur = 20 + pulse * 10;
        this.ctx.shadowColor = color;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 8 + pulse * 4;
        this.ctx.lineCap = "round";

        const b = p.bounds;
        this.ctx.beginPath();
        if ((p as any).moveAxis === "y") {
          this.ctx.moveTo(p.position.x, b.min.y);
          this.ctx.lineTo(p.position.x, b.max.y);
        } else {
          this.ctx.moveTo(b.min.x, p.position.y);
          this.ctx.lineTo(b.max.x, p.position.y);
        }
        this.ctx.stroke();
      }
    });
    this.ctx.restore();

    // Draw Drones
    this.ctx.save();
    this.drones.forEach((d) => {
      this.ctx.fillStyle = "#94a3b8";
      this.ctx.strokeStyle = "#334155";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(d.body.position.x, d.body.position.y, 15, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Eye
      this.ctx.fillStyle = Math.sin(Date.now() / 100) > 0 ? "#f00" : "#400";
      this.ctx.beginPath();
      this.ctx.arc(d.body.position.x, d.body.position.y, 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Thruster
      this.createParticles(
        d.body.position.x,
        d.body.position.y + 15,
        "#38bdf8",
        1,
        0.2,
      );
    });
    this.ctx.restore();

    // Draw Sentries
    this.ctx.save();
    this.sentries.forEach((s) => {
      this.ctx.fillStyle = "#475569";
      this.ctx.strokeStyle = "#1e293b";
      this.ctx.lineWidth = 3;
      const w = 40;
      this.ctx.fillRect(
        s.body.position.x - w / 2,
        s.body.position.y - w / 2,
        w,
        w,
      );
      this.ctx.strokeRect(
        s.body.position.x - w / 2,
        s.body.position.y - w / 2,
        w,
        w,
      );

      // Eye
      this.ctx.fillStyle = "#f00";
      this.ctx.beginPath();
      this.ctx.arc(s.body.position.x, s.body.position.y - 5, 4, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();

    this.projectiles.forEach((p) => {
      const pData = p as any;
      const color = (p.render.fillStyle as string) || "white";
      
      this.ctx.save();
      this.ctx.globalCompositeOperation = "lighter";

      if (pData.isBlackHole || pData.isEraser) {
        this.ctx.translate(p.position.x, p.position.y);
        this.ctx.rotate(Date.now() / 150);
        const radius = pData.isEraser ? 60 : 40;
        const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        grad.addColorStop(0, "#000");
        grad.addColorStop(0.7, pData.isEraser ? "#ff0000" : "#a855f7");
        grad.addColorStop(1, "transparent");
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Add spikes
        this.ctx.strokeStyle = pData.isEraser ? "#ff4d4d" : "#d8b4fe";
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + Date.now() / 1000;
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.lineTo(
            Math.cos(a) * radius * 1.5,
            Math.sin(a) * radius * 1.5,
          );
          this.ctx.stroke();
        }
      } else if (pData.isRailgun) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = "#38bdf8";
        this.ctx.lineWidth = 2 + Math.random() * 4;
        this.ctx.moveTo(p.position.x, p.position.y);
        this.ctx.lineTo(
          p.position.x - p.velocity.x * 2,
          p.position.y - p.velocity.y * 2,
        );
        this.ctx.stroke();
      } else {
        const radius = p.circleRadius || 6;
        
        // Multi-layered glow (Efficient replacement for shadowBlur)
        // Outer glow
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(p.position.x, p.position.y, radius * 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner glow
        this.ctx.globalAlpha = 0.6;
        this.ctx.beginPath();
        this.ctx.arc(p.position.x, p.position.y, radius * 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // White Core
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = "#fff";
        this.ctx.beginPath();
        this.ctx.arc(p.position.x, p.position.y, radius * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    this.magnets.forEach((m) => {
      const pos = (m.body as any).position || m.body;
      this.ctx.fillStyle = "#ef4444";
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = "#ef4444";
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.effects.forEach((e) => {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(
        e.x,
        e.y,
        e.radius * (1 - e.life / e.maxLife),
        0,
        Math.PI * 2,
      );
      this.ctx.fillStyle = e.color;
      this.ctx.fill();
      this.ctx.restore();
    });

    this.drawLighting();

    this.ctx.restore();

    // Final Screen Effects
    this.drawVignette();
  }

  public cleanup() {
    World.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
