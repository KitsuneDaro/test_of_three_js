import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { HierarchicalNumberArray } from './ThreeCutUtils';
import { GroupBody } from './GroupBody';
import { MeshBody } from './MeshBody';

// gltf.scene >
// children: Array > geometry
// geometry.attribute.position
// geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
// 1つのGroupで断片を表し、これを配列で複数管理する

export function FishDisplay(container: HTMLElement){
    // FPSなどの表示
    const stats = new Stats();

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    // 並行投影：Orthographic
    // 遠近法：Perspective
    
    const camera = new THREE.PerspectiveCamera(70);
    const scene = new THREE.Scene();
    const light = new THREE.HemisphereLight(0xFFFFFF, 0x00000F, 3.0);

    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.8, 0),
        solver: new CANNON.GSSolver(),
    })
    world.broadphase = new CANNON.NaiveBroadphase();
    // 反復計算回数
    (world.solver as CANNON.GSSolver).iterations = 5;
    // 許容値
    (world.solver as CANNON.GSSolver).tolerance = 0.1;

    const fishMaterialGapArray: HierarchicalNumberArray = {
        'Skin': -0.0275, 
        'Meat': -0.025,
        'Armature': {
            'Bone_1': -0.0125
        },
        'Eye': 0,
    };
    var fishArray: GroupBody[] = [];
    var theta: number = 0.0;
    
    const groundMesh = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.02, 20),
        new THREE.MeshPhongMaterial({
            color: 0x9999ff,
            transparent: true,
            opacity: 0.5,
        }),
    );
    groundMesh.position.y = -2;

    const groundMeshBody = new MeshBody(
        groundMesh,
        {
            mass: 0,
            shapeType: 'box'
        }
    );

    const sphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5),
        new THREE.MeshStandardMaterial({
            color: 0x9999ff,
        }),
    );
    sphereMesh.position.y = 2;
    sphereMesh.position.x = -2;

    const sphereMeshBody = new MeshBody(
        sphereMesh,
        {
            mass: 1,
            shapeType: 'sphere'
        }
    );

    const cutStartVector: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    const cutFinishVector: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

    init(container);
    animate();

    function init(container: HTMLElement) {
        camera.position.set(2.5, 2.5, 2.5);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        scene.background = new THREE.Color( 0xFFFFFF );

        container.appendChild( renderer.domElement );
        container.appendChild( stats.dom );

        window.addEventListener('resize', onWindowResize);
        onWindowResize();

        window.addEventListener('keydown', onKeyDown);

        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        
        scene.add(light);

        addGround();
        addSphere();

        const loader = new GLTFLoader();

        loader.load('gltf/fish1.glb', function (gltf: GLTF) {
            fishArray.push(new GroupBody(gltf.scene, fishMaterialGapArray, {mass: 0.7, shapeType: 'sphere'}));
            fishArray[0].addSceneAndWorld(scene, world);
        }, undefined, function (error: any) {
            console.error(error);
        });
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.code == 'KeyF') {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                renderer.domElement.requestFullscreen();
            }
        }

        if (event.code == 'Space') {
            const normal0 = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
            const offset0 = new THREE.Vector3(0, 0, 0);
            
            cutFish(normal0, offset0);
        }
    }

    function evalPosition3DFromScreen(position2D: THREE.Vector2): THREE.Vector3 {
        const position3D = new THREE.Vector3(0, 0, -2 / 3); // ちゃんと計算してないけどいけたマジックナンバー
        const screenSize = new THREE.Vector2(0, 0);
        const tanFov = Math.tan(camera.fov / 2);
        
        renderer.getSize(screenSize);

        const normalizedX = (position2D.x * 2 - screenSize.x) / screenSize.x;
        const normalizedY = -(position2D.y * 2 - screenSize.y) / screenSize.y;
        
        position3D.x = normalizedX * tanFov * camera.aspect;
        position3D.y = normalizedY * tanFov;

        position3D.applyEuler(camera.rotation).add(camera.position);

        console.log(camera.aspect);

        return position3D;
    }

    function onMouseDown(event: MouseEvent) {
        cutStartVector.copy(evalPosition3DFromScreen(new THREE.Vector2(event.clientX, event.clientY)));
        cutStartVector
        
        /*
        const geometry = new THREE.SphereGeometry(0.025);
        const material = new THREE.MeshStandardMaterial({
            color: 0x9999ff,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(cutStartVector);
        
        scene.add(mesh);
        */
    }

    function onMouseUp(event: MouseEvent) {
        cutFinishVector.copy(evalPosition3DFromScreen(new THREE.Vector2(event.clientX, event.clientY)));
        
        /*
        const geometry = new THREE.SphereGeometry(0.025);
        const material = new THREE.MeshStandardMaterial({
            color: 0x99ff99,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(cutFinishVector);
        
        scene.add(mesh);
        */

        if (cutStartVector.equals(cutFinishVector)) {
            return;
        }

        const normal = new THREE.Vector3(0, 0, 0);

        normal.crossVectors(cutStartVector.clone().sub(camera.position), cutFinishVector.clone().sub(camera.position));

        console.log(normal.dot(cutStartVector.clone().sub(camera.position)));

        cutFish(normal, camera.position);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setPixelRatio(window.devicePixelRatio);
        camera.updateProjectionMatrix();
    }

    function addGround() {
        groundMeshBody.addSceneAndWorld(scene, world);
    }

    function addSphere() {
        sphereMeshBody.addSceneAndWorld(scene, world);
    }

    function cutFish(normal: THREE.Vector3, offset: THREE.Vector3) {
        const newFishArray: GroupBody[] = [];
        const fishPieceN = fishArray.length;

        for (let fishArrayIndex = 0; fishArrayIndex < fishPieceN; fishArrayIndex++) {
            try{
                const cutFishArray = fishArray[0].cut(normal, offset);
                newFishArray.push(...cutFishArray);
            } catch {
                newFishArray.push(fishArray[0]);
            }
            fishArray[0].removeSceneAndWorld(scene, world);
            fishArray.splice(0, 1);

            console.log(fishArray);
        }

        for (let fishArrayIndex = 0; fishArrayIndex < newFishArray.length; fishArrayIndex++) {
            newFishArray[fishArrayIndex].addSceneAndWorld(scene, world);

            newFishArray[fishArrayIndex].group.rotateX(0.2);
        }

        fishArray.push(...newFishArray);

        console.log(fishArray);
    }

    function animate() {
        requestAnimationFrame( animate );

        camera.position.set(2.5 * Math.cos(theta), 2.5, 2.5 * Math.sin(theta));
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        //theta += 0.003;
        
        world.fixedStep();
        updateFish();
        groundMeshBody.update();
        sphereMeshBody.update();
        
        render();
        stats.update();
    }

    function updateFish() {
        for (let fishArrayIndex = 0; fishArrayIndex < fishArray.length; fishArrayIndex++) {
            fishArray[fishArrayIndex].update();
        }
    }

    function render() {
        renderer.render(scene, camera);
    }
}
