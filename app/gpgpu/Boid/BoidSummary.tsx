import * as THREE from 'three';
import { BoidGeometry } from './BoidGeometry';
import { BoidInfomation } from './BoidInformation';
import { BoidPosVel } from './BoidPosVel';

export class BoidSummary{
    boidInfo: BoidInfomation;
    boidPosVel: BoidPosVel;
    vs = `
        attribute vec2 reference;

        uniform sampler2D boidPosVel;

        uniform vec2 screenSize;
        uniform float time;
        uniform float delta;

        void main() {
            vec2 pos = texture2D( boidPosVel, reference ).xy;
            vec2 velocity = texture2D( boidPosVel, reference ).zw;

            vec3 newPosition = position;

            newPosition = mat3( modelMatrix ) * newPosition;

            float xy = length( velocity.xy );

            float cosr = velocity.x / xy;
            float sinr = velocity.y / xy;

            mat2 matr =  mat2(
                cosr, sinr,
                -sinr, cosr
            );

            newPosition.xy =  matr * newPosition.xy;
            newPosition.xy += pos / screenSize.x;

            gl_Position = projectionMatrix *  viewMatrix  * vec4( newPosition.xy, -1.0, 1.0 );
        }
    `;
    fs = `
        void main() {
            gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 );
        }
    `;
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
                screenSize: { type: "v2", value: new THREE.Vector2(this.boidInfo.screenWidth, this.boidInfo.screenHeight) },
                boidPosVel: { value: this.boidPosVel.getTexture() },
            },
            vertexShader: this.vs,
            fragmentShader: this.fs,
            side: THREE.DoubleSide,
        });// new THREE.MeshBasicMaterial( { color: 0xFF0000 } );
        this.uniforms = this.material.uniforms;
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        this.mesh.matrixAutoUpdate = false;
        this.mesh.updateMatrix();

        console.log(this.boidPosVel.getTexture());
    }

    update(){
        this.uniforms['time'].value = this.boidInfo.timeInfo.nowTime;
        this.uniforms['delta'].value = this.boidInfo.timeInfo.delta;
        this.uniforms['resolution'].value = this.boidInfo.resolution;
        this.uniforms['boidPosVel'].value = this.boidPosVel.getTexture();
    }
}