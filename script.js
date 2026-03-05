import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const canvas = document.getElementById("viewer-canvas");
const viewport = document.querySelector(".viewport");

const uploadInput = document.getElementById("model-upload");
const viewBtn = document.getElementById("view-model-btn");
const loadingText = document.getElementById("loading-text");

const triEl = document.getElementById("triangle-count");
const vertEl = document.getElementById("vertex-count");

const wireToggle = document.getElementById("wireframe-toggle");

/* scene */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b2a3a);

const camera = new THREE.PerspectiveCamera(
75,
viewport.clientWidth / viewport.clientHeight,
0.1,
1000
);

camera.position.set(6,5,6);

const renderer = new THREE.WebGLRenderer({
canvas,
antialias:true
});

renderer.setSize(viewport.clientWidth, viewport.clientHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* lighting */

scene.add(new THREE.AmbientLight(0xffffff,0.7));

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(5,10,5);
scene.add(light);

/* grid */

const grid = new THREE.GridHelper(40,40,0x3aa0ff,0x1b4a66);
scene.add(grid);

let currentModel = null;
let pendingModel = null;

/* helpers */

function clearModel(){

if(currentModel){
scene.remove(currentModel);
currentModel=null;
}

}

function updateStats(geometry){

if(!geometry?.attributes?.position) return;

const verts = geometry.attributes.position.count;
const tris = Math.floor(verts/3);

vertEl.textContent=verts;
triEl.textContent=tris;

}

function applyMaterial(object){

const mat=new THREE.MeshStandardMaterial({
color:0x4aa3ff
});

object.traverse(child=>{

if(child.isMesh){

child.material=mat;

if(child.geometry){
updateStats(child.geometry);
}

}

});

}

function centerModel(object){

const box=new THREE.Box3().setFromObject(object);
const center=box.getCenter(new THREE.Vector3());

object.position.sub(center);

const size=box.getSize(new THREE.Vector3()).length();
const dist=size*1.5;

camera.position.set(dist,dist,dist);

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
const ext=file.name.toLowerCase().split(".").pop();

if(ext==="obj"){

const loader=new OBJLoader();

loader.load(url,obj=>{

applyMaterial(obj);

pendingModel=obj;

loadingText.style.display="none";
viewBtn.disabled=false;

});

}

else if(ext==="stl"){

const loader=new STLLoader();

loader.load(url,geo=>{

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

const loader=new FBXLoader();

loader.load(url,obj=>{

applyMaterial(obj);

pendingModel=obj;

loadingText.style.display="none";
viewBtn.disabled=false;

});

}

});

/* view button */

viewBtn.addEventListener("click",()=>{

if(!pendingModel) return;

clearModel();

currentModel=pendingModel;

scene.add(currentModel);

centerModel(currentModel);

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

/* render loop */

function animate(){

requestAnimationFrame(animate);

controls.update();

renderer.render(scene,camera);

}

animate();

/* resize */

window.addEventListener("resize",()=>{

camera.aspect=viewport.clientWidth/viewport.clientHeight;
camera.updateProjectionMatrix();

renderer.setSize(viewport.clientWidth,viewport.clientHeight);

});
