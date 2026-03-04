import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/STLLoader.js";
import { FBXLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/FBXLoader.js";

const canvas = document.getElementById("viewer-canvas");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth / window.innerHeight,
0.1,
1000
);

camera.position.set(4,3,4);

const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff,0.7));

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(5,10,5);
scene.add(light);

const grid = new THREE.GridHelper(20,20,0x3aa0ff,0x1b4a66);
scene.add(grid);

let currentModel = null;

const triangleCount = document.getElementById("triangle-count");
const vertexCount = document.getElementById("vertex-count");
const statusText = document.getElementById("status-text");

function clearModel(){
if(currentModel){
scene.remove(currentModel);
currentModel = null;
}
}

function updateStats(geometry){

if(!geometry || !geometry.attributes?.position) return;

const vertices = geometry.attributes.position.count;
const triangles = Math.floor(vertices / 3);

vertexCount.textContent = vertices;
triangleCount.textContent = triangles;
}

function centerModel(object){

const box = new THREE.Box3().setFromObject(object);
const center = box.getCenter(new THREE.Vector3());

object.position.sub(center);

const size = box.getSize(new THREE.Vector3()).length();
const distance = size * 1.5;

camera.position.set(distance,distance,distance);

controls.target.set(0,0,0);
controls.update();
}

function applyMaterial(object){

const material = new THREE.MeshStandardMaterial({
color:0x4aa3ff,
metalness:0.2,
roughness:0.6
});

object.traverse(child=>{

if(child.isMesh){

child.material = material;

if(child.geometry){
updateStats(child.geometry);
}

}

});

}

document.getElementById("model-upload").addEventListener("change", e=>{

const file = e.target.files[0];
if(!file) return;

clearModel();

const url = URL.createObjectURL(file);

if(file.name.endsWith(".obj")){

const loader = new OBJLoader();

loader.load(url, object=>{

applyMaterial(object);

currentModel = object;

scene.add(object);

centerModel(object);

statusText.textContent = file.name + " loaded";

});

}

else if(file.name.endsWith(".stl")){

const loader = new STLLoader();

loader.load(url, geometry=>{

updateStats(geometry);

const material = new THREE.MeshStandardMaterial({color:0x4aa3ff});

const mesh = new THREE.Mesh(geometry, material);

currentModel = mesh;

scene.add(mesh);

centerModel(mesh);

statusText.textContent = file.name + " loaded";

});

}

else if(file.name.endsWith(".fbx")){

const loader = new FBXLoader();

loader.load(url, object=>{

applyMaterial(object);

currentModel = object;

scene.add(object);

centerModel(object);

statusText.textContent = file.name + " loaded";

});

}

});

function animate(){

requestAnimationFrame(animate);

controls.update();

renderer.render(scene,camera);

}

animate();

window.addEventListener("resize", ()=>{

camera.aspect = window.innerWidth / window.innerHeight;

camera.updateProjectionMatrix();

renderer.setSize(window.innerWidth, window.innerHeight);

});
