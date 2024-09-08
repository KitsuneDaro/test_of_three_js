import * as THREE from 'three';
import { GPUComputationRenderer, Variable } from 'three/addons/misc/GPUComputationRenderer.js';
import { BoidInformation } from './BoidInformation';

export class BoidPosVel{
    speedLimit: number = 80.0;
    separationDistance: number = 50;
    alignmentDistance: number = 30;
    cohesionDistance: number = 20;
    returnAcc: number = 100.0;
    screenMargin: number = 0.0;

    fs: string = `
        uniform float time;
        uniform float delta; // about 0.016
        uniform float separationDistance;
        uniform float alignmentDistance;
        uniform float cohesionDistance;
        uniform float speedLimit;
        uniform float returnAcc;
        uniform float screenMargin;
        uniform vec2 screenSize;
        uniform sampler2D video;

        const float width = resolution.x;
        const float height = resolution.y;

        const float PI = 3.141592653589793;
        const float PI_2 = PI * 2.0;

        float zoneRadius = 40.0;
        float zoneRadiusSquared = 1600.0;

        float separationThresh = 0.45;
        float alignmentThresh = 0.65;

        float rand( vec2 co ){
            return fract( sin( dot( co.xy, vec2(12.9898,78.233) ) ) * 43758.5453 );
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;

            vec2 selfPosition = texture2D( boidPosVel, uv ).xy;
            vec2 selfVelocity = texture2D( boidPosVel, uv ).zw;
            float videoPixel = texture2D( video, selfPosition / screenSize + 0.5 ).x;

            zoneRadius = separationDistance + alignmentDistance + cohesionDistance;
            separationThresh = separationDistance / zoneRadius;
            alignmentThresh = ( separationDistance + alignmentDistance ) / zoneRadius;
            zoneRadiusSquared = zoneRadius * zoneRadius;

            vec2 boidPosition, boidVelocity;

            float dist;
            vec2 dir; // direction
            float distSquared;

            float separationSquared = separationDistance * separationDistance;
            float cohesionSquared = cohesionDistance * cohesionDistance;

            float f;
            float percent;

            vec2 velocity = selfVelocity;

            float limit = speedLimit;

            for ( float y = 0.0; y < height; y++ ) {
                for ( float x = 0.0; x < width; x++ ) {

                    vec2 ref = vec2( x + 0.5, y + 0.5 ) / resolution.xy;
                    boidPosition = texture2D( boidPosVel, ref ).xy;

                    dir = boidPosition - selfPosition;
                    dist = length( dir );

                    if ( dist < 0.0001 ) continue;

                    distSquared = dist * dist;

                    if ( distSquared > zoneRadiusSquared ) continue;

                    percent = distSquared / zoneRadiusSquared;

                    if ( percent < separationThresh ) { // low

                        // Separation - Move apart for comfort
                        f = ( separationThresh / percent - 1.0 ) * delta;
                        velocity -= normalize( dir ) * f;

                    } else if ( percent < alignmentThresh ) { // high

                        // Alignment - fly the same direction
                        float threshDelta = alignmentThresh - separationThresh;
                        float adjustedPercent = ( percent - separationThresh ) / threshDelta;

                        boidVelocity = texture2D( boidPosVel, ref ).zw;

                        f = ( 0.5 - cos( adjustedPercent * PI_2 ) * 0.5 + 0.5 ) * delta;
                        velocity += normalize( boidVelocity ) * f;

                    } else {

                        // Attraction / Cohesion - move closer
                        float threshDelta = 1.0 - alignmentThresh;
                        float adjustedPercent;
                        if( threshDelta == 0. ) adjustedPercent = 1.;
                        else adjustedPercent = ( percent - alignmentThresh ) / threshDelta;

                        f = ( 0.5 - ( cos( adjustedPercent * PI_2 ) * -0.5 + 0.5 ) ) * delta;

                        velocity += normalize( dir ) * f;

                    }

                }

            }
            
            // this make tends to fly around than down or up
            // if (velocity.y > 0.) velocity.y *= (1. - 0.2 * delta);

            vec2 position = selfPosition + velocity * delta;

            // Speed Limits

            if ( length( velocity ) > limit ) {
                velocity = normalize( velocity ) * limit;
            }

            if (abs(position.x) > screenSize.x * (1.0 - screenMargin) / 2.0 || abs(position.y) > screenSize.y * (1.0 - screenMargin) / 2.0) {
                velocity -= position / (screenSize * (1.0 - screenMargin) / 2.0) * returnAcc;
            } else {
                //velocity -= pow(position / (screenSize * (1.0 - screenMargin) / 2.0), vec2(2.0, 2.0)) * returnAcc * 0.1;
            }

            if ( length( velocity ) > limit ) {
                velocity = normalize( velocity ) * limit;
            }

            position = selfPosition + velocity * delta * videoPixel;

            gl_FragColor = vec4( position, velocity );
        }
    `;
    boidInfo: BoidInformation;
    gpuCompute: GPUComputationRenderer;
    texture: THREE.Texture;
    variable: Variable;
    uniforms: { [key: string]: THREE.Uniform };

    constructor(boidInfo: BoidInformation){
        this.boidInfo = boidInfo;
        this.gpuCompute = new GPUComputationRenderer(this.boidInfo.boidWidth, this.boidInfo.boidHeight, this.boidInfo.renderer);
        this.texture = this.gpuCompute.createTexture();
        this.variable = this.gpuCompute.addVariable('boidPosVel', this.fs, this.texture);
        this.uniforms = this.variable.material.uniforms;

        this.init();

        this.gpuCompute.init();
    }

    init() {
        const array = this.texture.image.data;

        for(let i = 0, arraySize = array.length; i < arraySize; i += 4) {
            array[i + 0] = (Math.random() - 0.5) * this.boidInfo.screenWidth;
            array[i + 1] = (Math.random() - 0.5) * this.boidInfo.screenHeight;
            
            const angle = Math.random() * 2 * Math.PI;
            const len = Math.random() * this.speedLimit;
            array[i + 2] = len * Math.cos(angle);
            array[i + 3] = len * Math.sin(angle);
        }

        this.uniforms['time'] = {value: 0.0};
        this.uniforms['delta'] = {value: 0.0};
        this.uniforms['boidPosVel'] = {value: null};
        this.uniforms['separationDistance'] = {value: this.separationDistance};
        this.uniforms['alignmentDistance'] = {value: this.alignmentDistance};
        this.uniforms['cohesionDistance'] = {value: this.cohesionDistance};
        this.uniforms['speedLimit'] = {value: this.speedLimit};
        this.uniforms['returnAcc'] = {value: this.returnAcc};
        this.uniforms['screenMargin'] = {value: this.screenMargin};
        this.uniforms['screenSize'] = {value: new THREE.Vector2(this.boidInfo.screenWidth, this.boidInfo.screenHeight)};
        this.uniforms['video'] = {value: null};
    
        // 縦横のリピート設定
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;

        // 依存性の設定
        // gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable ] );
        this.gpuCompute.setVariableDependencies( this.variable, [ this.variable ] );
    }

    update(){
        this.uniforms['time'].value = this.boidInfo.timeInfo.nowTime;
        this.uniforms['delta'].value = this.boidInfo.timeInfo.delta;
        this.uniforms['boidPosVel'].value = this.getTexture();
        this.uniforms['video'].value = this.boidInfo.videoInfo.texture;
        this.gpuCompute.compute();
    }

    getTexture(){
        return this.gpuCompute.getCurrentRenderTarget(this.variable as Variable).texture;
    }
}