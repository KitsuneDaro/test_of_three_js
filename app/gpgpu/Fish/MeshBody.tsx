import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CannonThreeUtils } from './CannonThreeUtils';
import { HierarchicalNumberArray, ThreeCutUtils } from './ThreeCutUtils';

export class MeshBody {
    mesh: THREE.Mesh;
    mass: number;
    density: number;
    shapeType: 'box' | 'sphere';
    body: CANNON.Body;

    constructor(
        mesh: THREE.Mesh,
        options?: {
            mass?: number,
            density?: number | undefined,
            shapeType: 'box' | 'sphere'
        } 
    ) {
        if (options === undefined) {
            options = {
                mass: 1,
                density: undefined,
                shapeType: 'box'
            };
        }

        this.mesh = mesh;
        this.shapeType = options.shapeType;
        
        const body = new CANNON.Body({mass: 1});
        this.body = body;

        const geometry = mesh.geometry;

        CannonThreeUtils.addTrimeshShapeFromGeometry(body, geometry);
        if (this.shapeType == 'sphere') {
            CannonThreeUtils.addSphereShapeFromGeometry(body, geometry);
        } else if (this.shapeType == 'box') {
            CannonThreeUtils.addBoxShapeFromGeometry(body, geometry);
        }

        if (options.density === undefined) {
            if (options.mass === undefined) {
                options.mass = 1;
            }

            this.mass = options.mass;
            this.density = options.mass / body.shapes[0].volume();
        } else {
            this.density = options.density;
            this.mass = this.density * body.shapes[0].volume();
        }

        this.body.mass = this.mass;
        this.body.updateMassProperties();
        this.body.updateBoundingRadius();

        CannonThreeUtils.copyObject3DToBody(this.mesh, this.body);
    }

    cut(
        normal: THREE.Vector3, 
        offset: THREE.Vector3
    ): MeshBody[] {
        const meshArray = ThreeCutUtils.cutMesh(this.mesh, 0, normal, offset);
        const meshBodyArray = [];

        for (let meshIndex = 0; meshIndex < meshArray.length; meshIndex++) {
            meshBodyArray.push(
                new MeshBody(
                    meshArray[meshIndex], 
                    {
                        density: this.density,
                        shapeType: this.shapeType
                    }
                )
            );
        }

        return meshBodyArray;
    }

    update() {
        CannonThreeUtils.copyBodyToObject3D(this.mesh, this.body);
    }

    addSceneAndWorld(scene: THREE.Scene, world: CANNON.World) {
        scene.add(this.mesh);
        world.addBody(this.body);
    }

    removeSceneAndWorld(scene: THREE.Scene, world: CANNON.World) {
        scene.remove(this.mesh);
        world.removeBody(this.body);
    }
}