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

camera.position.set(80,60,80);

/* RENDERER */

const renderer = new THREE.WebGLRenderer({
canvas,
antialias:true
});

renderer.setSize(viewport.clientWidth, viewport.clientHeight);

/* CONTROLS */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* LIGHTS */

scene.add(new THREE.AmbientLight(0xffffff,0.9));

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(20,40,20);
scene.add(light);

/* GRID */

const grid = new THREE.GridHelper(200,40,0x3aa0ff,0x1b4a66);
scene.add(grid);

/* MODEL STRUCTURE */

const pivot = new THREE.Group();
scene.add(pivot);

let currentModel = null;
let pendingModel = null;

let modelSize = 1;

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

/* PREPARE MODEL */

function prepareModel(){

pivot.clear();

pivot.add(currentModel);

/* bounding box */

const box = new THREE.Box3().setFromObject(currentModel);

const center = new THREE.Vector3();
const size = new THREE.Vector3();

box.getCenter(center);
box.getSize(size);

/* move pivot */

pivot.position.copy(center).multiplyScalar(-1);

/* normalize size */

const maxDim = Math.max(size.x,size.y,size.z);

const targetSize = 50;

if(maxDim > 200 || maxDim < 1){

const scale = targetSize / maxDim;
pivot.scale.setScalar(scale);

}

/* recalc */

const newBox = new THREE.Box3().setFromObject(pivot);
const newSize = new THREE.Vector3();

newBox.getSize(newSize);

modelSize = Math.max(newSize.x,newSize.y,newSize.z);

/* grid */

grid.position.y = newBox.min.y;

}

/* CAMERA */

function frameCamera(){

const distance = modelSize * 2;

camera.position.set(distance,distance*0.6,distance);

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

currentModel = pendingModel;

prepareModel();
frameCamera();

originalRotation.copy(pivot.rotation);

originalMaterials.clear();

currentModel.traverse(child=>{
if(child.isMesh){
originalMaterials.set(child,child.material);
}
});

pendingModel=null;

viewBtn.disabled=true;

});

/* CENTER CAMERA */

centerBtn.addEventListener("click",frameCamera);

/* RESET CAMERA */

resetCameraBtn.addEventListener("click",frameCamera);

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

/* RESET ROTATION */

resetRotationBtn.addEventListener("click",()=>{

pivot.rotation.copy(originalRotation);

});

/* RENDER LOOP */

function animate(){

requestAnimationFrame(animate);

controls.update();

if(autoRotateToggle.checked && pivot){

const speed = parseFloat(rotateSpeedSlider.value);
pivot.rotation.y += speed;

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
