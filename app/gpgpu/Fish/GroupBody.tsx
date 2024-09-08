import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CannonThreeUtils } from './CannonThreeUtils';
import { HierarchicalNumberArray, ThreeCutUtils } from './ThreeCutUtils';

export class GroupBody {
    group: THREE.Group | THREE.Object3D;
    mass: number;
    density: number;
    shapeType: 'box' | 'sphere';
    body: CANNON.Body;
    materialGapArray: HierarchicalNumberArray;

    constructor(
        group: THREE.Group | THREE.Object3D,
        materialGapArray: HierarchicalNumberArray, 
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

        this.group = group;
        this.materialGapArray = materialGapArray;
        this.shapeType = options.shapeType;
        
        const body = new CANNON.Body({mass: 1});
        this.body = body;

        const geometry = CannonThreeUtils.getGeometryOfGroup(group);

        CannonThreeUtils.addTrimeshShapeFromGeometry(body, geometry);
        CannonThreeUtils.addVertexShapeFromGeometry(body, geometry);
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

        CannonThreeUtils.copyObject3DToBody(this.group, this.body);
    }

    cut(
        normal: THREE.Vector3, 
        offset: THREE.Vector3
    ): GroupBody[] {
        const groupArray = ThreeCutUtils.cutGroup(this.group, this.materialGapArray, normal, offset);
        const groupBodyArray = [];

        for (let groupIndex = 0; groupIndex < groupArray.length; groupIndex++) {
            groupBodyArray.push(
                new GroupBody(
                    groupArray[groupIndex], 
                    this.materialGapArray, {
                        density: this.density,
                        shapeType: this.shapeType
                    }
                )
            );
        }

        return groupBodyArray;
    }

    update() {
        CannonThreeUtils.copyBodyToObject3D(this.group, this.body);
    }

    addSceneAndWorld(scene: THREE.Scene, world: CANNON.World) {
        scene.add(this.group);
        world.addBody(this.body);
    }

    removeSceneAndWorld(scene: THREE.Scene, world: CANNON.World) {
        scene.remove(this.group);
        world.removeBody(this.body);
    }
}