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

const fileInfo = document.getElementById("file-info");
const dropHint = document.getElementById("drop-hint");

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

/* CLEANUP */

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

/* STATS */

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

/* MATERIAL */

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

if (currentModel) {
scene.remove(currentModel);
disposeModel(currentModel);
}

/* CONTAINER */

const container = new THREE.Group();

/* ✅ ONLY FIX FBX ORIENTATION */
if (newModel.userData.isFBX) {
newModel.rotation.x = -Math.PI / 2;
}

container.add(newModel);

currentModel = container;
scene.add(currentModel);

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

/* CENTER */

const center = new THREE.Box3().setFromObject(currentModel).getCenter(new THREE.Vector3());
currentModel.position.sub(center);

/* BOUNDS */

const sphere = new THREE.Sphere();
new THREE.Box3().setFromObject(currentModel).getBoundingSphere(sphere);

modelRadius = sphere.radius;
controls.target.set(0, 0, 0);

/* STORE MATERIALS */

currentModel.traverse(child => {
if (child.isMesh) {
baseMaterials.set(child, child.material);
}
});

wireToggle.checked = false;
textureToggle.checked = true;

applyMaterialState();

/* HIDE DROP HINT */
if (dropHint) dropHint.style.display = "none";
}

/* CAMERA */

function frameCamera() {

const dist = modelRadius * 1.8;

const dir = new THREE.Vector3(1, 0.6, 1).normalize();

camera.position.copy(dir.multiplyScalar(dist));

camera.near = dist / 100;
camera.far = dist * 100;

camera.updateProjectionMatrix();
controls.update();
}

/* LOAD */

uploadInput.addEventListener("change", e => {

const file = e.target.files[0];
if (!file) return;

/* FILE INFO */
if (fileInfo) {
fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
}

loadingText.style.display = "block";
loadingText.textContent = "Loading model...";
viewBtn.disabled = true;

const url = URL.createObjectURL(file);
const ext = file.name.split(".").pop().toLowerCase();

const done = (model) => {
loadingText.textContent = "Processing...";
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
new FBXLoader().load(url, model => {
model.userData.isFBX = true; // ✅ mark FBX
done(model);
});
}

});

/* DRAG & DROP */

viewport.addEventListener("dragover", e => e.preventDefault());

viewport.addEventListener("drop", e => {
e.preventDefault();

const file = e.dataTransfer.files[0];
if (!file) return;

uploadInput.files = e.dataTransfer.files;
uploadInput.dispatchEvent(new Event("change"));
});

/* VIEW */

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
if (currentModel) currentModel.rotation.set(0, 0, 0);
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
