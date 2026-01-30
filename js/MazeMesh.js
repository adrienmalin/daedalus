import * as THREE from 'three';

export default class MazeMesh extends THREE.InstancedMesh {
    constructor( width, length, height, material ) {
        super( 
            new THREE.BoxGeometry( 1, height, 1 ),
            material,
            width*length - 2
        );
        this.length = length
        this.width = width
        this.map = new Array(length).fill().map(() => new Array(width).fill(1))
        this.start = new THREE.Vector3(width/2, .1, length/2)
        this.exit = new THREE.Vector3(Math.floor(width/2), 0, 1)

        this.dig(this.exit)
        this.dig(new THREE.Vector3(Math.floor(width/2), 0, 0))
        this.build ( this.exit )
        let matrix = new THREE.Matrix4()
        this.count = 0
        this.map.forEach((row, z) => {
            row.forEach((isWall, x) => {
                if (isWall) {
                    matrix.setPosition( x + .5 - width/2, 0.5, z + .5 - length/2)
                    this.setMatrixAt( this.count, matrix );
                    this.count++
                }
            })
        })
    }
    
dig(position) {
        this.map[position.z][position.x] = 0
    }

    static DIRECTIONS = [
        new THREE.Vector3( 0, 0, -1),
        new THREE.Vector3( 0, 0,  1),
        new THREE.Vector3(-1, 0,  0),
        new THREE.Vector3( 1, 0,  0),
    ]
    build(position) {
        for (var direction of Array.from(this.constructor.DIRECTIONS).sort(x => .5 - Math.random())) {
            var step1 = position.clone().add(direction)
            var step2 = step1.clone().add(direction)
            if (this.isWall(step2) == 1) {
                this.dig(step1)
                this.dig(step2)
                this.count -= 2
                this.build(step2)
            }
        }
    }

    isWall(position) {
        if (0 <= position.x && position.x < this.width &&
            0 <= position.y &&
            0 <= position.z && position.z < this.length) {
            return this.map[Math.floor(position.z)][Math.floor(position.x)]
        } else {
            return -1
        }
    }

    collision(position) {
        return this.isWall(this.worldToLocal(position))
    }

    toString() {
        return this.map.map(row => 
            row.map(isWall => isWall? "██":"  ").join("")
        ).join("\n")
    }
}