import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';

import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';

import { Capsule } from 'three/addons/math/Capsule.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';

const DIRECTIONS = [
    new THREE.Vector3( 0, 0, -1),
    new THREE.Vector3( 0, 0,  1),
    new THREE.Vector3(-1, 0,  0),
    new THREE.Vector3( 1, 0,  0),
]

class Labyrinthe extends Array {
    constructor(width, length) {
        super()
        for (let row=0; row < length; row++) {
            this.push(new Array(width).fill(1))
        }
        this.length = length
        this.width = width
        this.start = new THREE.Vector3(width/2, .1, length/2)
        this.exit = new THREE.Vector3(Math.floor(width/2), 0, 1)
        this.dig(this.exit)
        this.dig(new THREE.Vector3(Math.floor(width/2), 0, 0))
        this.walls = length * width - 2
        this.build(this.exit)
    }

    build(position) {
        for (var direction of Array.from(DIRECTIONS).sort(x => .5 - Math.random())) {
            var step1 = position.clone().add(direction)
            var step2 = step1.clone().add(direction)
            if (this.isWall(step2) == 1) {
                this.dig(step1)
                this.dig(step2)
                this.walls -= 2
                this.build(step2)
            }
        }
    }
    
    dig(position) {
        this[position.z][position.x] = 0
    }

    isWall(position) {
        if (0 <= position.x && position.x < this.width &&
            0 <= position.z && position.z < this.length) {
            return this[Math.floor(position.z)][Math.floor(position.x)]
        } else {
            return -1
        }
    }
}

const latitude  = THREE.MathUtils.degToRad(35)
const longitude = THREE.MathUtils.degToRad(25)
const mazeLength = 51
const mazeWidth = 51

let showGUI = window.location.search.includes("debug")
let showStats = window.location.search.includes("stats")

const ambiance      = new Audio("snd/ambiance.mp3")
ambiance.loop       = true
const piano         = new Audio("snd/waves-and-tears.mp3")

const loadMngr      = new THREE.LoadingManager();
const loader        = new THREE.TextureLoader(loadMngr);
const waterTexture  = loader.load('img/waternormals.jpg');
const groundTexture = loader.load('img/ground.jpg');
const wallTexture   = loader.load('img/wall.jpg');
const woodTexture   = loader.load('img/wood.jpg');
loadMngr.onLoad = () => {
    animate();
};

const clock = new THREE.Clock();

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.rotation.order = 'YXZ';

const worldOctree = new Octree();
const raftOctree = new Octree();

const container = document.getElementById( 'container' );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap   ;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
container.appendChild( renderer.domElement );

// Water
waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
const ocean = new Water(
    new THREE.PlaneGeometry( 1000, 1000 ),
    {
        textureWidth   : 512,
        textureHeight  : 512,
        waterNormals   : waterTexture,
        sunDirection   : new THREE.Vector3(),
        sunColor       : 0xffffff,
        waterColor     : 0x001e0f,
        distortionScale: 3.7,
        fog            : scene.fog !== undefined,
        alpha          : 0.5
    }
);
ocean.rotation.x = - Math.PI / 2;
ocean.position.y = -.01
ocean.receiveShadow = true;
ocean.material.transparent = true;
scene.add( ocean );

// Lights

const ambientLight = new THREE.AmbientLight( 0x404040 , 1 ); // soft white light
scene.add( ambientLight );

const sunLight = new THREE.DirectionalLight( 0xffffff, 0.3 );
sunLight.castShadow            = true;
sunLight.shadow.camera.near    = 20;
sunLight.shadow.camera.far     = 200;
sunLight.shadow.camera.right   =  10;
sunLight.shadow.camera.left    = -10;
sunLight.shadow.camera.top     =  10;
sunLight.shadow.camera.bottom  = -10;
sunLight.shadow.mapSize.width  = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.radius         = 6;
sunLight.target                = camera
scene.add( sunLight );

const torchLight = new THREE.SpotLight(0xffffe8, 1, mazeLength/2, .45, 1)
scene.add( torchLight );
scene.add( torchLight.target );

// Skybox

const sun = new THREE.Vector3();

