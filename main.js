import * as THREE from 'three';

import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { Water } from 'three/addons/objects/Water.js';
// import { Sky } from 'three/addons/objects/Sky.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import Stats from 'three/addons/libs/stats.module.js';

import MazeMesh from './MazeMesh.js';

const mazeWidth = 23

const parameters = {
    elevation: 48,
    azimuth  : 53,
};

const waves = {
    A: { direction:  0, steepness: 0.05, wavelength: 3 },
    B: { direction: 30, steepness: 0.10, wavelength: 6 },
    C: { direction: 60, steepness: 0.05, wavelength: 1.5 },
};

const showParam = window.location.search.includes("param")
const showStats = window.location.search.includes("stats")

const ambiance = new Audio("snd/ambiance.mp3")
ambiance.loop = true
const piano = new Audio("snd/waves-and-tears.mp3")
piano.loop = false

const loadMngr = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(loadMngr);
loadMngr.onStart = function (url, itemsLoaded, itemsTotal) {
	progressCircle.innerText = "0%"
	progressCircle.style.setProperty("--progress", "0deg")
}
loadMngr.onProgress = function (url, itemsLoaded, itemsTotal) {
	progressCircle.innerText = Math.floor(100 * itemsLoaded / itemsTotal) + "%"
	progressCircle.style.setProperty("--progress", Math.floor(360 * itemsLoaded / itemsTotal)+"deg")
}
loadMngr.onError = function (url) {
    message.innerHTML = 'Erreur de chargement'
}
loadMngr.onLoad = () => {
    message.innerHTML = ""
    message.className = ""

    renderer.setAnimationLoop(animate)
};

//

const container = document.getElementById('container');

const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
//renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;

container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

scene.background = new THREE.CubeTextureLoader(loadMngr)
    .setPath( 'textures/calm-sea-skybox/' )
    .load( [
        'ft.jpg',
        'bk.jpg',
        'up.jpg',
        'dn.jpg',
        'rt.jpg',
        'lf.jpg',
    ] );
scene.backgroundBlurriness = 0.03;
scene.environment = scene.background;

window.scene = scene;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';

const mazeCollisionner = new THREE.Group();

// Maze

const wallMaterial = new THREE.MeshStandardMaterial({
    map         : loader.load('textures/stonewall/albedo.png'),
    normalMap   : loader.load('textures/stonewall/normal.png'),
	normalScale : new THREE.Vector2(0.6, 0.6),
    metalnessMap: loader.load('textures/stonewall/metalness.png'),
    aoMap       : loader.load('textures/stonewall/ao.png'),
    roughnessMap: loader.load('textures/stonewall/roughness.png'),
	roughness   : 1,
	envMapIntensity: 0.4
})

const maze = new MazeMesh(mazeWidth, mazeWidth, 1, wallMaterial);
maze.castShadow = true;
maze.receiveShadow = true;
maze.matrixAutoUpdate = false
scene.add(maze)

console.log(String(maze))

const invisibleWall = new THREE.Mesh(new THREE.BoxGeometry( .9, 1.8, .9 ));
invisibleWall.material.visible = false;
let matrix = new THREE.Matrix4()
for (let i = 0; i < maze.count; i++) {
    maze.getMatrixAt(i, matrix)
    const clone = invisibleWall.clone()
    clone.position.setFromMatrixPosition(matrix);
    clone.position.y = 1;
    mazeCollisionner.add(clone);
}

// Ground

const groundGeometry = new THREE.BoxGeometry(mazeWidth, mazeWidth, 1)
const groundMaterial = new THREE.MeshStandardMaterial({
    map: loader.load(
        'textures/angled-blocks-vegetation/albedo.png',
        texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            texture.repeat.set(mazeWidth / 4, mazeWidth / 4)
        }
    ),
    aoMap: loader.load(
        'textures/angled-blocks-vegetation/ao.png',
        texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            texture.repeat.set(mazeWidth / 4, mazeWidth / 4)
        }
    ),
    metalnessMap: loader.load(
        'textures/angled-blocks-vegetation/metallic.png',
        texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            texture.repeat.set(mazeWidth / 4, mazeWidth / 4)
        }
    ),
    normalMap: loader.load(
        'textures/angled-blocks-vegetation/normal-dx.png',
        texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            texture.repeat.set(mazeWidth / 4, mazeWidth / 4)
        }
    ),
    roughnessMap: loader.load(
        'textures/angled-blocks-vegetation/roughness.png',
        texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            texture.repeat.set(mazeWidth / 4, mazeWidth / 4)
        }
    ),
})

