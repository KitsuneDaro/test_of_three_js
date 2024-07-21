import * as THREE from 'three';
import { TimeInformation } from './TimeInformation';
import { time } from 'console';

export class BoidInformation{
    boidWidth: number;
    boidHeight: number;
    screenWidth: number;
    screenHeight: number;
    renderer: THREE.WebGLRenderer;
    timeInfo: TimeInformation;

    boidN: number;

    constructor(boidWidth: number, boidHeight: number, screenWidth: number, screenHeight: number, renderer: THREE.WebGLRenderer, timeInfo: TimeInformation) {
        this.boidWidth = boidWidth;
        this.boidHeight = boidHeight;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.renderer = renderer;
        this.timeInfo = timeInfo;

        this.boidN = this.boidWidth * this.boidHeight;
    }
}