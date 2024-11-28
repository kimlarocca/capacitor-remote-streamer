import { WebPlugin } from '@capacitor/core';

import type { RemoteStreamerPlugin } from './definitions';

export class RemoteStreamerWeb
  extends WebPlugin
  implements RemoteStreamerPlugin
{
  async setNowPlayingInfo (options: {
    title: string;
    artist: string;
    album: string;
    duration: string;
    imageUrl: string;
    isLiveStream: boolean;
    fade?: boolean;
  }): Promise<void> {
    this.duration = parseFloat(options.duration);
    console.log('Setting now playing info', options);
  }
  async enableCommandCenter (options: { seek: boolean }): Promise<void> {
    console.log('Enabling lock screen control', options);
  }
  private audio: HTMLAudioElement | null = null;
  private intervalId: number | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private isLooping = false;
  private fadeInterval: number | null = null;
  private readonly FADE_DURATION = 1000; // 1 second fade
  private readonly FADE_STEP = 50; // Update every 50ms
  private duration = 0; // Track duration
  private currentUrl = ''; // Store current URL

  async setLoop (options: { loop: boolean }): Promise<void> {
    this.isLooping = options.loop;
    if (this.audio) {
      this.audio.loop = this.isLooping;
    }
  }

  async play (options: { url: string }): Promise<void> {
    this.currentUrl = options.url;
    if (this.audio) {
      console.log('plugin play() pause');
      await this.fadeOut();
      this.audio.pause();
    }
    console.log('plugin play() after pause');

    this.audio = new Audio(options.url);
    this.audio.id = 'pluginAudioElement'; // Assigning an ID to the audio element
    this.audio.loop = false; // Disable native looping to handle our own
    this.audio.preload = 'auto';
    this.audio.volume = 0; // Start at 0 volume for fade in

    // Set up loop handling
    if (this.isLooping) {
      this.audio.addEventListener('timeupdate', () => {
        if (this.audio && !this.nextAudio && this.duration > 0) {
          const timeLeft = this.duration - this.audio.currentTime;

          // Start crossfade when approaching end
          if (timeLeft <= this.FADE_DURATION / 1000) {
            this.startNextLoop();
          }
        }
      });
    }

    // Wait for enough data before playing
    await new Promise(resolve => {
      if (this.audio) {
        this.audio.addEventListener('canplaythrough', resolve, { once: true });
        this.audio.load();
      }
    });

    this.setupEventListeners();
    await this.audio.play();
    await this.fadeIn();
    this.notifyListeners('play', {});
    this.startTimeUpdates();
  }

  private async startNextLoop (): Promise<void> {
    if (!this.isLooping || this.nextAudio) return;

    // Create and prepare next audio instance
    this.nextAudio = new Audio(this.currentUrl);
    this.nextAudio.preload = 'auto';
    this.nextAudio.volume = 0;

    // Wait for next audio to be ready
    await new Promise(resolve => {
      if (this.nextAudio) {
        this.nextAudio.addEventListener('canplaythrough', resolve, {
          once: true,
        });
        this.nextAudio.load();
      }
    });

    // Start playing next audio and crossfade
    if (this.nextAudio && this.audio) {
      await this.nextAudio.play();
      await this.crossFade();
    }
  }

  private async crossFade (): Promise<void> {
    if (!this.audio || !this.nextAudio) return;

    return new Promise(resolve => {
      let progress = 0;
      const fadeInterval = setInterval(() => {
        progress += this.FADE_STEP;
        const fadeRatio = progress / this.FADE_DURATION;

        if (this.audio) this.audio.volume = Math.max(0, 1 - fadeRatio);
        if (this.nextAudio) this.nextAudio.volume = Math.min(1, fadeRatio);

        if (progress >= this.FADE_DURATION) {
          clearInterval(fadeInterval);
          if (this.audio) {
            this.audio.pause();
            this.audio = this.nextAudio;
            this.nextAudio = null;
          }
          resolve();
        }
      }, this.FADE_STEP);
    });
  }

  private async fadeIn (): Promise<void> {
    if (!this.audio) return;

    return new Promise(resolve => {
      let volume = 0;
      this.audio!.volume = volume;

      this.fadeInterval = window.setInterval(() => {
        volume = Math.min(volume + this.FADE_STEP / this.FADE_DURATION, 1);
        if (this.audio) {
          this.audio.volume = volume;
        }

        if (volume >= 1) {
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          resolve();
        }
      }, this.FADE_STEP);
    });
  }

  private async fadeOut (): Promise<void> {
    if (!this.audio) return;

    return new Promise(resolve => {
      let volume = this.audio ? this.audio.volume : 0;

      this.fadeInterval = window.setInterval(() => {
        volume = Math.max(volume - this.FADE_STEP / this.FADE_DURATION, 0);
        if (this.audio) {
          this.audio.volume = volume;
        }

        if (volume <= 0) {
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          resolve();
        }
      }, this.FADE_STEP);
    });
  }

  async pause (): Promise<void> {
    if (this.audio) {
      await this.fadeOut();
      this.audio.pause();
      this.notifyListeners('pause', {});
    }
  }

  async resume (): Promise<void> {
    if (this.audio) {
      await this.audio.play();
      this.notifyListeners('play', {});
    }
  }

  async seekTo (options: { position: number }): Promise<void> {
    if (this.audio) {
      this.audio.currentTime = options.position;
    }
  }

  async stop (): Promise<void> {
    if (this.nextAudio) {
      this.nextAudio.pause();
      this.nextAudio = null;
    }
    if (this.audio) {
      await this.fadeOut();
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
      this.audio.currentTime = 0;
      this.audio = null;
      this.notifyListeners('stop', {});
      this.stopTimeUpdates();
      console.log('stopped', this.audio);
    }
  }

  async setPlaybackRate (options: { rate: number }): Promise<void> {
    if (this.audio) {
      this.audio.playbackRate = options.rate;
    }
  }

  private startTimeUpdates () {
    this.stopTimeUpdates();
    this.intervalId = window.setInterval(() => {
      if (this.audio) {
        this.notifyListeners('timeUpdate', {
          currentTime: this.audio.currentTime,
        });
      }
    }, 1000);
  }

  private stopTimeUpdates () {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async setVolume (options: { volume: number }): Promise<void> {
    if (this.audio) {
      this.audio.volume = options.volume;
    }
  }

  private setupEventListeners () {
    if (this.audio) {
      this.audio.onplaying = () => this.notifyListeners('play', {});
      this.audio.onpause = () => this.notifyListeners('pause', {});
      this.audio.onended = () => this.notifyListeners('stop', { ended: true });
      this.audio.onerror = e =>
        this.notifyListeners('error', { message: `Audio error: ${e}` });
      this.audio.onwaiting = () =>
        this.notifyListeners('buffering', { isBuffering: true });
      this.audio.oncanplaythrough = () =>
        this.notifyListeners('buffering', { isBuffering: false });
    }
  }
}
