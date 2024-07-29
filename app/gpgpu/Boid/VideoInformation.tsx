import * as THREE from 'three';

export class VideoInformation{
    element: HTMLVideoElement;
    texture: THREE.VideoTexture;
    
    constructor(src: string){
        this.element = document.createElement('video');
        this.element.src = src;
        this.texture = new THREE.VideoTexture(this.element);
    }
}