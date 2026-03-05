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

const wireToggle = document.getElementById("wireframe-toggle");
const gridToggle = document.getElementById("grid-toggle");
const autoRotate = document.getElementById("auto-rotate");
const resetView = document.getElementById("reset-view");

/* scene */

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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* lights */

scene.add(new THREE.AmbientLight(0xffffff,.7));

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(5,10,5);
scene.add(light);

/* grid */

const grid = new THREE.GridHelper(40,40,0x3aa0ff,0x1b4a66);
scene.add(grid);

let currentModel=null;
let pendingModel=null;

/* clear */

function clearModel(){

if(currentModel){
scene.remove(currentModel);
currentModel=null;
}

triEl.textContent="0";
vertEl.textContent="0";

}

/* stats */

function updateStats(geo){

if(!geo?.attributes?.position) return;

const verts=geo.attributes.position.count;
const tris=Math.floor(verts/3);

vertEl.textContent=verts;
triEl.textContent=tris;

}

/* material */

function applyMaterial(obj){

const mat=new THREE.MeshStandardMaterial({color:0x4aa3ff});

obj.traverse(c=>{
if(c.isMesh){
c.material=mat;
if(c.geometry) updateStats(c.geometry);
}
});

}

/* center + scale */

function centerModel(obj){

const box=new THREE.Box3().setFromObject(obj);
const size=box.getSize(new THREE.Vector3());
const center=box.getCenter(new THREE.Vector3());

obj.position.sub(center);

const maxDim=Math.max(size.x,size.y,size.z);
const scale=6/maxDim;

obj.scale.setScalar(scale);

camera.position.set(8,6,8);

controls.target.set(0,0,0);
controls.update();

}

/* upload */

uploadInput.addEventListener("change",e=>{

const file=e.target.files[0];
if(!file) return;

clearModel();

loadingText.style.display="block";
viewBtn.disabled=true;

const url=URL.createObjectURL(file);
const ext=file.name.toLowerCase().split(".").pop();

if(ext==="obj"){

new OBJLoader().load(url,obj=>{
applyMaterial(obj);
pendingModel=obj;
loadingText.style.display="none";
viewBtn.disabled=false;
});

}

else if(ext==="stl"){

new STLLoader().load(url,geo=>{
const mesh=new THREE.Mesh(
geo,
new THREE.MeshStandardMaterial({color:0x4aa3ff})
);
updateStats(geo);
pendingModel=mesh;
loadingText.style.display="none";
viewBtn.disabled=false;
});

}

else if(ext==="fbx"){

new FBXLoader().load(url,obj=>{
applyMaterial(obj);
pendingModel=obj;
loadingText.style.display="none";
viewBtn.disabled=false;
});

}

});

/* view */

viewBtn.onclick=()=>{

if(!pendingModel) return;

clearModel();

currentModel=pendingModel;

scene.add(currentModel);

centerModel(currentModel);

pendingModel=null;

viewBtn.disabled=true;

};

/* wireframe */

wireToggle.onchange=e=>{
if(!currentModel) return;

currentModel.traverse(c=>{
if(c.material) c.material.wireframe=e.target.checked;
});
};

/* grid toggle */

gridToggle.onchange=e=>{
grid.visible=e.target.checked;
};

/* reset */

resetView.onclick=()=>{

camera.position.set(8,6,8);
controls.target.set(0,0,0);
controls.update();

};

/* render */

function animate(){

requestAnimationFrame(animate);

controls.update();

if(autoRotate.checked && currentModel){
currentModel.rotation.y+=0.002;
}

renderer.render(scene,camera);

}

animate();

/* resize */

window.onresize=()=>{

camera.aspect=viewport.clientWidth/viewport.clientHeight;
camera.updateProjectionMatrix();

renderer.setSize(viewport.clientWidth,viewport.clientHeight);

};
