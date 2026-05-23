import Matter from 'matter-js';
import { PlayerStats, Weapon, GodModeColor } from '../types/game';

const { Bodies, Composite, Constraint, Body } = Matter;

export class CubeCharacter {
  public composite: Matter.Composite;
  public torso: Matter.Body;
  
  private stats: PlayerStats;
  private color: string;
  private id: number;
  private currentWeapon?: Weapon;
  private hasForceField: boolean = false;
  private isFrozen: boolean = false;
  private isStunned: boolean = false;
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

  update(input: { left: boolean, right: boolean, jump: boolean, aimX: number, aimY: number, up?: boolean, down?: boolean }, gravityY: number = 1, onVine: boolean = false) {
    const force = 0.007 * (this.stats.movementSpeed / 5);
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

    // Climbing Logic
    if (onVine) {
      // Counter-act gravity while on vine
      Body.applyForce(this.torso, this.torso.position, { x: 0, y: -gravityY * this.torso.mass * 0.001 });
      
      // Vertical Movement on Vine
      if (input.up) {
        Body.setVelocity(this.torso, { x: this.torso.velocity.x, y: gravityY > 0 ? -4 : 4 });
      } else if (input.down) {
        Body.setVelocity(this.torso, { x: this.torso.velocity.x, y: gravityY > 0 ? 4 : -4 });
      } else {
        // Hold position vertically if not moving
        Body.setVelocity(this.torso, { x: this.torso.velocity.x, y: this.torso.velocity.y * 0.9 });
      }
      
      // Reset jump count while on vine to allow climbing and then jumping off
      this.jumpCount = 0;
    }

    // Velocity capping
    const maxVel = 9 * (this.stats.movementSpeed / 5);
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
  public setExternalState(stats: PlayerStats, weapon?: Weapon, hasForceField: boolean = false, isFrozen: boolean = false, isGodMode: boolean = false, hasSpeedBoost: boolean = false, isVisible: boolean = true, activeGodMode?: GodModeColor, isStunned: boolean = false) {
    this.stats = stats;
    this.currentWeapon = weapon;
    this.hasForceField = hasForceField;
    this.isFrozen = isFrozen;
    this.isStunned = isStunned;
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
                // Heavy armor plate
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(-size/2 + 4, -size/2 + 4, size - 8, size - 8);
                // Rivets
                ctx.fillStyle = '#fff';
                [-size/2 + 4, size/2 - 4].forEach(x => {
                    [-size/2 + 4, size/2 - 4].forEach(y => {
                        ctx.beginPath();
                        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                });
                break;
            case 'wraith':
                ctx.globalAlpha = 0.6 + Math.sin(now / 200) * 0.2;
                // Ghostly trails are mostly handled by alpha in this case
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-size/2, -size/4);
                ctx.lineTo(-size/2 - 8, 0);
                ctx.lineTo(-size/2, size/4);
                ctx.stroke();
                break;
            case 'acrobat':
                // Wing-like protrusions
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(-size/2, -size/2);
                ctx.lineTo(-size/2 - 10, -size/2 + 5);
                ctx.lineTo(-size/2, -size/2 + 10);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(size/2, -size/2);
                ctx.lineTo(size/2 + 10, -size/2 + 5);
                ctx.lineTo(size/2, -size/2 + 10);
                ctx.fill();
                break;
            case 'gunner':
                // Tactical visor/band
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(-size/2, -size/4, size, size/2);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(-size/2, -size/4, size, size/2);
                break;
            case 'neon_ninja':
                // Glowing visor
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 10;
                ctx.fillRect(this.facing * (size/4), -size/4, this.facing * 8, 4);
                // Tech lines
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-size/4, size/2);
                ctx.lineTo(0, size/4);
                ctx.lineTo(size/4, size/2);
                ctx.stroke();
                break;
            case 'molten_core':
                // Magma cracks
                ctx.strokeStyle = '#fb923c';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-size/2, 0); ctx.lineTo(-size/4, -size/4); ctx.lineTo(0, 0);
                ctx.moveTo(size/2, 0); ctx.lineTo(size/4, size/4); ctx.lineTo(0, 0);
                ctx.stroke();
                // Embers
                ctx.fillStyle = '#fff';
                const orbit = now / 300;
                ctx.fillRect(Math.cos(orbit) * 20, Math.sin(orbit) * 20, 2, 2);
                break;
            case 'frost_giant':
                // Ice spikes
                ctx.fillStyle = '#bae6fd';
                for(let i=0; i<3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-size/2 + i*10, -size/2);
                    ctx.lineTo(-size/2 + i*10 + 5, -size/2 - 8);
                    ctx.lineTo(-size/2 + i*10 + 10, -size/2);
                    ctx.fill();
                }
                break;
            case 'static_demon':
                // Spiky electric protrusions
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 2;
                for(let i=0; i<4; i++) {
                    const r = (now / 100) + (i * Math.PI / 2);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(r) * 16, Math.sin(r) * 16);
                    ctx.lineTo(Math.cos(r) * 24, Math.sin(r) * 24);
                    ctx.stroke();
                }
                break;
            case 'vampire_lord':
                // High collar/cape silhouette
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(-size/2, -size/2);
                ctx.lineTo(-size/2 - 5, -size/2 - 10);
                ctx.lineTo(-size/2 + 10, -size/2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(size/2, -size/2);
                ctx.lineTo(size/2 + 5, -size/2 - 10);
                ctx.lineTo(size/2 - 10, -size/2);
                ctx.fill();
                break;
            case 'stellar_nova':
                // Central white eye/core and orbital ring
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 0.8, size * 0.3, now / 1000, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'chaos_glitch':
                // Distorted geometry
                if (Math.random() > 0.8) {
                    ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
                }
                ctx.fillStyle = '#fff';
                ctx.fillRect(-size/2 - 4, -size/4, 4, 8);
                ctx.fillRect(size/2, size/4, 4, 8);
                break;
            case 'bio_hazard':
                // Bubbles
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                for(let i=0; i<3; i++) {
                    const offset = (now / 1000 + i) % 1;
                    ctx.beginPath();
                    ctx.arc(-size/4 + i*8, size/2 - offset*25, 3, 0, Math.PI*2);
                    ctx.stroke();
                }
                break;
            case 'mecha_prime':
                // Tech plating/circuit lines
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.strokeRect(-size/2 + 2, -size/2 + 2, size - 4, size - 4);
                ctx.beginPath();
                ctx.moveTo(0, -size/2); ctx.lineTo(0, size/2);
                ctx.moveTo(-size/2, 0); ctx.lineTo(size/2, 0);
                ctx.stroke();
                break;
            case 'spirit_guide':
                // Floating orbs
                ctx.fillStyle = '#fff';
                for(let i=0; i<2; i++) {
                    const r = now/500 + i*Math.PI;
                    ctx.beginPath();
                    ctx.arc(Math.cos(r)*25, Math.sin(r)*25, 3, 0, Math.PI*2);
                    ctx.fill();
                }
                break;
            case 'quantum_quark':
                // Rapidly shifting state
                if (Math.sin(now / 50) > 0.5) {
                    ctx.globalAlpha = 0.3;
                }
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(-size/2 - 2, -size/2 - 2, size + 4, size + 4);
                break;
            case 'druid_root':
                // Leaf/Vine pattern
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-size/2, size/2);
                ctx.quadraticCurveTo(0, 0, size/2, -size/2);
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(0, 0, 4, 8, Math.PI/4, 0, Math.PI*2);
                ctx.fill();
                break;
            case 'sun_stepper':
                // Sun rays
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                for(let i=0; i<8; i++) {
                    const angle = i * Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle)*size, Math.sin(angle)*size);
                    ctx.stroke();
                }
                break;
            case 'void_reaper':
                // Deep void
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(0, 0, size/2, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
            case 'gravity_monarch':
                // Swirling void
                ctx.rotate(now / 200);
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, size/2, 0, Math.PI, false);
                ctx.stroke();
                break;
            case 'echo_walker':
                // Ghostly trail
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = this.color;
                ctx.fillRect(-size/2 - 10, -size/2, size, size);
                break;
            case 'iron_clover':
                // Clover shape
                ctx.fillStyle = '#fff';
                for(let i=0; i<4; i++) {
                    const r = i * Math.PI / 2;
                    ctx.beginPath();
                    ctx.arc(Math.cos(r)*6, Math.sin(r)*6, 5, 0, Math.PI*2);
                    ctx.fill();
                }
                break;
            case 'storm_herald':
                // Lightning bolt
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -size/2);
                ctx.lineTo(-5, 0);
                ctx.lineTo(5, 0);
                ctx.lineTo(0, size/2);
                ctx.stroke();
                break;
            case 'shadow_shade':
                // Fading edges
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size/2);
                grad.addColorStop(0, this.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(-size/2, -size/2, size, size);
                break;
            case 'plasma_pulse':
                // Pulsing ring
                const s = 1 + Math.sin(now / 150) * 0.2;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, (size/2) * s, 0, Math.PI*2);
                ctx.stroke();
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

    // Stun indicator (stars)
    if (this.isStunned) {
        ctx.save();
        const starCount = 3;
        for (let i = 0; i < starCount; i++) {
            const angle = (now / 200) + (i * Math.PI * 2 / starCount);
            const x = Math.cos(angle) * 20;
            const y = Math.sin(angle) * 5 - 35;
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    ctx.restore();
  }
}
