import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { BoidInfomation } from './BoidInformation';

export class BoidPosVel{
    speedLimit: number = 9.0;
    separationDistance: number = 1;
    alignmentDistance: number = 1;
    cohesionDistance: number = 1;

    fs: string = `
        uniform float time;
        uniform float delta; // about 0.016
        uniform float separationDistance;
        uniform float alignmentDistance;
        uniform float cohesionDistance;
        uniform float speedLimit; // 9.0

        const float width = resolution.x;
        const float height = resolution.y;

        const float PI = 3.141592653589793;
        const float PI_2 = PI * 2.0;

        float zoneRadius = 40.0;
        float zoneRadiusSquared = 1600.0;

        float separationThresh = 0.45;
        float alignmentThresh = 0.65;

        const float UPPER_BOUNDS = BOUNDS;
        const float LOWER_BOUNDS = -UPPER_BOUNDS;

        float rand( vec2 co ){
            return fract( sin( dot( co.xy, vec2(12.9898,78.233) ) ) * 43758.5453 );
        }

        void main() {

            zoneRadius = separationDistance + alignmentDistance + cohesionDistance;
            separationThresh = separationDistance / zoneRadius;
            alignmentThresh = ( separationDistance + alignmentDistance ) / zoneRadius;
            zoneRadiusSquared = zoneRadius * zoneRadius;


            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 boidPosition, boidVelocity;

            vec2 selfPosition = texture2D( texturePosVel, uv ).xy;
            vec2 selfVelocity = texture2D( texturePosVel, uv ).zw;

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
                    boidPosition = texture2D( texturePosVel, ref ).xy;

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

                        boidVelocity = texture2D( texturePosVel, ref ).zw;

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

            // Speed Limits
            if ( length( velocity ) > limit ) {
                velocity = normalize( velocity ) * limit;
            }

            vec2 position = boidPosition + velocity * delta;

            gl_FragColor = vec4( position, velocity );
        }
    `;
    boidInfo: BoidInfomation;
    gpuCompute: GPUComputationRenderer;
    texture: THREE.GPUTexture;
    variable: { [key: string]: any };
    uniforms: { [key: string]: THREE.Uniform };

    lastTime: number;

    constructor(boidInfo: BoidInfomation){
        this.boidInfo = boidInfo;
        this.gpuCompute = new GPUComputationRenderer(this.boidInfo.boidWidth, this.boidInfo.boidHeight, this.boidInfo.renderer);
        this.texture = this.gpuCompute.createTexture();
        this.variable = this.gpuCompute.addVariable('boidPosVel', this.fs, this.texture);
        this.uniforms = this.variable.material.uniforms;

        this.lastTime = performance.now();

        this.gpuCompute.init();

        this.init();
    }

    init() {
        const array = this.texture.image.data;

        for(let i = 0, arraySize = array.length; i < arraySize; i += 4) {
            array[i + 0] = Math.random() * this.boidInfo.screenWidth;
            array[i + 1] = Math.random() * this.boidInfo.screenHeight;
            
            const angle = Math.random() * 2 * Math.PI;
            const len = Math.random() * this.speedLimit;
            array[i + 2] = len * Math.cos(angle);
            array[i + 3] = len * Math.sin(angle);
        }

        this.uniforms['time'] = {type: 'f', value: 0.0};
        this.uniforms['delta'] = {type: 'f', value: 0.0};
        this.uniforms['separationDistance'] = {type: 'f', value: this.separationDistance};
        this.uniforms['alignmentDistance'] = {type: 'f', value: this.alignmentDistance};
        this.uniforms['cohesionDistance'] = {type: 'f', value: this.cohesionDistance};
        this.uniforms['speedLimit'] = {type: 'f', value: this.speedLimit};
    
        // 縦横のリピート設定
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;

        // 依存性の設定
        // gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable ] );
        this.gpuCompute.setVariableDependencies( this.variable, [ this.variable ] );

        this.lastTime = performance.now();
    }

    update(){
        this.uniforms['time'].value = this.boidInfo.timeInfo.nowTime;
        this.uniforms['delta'].value = this.boidInfo.timeInfo.delta;

        this.gpuCompute.compute();
    }

    getTexture(){
        return this.gpuCompute.getCurrentRenderTarget(this.variable).texture
    }
}