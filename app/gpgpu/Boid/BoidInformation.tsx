import * as THREE from 'three';
import { TimeInformation } from './TimeInformation';
import { time } from 'console';
import { VideoInformation } from './VideoInformation';

export class BoidInformation{
    boidWidth: number;
    boidHeight: number;
    screenWidth: number;
    screenHeight: number;
    renderer: THREE.WebGLRenderer;
    resolution: THREE.Vector2;
    timeInfo: TimeInformation;
    videoInfo: VideoInformation;

    boidN: number;

    constructor(boidWidth: number, boidHeight: number, screenWidth: number, screenHeight: number, renderer: THREE.WebGLRenderer, resolution: THREE.Vector2, timeInfo: TimeInformation, videoInfo: VideoInformation) {
        this.boidWidth = boidWidth;
        this.boidHeight = boidHeight;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.renderer = renderer;
        this.resolution = resolution;
        this.timeInfo = timeInfo;
        this.videoInfo = videoInfo;

        this.boidN = this.boidWidth * this.boidHeight;
    }
}