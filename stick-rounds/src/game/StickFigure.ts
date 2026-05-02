import Matter from 'matter-js';
import { PlayerStats, Weapon, GodModeColor } from '../types/game';

const { Bodies, Composite, Constraint, Body } = Matter;

export class StickFigure {
  public composite: Matter.Composite;
  public torso: Matter.Body;
  
  private stats: PlayerStats;
  private color: string;
  private id: number;
  private currentWeapon?: Weapon;
  private hasForceField: boolean = false;
  private isFrozen: boolean = false;
  private isGodMode: boolean = false;
  private hasSpeedBoost: boolean = false;
  public isVisible: boolean = true;
  private activeGodMode?: GodModeColor;
  
  private jumpCount: number = 0;
  private lastJumpTime: number = 0;
  private jumpCooldown: number = 250; 
  private lastOnWall: number = 0;
  private lastWallSide: number = 0; // -1 for left, 1 for right
  public facing: number = 1; // 1 for right, -1 for left
  private archetypeId?: string;

  constructor(x: number, y: number, color: string, stats: PlayerStats, id: number, archetypeId?: string) {
    this.stats = stats;
    this.color = color;
    this.id = id;
    this.archetypeId = archetypeId;
    this.composite = Composite.create();

    const size = 32;
    this.torso = Bodies.rectangle(x, y, size, size, {
      friction: 0.1,
      frictionStatic: 0.1,
      frictionAir: 0.02,
      restitution: 0,
      inertia: Infinity,
      render: { fillStyle: color },
      label: 'player'
    });

    Composite.add(this.composite, [this.torso]);
  }

  update(input: { left: boolean, right: boolean, jump: boolean, aimX: number, aimY: number }, gravityY: number = 1) {
    const force = 0.008 * (this.stats.movementSpeed / 5);
    const now = Date.now();
    
    // Horizontal Movement
    if (input.left) {
      Body.applyForce(this.torso, this.torso.position, { x: -force, y: 0 });
      this.facing = -1;
    }
    if (input.right) {
      Body.applyForce(this.torso, this.torso.position, { x: force, y: 0 });
      this.facing = 1;
    }

    // Velocity capping
    const maxVel = 10 * (this.stats.movementSpeed / 5);
    if (Math.abs(this.torso.velocity.x) > maxVel) {
      Body.setVelocity(this.torso, { x: Math.sign(this.torso.velocity.x) * maxVel, y: this.torso.velocity.y });
    }

    // Grounded check (using velocity relative to gravity)
    const isGrounded = Math.abs(this.torso.velocity.y) < 0.1;

    // Simple wall detection logic would usually come from the engine's collision events,
    // but we can approximate or rely on the engine setting lastOnWall.
    
    if (isGrounded) {
      this.jumpCount = 0;
      this.lastOnWall = 0;
    }

    // Wall Jump / Wall Walk Logic
    const jumpYV = gravityY > 0 ? -13 : 13;
    const wallJumpYV = gravityY > 0 ? -11 : 11;

    if (input.jump && now - this.lastJumpTime > this.jumpCooldown) {
      const allowedJumps = (this.archetypeId === 'acrobat' ? 3 : 2) + (this.stats.extraJumps || 0);
      if (isGrounded || this.jumpCount < allowedJumps) {
        Body.setVelocity(this.torso, { x: this.torso.velocity.x, y: jumpYV });
        this.jumpCount++;
        this.lastJumpTime = now;
      } 
      else if (now - this.lastOnWall < 200) { // Wall Jump
        const jumpDir = -this.lastWallSide;
        Body.setVelocity(this.torso, { x: jumpDir * 10, y: wallJumpYV });
        this.lastJumpTime = now;
        this.jumpCount = 1; 
      }
    }

    // Sticky Friction (Wall Walking)
    if (this.stats.wallWalk && (now - this.lastOnWall < 200)) {
        // Apply a small force towards the wall to keep us attached
        Body.applyForce(this.torso, this.torso.position, { x: this.lastWallSide * 0.008, y: 0 });
        
        // Frictionless vertical climbing if moving towards wall or something?
        // Let's just slightly reduce gravity while on wall
        const wallFrictionForce = { x: 0, y: gravityY > 0 ? -0.005 : 0.005 };
        Body.applyForce(this.torso, this.torso.position, wallFrictionForce);
    }

    // Stabilize rotation
    Body.setAngle(this.torso, 0);
  }

  // Called by GameEngine on collision
  public setOnWall(side: number) {
    this.lastOnWall = Date.now();
    this.lastWallSide = side;
  }

  // Called by GameEngine on update
  public setExternalState(stats: PlayerStats, weapon?: Weapon, hasForceField: boolean = false, isFrozen: boolean = false, isGodMode: boolean = false, hasSpeedBoost: boolean = false, isVisible: boolean = true, activeGodMode?: GodModeColor) {
    this.stats = stats;
    this.currentWeapon = weapon;
    this.hasForceField = hasForceField;
    this.isFrozen = isFrozen;
    this.isGodMode = isGodMode;
    this.hasSpeedBoost = hasSpeedBoost;
    this.isVisible = isVisible;
    this.activeGodMode = activeGodMode;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const pos = this.torso.position;
    const size = 32;
    const now = Date.now();

    ctx.save();
    ctx.translate(pos.x, pos.y);

    // Neon Glow & Bolder Outlines
    if (this.stats.neonGlow) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
    }
    
