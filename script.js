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

/* MATERIAL STATE */

const baseMaterials = new Map();

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

/* APPLY MATERIAL STATE (FIXES GLITCH) */

function applyMaterialState() {

if (!currentModel) return;

currentModel.traverse(child => {

if (!child.isMesh) return;

let base = baseMaterials.get(child);

if (!base) return;

/* clone fresh every time */

let mat;

if (textureToggle.checked) {
mat = base.clone();
} else {
mat = new THREE.MeshStandardMaterial({ color: 0x4aa3ff });
}

/* apply wireframe consistently */

mat.wireframe = wireToggle.checked;

child.material = mat;

});

}

/* PREPARE MODEL */

function prepareModel() {

/* REMOVE OLD MODEL COMPLETELY */

if (currentModel) {
scene.remove(currentModel);
}

/* CLEAR MATERIAL CACHE */

baseMaterials.clear();

/* ADD NEW */

scene.add(currentModel);

currentModel.updateMatrixWorld(true);

/* SCALE NORMALIZATION */

const box = new THREE.Box3().setFromObject(currentModel);
const size = new THREE.Vector3();
box.getSize(size);

const maxDim = Math.max(size.x, size.y, size.z);
const targetSize = 50;

const scale = targetSize / maxDim;
currentModel.scale.setScalar(scale);

currentModel.updateMatrixWorld(true);

/* BOUNDING SPHERE */

const scaledBox = new THREE.Box3().setFromObject(currentModel);
const sphere = new THREE.Sphere();
scaledBox.getBoundingSphere(sphere);

modelRadius = sphere.radius;

/* TARGET */

controls.target.copy(sphere.center);

/* STORE BASE MATERIALS */

currentModel.traverse(child => {
if (child.isMesh) {
baseMaterials.set(child, child.material);
}
});

/* RESET UI STATE */

wireToggle.checked = false;
textureToggle.checked = true;

applyMaterialState();
}

/* CAMERA */

function frameCamera() {

const distance = modelRadius * 1.8;

const dir = new THREE.Vector3(1, 0.6, 1).normalize();

camera.position.copy(
controls.target.clone().add(dir.multiplyScalar(distance))
);

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

if (ext === "obj") {
new OBJLoader().load(url, obj => {
pendingModel = obj;
computeStats(obj);
loadingText.style.display = "none";
viewBtn.disabled = false;
});
}

if (ext === "stl") {
new STLLoader().load(url, geo => {
const mesh = new THREE.Mesh(
geo,
new THREE.MeshStandardMaterial({ color: 0x4aa3ff })
);
pendingModel = mesh;
computeStats(mesh);
loadingText.style.display = "none";
viewBtn.disabled = false;
});
}

if (ext === "fbx") {
new FBXLoader().load(url, obj => {
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

pendingModel = null;
viewBtn.disabled = true;

});

/* TOGGLES */

wireToggle.addEventListener("change", applyMaterialState);
textureToggle.addEventListener("change", applyMaterialState);

/* CAMERA BUTTONS */

centerBtn.addEventListener("click", frameCamera);
resetCameraBtn.addEventListener("click", frameCamera);

/* ROTATION */

resetRotationBtn.addEventListener("click", () => {
if (currentModel) currentModel.rotation.set(0, 0, 0);
});

/* RENDER */

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