const sideGroundMaterial = new THREE.MeshStandardMaterial({
    map         : wallMaterial.map.clone(),
    normalMap   : wallMaterial.normalMap.clone(),
	normalScale : new THREE.Vector2(0.6, 0.6),
    metalnessMap: wallMaterial.metalnessMap.clone(),
    aoMap       : wallMaterial.aoMap.clone(),
    roughnessMap: wallMaterial.roughnessMap.clone(),
	roughness   : 1,
	envMapIntensity: 0.4
})
sideGroundMaterial.map.wrapS = sideGroundMaterial.map.wrapT = THREE.RepeatWrapping
sideGroundMaterial.normalMap.wrapS = sideGroundMaterial.normalMap.wrapT = THREE.RepeatWrapping
sideGroundMaterial.metalnessMap.wrapS = sideGroundMaterial.metalnessMap.wrapT = THREE.RepeatWrapping
sideGroundMaterial.aoMap.wrapS = sideGroundMaterial.aoMap.wrapT = THREE.RepeatWrapping
sideGroundMaterial.roughnessMap.wrapS = sideGroundMaterial.roughnessMap.wrapT = THREE.RepeatWrapping
sideGroundMaterial.map.repeat.set(mazeWidth, 1)
sideGroundMaterial.normalMap.repeat.set(mazeWidth, 1)
sideGroundMaterial.metalnessMap.repeat.set(mazeWidth, 1)
sideGroundMaterial.aoMap.repeat.set(mazeWidth, 1)
sideGroundMaterial.roughnessMap.repeat.set(mazeWidth, 1)

const ground = new THREE.Mesh(
    groundGeometry,
    [
        sideGroundMaterial,
        sideGroundMaterial,
        sideGroundMaterial,
        sideGroundMaterial,
        groundMaterial,
        groundMaterial,
    ]
)
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5
ground.receiveShadow = true;
ground.matrixAutoUpdate = false
ground.updateMatrix();

mazeCollisionner.add(ground)

scene.add(mazeCollisionner);

const mazeOctree = new Octree().fromGraphNode(mazeCollisionner);

// Water

const waterGeometry = new THREE.PlaneGeometry(1024, 1024, 512, 512);

const ocean = new Water(waterGeometry, {
    textureWidth : 512,
    textureHeight: 512,
    waterNormals : loader.load(
        'textures/waternormals.jpg',
        function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
    ),
    sunDirection   : new THREE.Vector3(),
    sunColor       : 0xffffff,
    waterColor     : 0x001e0f,
    distortionScale: 3.7,
    fog            : scene.fog !== undefined,
    alpha          : 0.9
});
ocean.rotation.x = - Math.PI / 2;
ocean.position.y = -0.2;

ocean.material.transparent = true;
ocean.material.onBeforeCompile = function (shader) {

    shader.uniforms.size = { value: 6 }

    shader.uniforms.waveA = {
        value: [
            Math.sin((waves.A.direction * Math.PI) / 180),
            Math.cos((waves.A.direction * Math.PI) / 180),
            waves.A.steepness,
            waves.A.wavelength,
        ],
    };
    shader.uniforms.waveB = {
        value: [
            Math.sin((waves.B.direction * Math.PI) / 180),
            Math.cos((waves.B.direction * Math.PI) / 180),
            waves.B.steepness,
            waves.B.wavelength,
        ],
    };
    shader.uniforms.waveC = {
        value: [
            Math.sin((waves.C.direction * Math.PI) / 180),
            Math.cos((waves.C.direction * Math.PI) / 180),
            waves.C.steepness,
            waves.C.wavelength,
        ],
    };
    shader.vertexShader = document.getElementById('vertexShader').textContent;
    shader.fragmentShader = document.getElementById('fragmentShader').textContent;

};

scene.add(ocean);

// Lights

const sun = new THREE.Vector3();