const sky = new Sky();
sky.scale.setScalar( 10000 );
scene.add( sky );

const skyUniforms = sky.material.uniforms;

skyUniforms[ 'turbidity' ].value = 10;
skyUniforms[ 'rayleigh' ].value = 2;
skyUniforms[ 'mieCoefficient' ].value = 0.005;
skyUniforms[ 'mieDirectionalG' ].value = 0.8;

const parameters = {
    elevation: 70,
    azimuth: 160
};

const pmremGenerator = new THREE.PMREMGenerator( renderer );
let renderTarget;

const today       = new Date()
const startOfYear = new Date(today.getFullYear(), 0, 0);
const diff        = today - startOfYear;
const oneDay      = 1000 * 60 * 60 * 24;
const dayOfYear   = Math.floor(diff / oneDay);
const declination = 0.40928 * Math.sin(2*Math.PI*(dayOfYear+284)/365)
const startHour   = 24 * Math.random()

function updateSun() {
    
    let elevation, azimuth
    if ( showGUI ) {
    
        elevation = THREE.MathUtils.degToRad( parameters.elevation );
        azimuth   = THREE.MathUtils.degToRad( parameters.azimuth );

    } else {

        const time      = clock.elapsedTime ;
        const hour      = ( startHour + time / 1440 ) % 24
        const hourAngle = Math.PI * (1-hour/12)
              elevation = Math.asin( Math.sin(declination)*Math.sin(latitude) + Math.cos(declination)*Math.cos(latitude)*Math.cos(hourAngle) )
              azimuth   = -Math.PI/2 + Math.asin( Math.cos(declination)*Math.sin(hourAngle)/Math.cos(elevation) )
    
    }

    const phi = Math.PI/2 - elevation
    const theta = azimuth

    sun.setFromSphericalCoords( 100, phi, theta );

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    ocean.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

    if ( elevation >= 0 ) {

        sunLight.visible = true
        torchLight.visible = false

    }  else {

        sunLight.visible   = false
        torchLight.visible = true

    }

    if ( renderTarget !== undefined ) renderTarget.dispose();

    renderTarget = pmremGenerator.fromScene( sky );

    scene.environment = renderTarget.texture;

}

updateSun();
const updateSunIntervalId = setInterval( updateSun, 100 );

// Ground

const groundGeometry = new THREE.PlaneGeometry(mazeLength, mazeWidth)
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping
groundTexture.repeat.set(50, 50)
const groundMaterial = new THREE.MeshPhongMaterial( {
    map       : groundTexture,
    color     : 0xFFFFFF,
    emissive  : 0,
    specular  : 0x000000,
    shininess : 5,
    bumpMap   : groundTexture,
    bumpScale : .02,
    depthFunc : 3,
    depthTest : true,
    depthWrite: true
} )
const ground = new THREE.Mesh( groundGeometry, groundMaterial )
ground.rotation.x = - Math.PI / 2;
ground.position.set(mazeLength/2, 0, mazeWidth/2)
ground.receiveShadow = true;
ground.matrixAutoUpdate = false
ground.updateMatrix();
scene.add(ground)
worldOctree.fromGraphNode( ground )

// Raft

const raftGeometry = new THREE.BoxGeometry( 1.8, .1, .9, 1, 1, 8 )
const raftMaterial = new THREE.MeshPhongMaterial( {
    map              : woodTexture,
    color            : 0xFFFFFF,
    emissive         : 0,
    specular         : 0x505050,
    shininess        : 1,
    bumpMap          : woodTexture,
    bumpScale        : .1,
    depthFunc        : 3,
    depthTest        : true,
    depthWrite       : true,
    displacementMap  : woodTexture,
    displacementScale: -0.08
} )
const raft = new THREE.Mesh( raftGeometry, raftMaterial )
raft.position.set( mazeLength/2 + .2, 0, -1 )
raft.rotation.y     = 1.4
raft.rotation.order = 'ZXY';
raft.castShadow     = true;
scene.add(raft)
worldOctree.fromGraphNode( raft )
raftOctree.fromGraphNode( raft )

// Maze

