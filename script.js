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

const baseMaterials = new Map();

/* CLEANUP OLD MODEL */

function disposeModel(model) {
model.traverse(child => {
if (child.isMesh) {
child.geometry?.dispose();

if (Array.isArray(child.material)) {
child.material.forEach(m => m.dispose());
} else {
child.material?.dispose();
}
}
});
}

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

triangles += geo.index
? geo.index.count / 3
: geo.attributes.position.count / 3;
}
});

triEl.textContent = triangles.toLocaleString();
vertEl.textContent = vertices.toLocaleString();
meshEl.textContent = meshes;
}

/* MATERIAL SYSTEM */

function applyMaterialState() {

if (!currentModel) return;

currentModel.traverse(child => {

if (!child.isMesh) return;

const base = baseMaterials.get(child);
if (!base) return;

let mat = textureToggle.checked
? base.clone()
: new THREE.MeshStandardMaterial({ color: 0x4aa3ff });

mat.wireframe = wireToggle.checked;

child.material = mat;

});
}

/* PREPARE MODEL */

function prepareModel(newModel) {

/* REMOVE OLD MODEL */

if (currentModel) {
scene.remove(currentModel);
disposeModel(currentModel);
}

/* SET NEW MODEL */

const container = new THREE.Group();
container.add(newModel);

currentModel = container;
scene.add(currentModel);

/* ✅ STORE ORIGINAL ROTATION (FIX) */
currentModel.userData.initialRotation = currentModel.rotation.clone();

baseMaterials.clear();

currentModel.updateMatrixWorld(true);

/* SCALE */

const box = new THREE.Box3().setFromObject(currentModel);
const size = new THREE.Vector3();
box.getSize(size);

const maxDim = Math.max(size.x, size.y, size.z);
const scale = 50 / maxDim;

currentModel.scale.setScalar(scale);
currentModel.updateMatrixWorld(true);

/* BOUNDING SPHERE */

const sphere = new THREE.Sphere();
new THREE.Box3().setFromObject(currentModel).getBoundingSphere(sphere);

modelRadius = sphere.radius;
controls.target.copy(sphere.center);

/* STORE MATERIALS */

currentModel.traverse(child => {
if (child.isMesh) {
baseMaterials.set(child, child.material);
}
});

/* RESET UI */

wireToggle.checked = false;
textureToggle.checked = true;

applyMaterialState();
}

/* CAMERA */

function frameCamera() {

const dist = modelRadius * 1.8;

const dir = new THREE.Vector3(1, 0.6, 1).normalize();

camera.position.copy(
controls.target.clone().add(dir.multiplyScalar(dist))
);

camera.near = dist / 100;
camera.far = dist * 100;

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

const done = (model) => {
pendingModel = model;
computeStats(model);
loadingText.style.display = "none";
viewBtn.disabled = false;
};

if (ext === "obj") {
new OBJLoader().load(url, done);
}

if (ext === "stl") {
new STLLoader().load(url, geo => {
done(new THREE.Mesh(
geo,
new THREE.MeshStandardMaterial({ color: 0x4aa3ff })
));
});
}

if (ext === "fbx") {
new FBXLoader().load(url, done);
}

});

/* VIEW MODEL */

viewBtn.addEventListener("click", () => {

if (!pendingModel) return;

prepareModel(pendingModel);
frameCamera();

pendingModel = null;
viewBtn.disabled = true;

});

/* TOGGLES */

wireToggle.addEventListener("change", applyMaterialState);
textureToggle.addEventListener("change", applyMaterialState);

/* CAMERA */

centerBtn.addEventListener("click", frameCamera);
resetCameraBtn.addEventListener("click", frameCamera);

/* ROTATION */

resetRotationBtn.addEventListener("click", () => {
if (currentModel && currentModel.userData.initialRotation) {
currentModel.rotation.copy(currentModel.userData.initialRotation);
}
});

/* LOOP */

function animate() {

requestAnimationFrame(animate);

controls.update();

if (autoRotateToggle.checked && currentModel) {
currentModel.rotation.y += parseFloat(rotateSpeedSlider.value);
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