//const ambientLight = new THREE.AmbientLight(0x404040, 7);
//scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffae8, 2);
sunLight.castShadow            = true;
sunLight.shadow.camera.near    = 0.1;
sunLight.shadow.camera.far     =  1.4 * mazeWidth;
sunLight.shadow.camera.left    = -1.4 * mazeWidth/2;
sunLight.shadow.camera.right   =  1.4 * mazeWidth/2;
sunLight.shadow.camera.bottom  = -1.4 * mazeWidth/2;
sunLight.shadow.camera.top     =  1.4 * mazeWidth/2;
sunLight.shadow.mapSize.width  = 1024;
sunLight.shadow.mapSize.height = 1024;
//sunLight.shadow.radius         = 0.01;
sunLight.shadow.bias           = 0.0001;
sunLight.target                = maze
scene.add(sunLight);

updateSun();

function updateSun() {

    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1.4 * mazeWidth/2, phi, theta);
    ocean.material.uniforms['sunDirection'].value.copy(sun).normalize();
    
    sunLight.position.copy(sun)

    //ambientLight.intensity = 5 + 5 * Math.sin(Math.max(THREE.MathUtils.degToRad(parameters.elevation), 0));

}

// Raft

const raftGeometry = new THREE.BoxGeometry(1.8, .1, 1.1, 1, 1, 8)
const woodTexture = loader.load('textures/wood.jpg');
const raftFaceMaterial = new THREE.MeshStandardMaterial({
    map: woodTexture,
    aoMap: woodTexture,
    roughnessMap: woodTexture,
    color: 0xFFFFFF,
    emissive: 0,
    specular: 0x505050,
    shininess: 1,
    bumpMap: woodTexture,
    bumpScale: .1,
    depthFunc: 3,
    depthTest: true,
    depthWrite: true,
    displacementMap: woodTexture,
    displacementScale: -0.08
})
const raftSideMaterial = new THREE.MeshStandardMaterial({
    map: woodTexture,
    aoMap: woodTexture,
    roughnessMap: woodTexture,
    color: 0xFFFFFF,
    emissive: 0,
    specular: 0x505050,
    shininess: 1,
    bumpMap: woodTexture,
    bumpScale: .1,
    depthFunc: 3,
    depthTest: true,
    depthWrite: true,
})
const raft = new THREE.Mesh(raftGeometry, [
    raftSideMaterial,
    raftSideMaterial,
    raftFaceMaterial,
    raftSideMaterial,
    raftFaceMaterial,
    raftFaceMaterial,
])
raft.position.set( .2, ocean.position.y, -mazeWidth/2 - 1 );
raft.rotation.y = 1.4
raft.castShadow = true;

scene.add(raft);
const raftOctree  = new Octree().fromGraphNode(raft);

//

const stats = new Stats();
if (showStats) container.appendChild(stats.dom);

// GUI