const wallGeometry = new THREE.BoxGeometry( 1, 1, 1 )
const wallMaterial = new THREE.MeshPhongMaterial( {
    map       : wallTexture,
    color     : 0xFFFFFF,
    emissive  : 0,
    specular  : 0x505050,
    shininess : 7,
    bumpMap   : wallTexture,
    bumpScale : .02,
    depthFunc : 3,
    depthTest : true,
    depthWrite: true
} )

const mazeMap = new Labyrinthe(mazeLength, mazeWidth)
const maze = new THREE.InstancedMesh( wallGeometry, wallMaterial, mazeMap.walls );
let matrix = new THREE.Matrix4()
const cube = new THREE.Mesh(wallGeometry)
let i=0
mazeMap.forEach((row, z) => {
    row.forEach((isWall, x) => {
        if (isWall) {
            matrix.setPosition(x + .5, 0.5, z + .5)
            maze.setMatrixAt( i, matrix );
            const clone = cube.clone()
            clone.position.set(x + .5, 0.5, z + .5)
            worldOctree.fromGraphNode( clone )
            i++
        }
    })
})
maze.castShadow    = true;
maze.receiveShadow = true;
maze.matrixAutoUpdate = false
scene.add(maze)

camera.position.copy(mazeMap.start)

// debug

let stats, octreeHelper, gui
if ( showGUI ) {

    gui = new GUI( { width: 200 } );

    octreeHelper = new OctreeHelper( worldOctree );
    octreeHelper.visible = false;
    scene.add( octreeHelper );
    const lightHelper = new THREE.DirectionalLightHelper( sunLight, .5 )
    lightHelper.position.copy(mazeMap.start)
    lightHelper.visible = false;
    scene.add( lightHelper );
    var cameraHelper = new THREE.CameraHelper(sunLight.shadow.camera);
    cameraHelper.visible = false;
    scene.add(cameraHelper)
    const showHelper = gui.add( { helpers: false }, "helpers" )
    showHelper.onChange( function ( value ) {

        octreeHelper.visible = value;
        lightHelper.visible  = value;
        cameraHelper.visible = value;

    } );

    const folderSky = gui.addFolder( 'Sky' );
    folderSky.add( parameters, 'elevation', -90, 90, 0.1 ).onChange( updateSun );
    folderSky.add( parameters, 'azimuth', - 180, 180, 0.1 ).onChange( updateSun );
    folderSky.open();

    const waterUniforms = ocean.material.uniforms;

    const folderWater = gui.addFolder( 'Water' );
    folderWater.add( waterUniforms.distortionScale, 'value', 0, 8, 0.1 ).name( 'distortionScale' );
    folderWater.add( waterUniforms.size, 'value', 0.1, 10, 0.1 ).name( 'size' );
    folderWater.open();

}

if ( showStats ) {

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

}

// Controls

const GRAVITY = 30;

const STEPS_PER_FRAME = 5;

const playerCollider = new Capsule(
    new THREE.Vector3( mazeLength/2, 0.3, mazeWidth/2 ),
    new THREE.Vector3( mazeLength/2, 0.7, mazeWidth/2 ),
    0.3
);

const playerVelocity  = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let jumping       = false;
let stopAnimation       = false;

const keyStates = {};

document.addEventListener( 'keydown', ( event ) => {

    keyStates[ event.code ] = true;

} );

document.addEventListener( 'keyup', ( event ) => {

    keyStates[ event.code ] = false;
    if ( event.code == 'Space' ) jumping = false

} );

container.addEventListener( 'mousedown', () => {

    document.body.requestPointerLock();

} );

function lockChangeAlert() {
  if (document.pointerLockElement === document.body) {
    ambiance.play()
  } else {
    ambiance.pause()
  }
}

document.addEventListener("pointerlockchange", lockChangeAlert, false);

