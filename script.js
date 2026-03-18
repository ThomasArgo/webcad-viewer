import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

/* DOM */

const canvas = document.getElementById("viewer-canvas");
const viewport = document.querySelector(".viewport");

const uploadInput = document.getElementById("model-upload");
const viewBtn = document.getElementById("view-model-btn");
const loadingText = document.getElementById("loading-text");

const triEl = document.getElementById("triangle-count");
const vertEl = document.getElementById("vertex-count");
const meshEl = document.getElementById("mesh-count");

const wireToggle = document.getElementById("wireframe-toggle");
const textureToggle = document.getElementById("texture-toggle");
const autoRotateToggle = document.getElementById("auto-rotate");

const rotateSpeedSlider = document.getElementById("rotate-speed");

const centerBtn = document.getElementById("center-model");
const resetRotationBtn = document.getElementById("reset-model-rotation");
const resetCameraBtn = document.getElementById("reset-view");

/* SCENE */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b2a3a);

/* CAMERA */

const camera = new THREE.PerspectiveCamera(
75,
viewport.clientWidth / viewport.clientHeight,
0.01,
100000
);

/* RENDERER */

const renderer = new THREE.WebGLRenderer({
canvas,
antialias: true
});

renderer.setSize(viewport.clientWidth, viewport.clientHeight);

/* CONTROLS */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

/* LIGHTS */

scene.add(new THREE.AmbientLight(0xffffff, 0.9));

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(20, 40, 20);
scene.add(light);

/* MODEL */

let currentModel = null;
let pendingModel = null;

let modelRadius = 1;

let originalRotation = new THREE.Euler();
let originalMaterials = new Map();

/* MODEL STATS */

function computeStats(object) {

let triangles = 0;
let vertices = 0;
let meshes = 0;

object.traverse(child => {

if (child.isMesh && child.geometry) {

meshes++;

const geo = child.geometry;

vertices += geo.attributes.position.count;

if (geo.index) {
triangles += geo.index.count / 3;
} else {
triangles += geo.attributes.position.count / 3;
}

}

});

triEl.textContent = triangles.toLocaleString();
vertEl.textContent = vertices.toLocaleString();
meshEl.textContent = meshes;

}

/* PREPARE MODEL */

function prepareModel() {

if (currentModel) {
scene.remove(currentModel);
}

scene.add(currentModel);

currentModel.updateMatrixWorld(true);

/* bounding box */

const box = new THREE.Box3().setFromObject(currentModel);
const size = new THREE.Vector3();
box.getSize(size);

/* normalize scale */

const maxDim = Math.max(size.x, size.y, size.z);
const targetSize = 50;

const scale = targetSize / maxDim;
currentModel.scale.setScalar(scale);

currentModel.updateMatrixWorld(true);

/* bounding sphere */

const scaledBox = new THREE.Box3().setFromObject(currentModel);
const sphere = new THREE.Sphere();
scaledBox.getBoundingSphere(sphere);

modelRadius = sphere.radius;

/* set orbit target */

controls.target.copy(sphere.center);

}

/* CAMERA FRAME */

function frameCamera() {

const offset = 1.8;
const distance = modelRadius * offset;

const direction = new THREE.Vector3(1, 0.6, 1).normalize();

const position = controls.target.clone().add(direction.multiplyScalar(distance));

camera.position.copy(position);

camera.near = distance / 100;
camera.far = distance * 100;

camera.updateProjectionMatrix();

controls.update();

}

/* LOAD FILE */

uploadInput.addEventListener("change", e => {

const file = e.target.files[0];
if (!file) return;

loadingText.style.display = "block";
viewBtn.disabled = true;

const url = URL.createObjectURL(file);
const ext = file.name.split(".").pop().toLowerCase();

/* OBJ */

if (ext === "obj") {

new OBJLoader().load(url, obj => {

obj.updateMatrixWorld(true);

pendingModel = obj;

computeStats(obj);

loadingText.style.display = "none";
viewBtn.disabled = false;

});

}

/* STL */

if (ext === "stl") {

new STLLoader().load(url, geo => {

const mesh = new THREE.Mesh(
geo,
new THREE.MeshStandardMaterial({ color: 0x4aa3ff })
);

mesh.updateMatrixWorld(true);

pendingModel = mesh;

computeStats(mesh);

loadingText.style.display = "none";
viewBtn.disabled = false;

});

}

/* FBX */

if (ext === "fbx") {

new FBXLoader().load(url, obj => {

obj.updateMatrixWorld(true);

pendingModel = obj;

computeStats(obj);

loadingText.style.display = "none";
viewBtn.disabled = false;

});

}

});

/* VIEW MODEL */

viewBtn.addEventListener("click", () => {

if (!pendingModel) return;

currentModel = pendingModel;

prepareModel();
frameCamera();

originalRotation.copy(currentModel.rotation);

originalMaterials.clear();

currentModel.traverse(child => {
if (child.isMesh) {
originalMaterials.set(child, child.material);
}
});

pendingModel = null;
viewBtn.disabled = true;

});

/* CAMERA CONTROLS */

centerBtn.addEventListener("click", frameCamera);
resetCameraBtn.addEventListener("click", frameCamera);

/* WIREFRAME */

wireToggle.addEventListener("change", e => {

if (!currentModel) return;

currentModel.traverse(child => {

if (child.material) {

if (Array.isArray(child.material)) {
child.material.forEach(m => m.wireframe = e.target.checked);
} else {
child.material.wireframe = e.target.checked;
}

}

});

});

/* TEXTURE */

textureToggle.addEventListener("change", e => {

if (!currentModel) return;

currentModel.traverse(child => {

if (child.isMesh) {

if (e.target.checked) {
child.material = originalMaterials.get(child);
} else {
child.material = new THREE.MeshStandardMaterial({
color: 0x4aa3ff
});
}

}

});

});

/* RESET ROTATION */

resetRotationBtn.addEventListener("click", () => {
if (currentModel) {
currentModel.rotation.copy(originalRotation);
}
});

/* RENDER LOOP */

function animate() {

requestAnimationFrame(animate);

controls.update();

if (autoRotateToggle.checked && currentModel) {

const speed = parseFloat(rotateSpeedSlider.value);
currentModel.rotation.y += speed;

}

renderer.render(scene, camera);

}

animate();

/* RESIZE */

window.addEventListener("resize", () => {

camera.aspect = viewport.clientWidth / viewport.clientHeight;
camera.updateProjectionMatrix();

renderer.setSize(viewport.clientWidth, viewport.clientHeight);

});
