import { WebPlugin } from '@capacitor/core';

import type { RemoteStreamerPlugin } from './definitions';

export class RemoteStreamerWeb extends WebPlugin implements RemoteStreamerPlugin {
  async setNowPlayingInfo(options: { title: string; artist: string; album: string; duration: string; imageUrl: string; }): Promise<void> {
    console.log("Setting now playing info", options);
  }
  async enableComandCenter(options: { seek: boolean; }): Promise<void> {
    console.log("Enabling lock screen control", options);
  }
  private audio: HTMLAudioElement | null = null;
  private intervalId: number | null = null;
  private isLooping = false;

  async setLoop(options: { loop: boolean }): Promise<void> {
    this.isLooping = options.loop;
    if (this.audio) {
      this.audio.loop = this.isLooping;
    }
  }

  async play(options: { url: string }): Promise<void> {
    if (this.audio) {
      console.log('plugin play() pause')
      this.audio.pause();
    }
    console.log('plugin play() after pause')

    this.audio = new Audio(options.url);
    this.audio.id = "pluginAudioElement"; // Assigning an ID to the audio element
    this.audio.loop = this.isLooping; // Set loop property
    // Minimize loop gap
    this.audio.preload = "auto";
    this.audio.preservesPitch = true;

    // Wait for enough data before playing
    await new Promise((resolve) => {
      if (this.audio) {
        this.audio.addEventListener('canplaythrough', resolve, { once: true });
        this.audio.load();
      }
    });

    this.setupEventListeners(); // Call setupEventListeners here
    await this.audio.play();
    this.notifyListeners('play', {});
    this.startTimeUpdates();
  }

  async pause(): Promise<void> {
    if (this.audio) {
      this.audio.pause();
      this.notifyListeners('pause', {});
    }
  }

  async resume(): Promise<void> {
    if (this.audio) {
      await this.audio.play();
      this.notifyListeners('play', {});
    }
  }

  async seekTo(options: { position: number }): Promise<void> {
    if (this.audio) {
      this.audio.currentTime = options.position;
    }
  }

  async stop(): Promise<void> {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = ''
      this.audio.load()
      this.audio.currentTime = 0;
      this.audio = null;
      this.notifyListeners('stop', {});
      this.stopTimeUpdates();
      console.log('stopped', this.audio)
    }
  }

  async setPlaybackRate(options: { rate: number }): Promise<void> {
    if (this.audio) {
      this.audio.playbackRate = options.rate;
    }
  }

  private startTimeUpdates() {
    this.stopTimeUpdates();
    this.intervalId = window.setInterval(() => {
      if (this.audio) {
        this.notifyListeners('timeUpdate', { currentTime: this.audio.currentTime });
      }
    }, 1000);
  }

  private stopTimeUpdates() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async setVolume(options: { volume: number }): Promise<void> {
    if (this.audio) {
      this.audio.volume = options.volume;
    }
  }

  private setupEventListeners() {
    if (this.audio) {
      this.audio.onplaying = () => this.notifyListeners('play', {});
      this.audio.onpause = () => this.notifyListeners('pause', {});
      this.audio.onended = () => this.notifyListeners('stop', { ended: true });
      this.audio.onerror = (e) => this.notifyListeners('error', { message: `Audio error: ${e}` });
      this.audio.onwaiting = () => this.notifyListeners('buffering', { isBuffering: true });
      this.audio.oncanplaythrough = () => this.notifyListeners('buffering', { isBuffering: false });
    }
  }
}