document.body.addEventListener( 'mousemove', ( event ) => {

    if ( document.pointerLockElement === document.body ) {

        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;

    }

} );

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function playerCollisions() {

    if ( !stopAnimation && raftOctree.capsuleIntersect( playerCollider ) ) {

        message.className = "escaped";
        piano.play();

    }

    const result = worldOctree.capsuleIntersect( playerCollider );

    playerOnFloor = false;

    if ( result ) {

        playerOnFloor = result.normal.y > 0;

        if ( ! playerOnFloor ) {

            playerVelocity.addScaledVector( result.normal, - result.normal.dot( playerVelocity ) );

        }

        playerCollider.translate( result.normal.multiplyScalar( result.depth ) );

    }

}

addEventListener("animationend", (event) => {

    stopAnimation = true;
    clearInterval( updateSunIntervalId );
    document.exitPointerLock();

});


function updatePlayer( deltaTime ) {

    let damping = Math.exp( - 4 * deltaTime ) - 1;

    if ( ! playerOnFloor ) {

        playerVelocity.y -= GRAVITY * deltaTime;

        // small air resistance
        damping *= 0.1;

    }

    playerVelocity.addScaledVector( playerVelocity, damping );

    const deltaPosition = playerVelocity.clone().multiplyScalar( deltaTime );
    playerCollider.translate( deltaPosition );

    playerCollisions();

    camera.position.copy( playerCollider.end );

}

function getForwardVector() {

    camera.getWorldDirection( playerDirection );
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;

}

function getSideVector() {

    camera.getWorldDirection( playerDirection );
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross( camera.up );

    return playerDirection;

}

function controls( deltaTime ) {

    // gives a bit of air control
    const speedDelta = deltaTime * ( playerOnFloor ? 10 : 2 );

    if ( keyStates["ArrowUp"] || keyStates[ 'KeyW' ] ) {

        playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );

    }

    if ( keyStates["ArrowDown"] || keyStates[ 'KeyS' ] ) {

        playerVelocity.add( getForwardVector().multiplyScalar( - speedDelta ) );

    }

    if ( keyStates["ArrowLeft"] || keyStates[ 'KeyA' ] ) {

        playerVelocity.add( getSideVector().multiplyScalar( - speedDelta ) );

    }

    if ( keyStates["ArrowRight"] || keyStates[ 'KeyD' ] ) {

        playerVelocity.add( getSideVector().multiplyScalar( speedDelta ) );

    }

    if ( playerOnFloor && jumping == false ) {

        if ( keyStates[ 'Space' ] ) {

            playerVelocity.y = 9;
            jumping = true

        }

    }

}

function teleportPlayerIfOob() {

    if ( camera.position.y <= - 25 ) {

        playerCollider.start.set( mazeLength/2, 0.3, mazeWidth/2 );
        playerCollider.end.set( mazeLength/2, 0.7, mazeWidth/2 );
        playerCollider.radius = 0.3;
        camera.position.copy( playerCollider.end );
        camera.rotation.set( 0, 0, 0 );

    }

}


function animate() {

    const deltaTime = Math.min( 0.05, clock.getDelta() ) / STEPS_PER_FRAME;

    // we look for collisions in substeps to mitigate the risk of
    // an object traversing another too quickly for detection.

    for ( let i = 0; i < STEPS_PER_FRAME; i ++ ) {

        controls( deltaTime );

        updatePlayer( deltaTime );

        teleportPlayerIfOob();

    }

    const time = clock.elapsedTime;

    ocean.material.uniforms[ 'time' ].value += 1.0 / 100.0;
    raft.rotation.z = 0.12 * Math.cos( 1.2 * time ) 
    raft.rotation.x = 0.06 * Math.cos( time )
    raft.position.y = 0.05 * (0.5 * Math.sin( 1.2 * time ) + 0.5 * Math.sin( time ))

    if ( sunLight.visible ) {
    
        sunLight.position.copy( sun )
        sunLight.position.x += camera.position.x
        sunLight.position.z += camera.position.z

    }

    if ( torchLight.visible ) {
    
        torchLight.position.copy(camera.position)
        torchLight.position.y -= .2
        const targetDirection = camera.getWorldDirection(camera.up).add(camera.position)
        torchLight.target.position.copy(targetDirection)
    
    }

    renderer.render( scene, camera );

    if ( showStats ) stats.update();

    if ( !stopAnimation ) requestAnimationFrame( animate );

}