
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
import { Primitive3D } from '../types';

const createSceneFromPrimitives = (primitives: Primitive3D[]) => {
  const scene = new THREE.Scene();
  primitives.forEach((primitive) => {
    let geometry: THREE.BufferGeometry;
    switch (primitive.type) {
      case 'BOX': geometry = new THREE.BoxGeometry(1, 1, 1); break;
      case 'SPHERE': geometry = new THREE.SphereGeometry(0.5, 32, 32); break;
      case 'CYLINDER': geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
      case 'CAPSULE': geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 16); break;
      default: geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const mesh = new THREE.Mesh(geometry);
    mesh.position.set(...primitive.position);
    mesh.rotation.set(...primitive.rotation);
    mesh.scale.set(...primitive.scale);
    mesh.updateMatrix();
    
    const transformedGeometry = geometry.clone();
    transformedGeometry.applyMatrix4(mesh.matrix);
    
    const finalMesh = new THREE.Mesh(transformedGeometry);
    scene.add(finalMesh);
  });
  return scene;
};

export const exportModelToSTL = (primitives: Primitive3D[], fileName: string = 'makerflow_model') => {
  const scene = createSceneFromPrimitives(primitives);
  const exporter = new STLExporter();
  const stlString = exporter.parse(scene);
  downloadFile(stlString, `${fileName.replace(/\s+/g, '_')}.stl`, 'text/plain');
};

export const exportModelToOBJ = (primitives: Primitive3D[], fileName: string = 'makerflow_model') => {
  const scene = createSceneFromPrimitives(primitives);
  const exporter = new OBJExporter();
  const objData = exporter.parse(scene);
  downloadFile(objData, `${fileName.replace(/\s+/g, '_')}.obj`, 'text/plain');
};

const downloadFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
