import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { TimeInformation } from './TimeInformation';
import { BoidPosVel } from './BoidPosVel';
import { BoidSummary } from './BoidSummary';
import { BoidInformation } from './BoidInformation';
import { ScreenSummary } from './ScreenSummary';

export function BoidDisplay(container: HTMLElement){
    // FPSなどの表示
    const stats = new Stats();

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    // 並行投影：Orthographic
    // 遠近法：Perspective
    
    const camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 1, 3000);
    const scene = new THREE.Scene();

    const screenWidth = 1920;
    const screenHeight = 1080;

    const timeInfo = new TimeInformation();

    // boidPosVel
    const boidWidth = 32;
    const boidHeight = 32;
    const boidInfo = new BoidInformation(boidWidth, boidHeight, screenWidth, screenHeight, renderer, timeInfo);

    const boidPosVel = new BoidPosVel(boidInfo);
    const boidSummary = new BoidSummary(boidInfo, boidPosVel);

    const screenSummary = new ScreenSummary(boidInfo, boidPosVel);

    init(container);
    animate();

    function init(container: HTMLElement) {
        camera.position.set(0, 0, -10);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        scene.background = new THREE.Color( 0xff0000 );

        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        container.appendChild( renderer.domElement );

        container.appendChild( stats.dom );

        window.addEventListener( 'resize', onWindowResize );

        scene.add(boidSummary.mesh);
        scene.add(screenSummary.mesh);

        console.log(boidPosVel);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
        screenSummary.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
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
