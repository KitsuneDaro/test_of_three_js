import * as THREE from 'three';
import { BoidGeometry } from './BoidGeometry';
import { BoidInfomation } from './BoidInformation';
import { BoidPosVel } from './BoidPosVel';

export class BoidSummary{
    boidInfo: BoidInfomation;
    boidPosVel: BoidPosVel;
    vs = ``;
    fs = ``;
    geometry: BoidGeometry;
    material: THREE.ShaderMaterial;
    uniforms: { [key: string]: THREE.Uniform };
    mesh: THREE.Mesh;

    constructor(boidInfo: BoidInfomation, boidPosVel: BoidPosVel){
        this.boidInfo = boidInfo;
        this.boidPosVel = boidPosVel;
        this.geometry = new BoidGeometry(this.boidInfo);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { type: "f", value: 0.0 },
                delta: { type: "f", value: 0.0 },
                resolution: { type: "v2", value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                boidPosVel: { value: this.boidPosVel.getTexture() },
            },
            vertexShader: this.vs,
            fragmentShader: this.fs
        });// new THREE.MeshBasicMaterial( { color: 0xFF0000 } );
        this.uniforms = this.material.uniforms;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }

    update(){
        this.uniforms['time'].value = this.boidInfo.timeInfo.nowTime;
        this.uniforms['delta'].value = this.boidInfo.timeInfo.delta;
        this.uniforms['boidPosVel'].value = this.boidPosVel.getTexture();
    }
}