import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// gltf.scene >
// children: Array > geometry
// geometry.attribute.position
// geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
// 1つのGroupで断片を表し、これを配列で複数管理する

export type HierarchicalNumberArray = {[name: string] : number | HierarchicalNumberArray};
export type NumberToNumberArrayDictionary = {[index: number] : number[]};
export type Number3DToNumberDictionary = {[x: number] : {[y: number] : {[z: number] : number}}};
export type Number3DToNumberArrayDictionary = {[x: number] : {[y: number] : {[z: number] : number[]}}};

export class ThreeCutUtils {
    static eps: number = Number.EPSILON;

    // 切断平面(normal, offset)を指定して2つのFishPieceを返す
    static cutGroup(
        group: THREE.Group | THREE.Object3D, 
        materialGapArray: HierarchicalNumberArray, 
        normal: THREE.Vector3, 
        offset: THREE.Vector3
    ): THREE.Object3D[] {
        const groupArray: THREE.Group[] = [];
        
        const positiveGroup = this.getHalfGroup(group, materialGapArray, normal, offset);
        const negativeGroup = this.getHalfGroup(group, materialGapArray, normal.clone().multiplyScalar(-1), offset);

        if (positiveGroup !== null) {
            groupArray.push(positiveGroup);
        }
        if (negativeGroup !== null) {
            groupArray.push(negativeGroup);
        }

        return groupArray;
    }

    static getHalfGroup(
        group: THREE.Group | THREE.Object3D, 
        materialGapArray: HierarchicalNumberArray, 
        normal: THREE.Vector3, 
        offset: THREE.Vector3
    ): THREE.Group | null {
        const halfGroup: THREE.Group = new THREE.Group();
        const quaternion = new THREE.Quaternion().setFromEuler(group.rotation).invert();
        const fixedNormal = normal.clone().normalize().applyQuaternion(quaternion);
        const fixedOffset = offset.clone().sub(group.position).applyQuaternion(quaternion);
        let flag = false;

        for(let childrenIndex = 0; childrenIndex < group.children.length; childrenIndex++) {
            const child = group.children[childrenIndex];
            
            if (!(child instanceof THREE.Mesh || child instanceof THREE.Group || child.constructor === THREE.Object3D)) {
                continue;
            }

            if (child instanceof THREE.Mesh) {
                const childGap = materialGapArray[child.name] as number;
                const childMesh = this.getHalfMesh(child, childGap, fixedNormal, fixedOffset);

                if (childMesh !== null) {
                    halfGroup.add(childMesh);
                    flag = true;
                }
            } else {
                const childMaterialGapArray = materialGapArray[child.name] as HierarchicalNumberArray;
                const childGroup = this.getHalfGroup(child, childMaterialGapArray, fixedNormal, fixedOffset);

                if (childGroup !== null) {
                    halfGroup.attach(childGroup);
                    flag = true;
                }
            }
        }

        if (!flag) {
            return null;
        }

        halfGroup.name = group.name;

        halfGroup.applyQuaternion(group.quaternion)
        halfGroup.position.copy(group.position);

        return halfGroup;
    }

    static cutMesh(
        mesh: THREE.Mesh, 
        gap: number, 
        normal: THREE.Vector3, 
        offset: THREE.Vector3, 
    ): THREE.Mesh[] {
        const meshArray: THREE.Mesh[] = [];

        const positiveMesh = this.getHalfMesh(mesh, gap, normal, offset);
        const negativeMesh = this.getHalfMesh(mesh, gap, normal.clone().multiplyScalar(-1), offset);

        if (positiveMesh !== null) {
            meshArray.push(positiveMesh);
        }
        if (negativeMesh !== null) {
            meshArray.push(negativeMesh);
        }

        return meshArray;
    }

    static getHalfMesh(
        mesh: THREE.Mesh, 
        gap: number, 
        normal: THREE.Vector3, 
        offset: THREE.Vector3, 
    ): THREE.Mesh | null {
        const quaternion = new THREE.Quaternion().setFromEuler(mesh.rotation).invert();
        const fixedNormal = normal.clone().normalize().applyQuaternion(quaternion);
        const fixedOffset = offset.clone().sub(mesh.position).applyQuaternion(quaternion);

        console.log(mesh.name);

        const geometry = this.getHalfGeometry(mesh.geometry, fixedNormal, fixedOffset.clone().add(fixedNormal.clone().multiplyScalar(-gap)));

        if (geometry === null) {
            return null;
        }

        geometry.computeVertexNormals();
        
        //(mesh.material as THREE.MeshStandardMaterial).wireframe = true;
        
        const halfMesh = new THREE.Mesh(geometry, mesh.material);
        halfMesh.name = mesh.name;

        halfMesh.applyQuaternion(mesh.quaternion)
        halfMesh.position.copy(mesh.position);

        return halfMesh;
    }