if (showParam) {

    const gui = new GUI();

    const lightHelper = new THREE.DirectionalLightHelper(sunLight, .5)
    lightHelper.position.copy(maze.start)
    lightHelper.visible = false;

    const octreeHelper = new OctreeHelper(mazeOctree);
    octreeHelper.visible = false;
    scene.add(octreeHelper);
    const showHelper = gui.add({ helpers: false }, "helpers")
    showHelper.onChange(function (value) {

        lightHelper.visible = value;
        octreeHelper.visible = value;

    });

    const folderSky = gui.addFolder('Sky');
    folderSky.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun);
    folderSky.add(parameters, 'azimuth', - 180, 180, 0.1).onChange(updateSun);
    folderSky.open();

    const waterUniforms = ocean.material.uniforms;

    const folderWater = gui.addFolder('Water');
    folderWater
        .add(waterUniforms.distortionScale, 'value', 0, 8, 0.1)
        .name('distortionScale');
    folderWater.add(waterUniforms.size, 'value', 0.1, 10, 0.1).name('size');
    folderWater.add(ocean.material, 'wireframe');
    folderWater.open();

    const waveAFolder = gui.addFolder('Wave A');
    waveAFolder
        .add(waves.A, 'direction', 0, 359)
        .name('Direction')
        .onChange((v) => {

            const x = (v * Math.PI) / 180;
            ocean.material.uniforms.waveA.value[0] = Math.sin(x);
            ocean.material.uniforms.waveA.value[1] = Math.cos(x);

        });
    waveAFolder
        .add(waves.A, 'steepness', 0, 1, 0.01)
        .name('Steepness')
        .onChange((v) => {

            ocean.material.uniforms.waveA.value[2] = v;

        });
    waveAFolder
        .add(waves.A, 'wavelength', 1, 100)
        .name('Wavelength')
        .onChange((v) => {

            ocean.material.uniforms.waveA.value[3] = v;

        });
    waveAFolder.open();

    const waveBFolder = gui.addFolder('Wave B');
    waveBFolder
        .add(waves.B, 'direction', 0, 359)
        .name('Direction')
        .onChange((v) => {

            const x = (v * Math.PI) / 180;
            ocean.material.uniforms.waveB.value[0] = Math.sin(x);
            ocean.material.uniforms.waveB.value[1] = Math.cos(x);

        });
    waveBFolder
        .add(waves.B, 'steepness', 0, 1, 0.01)
        .name('Steepness')
        .onChange((v) => {

            ocean.material.uniforms.waveB.value[2] = v;

        });
    waveBFolder
        .add(waves.B, 'wavelength', 1, 100)
        .name('Wavelength')
        .onChange((v) => {

            ocean.material.uniforms.waveB.value[3] = v;

        });
    waveBFolder.open();

    const waveCFolder = gui.addFolder('Wave C');
    waveCFolder
        .add(waves.C, 'direction', 0, 359)
        .name('Direction')
        .onChange((v) => {

            const x = (v * Math.PI) / 180;
            ocean.material.uniforms.waveC.value[0] = Math.sin(x);
            ocean.material.uniforms.waveC.value[1] = Math.cos(x);

        });
    waveCFolder
        .add(waves.C, 'steepness', 0, 1, 0.01)
        .name('Steepness')
        .onChange((v) => {

            ocean.material.uniforms.waveC.value[2] = v;

        });
    waveCFolder
        .add(waves.C, 'wavelength', 1, 100)
        .name('Wavelength')
        .onChange((v) => {

            ocean.material.uniforms.waveC.value[3] = v;

        });
    waveCFolder.open();

}

//

const clock = new THREE.Clock();

// Controls

const GRAVITY = 30;

const STEPS_PER_FRAME = 10;

const playerCollider = new Capsule(
    new THREE.Vector3(0, 25.0, 0),
    new THREE.Vector3(0, 25.5, 0),
    0.3
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let jumping = false;
let escaped = false;

const pointerLockControls = new PointerLockControls(camera, document.body);
pointerLockControls.pointerSpeed = 0.7;

container.addEventListener('click', function () {

    pointerLockControls.lock();

});

pointerLockControls.addEventListener('lock', function () {

    ambiance.play();

});

pointerLockControls.addEventListener('unlock', function () {

    ambiance.pause();

});

scene.add(pointerLockControls.getObject());

const keyStates = {};

document.addEventListener('keydown', (event) => {

    keyStates[event.code] = true;

});

document.addEventListener('keyup', (event) => {

    keyStates[event.code] = false;
    if (event.code == 'Space') jumping = false

});

function playerCollisions() {

    const playerOnMaze = mazeOctree.capsuleIntersect(playerCollider);
    const playerOnRaft = raftOctree.capsuleIntersect(playerCollider);

    const result = playerOnMaze || playerOnRaft;

    playerOnFloor = false;

    if ( result ) {

        playerOnFloor = result.normal.y > 0;

        if (!playerOnFloor) {

            playerVelocity.addScaledVector(result.normal, - result.normal.dot(playerVelocity));

        }

        playerCollider.translate(result.normal.multiplyScalar(result.depth));

    }

    if (playerOnRaft) {

        camera.position.y = raft.position.y + 0.9;

        if (!escaped) gameEnd()

    }

}

function gameEnd() {

    escaped = true;
    message.innerHTML = '<a href="" title="Rejouer">Libre !</a>';
    message.className = "escaped";
    piano.play();

    document.exitPointerLock();
    container.style.cursor = "default";

}

function updatePlayer(deltaTime) {

    let damping = Math.exp(- 4 * deltaTime) - 1;

    if (!playerOnFloor) {

        playerVelocity.y -= GRAVITY * deltaTime;

        // small air resistance
        damping *= 0.1;

    }

    playerVelocity.addScaledVector(playerVelocity, damping);

    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
    playerCollider.translate(deltaPosition);

    camera.position.copy(playerCollider.end);

    playerCollisions();

}

function getForwardVector() {

    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;

}

function getSideVector() {

    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);

    return playerDirection;

}

