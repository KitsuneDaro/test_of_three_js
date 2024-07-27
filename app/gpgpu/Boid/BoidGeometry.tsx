import * as THREE from 'three';
import { BoidInfomation } from './BoidInformation';

export class BoidGeometry extends THREE.BufferGeometry {

    constructor(boidInfo: BoidInfomation) {
        super();

        const trianglesPerBoid = 2;
        const triangles = boidInfo.boidN * trianglesPerBoid;
        const points = triangles * 2;

        const vertices = new THREE.BufferAttribute( new Float32Array( points * 3 ), 3 );
        const boidColors = new THREE.BufferAttribute( new Float32Array( points * 3 ), 3 );
        const references = new THREE.BufferAttribute( new Float32Array( points * 2 ), 2 );
        const boidVertex = new THREE.BufferAttribute( new Float32Array( points ), 1 );

        this.setAttribute( 'position', vertices );
        this.setAttribute( 'boidColor', boidColors );
        this.setAttribute( 'reference', references );
        this.setAttribute( 'boidVertex', boidVertex );


        let v = 0;

        function verts_push() {
            for ( let i = 0; i < arguments.length; i ++ ) {
                vertices.array[ v ++ ] = arguments[ i ];
            }
        }

        for ( let f = 0; f < boidInfo.boidN; f ++ ) {
            // Wings

            verts_push(
                0, 7.5, 0,
                0, -2.5, 0,
                5, -7.5, 0,
            );

            verts_push(
                0, 7.5, 0,
                0, -2.5, 0,
                -5, -7.5, 0,
            );
        }

        for ( let v = 0; v < triangles * 3; v++ ) {

            const triangleIndex = ~ ~ ( v / 3 );
            const boidIndex = ~ ~ ( triangleIndex / trianglesPerBoid );
            const x = ( boidIndex % boidInfo.boidWidth ) / boidInfo.boidWidth;
            const y = ~ ~ ( boidIndex / boidInfo.boidWidth ) / boidInfo.boidWidth;

            const c = new THREE.Color(
                0x666666 +
                ~ ~ ( v / 9 ) / boidInfo.boidN * 0x666666
            );

            boidColors.array[ v * 3 + 0 ] = c.r;
            boidColors.array[ v * 3 + 1 ] = c.g;
            boidColors.array[ v * 3 + 2 ] = c.b;

            references.array[ v * 2 ] = x;
            references.array[ v * 2 + 1 ] = y;

            boidVertex.array[ v ] = v % 9;

        }

        this.scale( 0.1 / boidInfo.boidWidth, 0.1 / boidInfo.boidWidth, 0.01 );
    }

}