    static getHalfGeometry(
        geometry: THREE.BufferGeometry, 
        normal: THREE.Vector3, 
        offset: THREE.Vector3
    ): THREE.BufferGeometry | null {
        const intercept: number = -offset.dot(normal);
        const verticeAttribute = geometry.getAttribute('position');
        const originalIndexAttribute = geometry.getIndex() as THREE.BufferAttribute;
        const triangleN: number = originalIndexAttribute.count / 3;
        const halfVerticeArray = new Float32Array(triangleN * 9);
        const usedIndexArray = new Int32Array(originalIndexAttribute.count);
        const newVerticeArray = new Int32Array(triangleN * 3 * 2);
        const crossSectionDictonary: NumberToNumberArrayDictionary = {};
        const faceArray = new Uint32Array(triangleN * 3 * 2); // 最大元の2倍程度になる
        const knownVerticeIndexDictionary: Number3DToNumberDictionary = {};
        usedIndexArray.fill(-1);

        let halfVerticeN: number = 0;
        let faceN: number = 0;
        let newVerticeN: number = 0;

        for(let triangleIndex = 0; triangleIndex < triangleN; triangleIndex++) {
            const triangleVerticeArray: THREE.Vector3[] = [
                new THREE.Vector3(...verticeAttribute.array.slice(originalIndexAttribute.array[triangleIndex * 3 + 0] * 3, originalIndexAttribute.array[triangleIndex * 3 + 0] * 3 + 3)), 
                new THREE.Vector3(...verticeAttribute.array.slice(originalIndexAttribute.array[triangleIndex * 3 + 1] * 3, originalIndexAttribute.array[triangleIndex * 3 + 1] * 3 + 3)),
                new THREE.Vector3(...verticeAttribute.array.slice(originalIndexAttribute.array[triangleIndex * 3 + 2] * 3, originalIndexAttribute.array[triangleIndex * 3 + 2] * 3 + 3)),
            ];
            const originalIndexArray: number[] = [
                this.getKnownVertice(knownVerticeIndexDictionary, triangleVerticeArray[0], originalIndexAttribute.array[triangleIndex * 3 + 0]), 
                this.getKnownVertice(knownVerticeIndexDictionary, triangleVerticeArray[1], originalIndexAttribute.array[triangleIndex * 3 + 1]), 
                this.getKnownVertice(knownVerticeIndexDictionary, triangleVerticeArray[2], originalIndexAttribute.array[triangleIndex * 3 + 2]), 
            ]

            const sideInfoArray: {side: number, addition: boolean}[] = [];

            for (let i = 0; i < 3; i++) {
                const sideInfo = this.getVerticeSide(triangleVerticeArray[i], originalIndexArray[i], usedIndexArray, halfVerticeArray, halfVerticeN, normal, intercept);
                
                if (sideInfo.addition) {
                    halfVerticeN += 1;
                }

                sideInfoArray.push(sideInfo);
            }

            const triangleState: number = sideInfoArray[0].side + sideInfoArray[1].side + sideInfoArray[2].side;

            
            if (triangleState == 0) { // すべてカットされた場合
                continue;
            } else if (triangleState == 3) { // すべて残った場合
                faceArray[faceN * 3 + 0] = usedIndexArray[originalIndexArray[0]];
                faceArray[faceN * 3 + 1] = usedIndexArray[originalIndexArray[1]];
                faceArray[faceN * 3 + 2] = usedIndexArray[originalIndexArray[2]];
                
                faceN += 1;
            } else if (triangleState == 1) { // 1頂点だけ残った場合
                for (let verticeIndex = 0; verticeIndex < 3; verticeIndex++) {
                    if (sideInfoArray[verticeIndex].side > 0) {
                        const mainVertice = triangleVerticeArray[verticeIndex];
                        faceArray[faceN * 3] = usedIndexArray[originalIndexArray[verticeIndex]];

                        const lineRatioUpper = -(normal.dot(mainVertice) + intercept);
                        for (let subVerticeIndex = 0; subVerticeIndex < 2; subVerticeIndex++) {
                            
                            let newVerticeIndex = this.searchNewVertice(
                                originalIndexArray[verticeIndex], 
                                originalIndexArray[(verticeIndex + 1 + subVerticeIndex) % 3],
                                newVerticeArray,
                                newVerticeN
                            );

                            if (newVerticeIndex == -1) {
                                const subVertice = triangleVerticeArray[(verticeIndex + 1 + subVerticeIndex) % 3];
                                const lineVector = subVertice.clone().sub(mainVertice);
                                const lineRatio = lineRatioUpper / normal.dot(lineVector);
                                const vertice = mainVertice.clone().add(lineVector.clone().multiplyScalar(lineRatio));
    
                                newVerticeIndex = halfVerticeN;

                                this.addNewVertice(
                                    vertice, 
                                    originalIndexArray[verticeIndex], 
                                    originalIndexArray[(verticeIndex + 1 + subVerticeIndex) % 3],
                                    halfVerticeArray,
                                    newVerticeIndex,
                                    newVerticeArray,
                                    newVerticeN
                                )
    
                                halfVerticeN += 1;
                                newVerticeN += 1;
                            }
                                
                            faceArray[faceN * 3 + 1 + subVerticeIndex] = newVerticeIndex;
                        }

                        this.setCrossSection(crossSectionDictonary, faceArray[faceN * 3 + 1], faceArray[faceN * 3 + 2]);
                        
                        faceN += 1;

                        break;
                    }
                }
            } else if (triangleState == 2) { // 2頂点だけ残った場合
                for (let verticeIndex = 0; verticeIndex < 3; verticeIndex++) {
                    if (sideInfoArray[verticeIndex].side <= 0) {
                        const mainVertice = triangleVerticeArray[verticeIndex];

                        // 1st triangle

                        for (let subVerticeIndex = 0; subVerticeIndex < 2; subVerticeIndex++) {
                            faceArray[faceN * 3 + subVerticeIndex] = usedIndexArray[originalIndexArray[(verticeIndex + 1 + subVerticeIndex) % 3]];
                        }

                        const lineRatioUpper = -(normal.dot(mainVertice) + intercept);

                        let verticeIndex0 = this.searchNewVertice(
                            originalIndexArray[verticeIndex], 
                            originalIndexArray[(verticeIndex + 1) % 3],
                            newVerticeArray,
                            newVerticeN
                        );

                        if (verticeIndex0 == -1) {
                            const subVertice0 = triangleVerticeArray[(verticeIndex + 1) % 3];
                            const lineVector0 = subVertice0.clone().sub(mainVertice);
                            const lineRatio0 = lineRatioUpper / normal.dot(lineVector0);
                            const vertice0 = mainVertice.clone().add(lineVector0.clone().multiplyScalar(lineRatio0));
                            
                            verticeIndex0 = halfVerticeN;
                            this.addNewVertice(
                                vertice0, 
                                originalIndexArray[verticeIndex], 
                                originalIndexArray[(verticeIndex + 1) % 3],
                                halfVerticeArray,
                                verticeIndex0,
                                newVerticeArray,
                                newVerticeN
                            )
                            halfVerticeN += 1;
                            newVerticeN += 1;

                            // 実際は断面が1頂点のみの場合
                            if (lineRatio0 == 1.0) {
                                this.setNewVertice(
                                    originalIndexArray[verticeIndex],
                                    originalIndexArray[(verticeIndex + 2) % 3],
                                    verticeIndex0, 
                                    newVerticeArray,
                                    newVerticeN
                                )
                                newVerticeN += 1;

                                faceArray[faceN * 3 + 2] = verticeIndex0;
                                faceN += 1;

                                break;
                            }
                        }
                        
                        faceArray[faceN * 3 + 2] = verticeIndex0;
                        faceN += 1;

                        // 2nd triangle

                        faceArray[faceN * 3 + 0] = verticeIndex0;
                        faceArray[faceN * 3 + 1] = usedIndexArray[originalIndexArray[(verticeIndex + 2) % 3]];

                        let verticeIndex1 = this.searchNewVertice(
                            originalIndexArray[verticeIndex], 
                            originalIndexArray[(verticeIndex + 2) % 3],
                            newVerticeArray,
                            newVerticeN
                        );

                        if (verticeIndex1 == -1) {
                            const subVertice1 = triangleVerticeArray[(verticeIndex + 2) % 3];
                            const lineVector1 = subVertice1.clone().sub(mainVertice);
                            const lineRatio1 = lineRatioUpper / normal.dot(lineVector1);
                            const vertice1 = mainVertice.clone().add(lineVector1.clone().multiplyScalar(lineRatio1));

                            verticeIndex1 = halfVerticeN;
                            this.addNewVertice(
                                vertice1, 
                                originalIndexArray[verticeIndex], 
                                originalIndexArray[(verticeIndex + 2) % 3],
                                halfVerticeArray,
                                verticeIndex1,
                                newVerticeArray,
                                newVerticeN
                            )

                            halfVerticeN += 1;
                            newVerticeN += 1;
                        }

                        faceArray[faceN * 3 + 2] = verticeIndex1;
                        
                        this.setCrossSection(crossSectionDictonary, verticeIndex0, verticeIndex1);

                        faceN += 1;

                        break;
                    }
                }
            }
        }

        if (halfVerticeN == 0) {
            return null;
        }

        if (halfVerticeN == originalIndexAttribute.count) {
            return geometry;
        }

        const sameCrossSectionDictonary: Number3DToNumberArrayDictionary = {};

        for (const crossSectionIndexStr0 in crossSectionDictonary) {
            const crossSectionIndex0 = Number(crossSectionIndexStr0);
            
            for (const crossSectionIndexStr1 in crossSectionDictonary) {
                const crossSectionIndex1 = Number(crossSectionIndexStr1);
                const x0 = halfVerticeArray[crossSectionIndex0 * 3 + 0];
                const y0 = halfVerticeArray[crossSectionIndex0 * 3 + 1];
                const z0 = halfVerticeArray[crossSectionIndex0 * 3 + 2];
                
                if (
                    crossSectionIndex0 < crossSectionIndex1
                    && x0 == halfVerticeArray[crossSectionIndex1 * 3 + 0]
                    && y0 == halfVerticeArray[crossSectionIndex1 * 3 + 1]
                    && z0 == halfVerticeArray[crossSectionIndex1 * 3 + 2]
                ) {
                    let tempSameCrossSectionDictonary: any = sameCrossSectionDictonary;

                    for (let xyz = 0; xyz < 3; xyz++) {
                        const oldSameCrossSectionDictonary = tempSameCrossSectionDictonary;
                        tempSameCrossSectionDictonary = oldSameCrossSectionDictonary[halfVerticeArray[crossSectionIndex0 * 3 + xyz]];

                        if (tempSameCrossSectionDictonary === undefined) {
                            if (xyz < 2) {
                                oldSameCrossSectionDictonary[halfVerticeArray[crossSectionIndex0 * 3 + xyz]] = {};
                            } else {
                                oldSameCrossSectionDictonary[halfVerticeArray[crossSectionIndex0 * 3 + xyz]] = [];
                            }
                        }

                        tempSameCrossSectionDictonary = oldSameCrossSectionDictonary[halfVerticeArray[crossSectionIndex0 * 3 + xyz]];
                    }

                    const tempArray: number[] = tempSameCrossSectionDictonary as [];
                    if (tempArray.findIndex((value: number) => (value == crossSectionIndex0)) == -1) {
                        tempArray.push(crossSectionIndex0);
                    }

                    if (tempArray.findIndex((value: number) => (value == crossSectionIndex1)) == -1) {
                        tempArray.push(crossSectionIndex1);
                    }
                }
            }
        }

        const changeCrossSectionDictionary: {[index: number]: number} = {};

        for (const xStr in sameCrossSectionDictonary) {
            for (const yStr in sameCrossSectionDictonary[xStr]) {
                for (const zStr in sameCrossSectionDictonary[xStr][yStr]) {
                    const tempArray = sameCrossSectionDictonary[xStr][yStr][zStr];

                    for (let tempArrayIndex = 1; tempArrayIndex < tempArray.length; tempArrayIndex++) {
                        changeCrossSectionDictionary[tempArray[tempArrayIndex]] = tempArray[0];
                    }
                }
            }
        }

        for (const crossSectionIndexStr0 in crossSectionDictonary){
            const crossSectionIndex0 = Number(crossSectionIndexStr0);

            const tempArray = crossSectionDictonary[crossSectionIndex0];

            for (let tempArrayIndex = 0; tempArrayIndex < tempArray.length; tempArrayIndex++) {
                if (changeCrossSectionDictionary[tempArray[tempArrayIndex]] !== undefined) {
                    tempArray[tempArrayIndex] = changeCrossSectionDictionary[tempArray[tempArrayIndex]];
                }
            }

            if (changeCrossSectionDictionary[crossSectionIndex0] !== undefined) {
                const changeIndex = changeCrossSectionDictionary[crossSectionIndex0];
                
                for (let tempArrayIndex = 0; tempArrayIndex < tempArray.length; tempArrayIndex++) {
                    if (crossSectionDictonary[changeIndex].includes(tempArray[tempArrayIndex])) {
                        const tempIndex = crossSectionDictonary[changeIndex].findIndex((value: number) => (value == tempArray[tempArrayIndex]));
                        crossSectionDictonary[changeIndex].splice(tempIndex, 1);
                    } else {
                        crossSectionDictonary[changeIndex].push(tempArray[tempArrayIndex]);
                    }
                }

                delete crossSectionDictonary[crossSectionIndex0];
            }
        }

        // 1. crossSectionDictonaryから閉路を取り出す

        let pathIndexArray: number[] = [];
        const cycleArray: (number[])[] = [];
        const visitedIndexDictionary: {[index: number]: number[]} = {};
        const deletedCycleIndexArray: number[] = [];

        for (const startIndexStr in crossSectionDictonary) {
            const startIndex = Number(startIndexStr);

            if (!(startIndex in visitedIndexDictionary)) {
                let oldIndex = startIndex;
                let nowIndex = crossSectionDictonary[startIndex][0];
                let n = 0;
                let maxCycleLength = 3;
                const visitedCycleIndexArray: number[] = [];

                while (nowIndex !== startIndex && nowIndex !== -1 && nowIndex !== undefined) {
                    const tempIndex = nowIndex;
                    nowIndex = crossSectionDictonary[nowIndex][crossSectionDictonary[nowIndex].findIndex((value: number) => {return value !== oldIndex})];
                    oldIndex = tempIndex;
                    
                    pathIndexArray.push(oldIndex);
                    if (visitedIndexDictionary[oldIndex] === undefined) {
                        visitedIndexDictionary[oldIndex] = [];
                    } else {
                        for(const visitedIndex in visitedIndexDictionary[oldIndex]) {
                            const visitedCycleIndex = visitedIndexDictionary[oldIndex][visitedIndex];
                            
                            const tempCycleLength = cycleArray[visitedCycleIndex].length;

                            maxCycleLength = Math.max(maxCycleLength, tempCycleLength);
                            visitedCycleIndexArray.push(visitedCycleIndex);
                        }
                    }
                    visitedIndexDictionary[oldIndex].push(cycleArray.length);

                    n += 1;
                    if (n > 10000) {
                        throw new Error('fuck');
                    }
                }

                pathIndexArray.push(startIndex);
                if (visitedIndexDictionary[startIndex] === undefined) {
                    visitedIndexDictionary[startIndex] = [];
                }
                visitedIndexDictionary[startIndex].push(cycleArray.length);

                if (pathIndexArray.length < maxCycleLength) {
                    deletedCycleIndexArray.push(cycleArray.length);
                } else {
                    for (let visitedCycleIndexArrayIndex = 0; visitedCycleIndexArrayIndex < visitedCycleIndexArray.length; visitedCycleIndexArrayIndex++) {
                        const visitedCycleIndex = visitedCycleIndexArray[visitedCycleIndexArrayIndex];

                        if (!deletedCycleIndexArray.includes(visitedCycleIndex)) {
                            deletedCycleIndexArray.push(visitedCycleIndex);
                        }
                    }
                }

                cycleArray.push(pathIndexArray);

                pathIndexArray = [];
            }
        }

        // 2. Vector3を2Dに落とし込む
        const crossSectionVertice2DDictionary: {[index: number]: THREE.Vector2} = {};
        const crossSectionIndexDictionary: {[x: number]: {[y: number]: number}} = {};
        const invertedNormalQuaternion = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, -1));

        for (const crossSectionIndexStr in crossSectionDictonary) {
            const crossSectionIndex = Number(crossSectionIndexStr);
            const crossSectionVertice3D = new THREE.Vector3(...halfVerticeArray.slice(crossSectionIndex * 3, crossSectionIndex * 3 + 3));
            const rotatedCrossSectionVertice3D = crossSectionVertice3D.sub(offset).applyQuaternion(invertedNormalQuaternion);
            const xy = new Float32Array([rotatedCrossSectionVertice3D.x, rotatedCrossSectionVertice3D.y]);

            crossSectionVertice2DDictionary[crossSectionIndex] = new THREE.Vector2(xy[0], xy[1]);

            if (crossSectionIndexDictionary[xy[0]] === undefined) {
                crossSectionIndexDictionary[xy[0]] = {};
            }

            crossSectionIndexDictionary[xy[0]][xy[1]] = crossSectionIndex;
        }

        const parentRelationCycleArray: (number[])[] = Array(cycleArray.length);
        const childRelationCycleArray: (number[])[] = Array(cycleArray.length);

        // 穴を見つける

        for (let parentCycleIndex = 0; parentCycleIndex < cycleArray.length; parentCycleIndex++) {
            const parentCycle = cycleArray[parentCycleIndex];

            for (let cycleIndex = 0; cycleIndex < cycleArray.length; cycleIndex++) {
                if (cycleIndex === parentCycleIndex) {
                    continue;
                }

                const cycleVertice = crossSectionVertice2DDictionary[cycleArray[cycleIndex][0]];
                let crossN = 0;

                let nowParentVertice = crossSectionVertice2DDictionary[parentCycle[parentCycle.length - 1]];
                let oldParentVertice: THREE.Vector2;
                for (let parentVerticeIndex = 0; parentVerticeIndex < parentCycle.length; parentVerticeIndex++) {
                    oldParentVertice = nowParentVertice.clone();
                    nowParentVertice = crossSectionVertice2DDictionary[parentCycle[parentVerticeIndex]];

                    if (xor(oldParentVertice.y < cycleVertice.y, nowParentVertice.y < cycleVertice.y)) {
                        const nowOldVector = oldParentVertice.clone().sub(nowParentVertice);
                        const nowOldVector90CW = new THREE.Vector2(-nowOldVector.y, nowOldVector.x);
                        const bottomK = nowOldVector90CW.dot(new THREE.Vector2(1, 0));
                        const topK = nowOldVector90CW.dot(nowParentVertice.clone().sub(cycleVertice));
                        const k = topK / bottomK;
                        const crossVector = nowOldVector.clone().multiplyScalar(k).add(nowParentVertice);
                        
                        if (crossVector.x > cycleVertice.x) {
                            crossN += 1;
                        }
                    } else if (oldParentVertice.y == cycleVertice.y && nowParentVertice.y == cycleVertice.y) {
                        if (xor(oldParentVertice.x > cycleVertice.x, nowParentVertice.x > cycleVertice.x)) {
                            crossN += 1;
                        }
                    }
                }

                if (crossN % 2 == 1) {
                    if ( parentRelationCycleArray[cycleIndex] === undefined) {
                        parentRelationCycleArray[cycleIndex] = [];
                    }
                    parentRelationCycleArray[cycleIndex].push(parentCycleIndex);

                    if (childRelationCycleArray[parentCycleIndex] === undefined) {
                        childRelationCycleArray[parentCycleIndex] = [];
                    }
                    childRelationCycleArray[parentCycleIndex].push(cycleIndex);
                }
            }    
        }

        // parentRelationの重複をなくす

        const rootFlagDictionary: {[index: number]: number} = {};
        const rootIndexDictionary: {[index: number]: number} = {};
        const nodeIndexDictionary: {[index: number]: number[]} = {};

        for (let parentCycleIndex = 0; parentCycleIndex < cycleArray.length; parentCycleIndex++) {
            if (!(parentCycleIndex in parentRelationCycleArray)) {
                rootFlagDictionary[parentCycleIndex] = 0;
            }
        }

        for (const rootCycleIndexStr in rootFlagDictionary) {
            const rootCycleIndex = Number(rootCycleIndexStr);

            const nodeCycleArray = childRelationCycleArray[rootCycleIndex];

            if (nodeCycleArray === undefined) {
                continue;
            }

            for (let nodeCycleArrayIndex = 0; nodeCycleArrayIndex < nodeCycleArray.length; nodeCycleArrayIndex++) {
                const nodeCycleIndex = nodeCycleArray[nodeCycleArrayIndex];
                const childLength = parentRelationCycleArray[nodeCycleIndex].length;

                if (childLength == rootFlagDictionary[rootCycleIndex] + 1) {
                    rootFlagDictionary[nodeCycleIndex] = childLength;
                    rootIndexDictionary[nodeCycleIndex] = rootCycleIndex;

                    if (nodeIndexDictionary[rootCycleIndex] === undefined) {
                        nodeIndexDictionary[rootCycleIndex] = [];
                    }

                    nodeIndexDictionary[rootCycleIndex].push(nodeCycleIndex);
                }
            }
        }


        // 3. 図形を三角形に分割する
        // Shapesでholeを設定し、ShapeGeometryに任せる
        // mergeGeometriesで合体

        const crossSectionShapeArray: THREE.Shape[] = [];

        for (let cycleIndex = 0; cycleIndex < cycleArray.length; cycleIndex++) {
            const cycleVerticeArray: THREE.Vector2[] = [];
            
            for (let cycleVerticeArrayIndex = 0; cycleVerticeArrayIndex < cycleArray[cycleIndex].length; cycleVerticeArrayIndex++) {
                cycleVerticeArray.push(crossSectionVertice2DDictionary[cycleArray[cycleIndex][cycleVerticeArrayIndex]]);
            }

            const crossSectionShape = new THREE.Shape(cycleVerticeArray);

            crossSectionShapeArray.push(crossSectionShape);
        }

        const rootShapeArray: THREE.Shape[] = [];

        for (let rootIndex = 0; rootIndex < cycleArray.length; rootIndex++) {
            if (rootFlagDictionary[rootIndex] % 2 == 0 || rootFlagDictionary[rootIndex] === undefined) {
                const rootShape = crossSectionShapeArray[rootIndex];

                if (nodeIndexDictionary[rootIndex] !== undefined) {
                    for (let nodeIndex = 0; nodeIndex < nodeIndexDictionary[rootIndex].length; nodeIndex++) {
                        const holeShape = crossSectionShapeArray[nodeIndexDictionary[rootIndex][nodeIndex]];

                        rootShape.holes.push(holeShape);
                    }
                }

                rootShapeArray.push(rootShape);
            }
        }

        const crossSectionGeometry = new THREE.ShapeGeometry(rootShapeArray, 1);
        crossSectionGeometry.deleteAttribute('uv');
        crossSectionGeometry.deleteAttribute('normal');
        
        const crossSectionVerticeArray = crossSectionGeometry.attributes.position.array;
        const crossSectionVerticeN = crossSectionVerticeArray.length / 3;
        const normalQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

        for (let crossSectionVerticeIndex = 0; crossSectionVerticeIndex < crossSectionVerticeN; crossSectionVerticeIndex++) {
            const verticeArray = crossSectionVerticeArray.slice(crossSectionVerticeIndex * 3, crossSectionVerticeIndex * 3 + 2);

            if (crossSectionIndexDictionary[verticeArray[0]] !== undefined) {
                const halfVerticeIndex = crossSectionIndexDictionary[verticeArray[0]][verticeArray[1]];
                
                if (halfVerticeIndex !== undefined) {
                    crossSectionVerticeArray[crossSectionVerticeIndex * 3 + 0] = halfVerticeArray[halfVerticeIndex * 3 + 0];
                    crossSectionVerticeArray[crossSectionVerticeIndex * 3 + 1] = halfVerticeArray[halfVerticeIndex * 3 + 1];
                    crossSectionVerticeArray[crossSectionVerticeIndex * 3 + 2] = halfVerticeArray[halfVerticeIndex * 3 + 2];

                    continue;
                }

            }

            const verticeVector3D: THREE.Vector3 = new THREE.Vector3(verticeArray[0], verticeArray[1], 0);
            
            verticeVector3D.applyQuaternion(normalQuaternion);
            verticeVector3D.add(offset);

            crossSectionVerticeArray[crossSectionVerticeIndex * 3 + 0] = verticeVector3D.x;
            crossSectionVerticeArray[crossSectionVerticeIndex * 3 + 1] = verticeVector3D.y;
            crossSectionVerticeArray[crossSectionVerticeIndex * 3 + 2] = verticeVector3D.z;
        }
        crossSectionGeometry.setAttribute('position', new THREE.BufferAttribute(crossSectionVerticeArray, 3));

        // create geometry
        const vertices = halfVerticeArray.slice(0, halfVerticeN * 3);
        const halfFaceGeometry = new THREE.BufferGeometry();
        halfFaceGeometry.setIndex(new THREE.BufferAttribute(faceArray.slice(0, faceN * 3), 1));
        halfFaceGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        crossSectionGeometry.computeVertexNormals();
        halfFaceGeometry.computeVertexNormals();

        const halfGeometry = BufferGeometryUtils.mergeVertices(BufferGeometryUtils.mergeGeometries([halfFaceGeometry, crossSectionGeometry]), 0);

        return halfGeometry;
    }

    static getVerticeSide(
        vertice: THREE.Vector3, 
        originalVerticeIndex: number, 
        usedIndexArray: THREE.TypedArray, 
        verticeArray: THREE.TypedArray,
        verticeN: number,
        normal: THREE.Vector3, 
        intercept: number
    ): {side: number, addition: boolean} {
        if (usedIndexArray[originalVerticeIndex] == -2) {
            return {side: 0, addition: false};
        } else if (usedIndexArray[originalVerticeIndex] >= 0) {
            return {side: 1, addition: false};
        } else {
            const side = normal.dot(vertice) + intercept > 0;

            // add usedVertice

            if (side) {
                this.setVertice(
                    vertice, 
                    verticeArray,
                    verticeN, 
                )
                usedIndexArray[originalVerticeIndex] = verticeN;
            } else {
                usedIndexArray[originalVerticeIndex] = -2;
            }

            return {side: Number(side), addition: side};
        }
    }

    static searchNewVertice(
        originalVerticeIndex0: number,
        originalVerticeIndex1: number,
        newVerticeArray: THREE.TypedArray,
        newVerticeN: number, 
    ): number {
        for (let newVerticeIndex = 0; newVerticeIndex < newVerticeN; newVerticeIndex++) {
            const verticeIndex0 = newVerticeArray[newVerticeIndex * 3 + 0];
            const verticeIndex1 = newVerticeArray[newVerticeIndex * 3 + 1];

            if (
                (verticeIndex0 == originalVerticeIndex0 && verticeIndex1 == originalVerticeIndex1)
                || (verticeIndex0 == originalVerticeIndex1 && verticeIndex1 == originalVerticeIndex0)
            ) {
                return newVerticeArray[newVerticeIndex * 3 + 2];
            }
        }

        return -1;
    }

    static addNewVertice(
            vertice: THREE.Vector3, 
            originalVerticeIndex0: number,
            originalVerticeIndex1: number,
            verticeArray: THREE.TypedArray,
            verticeN: number, 
            newVerticeArray: THREE.TypedArray,
            newVerticeN: number, 
        ) {
        this.setVertice(
            vertice, 
            verticeArray,
            verticeN, 
        )
        this.setNewVertice(
            originalVerticeIndex0,
            originalVerticeIndex1,
            verticeN, 
            newVerticeArray,
            newVerticeN, 
        )
    }

    static setVertice(
        vertice: THREE.Vector3, 
        verticeArray: THREE.TypedArray,
        verticeN: number, 
    ) {
        verticeArray[verticeN * 3 + 0] = vertice.x;
        verticeArray[verticeN * 3 + 1] = vertice.y;
        verticeArray[verticeN * 3 + 2] = vertice.z;
    }

    static setNewVertice(
        originalVerticeIndex0: number,
        originalVerticeIndex1: number,
        verticeIndex: number, 
        newVerticeArray: THREE.TypedArray,
        newVerticeN: number, 
    ) {
        newVerticeArray[newVerticeN * 3 + 0] = originalVerticeIndex0;
        newVerticeArray[newVerticeN * 3 + 1] = originalVerticeIndex1;
        newVerticeArray[newVerticeN * 3 + 2] = verticeIndex;
    }

    static setCrossSection(
        crossSectionDictonary: NumberToNumberArrayDictionary,
        verticeIndex0: number,
        verticeIndex1: number,
    ) {
        if (crossSectionDictonary[verticeIndex0] === undefined) {
            crossSectionDictonary[verticeIndex0] = [verticeIndex1];
        } else if (!crossSectionDictonary[verticeIndex0].includes(verticeIndex1)) {
            crossSectionDictonary[verticeIndex0].push(verticeIndex1);
        }
        if (crossSectionDictonary[verticeIndex1] === undefined) {
            crossSectionDictonary[verticeIndex1] = [verticeIndex0];
        } else if (!crossSectionDictonary[verticeIndex1].includes(verticeIndex0)) {
            crossSectionDictonary[verticeIndex1].push(verticeIndex0);
        }
    }

    static getKnownVertice(
        knownVerticeIndexDictionary: Number3DToNumberDictionary,
        vertice: THREE.Vector3,
        originalVerticeIndex: number
    ): number {
        const verticeXYZ: number[] = vertice.toArray();
        let knownVerticeIndexDepth: any = knownVerticeIndexDictionary;
        
        for (let xy = 0; xy < 2; xy++) {
            if (!(verticeXYZ[xy] in knownVerticeIndexDepth)) {
                knownVerticeIndexDepth[verticeXYZ[xy]] = {};
            }

            knownVerticeIndexDepth = knownVerticeIndexDepth[verticeXYZ[xy]];
        }

        if (!(verticeXYZ[2] in knownVerticeIndexDepth)) {
            knownVerticeIndexDepth[verticeXYZ[2]] = originalVerticeIndex;
        }

        return knownVerticeIndexDepth[verticeXYZ[2]];
    }
}

function xor(a: boolean, b: boolean) {
    return ( a || b ) && !( a && b );
}