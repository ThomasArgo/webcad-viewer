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
controls.enablePan = true;

/* LIGHTING (IMPROVED) */

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(50, 50, 50);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-30, 20, -20);

scene.add(keyLight, fillLight);

/* GRID + GROUND */

const grid = new THREE.GridHelper(200, 50, 0x888888, 0x444444);
scene.add(grid);

const ground = new THREE.Mesh(
new THREE.PlaneGeometry(500, 500),
new THREE.MeshStandardMaterial({ color: 0x111111 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
scene.add(ground);

/* AXES */

const axes = new THREE.AxesHelper(50);
scene.add(axes);

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
let triangles = 0, vertices = 0, meshes = 0;

object.traverse(child => {
if (child.isMesh && child.geometry) {
meshes++;
vertices += child.geometry.attributes.position.count;
triangles += child.geometry.index
? child.geometry.index.count / 3
: child.geometry.attributes.position.count / 3;
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
: new THREE.MeshStandardMaterial({
color: 0x4aa3ff,
metalness: 0.2,
roughness: 0.6
});

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

/* ORIENTATION FIX */
newModel.rotation.x = -Math.PI / 2;

container.add(newModel);
currentModel = container;
scene.add(currentModel);

baseMaterials.clear();

currentModel.updateMatrixWorld(true);

/* SCALE */

const box = new THREE.Box3().setFromObject(currentModel);
const size = new THREE.Vector3();
box.getSize(size);

const scale = 50 / Math.max(size.x, size.y, size.z);
currentModel.scale.setScalar(scale);
currentModel.updateMatrixWorld(true);

/* CENTER MODEL */

const center = new THREE.Box3().setFromObject(currentModel).getCenter(new THREE.Vector3());
currentModel.position.sub(center);

/* BOUNDS */

const sphere = new THREE.Sphere();
new THREE.Box3().setFromObject(currentModel).getBoundingSphere(sphere);

modelRadius = sphere.radius;
controls.target.set(0, 0, 0);

/* STORE MATERIALS */

currentModel.traverse(child => {
if (child.isMesh) baseMaterials.set(child, child.material);
});

applyMaterialState();
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

if (ext === "obj") new OBJLoader().load(url, done);

if (ext === "stl") {
new STLLoader().load(url, geo => {
done(new THREE.Mesh(
geo,
new THREE.MeshStandardMaterial({ color: 0x4aa3ff })
));
});
}

if (ext === "fbx") new FBXLoader().load(url, done);

});

/* DRAG & DROP */

viewport.addEventListener("dragover", e => e.preventDefault());

viewport.addEventListener("drop", e => {
e.preventDefault();
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

/* SMOOTH RESET ROTATION */

function smoothResetRotation() {
if (!currentModel) return;

const start = currentModel.rotation.clone();
const end = new THREE.Euler(0, 0, 0);

let t = 0;

function animateReset() {
t += 0.08;

currentModel.rotation.x = THREE.MathUtils.lerp(start.x, end.x, t);
currentModel.rotation.y = THREE.MathUtils.lerp(start.y, end.y, t);
currentModel.rotation.z = THREE.MathUtils.lerp(start.z, end.z, t);

if (t < 1) requestAnimationFrame(animateReset);
}

animateReset();
}

resetRotationBtn.addEventListener("click", smoothResetRotation);

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
