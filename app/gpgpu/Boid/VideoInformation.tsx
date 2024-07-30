import * as THREE from 'three';

export class VideoInformation{
    element: HTMLVideoElement;
    texture: THREE.VideoTexture;
    playing: boolean;
    
    constructor(src: string){
        this.element = document.createElement('video');
        this.element.src = src;
        this.texture = new THREE.VideoTexture(this.element);
        this.playing = false;

        this.element.volume = 0.3;
        console.log(this.element);
    }

    changePlayAndStop(){
        console.log(this.element);
        if(!this.playing){
            this.element.play();
            this.playing = true;
        }else{
            this.element.pause();
            this.playing = false;
        }
    }
}