    if (this.stats.health / this.stats.maxHealth > 0.8) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.color;
    }

    if (!this.isVisible) {
      ctx.globalAlpha = 0.25; // Shadowy but controllable
    }

    // God Mode Aura
    if (this.activeGodMode) {
        const godColors = {
            red: '#ef4444', orange: '#f97316', yellow: '#facc15', green: '#22c55e', blue: '#3b82f6', purple: '#d946ef', pink: '#f472b6'
        };
        const color = godColors[this.activeGodMode];
        const pulse = (Math.sin(now / 150) + 1) / 2;
        
        ctx.save();
        ctx.globalAlpha = 0.3 + pulse * 0.2;
        ctx.shadowBlur = 30 + pulse * 20;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        
        // Spinning ring
        ctx.rotate(now / 500);
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    // Archetype Specific Visuals
    if (this.archetypeId) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        switch (this.archetypeId) {
            case 'titan':
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 4;
                ctx.strokeRect(-size/2 - 4, -size/2 - 4, size + 8, size + 8);
                break;
            case 'wraith':
                ctx.globalAlpha = 0.6 + Math.sin(now / 200) * 0.2;
                // Ghostly offset copies
                for (let i = 1; i <= 2; i++) {
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = 0.2 / i;
                    ctx.fillRect(-size/2 - i*4, -size/2, size, size);
                }
                break;
            case 'acrobat':
                // Sparkle particles
                if (Math.random() > 0.8) {
                    // (Handle via engine or just static bits)
                }
                ctx.beginPath();
                ctx.arc(0, size/2, size/3, 0, Math.PI, false);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
            case 'gunner':
                ctx.fillStyle = '#fff';
                ctx.fillRect(size/2 - 2, -size/2, 4, size);
                break;
        }
        ctx.restore();
    }

    // Core Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.rect(-size/2, -size/2, size, size);
    ctx.fill();
    
    // Subtle inner gradient for some depth but keep it mostly flat
    const grad = ctx.createLinearGradient(0, -size/2, 0, size/2);
    grad.addColorStop(0, 'rgba(255,255,255,0.1)');
    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Eye
    const eyeX = this.facing * (size/4);
    const eyeY = -size/8;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Shield / Power Effect (Slimmer)
    if (this.hasForceField || this.isGodMode) {
        ctx.strokeStyle = this.isGodMode ? '#fbbf24' : '#0ea5e9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Weapon
    if (this.currentWeapon) {
        ctx.save();
        ctx.translate(this.facing * (size/2 + 5), 0);
        
        const w = this.currentWeapon;
        ctx.fillStyle = '#262626';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;

        switch (w.type) {
            case 'pistol':
                ctx.fillRect(-6, -3, 12, 6);
                ctx.fillRect(-6, 0, 4, 8);
                break;
            case 'sword':
            case 'plasma_sword':
            case 'void_sabre':
            case 'light_saber':
            case 'dimension_tearing_blade':
                ctx.rotate(-Math.PI / 4 * this.facing);
                const sColor = w.type === 'plasma_sword' ? '#ec4899' : (w.type === 'void_sabre' ? '#7c3aed' : (w.type === 'light_saber' ? '#3b82f6' : '#e5e5e5'));
                ctx.shadowBlur = (w.type !== 'sword') ? 15 : 0;
                ctx.shadowColor = sColor;
                ctx.fillStyle = sColor;
                ctx.fillRect(-2, -45, 4, 45);
                ctx.fillStyle = '#404040';
                ctx.fillRect(-6, 0, 12, 4);
                break;
            case 'void_bow':
            case 'thunder_bow':
                ctx.beginPath();
                ctx.arc(-10, 0, 20, -Math.PI/2, Math.PI/2);
                ctx.strokeStyle = w.type === 'void_bow' ? '#7c3aed' : '#fde047';
                ctx.lineWidth = 3;
                ctx.stroke();
                break;
            case 'world_slayer':
            case 'omega_cannon':
                ctx.fillStyle = w.type === 'world_slayer' ? '#ef4444' : '#262626';
                ctx.fillRect(-20, -10, 40, 20);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(-20, -10, 40, 20);
                if (Math.random() > 0.5) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(15, -8, 2, 16);
                }
                break;
            case 'holy_grenade':
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                // Cross on top
                ctx.fillRect(-1, -12, 2, 4);
                ctx.fillRect(-3, -10, 6, 2);
                break;
            default:
                ctx.fillRect(-8, -4, 16, 8);
                ctx.fillStyle = '#404040';
                ctx.fillRect(8, -2, 4, 4);
        }
        ctx.restore();
    }

    // Freeze block
    if (this.isFrozen) {
        ctx.save();
        ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4, 8);
        ctx.fill();
        ctx.stroke();
        // Ice cracks
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, -size * 0.5); ctx.lineTo(size * 0.3, size * 0.2);
        ctx.moveTo(size * 0.4, -size * 0.4); ctx.lineTo(-size * 0.2, size * 0.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
  }
}
