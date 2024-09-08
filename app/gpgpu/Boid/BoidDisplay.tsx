import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { TimeInformation } from './TimeInformation';
import { BoidPosVel } from './BoidPosVel';
import { BoidSummary } from './BoidSummary';
import { BoidInformation } from './BoidInformation';
import { ScreenSummary } from './ScreenSummary';
import { VideoInformation } from './VideoInformation';
import basePath from "../../../next.config.mjs" // 追加
const BASE_PATH = basePath ? basePath : "" // 追加

export function BoidDisplay(container: HTMLElement){
    // FPSなどの表示
    const stats = new Stats();

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    // 並行投影：Orthographic
    // 遠近法：Perspective
    
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, -0.5, 0.5, 0.5, 3000);
    const scene = new THREE.Scene();

    const screenWidth = 480;
    const screenHeight = 360;

    const timeInfo = new TimeInformation();

    // video
    const videoInfo = new VideoInformation(`${BASE_PATH.toString()}/video/video.mp4`);

    // boid
    const boidWidth = 128;
    const boidHeight = 128;
    const boidInfo = new BoidInformation(boidWidth, boidHeight, screenWidth, screenHeight, renderer, new THREE.Vector2(window.innerWidth, window.innerHeight), timeInfo, videoInfo);

    const boidPosVel = new BoidPosVel(boidInfo);
    const boidSummary = new BoidSummary(boidInfo, boidPosVel);

    const screenSummary = new ScreenSummary(boidInfo, boidPosVel);

    init(container);
    animate();

    function init(container: HTMLElement) {
        camera.position.set(0, 0, 10);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        scene.background = new THREE.Color( 0xff0000 );

        container.appendChild( renderer.domElement );
        container.appendChild( stats.dom );

        window.addEventListener( 'resize', onWindowResize );
        onWindowResize();

        scene.add(boidSummary.mesh);
        scene.add(screenSummary.mesh);
        
        window.addEventListener('click', videoInfo.changePlayAndStop.bind(videoInfo));
        window.addEventListener( 'keydown', onKeyDown );
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.code == 'KeyF'){
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                renderer.domElement.requestFullscreen();
            }
        }

        if (event.code == 'Space') {
            videoInfo.changePlayAndStop();
        }
    }
    function onWindowResize() {
        if(window.innerHeight / window.innerWidth > screenHeight / screenWidth) {
            camera.left = -0.5;
            camera.right = 0.5;
            camera.bottom = window.innerHeight / window.innerWidth * -0.5;
            camera.top = window.innerHeight / window.innerWidth * 0.5;
        } else {
            camera.left = window.innerWidth / window.innerHeight * -0.5 * screenHeight / screenWidth;
            camera.right = window.innerWidth / window.innerHeight * 0.5 * screenHeight / screenWidth;
            camera.bottom = -0.5 * screenHeight / screenWidth;
            camera.top = 0.5 * screenHeight / screenWidth;
        }
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio);

        renderer.setSize( window.innerWidth, window.innerHeight );
        boidInfo.resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame( animate );

        render();
        stats.update();
    }

    function render() {
        timeInfo.update();
        boidPosVel.update();
        boidSummary.update();
        screenSummary.update();
        renderer.render(scene, camera);
    }
}
