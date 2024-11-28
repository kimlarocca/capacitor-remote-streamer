import { WebPlugin } from '@capacitor/core';
import type { RemoteStreamerPlugin } from './definitions';
export declare class RemoteStreamerWeb extends WebPlugin implements RemoteStreamerPlugin {
    setNowPlayingInfo(options: {
        title: string;
        artist: string;
        album: string;
        duration: string;
        imageUrl: string;
        isLiveStream: boolean;
        fade?: boolean;
    }): Promise<void>;
    enableCommandCenter(options: {
        seek: boolean;
    }): Promise<void>;
    private audio;
    private intervalId;
    private nextAudio;
    private isLooping;
    private fadeInterval;
    private readonly FADE_DURATION;
    private readonly FADE_STEP;
    private duration;
    private currentUrl;
    setLoop(options: {
        loop: boolean;
    }): Promise<void>;
    play(options: {
        url: string;
    }): Promise<void>;
    private startNextLoop;
    private crossFade;
    private fadeIn;
    private fadeOut;
    pause(): Promise<void>;
    resume(): Promise<void>;
    seekTo(options: {
        position: number;
    }): Promise<void>;
    stop(): Promise<void>;
    setPlaybackRate(options: {
        rate: number;
    }): Promise<void>;
    private startTimeUpdates;
    private stopTimeUpdates;
    setVolume(options: {
        volume: number;
    }): Promise<void>;
    private setupEventListeners;
}
