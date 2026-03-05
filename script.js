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
const gridToggle = document.getElementById("grid-toggle");
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
0.1,
10000
);

camera.position.set(120,80,120);

/* RENDERER */

const renderer = new THREE.WebGLRenderer({
canvas,
antialias:true
});

renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* CONTROLS */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* LIGHTS */

scene.add(new THREE.AmbientLight(0xffffff,0.9));

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(10,20,10);
scene.add(light);

/* GRID */

let gridSize = 400;
let gridDivisions = 40;

let grid = new THREE.GridHelper(gridSize,gridDivisions,0x3aa0ff,0x1b4a66);
scene.add(grid);

/* MODEL PIVOT */

const modelPivot = new THREE.Group();
scene.add(modelPivot);

let currentModel = null;
let pendingModel = null;

let originalRotation = new THREE.Euler();
let originalMaterials = new Map();

/* MODEL STATS */

function computeStats(object){

let triangles = 0;
let vertices = 0;
let meshes = 0;

object.traverse(child=>{

if(child.isMesh && child.geometry){

meshes++;

const geo = child.geometry;

vertices += geo.attributes.position.count;

if(geo.index){
triangles += geo.index.count/3;
}else{
triangles += geo.attributes.position.count/3;
}

}

});

triEl.textContent = triangles.toLocaleString();
vertEl.textContent = vertices.toLocaleString();
meshEl.textContent = meshes;

}

/* CENTER MODEL */

function centerModel(){

if(!currentModel) return;

modelPivot.updateMatrixWorld(true);

const box = new THREE.Box3().setFromObject(modelPivot);

const center = new THREE.Vector3();
const size = new THREE.Vector3();

box.getCenter(center);
box.getSize(size);

/* move pivot */

modelPivot.position.sub(center);

/* scale grid */

const maxDim = Math.max(size.x,size.y,size.z);

scene.remove(grid);

gridSize = maxDim * 4;

grid = new THREE.GridHelper(gridSize,40,0x3aa0ff,0x1b4a66);

grid.position.y = box.min.y - center.y;

scene.add(grid);

/* frame camera */

const fov = camera.fov * (Math.PI/180);

let distance = maxDim / (2 * Math.tan(fov/2));
distance *= 1.8;

camera.position.set(distance,distance*0.7,distance);

controls.target.set(0,0,0);
controls.update();

}

/* LOAD FILE */

uploadInput.addEventListener("change",e=>{

const file = e.target.files[0];
if(!file) return;

loadingText.style.display = "block";
viewBtn.disabled = true;

const url = URL.createObjectURL(file);
const ext = file.name.split(".").pop().toLowerCase();

/* OBJ */

if(ext==="obj"){

new OBJLoader().load(url,obj=>{

pendingModel = obj;

computeStats(obj);

loadingText.style.display="none";
viewBtn.disabled=false;

});

}

/* STL */

if(ext==="stl"){

new STLLoader().load(url,geo=>{

const mesh = new THREE.Mesh(
geo,
new THREE.MeshStandardMaterial({color:0x4aa3ff})
);

pendingModel = mesh;

computeStats(mesh);

loadingText.style.display="none";
viewBtn.disabled=false;

});

}

/* FBX */

if(ext==="fbx"){

new FBXLoader().load(url,obj=>{

pendingModel = obj;

computeStats(obj);

loadingText.style.display="none";
viewBtn.disabled=false;

});

}

});

/* VIEW MODEL */

viewBtn.addEventListener("click",()=>{

if(!pendingModel) return;

modelPivot.clear();

currentModel = pendingModel;

modelPivot.add(currentModel);

centerModel();

originalRotation.copy(currentModel.rotation);

originalMaterials.clear();

currentModel.traverse(child=>{
if(child.isMesh){
originalMaterials.set(child,child.material);
}
});

pendingModel=null;

viewBtn.disabled=true;

});

/* CENTER BUTTON */

centerBtn.addEventListener("click",centerModel);

/* WIREFRAME */

wireToggle.addEventListener("change",e=>{

if(!currentModel) return;

currentModel.traverse(child=>{
if(child.material){
child.material.wireframe=e.target.checked;
}
});

});

/* TEXTURE */

textureToggle.addEventListener("change",e=>{

if(!currentModel) return;

currentModel.traverse(child=>{

if(child.isMesh){

if(e.target.checked){
child.material = originalMaterials.get(child);
}else{
child.material = new THREE.MeshStandardMaterial({
color:0x4aa3ff
});
}

}

});

});

/* GRID */

gridToggle.addEventListener("change",e=>{
grid.visible = e.target.checked;
});

/* RESET CAMERA */

resetCameraBtn.addEventListener("click",centerModel);

/* RESET ROTATION */

resetRotationBtn.addEventListener("click",()=>{

if(!currentModel) return;

currentModel.rotation.copy(originalRotation);

});

/* RENDER LOOP */

function animate(){

requestAnimationFrame(animate);

controls.update();

if(autoRotateToggle.checked && currentModel){

const speed = parseFloat(rotateSpeedSlider.value);

currentModel.rotation.y += speed;

}

renderer.render(scene,camera);

}

animate();

/* RESIZE */

window.addEventListener("resize",()=>{

camera.aspect = viewport.clientWidth / viewport.clientHeight;
camera.updateProjectionMatrix();

renderer.setSize(viewport.clientWidth,viewport.clientHeight);

});
