import { WebPlugin } from '@capacitor/core';
export class RemoteStreamerWeb extends WebPlugin {
    constructor() {
        super(...arguments);
        this.audio = null;
        this.intervalId = null;
        this.isLooping = false;
        this.fadeInterval = null;
        this.FADE_DURATION = 1000; // 1 second fade
        this.FADE_STEP = 50; // Update every 50ms
    }
    async setNowPlayingInfo(options) {
        console.log("Setting now playing info", options);
    }
    async enableCommandCenter(options) {
        console.log("Enabling lock screen control", options);
    }
    async setLoop(options) {
        this.isLooping = options.loop;
        if (this.audio) {
            this.audio.loop = this.isLooping;
        }
    }
    async play(options) {
        if (this.audio) {
            console.log('plugin play() pause');
            await this.fadeOut();
            this.audio.pause();
        }
        console.log('plugin play() after pause');
        this.audio = new Audio(options.url);
        this.audio.id = "pluginAudioElement"; // Assigning an ID to the audio element
        this.audio.loop = this.isLooping; // Set loop property
        // Minimize loop gap
        this.audio.preload = "auto";
        this.audio.volume = 0; // Start at 0 volume for fade in
        // Wait for enough data before playing
        await new Promise((resolve) => {
            if (this.audio) {
                this.audio.addEventListener('canplaythrough', resolve, { once: true });
                this.audio.load();
            }
        });
        this.setupEventListeners(); // Call setupEventListeners here
        await this.audio.play();
        await this.fadeIn();
        this.notifyListeners('play', {});
        this.startTimeUpdates();
    }
    async fadeIn() {
        if (!this.audio)
            return;
        return new Promise((resolve) => {
            let volume = 0;
            this.audio.volume = volume;
            this.fadeInterval = window.setInterval(() => {
                volume = Math.min(volume + (this.FADE_STEP / this.FADE_DURATION), 1);
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
    async fadeOut() {
        if (!this.audio)
            return;
        return new Promise((resolve) => {
            let volume = this.audio ? this.audio.volume : 0;
            this.fadeInterval = window.setInterval(() => {
                volume = Math.max(volume - (this.FADE_STEP / this.FADE_DURATION), 0);
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
    async pause() {
        if (this.audio) {
            await this.fadeOut();
            this.audio.pause();
            this.notifyListeners('pause', {});
        }
    }
    async resume() {
        if (this.audio) {
            await this.audio.play();
            this.notifyListeners('play', {});
        }
    }
    async seekTo(options) {
        if (this.audio) {
            this.audio.currentTime = options.position;
        }
    }
    async stop() {
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
    async setPlaybackRate(options) {
        if (this.audio) {
            this.audio.playbackRate = options.rate;
        }
    }
    startTimeUpdates() {
        this.stopTimeUpdates();
        this.intervalId = window.setInterval(() => {
            if (this.audio) {
                this.notifyListeners('timeUpdate', { currentTime: this.audio.currentTime });
            }
        }, 1000);
    }
    stopTimeUpdates() {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    async setVolume(options) {
        if (this.audio) {
            this.audio.volume = options.volume;
        }
    }
    setupEventListeners() {
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
//# sourceMappingURL=web.js.map