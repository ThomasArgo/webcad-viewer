import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

/* UI */

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

const resetModelRotationBtn = document.getElementById("reset-model-rotation");
const resetCameraBtn = document.getElementById("reset-view");

/* THREE */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b2a3a);

const camera = new THREE.PerspectiveCamera(
75,
viewport.clientWidth / viewport.clientHeight,
0.1,
1000
);

camera.position.set(8,6,8);

const renderer = new THREE.WebGLRenderer({
canvas,
antialias:true
});

renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* lights */

scene.add(new THREE.AmbientLight(0xffffff,0.8));

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(5,10,5);
scene.add(light);

/* grid */

const grid = new THREE.GridHelper(40,40,0x3aa0ff,0x1b4a66);
scene.add(grid);

/* storage */

let currentModel = null;
let pendingModel = null;

let originalRotation = new THREE.Euler();
let originalMaterials = new Map();

/* clear */

function clearModel(){

if(currentModel){
scene.remove(currentModel);
currentModel=null;
}

}

/* stats */

function computeStats(object){

let triangles=0;
let vertices=0;
let meshes=0;

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

/* center */

function centerModel(obj){

const box = new THREE.Box3().setFromObject(obj);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());

obj.position.sub(center);

const maxDim = Math.max(size.x,size.y,size.z);
const scale = 6/maxDim;

obj.scale.setScalar(scale);

camera.position.set(8,6,8);
controls.target.set(0,0,0);
controls.update();

}

/* upload */

uploadInput.addEventListener("change",e=>{

const file=e.target.files[0];
if(!file) return;

loadingText.style.display="block";
viewBtn.disabled=true;

const url=URL.createObjectURL(file);
const ext=file.name.split(".").pop().toLowerCase();

/* OBJ */

if(ext==="obj"){

new OBJLoader().load(url,obj=>{

pendingModel=obj;

computeStats(obj);

loadingText.style.display="none";
viewBtn.disabled=false;

});

}

/* STL */

if(ext==="stl"){

new STLLoader().load(url,geo=>{

const mesh=new THREE.Mesh(
geo,
new THREE.MeshStandardMaterial({color:0x4aa3ff})
);

pendingModel=mesh;

computeStats(mesh);

loadingText.style.display="none";
viewBtn.disabled=false;

});

}

/* FBX */

if(ext==="fbx"){

new FBXLoader().load(url,obj=>{

pendingModel=obj;

computeStats(obj);

loadingText.style.display="none";
viewBtn.disabled=false;

});

}

});

/* view model */

viewBtn.addEventListener("click",()=>{

if(!pendingModel) return;

clearModel();

currentModel=pendingModel;

scene.add(currentModel);

centerModel(currentModel);

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

/* wireframe */

wireToggle.addEventListener("change",e=>{

if(!currentModel) return;

currentModel.traverse(child=>{
if(child.material){
child.material.wireframe=e.target.checked;
}
});

});

/* texture toggle */

textureToggle.addEventListener("change",e=>{

if(!currentModel) return;

currentModel.traverse(child=>{

if(child.isMesh){

if(e.target.checked){

child.material = originalMaterials.get(child);

}else{

child.material = new THREE.MeshStandardMaterial({
color:0x4aa3ff,
metalness:0.2,
roughness:0.6
});

}

}

});

});

/* grid */

gridToggle.addEventListener("change",e=>{
grid.visible=e.target.checked;
});

/* reset camera */

resetCameraBtn.addEventListener("click",()=>{

camera.position.set(8,6,8);
controls.target.set(0,0,0);
controls.update();

});

/* reset rotation */

resetModelRotationBtn.addEventListener("click",()=>{

if(!currentModel) return;

currentModel.rotation.copy(originalRotation);

});

/* render */

function animate(){

requestAnimationFrame(animate);

controls.update();

if(autoRotateToggle.checked && currentModel){

const speed=parseFloat(rotateSpeedSlider.value);

currentModel.rotation.y+=speed;

}

renderer.render(scene,camera);

}

animate();

/* resize */

window.addEventListener("resize",()=>{

camera.aspect=viewport.clientWidth/viewport.clientHeight;
camera.updateProjectionMatrix();

renderer.setSize(viewport.clientWidth,viewport.clientHeight);

});
