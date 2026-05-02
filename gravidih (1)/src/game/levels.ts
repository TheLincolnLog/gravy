import { LevelData } from '../types';

export const LEVELS: LevelData[] = [
  {
    // Level 1: Introduction
    spawn: { x: 50, y: 500 },
    platforms: [
      { x: 0, y: 550, width: 800, height: 50, type: 'static' }, // Floor
      { x: 100, y: 400, width: 100, height: 20, type: 'static' },
      { x: 300, y: 350, width: 100, height: 20, type: 'static' },
      { x: 500, y: 450, width: 30, height: 30, type: 'button', id: 'btn1', triggerId: 'door1' },
      { x: 650, y: 450, width: 20, height: 100, type: 'door', id: 'door1', isOpen: false },
      { x: 750, y: 500, width: 40, height: 40, type: 'goal' }
    ]
  },
  {
    // Level 2: Gravity and Phasing
    spawn: { x: 50, y: 500 },
    platforms: [
      { x: 0, y: 550, width: 800, height: 50, type: 'static' },
      { x: 0, y: 0, width: 800, height: 50, type: 'static' }, // Ceiling for flipping
      { x: 200, y: 200, width: 400, height: 20, type: 'static' },
      { x: 200, y: 220, width: 20, height: 330, type: 'ghost' }, // Wall you must phase through
      { x: 400, y: 100, width: 30, height: 30, type: 'button', id: 'btn2', triggerId: 'door2' },
      { x: 700, y: 400, width: 20, height: 150, type: 'door', id: 'door2', isOpen: false },
      { x: 750, y: 500, width: 40, height: 40, type: 'goal' }
    ]
  },
  {
    // Level 3: Portal Complex
    spawn: { x: 50, y: 500 },
    platforms: [
      { x: 0, y: 550, width: 800, height: 50, type: 'static' },
      { x: 0, y: 0, width: 800, height: 50, type: 'static' },
      { x: 50, y: 300, width: 150, height: 20, type: 'static' },
      { x: 200, y: 100, width: 100, height: 20, type: 'static' },
      { x: 500, y: 150, width: 30, height: 30, type: 'button', id: 'btn3', triggerId: 'door3' },
      { x: 600, y: 400, width: 20, height: 150, type: 'door', id: 'door3', isOpen: false },
      { x: 400, y: 300, width: 200, height: 20, type: 'static' },
      { x: 50, y: 50, width: 50, height: 50, type: 'kill' },
      { x: 750, y: 500, width: 40, height: 40, type: 'goal' }
    ]
  }
];