var pressedMouseButtons = [];
document.body.onmousedown = document.body.onmouseup = function(event) { 
    for(var i=0; i <= Math.log2(event.buttons) || i < pressedMouseButtons.length; i++) {
        pressedMouseButtons[i] = (event.buttons & (1 << i)) > 0
    }
}

function controls(deltaTime) {

    // gives a bit of air control
    const speedDelta = deltaTime * (playerOnFloor ? 100 : 20) / STEPS_PER_FRAME;

    if (keyStates["ArrowUp"] || keyStates['KeyW'] || pressedMouseButtons[0]) {

        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));

    }

    if (keyStates["ArrowDown"] || keyStates['KeyS'] || pressedMouseButtons[1]) {

        playerVelocity.add(getForwardVector().multiplyScalar(- speedDelta));

    }

    if (keyStates["ArrowLeft"] || keyStates['KeyA']) {

        playerVelocity.add(getSideVector().multiplyScalar(- speedDelta));

    }

    if (keyStates["ArrowRight"] || keyStates['KeyD']) {

        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));

    }

    if (playerOnFloor && jumping == false) {

        if (keyStates['Space']) {

            playerVelocity.y = 9;
            jumping = true

        }

    }

}

function teleportPlayerIfOob() {

    if (camera.position.y <= - 25) {

        playerCollider.start.set(0, 25, 0);
        playerCollider.end.set(0, 25.5, 0);
        playerCollider.radius = 0.3;
        camera.position.copy(playerCollider.end);
        camera.rotation.set(0, 0, 0);
        message.className = ""
        escaped = false;

    }

}

function getWaveInfo(x, z, time) {

    const pos = new THREE.Vector3();
    const tangent = new THREE.Vector3(1, 0, 0);
    const binormal = new THREE.Vector3(0, 0, 1);
    Object.keys(waves).forEach((wave) => {

        const w = waves[wave];
        const k = (Math.PI * 2) / w.wavelength;
        const c = Math.sqrt(9.8 / k);
        const d = new THREE.Vector2(
            Math.sin((w.direction * Math.PI) / 180),
            - Math.cos((w.direction * Math.PI) / 180)
        );
        const f = k * (d.dot(new THREE.Vector2(x, z)) - c * time);
        const a = w.steepness / k;

        pos.x += d.y * (a * Math.cos(f));
        pos.y += a * Math.sin(f);
        pos.z += d.x * (a * Math.cos(f));

        tangent.x += - d.x * d.x * (w.steepness * Math.sin(f));
        tangent.y += d.x * (w.steepness * Math.cos(f));
        tangent.z += - d.x * d.y * (w.steepness * Math.sin(f));

        binormal.x += - d.x * d.y * (w.steepness * Math.sin(f));
        binormal.y += d.y * (w.steepness * Math.cos(f));
        binormal.z += - d.y * d.y * (w.steepness * Math.sin(f));

    });

    const normal = binormal.cross(tangent).normalize();

    return { position: pos, normal: normal };

}

function updateRaft(delta) {

    const t = ocean.material.uniforms['time'].value;

    const waveInfo = getWaveInfo(raft.position.x, raft.position.z, t);
    raft.position.y = ocean.position.y + waveInfo.position.y;
    const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler().setFromVector3(waveInfo.normal)
    );
    raft.quaternion.rotateTowards(quat, delta * 0.5);

}

window.addEventListener('resize', onWindowResize);

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    const delta = Math.min(0.05, clock.getDelta())
    const deltaTime = delta / STEPS_PER_FRAME;

    ocean.material.uniforms['time'].value += delta;

    updateRaft(delta);

    // we look for collisions in substeps to mitigate the risk of
    // an object traversing another too quickly for detection.

    for (let i = 0; i < STEPS_PER_FRAME; i++) {

        controls(deltaTime);

        updatePlayer(deltaTime);

        teleportPlayerIfOob();

    }

    if (camera.position.y > 3.5)
        camera.lookAt(raft.position.x, raft.position.y, raft.position.z);

    renderer.render(scene, camera);

    if (showStats) stats.update();

}