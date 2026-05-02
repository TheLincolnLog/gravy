import { Player, Platform, LevelData } from '../types';

export const GRAVITY = 0.5;
export const FRICTION = 0.8;
export const JUMP_FORCE = -12;
export const SPEED = 5;

export function checkCollision(p: { x: number; y: number; width: number; height: number }, plat: Platform) {
  return p.x < plat.x + plat.width &&
         p.x + p.width > plat.x &&
         p.y < plat.y + plat.height &&
         p.y + p.height > plat.y;
}

export function applyPhysics(player: Player, level: LevelData, others: Record<string, Player>, isMe: boolean) {
  const pWidth = 30;
  const pHeight = 30;
  
  // Apply gravity
  const currentGravity = GRAVITY * player.gravityScale;
  player.vy += currentGravity;

  // Horizontal movement
  player.x += player.vx;
  
  // Horizontal collisions
  for (const plat of level.platforms) {
    if (plat.type === 'door' && !plat.isOpen) {
       if (checkCollision({ x: player.x, y: player.y, width: pWidth, height: pHeight }, plat)) {
           if (player.vx > 0) player.x = plat.x - pWidth;
           if (player.vx < 0) player.x = plat.x + plat.width;
           player.vx = 0;
       }
    }
    if (plat.type === 'static' || (plat.type === 'ghost' && !player.isPhasing)) {
      if (checkCollision({ x: player.x, y: player.y, width: pWidth, height: pHeight }, plat)) {
        if (player.vx > 0) player.x = plat.x - pWidth;
        if (player.vx < 0) player.x = plat.x + plat.width;
        player.vx = 0;
      }
    }
  }

  // Vertical movement
  player.y += player.vy;
  let onGround = false;

  // Vertical collisions
  for (const plat of level.platforms) {
    const isColliding = checkCollision({ x: player.x, y: player.y, width: pWidth, height: pHeight }, plat);
    
    if (plat.type === 'door' && !plat.isOpen) {
       if (isColliding) {
           if (player.vy > 0) { player.y = plat.y - pHeight; onGround = true; }
           if (player.vy < 0) player.y = plat.y + plat.height;
           player.vy = 0;
       }
    }

    if (plat.type === 'static' || (plat.type === 'ghost' && !player.isPhasing)) {
      if (isColliding) {
        if (player.vy * player.gravityScale > 0) {
          if (player.gravityScale > 0) player.y = plat.y - pHeight;
          else player.y = plat.y + plat.height;
          onGround = true;
          player.vy = 0;
        } else if (player.vy * player.gravityScale < 0) {
          if (player.gravityScale > 0) player.y = plat.y + plat.height;
          else player.y = plat.y - pHeight;
          player.vy = 0;
        }
      }
    }

    if (plat.type === 'kill' && isColliding) {
        // Reset to spawn
        player.x = level.spawn.x;
        player.y = level.spawn.y;
        player.vx = 0;
        player.vy = 0;
    }

    if (plat.type === 'button' && isColliding) {
        plat.isOpen = true; // Temporary local toggle, should be synced via engine events
        // Global trigger logic needs to be handled via server
    }
  }

  // Boundary checks
  if (player.y > 600) { player.y = 600; onGround = true; player.vy = 0; }
  if (player.y < 0) { player.y = 0; if (player.gravityScale < 0) onGround = true; player.vy = 0; }
  if (player.x < 0) player.x = 0;
  if (player.x > 800 - pWidth) player.x = 800 - pWidth;

  return onGround;
}
