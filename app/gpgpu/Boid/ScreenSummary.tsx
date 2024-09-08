import * as THREE from 'three';
import { BoidInformation } from './BoidInformation';
import { BoidPosVel } from './BoidPosVel';

export class ScreenSummary{
    boidInfo: BoidInformation;
    boidPosVel: BoidPosVel;
    vs = `
        uniform float time;
        uniform float delta;
        varying vec2 vUv;

        void main()	{
            vUv = uv;
            
            gl_Position = projectionMatrix *  viewMatrix  * vec4( position, 1.0 );
        }
    `;
    fs = `
        uniform sampler2D video;
        uniform float delta;
        varying vec2 vUv;

        void main() {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);//vec4(texture2D(video, vUv).xyz, 0.5);
        }
    `;
    geometry: THREE.PlaneGeometry;
    material: THREE.ShaderMaterial;
    uniforms: { [key: string]: THREE.IUniform };
    mesh: THREE.Mesh;

    constructor(boidInfo: BoidInformation, boidPosVel: BoidPosVel){
        this.boidInfo = boidInfo;
        this.boidPosVel = boidPosVel;
        this.geometry = new THREE.PlaneGeometry(1.0, boidInfo.screenHeight / boidInfo.screenWidth);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { type: "f", value: 0.0 },
                delta: { type: "f", value: 0.0 },
                resolution: { type: "v2", value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                boidPosVel: { value: this.boidPosVel.getTexture() },
                video: {value: null},
            },
            vertexShader: this.vs,
            fragmentShader: this.fs,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.uniforms = this.material.uniforms;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    update(){
        this.uniforms['time'].value = this.boidInfo.timeInfo.nowTime;
        this.uniforms['delta'].value = this.boidInfo.timeInfo.delta;
        this.uniforms['boidPosVel'].value = this.boidPosVel.getTexture();
        this.uniforms['video'].value = this.boidInfo.videoInfo.texture;
    }
}