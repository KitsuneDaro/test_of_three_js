import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';

export type CannonBodyOptions = {
    collisionFilterGroup?: number;
    collisionFilterMask?: number;
    collisionResponse?: boolean;
    position?: CANNON.Vec3;
    velocity?: CANNON.Vec3;
    mass?: number;
    material?: CANNON.Material;
    linearDamping?: number;
    type?: CANNON.BodyType;
    allowSleep?: boolean;
    sleepSpeedLimit?: number;
    sleepTimeLimit?: number;
    quaternion?: CANNON.Quaternion;
    angularVelocity?: CANNON.Vec3;
    fixedRotation?: boolean;
    angularDamping?: number;
    linearFactor?: CANNON.Vec3;
    angularFactor?: CANNON.Vec3;
    shape?: CANNON.Shape;
    isTrigger?: boolean;
};

export class CannonThreeUtils {
    static copyBodyToObject3D(threeObject3D: THREE.Object3D, cannonBody: CANNON.Body) {
        // Copy position
        const position = new THREE.Vector3(
            cannonBody.position.x,
            cannonBody.position.y,
            cannonBody.position.z
        );
        threeObject3D.position.copy(position);
    
        // Copy rotation
        const quaternion = new CANNON.Quaternion(
            cannonBody.quaternion.x,
            cannonBody.quaternion.y,
            cannonBody.quaternion.z,
            cannonBody.quaternion.w
        );
        threeObject3D.quaternion.copy(quaternion);
    }

    static copyObject3DToBody(threeObject3D: THREE.Object3D, cannonBody: CANNON.Body) {
        // Copy position
        const position = new CANNON.Vec3(
            threeObject3D.position.x,
            threeObject3D.position.y,
            threeObject3D.position.z
        );
        cannonBody.position.copy(position);
    
        // Copy rotation
        const quaternion = new CANNON.Quaternion(
            threeObject3D.quaternion.x,
            threeObject3D.quaternion.y,
            threeObject3D.quaternion.z,
            threeObject3D.quaternion.w
        );
        cannonBody.quaternion.copy(quaternion);
    }

    static changeVector3ToVec3(vector: THREE.Vector3): CANNON.Vec3 {
        return new CANNON.Vec3(vector.x, vector.y, vector.z);
    }

    static changeVec3ToVector3(vector: CANNON.Vec3): THREE.Vector3 {
        return new THREE.Vector3(vector.x, vector.y, vector.z);
    }

    static addBoxShapeFromGeometry(body: CANNON.Body, geometry: THREE.BufferGeometry) {
        geometry.computeBoundingBox();
        const center = geometry.boundingBox!.max.clone().add(geometry.boundingBox!.min).multiplyScalar(0.5);
        const size = geometry.boundingBox!.max.clone().sub(geometry.boundingBox!.min).multiplyScalar(0.5);
        
        const shape = new CANNON.Box(this.changeVector3ToVec3(size));

        body.addShape(shape, this.changeVector3ToVec3(center));
    }

    static addSphereShapeFromGeometry(body: CANNON.Body, geometry: THREE.BufferGeometry) {
        geometry.computeBoundingBox();
        const center = geometry.boundingBox!.max.clone().add(geometry.boundingBox!.min).multiplyScalar(0.5);
        const radius = geometry.boundingBox!.max.clone().sub(geometry.boundingBox!.min).multiplyScalar(0.5);
        
        const shape = new CANNON.Sphere(Math.min(...radius.toArray()));

        body.addShape(shape, this.changeVector3ToVec3(center));
    }

    static addVertexShapeFromGeometry(body: CANNON.Body, geometry: THREE.BufferGeometry) {
        const vertexAttribute = geometry.attributes.position;
        const radius = 0.01;
        const shape = new CANNON.Sphere(radius);
        const step = 50;

        for (let vertexIndex = 0; vertexIndex < vertexAttribute.count; vertexIndex += step) {
            const vectorArray = vertexAttribute.array.slice(vertexIndex * 3, vertexIndex * 3 + 3);
            const vector = new CANNON.Vec3(vectorArray[0], vectorArray[1], vectorArray[2]);

            body.addShape(shape, vector);
        }
    }

    static addTrimeshShapeFromGeometry(body: CANNON.Body, geometry: THREE.BufferGeometry) {
        const vertices = geometry.attributes.position.array;
        const indices = geometry.getIndex();
        
        if (indices === null) {
            throw Error('Indices of this geometry are not set.');
        }

        const shape = new CANNON.Trimesh(Array.from(vertices), Array.from(indices.array));

        body.addShape(shape, new CANNON.Vec3(0, 0, 0));
    }

    static addTrimeshShapeFromMesh(body: CANNON.Body,mesh: THREE.Mesh) {
        this.addTrimeshShapeFromGeometry(body, mesh.geometry);
    }

    static getGeometryOfGroup(group: THREE.Group | THREE.Object3D) {
        const geometryArray = this.collectGeometriesOfGroup(group);
        const geometry = BufferGeometryUtils.mergeGeometries(geometryArray);

        return geometry;
    }

    static collectGeometriesOfGroup(group: THREE.Group | THREE.Object3D): THREE.BufferGeometry[] {
        const geometryArray: THREE.BufferGeometry[] = [];

        for(let childrenIndex = 0; childrenIndex < group.children.length; childrenIndex++) {
            const child = group.children[childrenIndex];
            
            if (!(child instanceof THREE.Mesh || child instanceof THREE.Group || child.constructor === THREE.Object3D)) {
                continue;
            }

            if (child instanceof THREE.Mesh) {
                const childGeometry = child.geometry;

                geometryArray.push(childGeometry);
            } else {
                const childGeometryArray = this.collectGeometriesOfGroup(child);

                geometryArray.push(...childGeometryArray);
            }
        }

        return geometryArray;
    }
}