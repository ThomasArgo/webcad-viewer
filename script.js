import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const canvas = document.getElementById("viewer-canvas");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth / window.innerHeight,
0.1,
1000
);

camera.position.set(3,3,3);

const renderer = new THREE.WebGLRenderer({
canvas,
antialias:true
});

renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/* lighting */

scene.add(new THREE.AmbientLight(0xffffff,0.7));

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(5,5,5);
scene.add(light);

/* grid */

const grid = new THREE.GridHelper(20,20,0x3aa0ff,0x1b4a66);
scene.add(grid);

let currentModel = null;

const triEl = document.getElementById("triangle-count");
const vertEl = document.getElementById("vertex-count");
const status = document.getElementById("status-text");

/* utilities */

function clearModel(){
if(currentModel){
scene.remove(currentModel);
currentModel=null;
}
}

function centerModel(obj){

const box = new THREE.Box3().setFromObject(obj);
const center = box.getCenter(new THREE.Vector3());

obj.position.sub(center);

const size = box.getSize(new THREE.Vector3()).length();
const dist = size * 1.4;

camera.position.set(dist,dist,dist);

controls.target.set(0,0,0);
controls.update();
}

function applyMaterial(obj){

const mat = new THREE.MeshStandardMaterial({
color:0x4aa3ff,
metalness:0.1,
roughness:0.6
});

obj.traverse(child=>{

if(child.isMesh){

child.material = mat;

if(child.geometry?.attributes?.position){

const verts = child.geometry.attributes.position.count;
vertEl.textContent = verts;
triEl.textContent = Math.floor(verts/3);

}

}

});

}

/* file upload */

document.getElementById("model-upload").addEventListener("change",e=>{

const file = e.target.files[0];
if(!file) return;

clearModel();

const url = URL.createObjectURL(file);

/* OBJ */

if(file.name.toLowerCase().endsWith(".obj")){

const loader = new OBJLoader();

loader.load(url,obj=>{

applyMaterial(obj);

currentModel = obj;

scene.add(obj);

centerModel(obj);

status.textContent=file.name+" loaded";

});

}

/* STL */

else if(file.name.toLowerCase().endsWith(".stl")){

const loader = new STLLoader();

loader.load(url,geo=>{

const mat = new THREE.MeshStandardMaterial({color:0x4aa3ff});

const mesh = new THREE.Mesh(geo,mat);

const verts = geo.attributes.position.count;

vertEl.textContent=verts;
triEl.textContent=Math.floor(verts/3);

currentModel=mesh;

scene.add(mesh);

centerModel(mesh);

status.textContent=file.name+" loaded";

});

}

/* FBX */

else if(file.name.toLowerCase().endsWith(".fbx")){

const loader = new FBXLoader();

loader.load(url,obj=>{

applyMaterial(obj);

currentModel=obj;

scene.add(obj);

centerModel(obj);

status.textContent=file.name+" loaded";

});

}

});

/* wireframe */

document.getElementById("wireframe-toggle").addEventListener("change",e=>{

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

camera.aspect=window.innerWidth/window.innerHeight;

camera.updateProjectionMatrix();

renderer.setSize(window.innerWidth,window.innerHeight);

});
