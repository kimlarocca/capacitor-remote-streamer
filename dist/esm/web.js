import { WebPlugin } from '@capacitor/core';
export class RemoteStreamerWeb extends WebPlugin {
    constructor() {
        super(...arguments);
        this.audio = null;
        this.intervalId = null;
        this.nextAudio = null;
        this.isLooping = false;
        this.fadeInterval = null;
        this.FADE_DURATION = 1000; // 1 second fade
        this.CROSS_FADE_DURATION = 2000; // 2 second cross fade
        this.FADE_STEP = 50; // Update every 50ms
        this.duration = 0; // Track duration
        this.currentUrl = ''; // Store current URL
        this.currentLoop = 0;
    }
    async setNowPlayingInfo(options) {
        this.duration = parseFloat(options.duration);
        console.log('Setting now playing info', options);
    }
    async enableCommandCenter(options) {
        console.log('Enabling lock screen control', options);
    }
    async setLoop(options) {
        this.isLooping = options.loop;
        if (this.audio) {
            this.audio.loop = this.isLooping;
        }
    }
    async play(options) {
        this.currentUrl = options.url;
        this.currentLoop = 0;
        if (this.audio) {
            await this.stop();
        }
        this.audio = new Audio(options.url);
        this.audio.preload = 'auto';
        this.audio.volume = 0;
        const setupTimeUpdate = (audio) => {
            const timeUpdateHandler = () => {
                if (audio === this.audio && this.duration > 0) {
                    const timeLeft = this.duration - audio.currentTime;
                    if (timeLeft <= this.FADE_DURATION / 1000 && !this.nextAudio) {
                        this.startNextLoop();
                    }
                }
            };
            audio.addEventListener('timeupdate', timeUpdateHandler);
        };
        setupTimeUpdate(this.audio);
        await new Promise(resolve => {
            if (this.audio) {
                this.audio.addEventListener('canplaythrough', resolve, { once: true });
                this.audio.load();
            }
        });
        await this.audio.play();
        await this.fadeIn();
    }
    async startNextLoop() {
        if (!this.isLooping || this.nextAudio)
            return;
        this.currentLoop++;
        console.log(`Starting loop ${this.currentLoop}`);
        this.nextAudio = new Audio(this.currentUrl);
        this.nextAudio.preload = 'auto';
        this.nextAudio.volume = 0;
        const setupTimeUpdate = (audio) => {
            const timeUpdateHandler = () => {
                if (audio === this.audio && this.duration > 0) {
                    const timeLeft = this.duration - audio.currentTime;
                    if (timeLeft <= this.FADE_DURATION / 1000 && !this.nextAudio) {
                        this.startNextLoop();
                    }
                }
            };
            audio.addEventListener('timeupdate', timeUpdateHandler);
        };
        setupTimeUpdate(this.nextAudio);
        await new Promise(resolve => {
            if (this.nextAudio) {
                this.nextAudio.addEventListener('canplaythrough', resolve, {
                    once: true,
                });
                this.nextAudio.load();
            }
        });
        if (this.nextAudio && this.audio) {
            await this.nextAudio.play();
            await this.crossFade();
        }
    }
    async crossFade() {
        if (!this.audio || !this.nextAudio)
            return;
        return new Promise(resolve => {
            let progress = 0;
            const fadeInterval = setInterval(() => {
                progress += this.FADE_STEP;
                const fadeRatio = progress / this.FADE_DURATION;
                if (this.audio)
                    this.audio.volume = Math.max(0, 1 - fadeRatio);
                if (this.nextAudio)
                    this.nextAudio.volume = Math.min(1, fadeRatio);
                if (progress >= this.FADE_DURATION) {
                    clearInterval(fadeInterval);
                    if (this.audio) {
                        const oldAudio = this.audio;
                        oldAudio.pause();
                        oldAudio.removeAttribute('src');
                        oldAudio.load();
                        this.audio = this.nextAudio;
                        this.nextAudio = null;
                    }
                    resolve();
                }
            }, this.FADE_STEP);
        });
    }
    async fadeIn() {
        if (!this.audio)
            return;
        return new Promise(resolve => {
            let volume = 0;
            this.audio.volume = volume;
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
    async fadeOut() {
        if (!this.audio)
            return;
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
        if (this.nextAudio) {
            this.nextAudio.pause();
            this.nextAudio = null;
            console.log('nextAudio stopped', this.audio);
        }
        if (this.audio) {
            await this.fadeOut();
            this.audio.pause();
            this.audio.src = '';
            this.audio.load();
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
    // KIM do we need this?
    // private startTimeUpdates () {
    //   this.stopTimeUpdates();
    //   this.intervalId = window.setInterval(() => {
    //     if (this.audio) {
    //       this.notifyListeners('timeUpdate', {
    //         currentTime: this.audio.currentTime,
    //       });
    //     }
    //   }, 1000);
    // }
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
            this.audio.onerror = e => this.notifyListeners('error', { message: `Audio error: ${e}` });
            this.audio.onwaiting = () => this.notifyListeners('buffering', { isBuffering: true });
            this.audio.oncanplaythrough = () => this.notifyListeners('buffering', { isBuffering: false });
        }
    }
}
//# sourceMappingURL=web.js.map