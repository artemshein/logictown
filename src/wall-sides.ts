import {MultiMaterial,SubMesh,VertexBuffer,type Material,type Mesh} from '@babylonjs/core';

// Wall geometry is closed: each face receives the finish of the space it faces.
export function applyWallSides(mesh:Mesh,inside:Material,outside:Material,reveal:Material){
 const positions=mesh.getVerticesData(VertexBuffer.PositionKind),normals=mesh.getVerticesData(VertexBuffer.NormalKind),indices=mesh.getIndices();
 if(!positions||!normals||!indices)return;
 const bounds=mesh.getBoundingInfo().boundingBox,extent=bounds.maximum.subtract(bounds.minimum);
 const axis=extent.x<extent.z?0:2,inward=(axis===0?mesh.position.x:mesh.position.z)<0?1:-1;
 const groups:number[][]=[[],[],[]];
 for(let i=0;i<indices.length;i+=3){
  const normal=(normals[indices[i]*3+axis]+normals[indices[i+1]*3+axis]+normals[indices[i+2]*3+axis])/3;
  const side=Math.abs(normal)>.3?(normal*inward>0?0:1):2;
  groups[side].push(indices[i],indices[i+1],indices[i+2]);
 }
 const material=new MultiMaterial(mesh.name+' wall sides',mesh.getScene());material.subMaterials=[inside,outside,reveal];
 mesh.material=material;mesh.setIndices(groups.flat());mesh.releaseSubMeshes();
 let offset=0;for(let side=0;side<groups.length;side++){const count=groups[side].length;if(count)new SubMesh(side,0,positions.length/3,offset,count,mesh);offset+=count}
}
