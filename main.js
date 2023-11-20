import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { Water } from 'three/addons/objects/Water.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import Stats from 'three/addons/libs/stats.module.js';

//import 'three-hex-tiling';

import MazeMesh from './MazeMesh.js';


const playerHeight = 0.5;
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

const dev = window.location.search.includes("dev")

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
    message.innerHTML = `Erreur de chargement :<br/>${url}`
}
loadMngr.onLoad = function (url, itemsLoaded, itemsTotal) {
    message.innerHTML = ""
    message.className = ""

    renderer.setAnimationLoop(animate)

    setInterval(() => {
        let x = Math.floor(8 + camera.position.x * 16 / mazeWidth)
        let y = Math.floor(8 + camera.position.z * 16 / mazeWidth)
        favicon.href = `favicon.php?x=${x}&y=${y}`
    }, 1000);
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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
scene.backgroundIntensity  = 1.4;
scene.environment = scene.background;

window.scene = scene;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';
camera.position.set(0, 25 + playerHeight, 0);

const mazeCollisionner = new THREE.Group();

// Maze

const wallMaterial = new THREE.MeshStandardMaterial({
    map            : loader.load('textures/Poly-cobblestone-wall/color_map.jpg'),
    normalMap      : loader.load('textures/Poly-cobblestone-wall/normal_map_opengl.jpg'),
	aoMap          : loader.load('textures/Poly-cobblestone-wall/ao_map.jpg'),
	roughnessMap   : loader.load('textures/Poly-cobblestone-wall/roughness_map.jpg'),
	roughness      : 1
})

const maze = new MazeMesh(mazeWidth, mazeWidth, 1, wallMaterial);
maze.castShadow = true;
maze.receiveShadow = true;
maze.matrixAutoUpdate = false
scene.add(maze)

console.log(String(maze))

if (!dev) {
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
}

// Ground

const groundGeometry = new THREE.BoxGeometry(mazeWidth, mazeWidth, 20)
function repeatGroundMaterial (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(mazeWidth / 4, mazeWidth / 4)
}
const groundMaterial = new THREE.MeshStandardMaterial({
    map         : loader.load('textures/angled-blocks-vegetation/albedo.png', repeatGroundMaterial),
    aoMap       : loader.load('textures/angled-blocks-vegetation/ao-roughness-metalness.png', repeatGroundMaterial),
    metalnessMap: loader.load('textures/angled-blocks-vegetation/ao-roughness-metalness.png', repeatGroundMaterial),
    normalMap   : loader.load('textures/angled-blocks-vegetation/normal-dx.png', repeatGroundMaterial),
    roughnessMap: loader.load('textures/angled-blocks-vegetation/ao-roughness-metalness.png', repeatGroundMaterial),
    /*hexTiling   : {
        patchScale: 1,
        useContrastCorrectedBlending: true,
        lookupSkipThreshold: 0.01,
        textureSampleCoefficientExponent: 32,
    }*/
})

const sideGroundMaterial = new THREE.MeshStandardMaterial({
    map              : wallMaterial.map.clone(),
    normalMap        : wallMaterial.normalMap.clone(),
    normalScale      : new THREE.Vector2(0.6, 0.6),
	aoMap            : wallMaterial.aoMap.clone(),
	roughnessMap     : wallMaterial.roughnessMap.clone(),
	roughness        : 1,
})
sideGroundMaterial.map.wrapS = sideGroundMaterial.map.wrapT = THREE.RepeatWrapping
sideGroundMaterial.map.repeat.set(mazeWidth, 20)
sideGroundMaterial.map.rotation = Math.PI
sideGroundMaterial.normalMap.wrapS = sideGroundMaterial.normalMap.wrapT = THREE.RepeatWrapping
sideGroundMaterial.normalMap.repeat.set(mazeWidth, 20)
sideGroundMaterial.normalMap.rotation = Math.PI
sideGroundMaterial.aoMap.wrapS = sideGroundMaterial.aoMap.wrapT = THREE.RepeatWrapping
sideGroundMaterial.aoMap.repeat.set(mazeWidth, 20)
sideGroundMaterial.aoMap.rotation = Math.PI
sideGroundMaterial.roughnessMap.wrapS = sideGroundMaterial.roughnessMap.wrapT = THREE.RepeatWrapping
sideGroundMaterial.roughnessMap.repeat.set(mazeWidth, 20)
sideGroundMaterial.roughnessMap.rotation = Math.PI

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
ground.position.y = -10
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
const oceanOctree  = new Octree().fromGraphNode(ocean);

// Lights

const sun = new THREE.Vector3();

const ambientLight = new THREE.AmbientLight(0x404040, 5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
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

const raftGeometry = new THREE.BoxGeometry(1.8, .1, 1.1, 1, 1, 16)
function repeatRaftMaterial(texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2, 1)
}
const raftMaterial = new THREE.MeshStandardMaterial({
    map: loader.load("textures/Poly-wood/color_map.jpg", repeatRaftMaterial),
    aoMap: loader.load("textures/Poly-wood/ao_map.jpg", repeatRaftMaterial),
    normalMap: loader.load("textures/Poly-wood/normal_map_opengl.jpg", repeatRaftMaterial),
    normalScale : new THREE.Vector2(2, 2),
    roughnessMap: loader.load("textures/Poly-wood/roughness_map.jpg", repeatRaftMaterial),
    depthFunc: 3,
    depthTest: true,
    depthWrite: true,
    displacementMap: loader.load("textures/Poly-wood/displacement_map.jpg", repeatRaftMaterial),
    displacementScale: -0.3,
    displacementBias: 0.15,
})
const raft = new THREE.Mesh(raftGeometry, raftMaterial)
raft.position.set( .25, ocean.position.y, -mazeWidth/2 - 1.1 )
raft.castShadow = true;

scene.add(raft);
const raftOctree  = new Octree().fromGraphNode(raft);

// GUI

const stats = new Stats();

if (dev) {
    
    container.appendChild(stats.dom);

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

    const raftFolder = gui.addFolder("Raft")
    const raftPositionFolder = raftFolder.addFolder("position")
    raftPositionFolder.add(raft.position, "x")
    raftPositionFolder.add(raft.position, "y")
    raftPositionFolder.add(raft.position, "z")
    const raftRotationFolder = raftFolder.addFolder("rotation")
    raftRotationFolder.add(raft.rotation, "x")
    raftRotationFolder.add(raft.rotation, "y")
    raftRotationFolder.add(raft.rotation, "z")
    raftFolder.close();

    const skyFolder = gui.addFolder('Sky');
    skyFolder.add(parameters, 'elevation', 0, 90, 0.1).onChange(updateSun);
    skyFolder.add(parameters, 'azimuth', - 180, 180, 0.1).onChange(updateSun);
    skyFolder.close();

    const waterUniforms = ocean.material.uniforms;

    const waterFolder = gui.addFolder('Water');
    waterFolder
        .add(waterUniforms.distortionScale, 'value', 0, 8, 0.1)
        .name('distortionScale');
    waterFolder.add(waterUniforms.size, 'value', 0.1, 10, 0.1).name('size');
    waterFolder.add(ocean.material, 'wireframe');
    waterFolder.close();

    const waveAFolder = waterFolder.addFolder('Wave A');
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

    const waveBFolder = waterFolder.addFolder('Wave B');
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

    const waveCFolder = waterFolder.addFolder('Wave C');
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

    const hexTilingFolder = gui.addFolder('Hex Tiling')
    if (wallMaterial?.hexTiling?.patchScale) {
        const wallMaterialFolder = hexTilingFolder.addFolder("wall")
        wallMaterialFolder.add(wallMaterial.hexTiling, "patchScale", 0, 10)
        wallMaterialFolder.add(wallMaterial.hexTiling, "useContrastCorrectedBlending")
        wallMaterialFolder.add(wallMaterial.hexTiling, "lookupSkipThreshold", 0, 1)
        wallMaterialFolder.add(wallMaterial.hexTiling, "textureSampleCoefficientExponent", 0, 64).name("SampleCoefExp")
    }
    if (groundMaterial?.hexTiling?.patchScale) {
        const groundMaterialFolder = hexTilingFolder.addFolder("ground")
        groundMaterialFolder.add(groundMaterial.hexTiling, "patchScale", 0, 10)
        groundMaterialFolder.add(groundMaterial.hexTiling, "useContrastCorrectedBlending")
        groundMaterialFolder.add(groundMaterial.hexTiling, "lookupSkipThreshold", 0, 1)
        groundMaterialFolder.add(groundMaterial.hexTiling, "textureSampleCoefficientExponent", 0, 64).name("SampleCoefExp")
    }
    hexTilingFolder.close()
}

//

const clock = new THREE.Clock();

// Controls

const GRAVITY = 30;

const STEPS_PER_FRAME = 10;

const playerCollider = new Capsule(
    new THREE.Vector3(0, 25.0, 0),
    new THREE.Vector3(0, 25 + playerHeight, 0),
    0.3
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let jumping = false;
let escaped = false;

const pointerLockControls = new PointerLockControls(camera, document.body);
pointerLockControls.pointerSpeed = 0.7;

const keyStates = {};

document.addEventListener('keydown', (event) => {
    keyStates[event.code] = true;
});

document.addEventListener('keyup', (event) => {
    keyStates[event.code] = false;
    if (event.code == 'Space') jumping = false
});

var mouseButtonsStates = [];

function onMouseChange(event) {
    for(var i=0; i < mouseButtonsStates.length || i <= Math.log2(event.buttons); i++) {
        mouseButtonsStates[i] = (event.buttons & (1 << i)) > 0
    }
}

container.addEventListener('click', function () {
    pointerLockControls.lock();
})

pointerLockControls.addEventListener('lock', function () {
    ambiance.play();
    document.addEventListener('mousedown', onMouseChange)
    document.addEventListener('mouseup', onMouseChange)
})

pointerLockControls.addEventListener('unlock', function () {
    ambiance.pause();
    document.removeEventListener('mousedown', onMouseChange)
    document.removeEventListener('mouseup', onMouseChange)
})

scene.add(pointerLockControls.getObject());

function playerCollisions() {

    const playerOnMaze  = mazeOctree.capsuleIntersect(playerCollider)
    const playerOnRaft  = raftOctree.capsuleIntersect(playerCollider)
    const playerOnWater = oceanOctree.capsuleIntersect(playerCollider)

    const result = playerOnMaze || playerOnRaft || playerOnWater

    playerOnFloor = false;

    if ( result ) {
        playerOnFloor = result.normal.y > 0;

        if (!playerOnFloor) {
            playerVelocity.addScaledVector(result.normal, - result.normal.dot(playerVelocity));
        }

        playerCollider.translate(result.normal.multiplyScalar(result.depth));

        if (playerOnRaft) {    
            camera.position.y = playerCollider.end.y + raft.position.y
            if (!escaped) gameEnd()

        } else if (playerOnWater) {
            const t = ocean.material.uniforms['time'].value;
            const waveInfo = getWaveInfo(playerCollider.end.x, playerCollider.end.z, t)
            camera.position.y = ocean.position.y + waveInfo.position.y + 0.2
        }
    }

}

function gameEnd() {

    escaped = true;
    message.innerHTML = '<h2>Libre !</h2><a href="">Rejouer</a>';
    message.className = "escaped";
    piano.play();

    document.exitPointerLock();
    //container.style.cursor = "default";

}

function updatePlayer(deltaTime) {

    let damping = Math.exp(- 4 * deltaTime) - 1;

    if (!playerOnFloor) {
        playerVelocity.y -= GRAVITY * deltaTime;
        damping *= 0.1; // small air resistance
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

function controls(deltaTime) {

    // gives a bit of air control
    const speedDelta = deltaTime * (playerOnFloor ? 100 : 20) / STEPS_PER_FRAME;

    if (keyStates["ArrowUp"] || keyStates['KeyW'] || mouseButtonsStates[0]) {
        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta))
    }
    if (keyStates["ArrowDown"] || keyStates['KeyS'] || mouseButtonsStates[1]) {
        playerVelocity.add(getForwardVector().multiplyScalar(- speedDelta))
    }
    if (keyStates["ArrowLeft"] || keyStates['KeyA']) {
        playerVelocity.add(getSideVector().multiplyScalar(- speedDelta))
    }
    if (keyStates["ArrowRight"] || keyStates['KeyD']) {
        playerVelocity.add(getSideVector().multiplyScalar(speedDelta))
    }
    if (playerOnFloor && jumping == false) {
        if (keyStates['Space']) {
            playerVelocity.y = 9;
            jumping = true
        }
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
    })

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

    }

    if (camera.position.y > 3.5)
        camera.lookAt(raft.position.x, raft.position.y, raft.position.z);

    renderer.render(scene, camera);

    if (dev) stats.update();

}