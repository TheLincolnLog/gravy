// Utility to manage game sounds and music
const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  hover: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  shoot: 'https://assets.mixkit.co/active_storage/sfx/1653/1653-preview.mp3',
  jump: 'https://assets.mixkit.co/active_storage/sfx/2095/2095-preview.mp3',
  damage: 'https://assets.mixkit.co/active_storage/sfx/2596/2596-preview.mp3',
  death: 'https://assets.mixkit.co/active_storage/sfx/2530/2530-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  round_win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  draft_open: 'https://assets.mixkit.co/active_storage/sfx/2589/2589-preview.mp3',
  menu_ambient: 'https://assets.mixkit.co/active_storage/sfx/131/131-preview.mp3', // Industrial ambient
};

class SoundManager {
  private static instance: SoundManager;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isMuted: boolean = false;
  private ambientMusic: HTMLAudioElement | null = null;

  private constructor() {}

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public play(soundName: keyof typeof SOUNDS, volume: number = 0.5) {
    if (this.isMuted) return;

    let audio = this.audioCache.get(soundName);
    if (!audio) {
      audio = new Audio(SOUNDS[soundName]);
      this.audioCache.set(soundName, audio);
    }
    
    // Clone node for overlapping sounds
    const playInstance = audio.cloneNode() as HTMLAudioElement;
    playInstance.volume = volume;
    playInstance.play().catch(() => {});
  }

  public startAmbient() {
      if (this.ambientMusic) return;
      this.ambientMusic = new Audio(SOUNDS.menu_ambient);
      this.ambientMusic.loop = true;
      this.ambientMusic.volume = 0.2;
      this.ambientMusic.play().catch(() => {});
  }

  public stopAmbient() {
      if (this.ambientMusic) {
          this.ambientMusic.pause();
          this.ambientMusic = null;
      }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ambientMusic) {
        if (this.isMuted) this.ambientMusic.pause();
        else this.ambientMusic.play().catch(() => {});
    }
    return this.isMuted;
  }
}

export const soundManager = SoundManager.getInstance();
