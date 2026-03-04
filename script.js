import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/STLLoader.js";
import { FBXLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/FBXLoader.js";

const canvas = document.getElementById("viewer-canvas");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f2027);

const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth / window.innerHeight,
0.1,
1000
);

camera.position.set(0,1,3);

const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const light1 = new THREE.DirectionalLight(0xffffff,1);
light1.position.set(5,5,5);
scene.add(light1);

scene.add(new THREE.AmbientLight(0xffffff,0.5));

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

document.getElementById("model-upload").addEventListener("change", e=>{

const file = e.target.files[0];
if(!file) return;

const reader = new FileReader();

reader.onload = function(event){

clearModel();

if(file.name.endsWith(".obj")){

const loader = new OBJLoader();
const object = loader.parse(event.target.result);

object.traverse(child=>{
if(child.isMesh){
updateStats(child.geometry);
}
});

currentModel = object;
scene.add(object);
centerModel(object);

statusText.textContent = "OBJ model loaded.";

}

else if(file.name.endsWith(".stl")){

const loader = new STLLoader();
const geometry = loader.parse(event.target.result);

updateStats(geometry);

const material = new THREE.MeshStandardMaterial({color:0x4aa3ff});
const mesh = new THREE.Mesh(geometry, material);

currentModel = mesh;
scene.add(mesh);
centerModel(mesh);

statusText.textContent = "STL model loaded.";
}

else if(file.name.endsWith(".fbx")){

const loader = new FBXLoader();
const object = loader.parse(event.target.result);

object.traverse(child=>{
if(child.isMesh && child.geometry){
updateStats(child.geometry);
}
});

currentModel = object;
scene.add(object);
centerModel(object);

statusText.textContent = "FBX model loaded.";
}

};

if(file.name.endsWith(".obj"))
reader.readAsText(file);

if(file.name.endsWith(".stl") || file.name.endsWith(".fbx"))
reader.readAsArrayBuffer(file);

});

document.getElementById("wireframe-toggle").addEventListener("change", e=>{

if(!currentModel) return;

currentModel.traverse?.(child=>{
if(child.material){
child.material.wireframe = e.target.checked;
}
});

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
