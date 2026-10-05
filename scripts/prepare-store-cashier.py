"""Dress the user-supplied Loves_Art model and export a rigged shop NPC.
Run Blender in background with this script, followed by -- <source GLB>.
"""
import bpy, bmesh, math, sys, json
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art'/'cashier';OUT.mkdir(parents=True,exist_ok=True)
PUBLIC=ROOT/'public'/'assets'/'shop';PUBLIC.mkdir(parents=True,exist_ok=True)
source=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
rig.animation_data_clear()
for old_action in list(bpy.data.actions):bpy.data.actions.remove(old_action)
for p in rig.pose.bones:p.matrix_basis.identity()
bpy.context.view_layer.update()
original=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.vertex_groups]
points=[o.matrix_world@v.co for o in original for v in o.data.vertices]
lo=Vector([min(p[a] for p in points) for a in range(3)])
hi=Vector([max(p[a] for p in points) for a in range(3)])
fit=bpy.data.objects.new('Cashier upright metres',None);bpy.context.collection.objects.link(fit)
for o in [o for o in bpy.context.scene.objects if o!=fit and o.parent is None and o.type!='MESH']:
 matrix=o.matrix_world.copy();o.parent=fit;o.matrix_world=matrix
s=1.75/(hi.y-lo.y)
fit.matrix_world=Matrix.Diagonal((s,s,s,1))@Matrix.Rotation(math.pi/2,4,'X')@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-lo.y,-(lo.z+hi.z)/2)))
bpy.context.view_layer.update()
skin=next(o for o in original if any(m.name=='skin' for m in o.data.materials))
old_clothes=next(o for o in original if any(m.name=='clothing' for m in o.data.materials))
kd=KDTree(len(skin.data.vertices))
for v in skin.data.vertices:kd.insert(skin.matrix_world@v.co,v.index)
kd.balance()

def fabric(name,colour):
 m=bpy.data.materials.new(name);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.88
 n=512;y,x=np.mgrid[:n,:n];rng=np.random.default_rng(24)
 grain=(np.sin(x*math.pi/2)+np.sin(y*math.pi/2))*.008+rng.normal(0,.004,(n,n))
 rgb=np.clip(np.array(colour)[None,None,:]+grain[:,:,None],0,1)
 pixels=np.ones((n,n,4),np.float32);pixels[:,:,:3]=rgb
 im=bpy.data.images.new(name+' woven cotton',n,n);im.pixels.foreach_set(pixels.ravel());im.pack()
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
 m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 return m
ivory=fabric('Warm ivory cotton shirt',(.88,.85,.76))
denim=fabric('Charcoal twill trousers',(.19,.22,.24))
green=fabric('Forest green canvas apron',(.19,.32,.23))

def bind(obj):
 for group in skin.vertex_groups:obj.vertex_groups.new(name=group.name)
 for v in obj.data.vertices:
  _,i,_=kd.find(obj.matrix_world@v.co)
  for g in skin.data.vertices[i].groups:obj.vertex_groups[g.group].add([v.index],g.weight,'REPLACE')
 mod=obj.modifiers.new('Cashier skeleton','ARMATURE');mod.object=rig
 obj.parent=rig;obj.matrix_parent_inverse=rig.matrix_world.inverted()
 return obj

def torso_weights(obj):
 names=[next(g.name for g in skin.vertex_groups if (':'+part+'_') in g.name) for part in ['Hips','Spine','Spine1','Spine2','Neck']]
 levels=[1.02,1.18,1.27,1.37,1.49]
 for g in obj.vertex_groups:g.remove(list(range(len(obj.data.vertices))))
 for v in obj.data.vertices:
  z=(obj.matrix_world@v.co).z
  k=next((i for i in range(4) if z<levels[i+1]),3)
  t=max(0,min(1,(z-levels[k])/(levels[k+1]-levels[k])))
  obj.vertex_groups[names[k]].add([v.index],1-t,'REPLACE');obj.vertex_groups[names[k+1]].add([v.index],t,'REPLACE')

def finish(obj,material,thickness=.002):
 obj.data.materials.clear();obj.data.materials.append(material)
 for p in obj.data.polygons:p.material_index=0;p.use_smooth=True
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
 if thickness:
  mod=obj.modifiers.new('Sewn fabric thickness','SOLIDIFY');mod.thickness=thickness;mod.offset=0
  bpy.ops.object.modifier_apply(modifier=mod.name)
 return obj

def shell(name,selector,material):
 verts=[];faces=[]
 for body in [skin,old_clothes]:
  world=body.matrix_world
  positions=[world@v.co for v in body.data.vertices]
  selected=[p for p in body.data.polygons if selector(sum((positions[i] for i in p.vertices),Vector())/len(p.vertices))]
  ids=sorted(set(i for p in selected for i in p.vertices));mapping={i:len(verts)+j for j,i in enumerate(ids)}
  normals=world.to_3x3().inverted().transposed()
  for i in ids:
   v=body.data.vertices[i];pos=positions[i]+(normals@v.normal).normalized()*.012
   verts.append(pos)
  faces.extend(tuple(mapping[i] for i in p.vertices) for p in selected)
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.004)
 # Cut hems and cuffs on straight planes, instead of triangle-shaped edges.
 planes=[((0,0,.98),(0,0,-1)),((0,0,1.455),(0,0,1)),((.27,0,0),(1,0,0)),((-.27,0,0),(-1,0,0))] if name=='Short sleeve shirt' else [((0,0,.105),(0,0,-1)),((0,0,1.055),(0,0,1))]
 for co,no in planes:bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=co,plane_no=no,clear_outer=True,dist=.00001)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
 finish(obj,material);bind(obj)
 return obj

pants=shell('Full length trousers',lambda p:.07<p.z<1.10 and abs(p.x)<.26,denim)
# Replace the crop top and shorts with the new garments.
bpy.data.objects.remove(old_clothes,do_unlink=True)

def mesh_part(name,verts,faces,material):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 finish(obj,material);bind(obj);return obj

# Continuous torso panels cover the original crop-top seams and exposed waist.
shirt_rings=[(.965,.21,.14,.025),(1.04,.187,.12,.025),(1.12,.145,.10,.025),(1.22,.162,.125,.025),(1.30,.177,.145,.025),(1.37,.19,.135,.03),(1.405,.192,.105,.035),(1.44,.115,.078,.035),(1.465,.052,.048,.035),(1.49,.052,.048,.035)]
verts=[];faces=[];segments=48
for z,rx,ry,cy in shirt_rings:
 for i in range(segments):
  a=i/segments*math.tau;verts.append((rx*math.cos(a),cy+ry*math.sin(a),z))
for j in range(len(shirt_rings)-1):
 for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
shirt_body=mesh_part('Continuous cotton shirt body',verts,faces,ivory)
torso_weights(shirt_body)

for side in [-1,1]:
 verts=[];faces=[];n=32
 bone=next(b for b in rig.data.bones if (':'+('Left' if side==1 else 'Right')+'Arm_') in b.name)
 pivot=rig.matrix_world@bone.head_local
 inverse=Quaternion(Vector((0,1,0)),-side*.88)
 for x,z,r in [(.115,1.449,.062),(.147,1.39,.064),(.163,1.32,.063),(.171,1.27,.061)]:
  for i in range(n):
   a=i/n*math.tau;posed=Vector((side*x+r*math.cos(a),.05+r*math.sin(a),z))
   verts.append(pivot+inverse@(posed-pivot))
 for j in range(3):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 faces.append(tuple(reversed(range(n))))
 obj=mesh_part('Tailored short sleeve '+str(side),verts,faces,ivory)
 for g in obj.vertex_groups:g.remove(list(range(len(obj.data.vertices))))
 obj.vertex_groups[bone.name].add(list(range(len(obj.data.vertices))),1,'REPLACE')

bpy.context.view_layer.update()
def surface_tree(obj):
 return BVHTree.FromPolygons([obj.matrix_world@v.co for v in obj.data.vertices],[list(p.vertices) for p in obj.data.polygons])
shirt_surface=surface_tree(shirt_body);pants_surface=surface_tree(pants)
def apron_y(x,z):
 # Upper fabric follows the shirt; the skirt bridges both legs as one panel.
 if z>=.97:
  hit=shirt_surface.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))[0]
  if hit:return hit.y-.004
 nearby=[pants.matrix_world@v.co for v in pants.data.vertices if abs((pants.matrix_world@v.co).z-z)<.08]
 probes=[pants_surface.ray_cast(Vector((xx,-1,z)),Vector((0,1,0)))[0] for xx in [-.18,-.15,-.12,-.09,-.06,-.03,0,.03,.06,.09,.12,.15,.18]]
 front=min([p.y for p in nearby]+[p.y for p in probes if p is not None]+[-.035])-.009
 skirt_y=.025-(.025-front)*math.sqrt(max(0,1-(x/.24)**2))
 # Blend into the shirt hem continuously, avoiding a step at the waist.
 hem=shirt_surface.ray_cast(Vector((x,-1,.971)),Vector((0,1,0)))[0]
 t=max(0,min(1,(z-.79)/(.97-.79)));t=t*t*(3-2*t)
 return skirt_y*(1-t)+((hem.y-.004) if hem else skirt_y)*t

outline=[(.69,.18),(.78,.185),(.9,.19),(1.02,.165),(1.08,.14),(1.15,.105),(1.26,.105),(1.36,.105)]
rows=[]
for i in range(41):
 z=.69+i*(1.36-.69)/40
 k=next((j for j in range(len(outline)-1) if z<=outline[j+1][0]),len(outline)-2)
 t=(z-outline[k][0])/(outline[k+1][0]-outline[k][0]);width=outline[k][1]*(1-t)+outline[k+1][1]*t
 rows.append((z,width))
verts=[];faces=[];cols=16
for z,width in rows:
 for i in range(cols+1):
  x=(i/cols*2-1)*width;verts.append((x,apron_y(x,z),z))
for j in range(len(rows)-1):
 for i in range(cols):
  a=j*(cols+1)+i;faces.append((a,a+1,a+cols+2,a+cols+1))
apron=mesh_part('Apron bib and skirt',verts,faces,green)
torso_weights(apron)

# Open-top patch pocket follows the apron surface.
verts=[];faces=[]
for j in range(5):
 z=.83+j*.027
 for i in range(9):
  x=-.095+i*.02375;verts.append((x,apron_y(x,z)-.003-.002*math.sin(i/8*math.pi),z))
for j in range(4):
 for i in range(8):a=j*9+i;faces.append((a,a+1,a+10,a+9))
torso_weights(mesh_part('Apron patch pocket',verts,faces,green))

def ribbon(name,path,width,material):
 verts=[];faces=[]
 for x,y,z in path:verts.extend([(x-width/2,y,z),(x+width/2,y,z)])
 for i in range(len(path)-1):a=i*2;faces.append((a,a+1,a+3,a+2))
 return mesh_part(name,verts,faces,material)
def shirt_radius(z):
 k=next((i for i in range(len(shirt_rings)-1) if z<=shirt_rings[i+1][0]),len(shirt_rings)-2)
 t=max(0,min(1,(z-shirt_rings[k][0])/(shirt_rings[k+1][0]-shirt_rings[k][0])))
 return [shirt_rings[k][a]*(1-t)+shirt_rings[k+1][a]*t for a in [1,2,3]]
for side in [-1,1]:
 path=[]
 for i in range(13):
  z=1.345+i*.095/12;rx,ry,cy=shirt_radius(z);x=side*.087
  path.append((x,cy-ry*math.sqrt(max(0,1-(x/rx)**2))-.004,z))
 for i in range(1,13):
  a=-math.pi/2+i*math.pi/12
  path.append((side*.087,.035+.025*math.sin(a),1.44+.008*math.cos(a)))
 for i in range(1,25):
  z=1.44-i*.36/24;rx,ry,cy=shirt_radius(z);x=side*.087
  path.append((x,cy+ry*math.sqrt(max(0,1-(x/rx)**2))+.004,z))
 torso_weights(ribbon('Apron shoulder strap',path,.022,green))

# Sewn waist tie runs around the shirt.
verts=[];faces=[]
for i in range(65):
 a=i/64*math.tau
 for z in [1.005,1.035]:
  rx,ry,cy=shirt_radius(z);verts.append(((rx+.003)*math.cos(a),cy+(ry+.003)*math.sin(a),z))
for i in range(64):a=i*2;faces.append((a,a+1,a+3,a+2))
torso_weights(mesh_part('Apron waist tie',verts,faces,green))

def joint(part):return next(p for p in rig.pose.bones if (':'+part+'_') in p.name)
def world_turn(p,axis,angle):
 bpy.context.view_layer.update()
 local=(rig.matrix_world.to_3x3()@p.matrix.to_3x3()).inverted()@Vector(axis)
 p.rotation_mode='QUATERNION';p.rotation_quaternion=Quaternion(local.normalized(),angle)

scene=bpy.context.scene;scene.render.fps=30
act=bpy.data.actions.new('CashierIdle');rig.animation_data_create();rig.animation_data.action=act
for frame in range(1,242,4):
 t=(frame-1)/240;phase=t*math.tau
 for p in rig.pose.bones:p.matrix_basis.identity();p.rotation_mode='QUATERNION'
 for side,sign in [('Left',1),('Right',-1)]:
  world_turn(joint(side+'Arm'),(0,1,0),sign*(.88+.045*math.sin(phase)))
  # Briefly lift one hand in a welcoming gesture, then relax it again.
  gesture=max(0,math.sin(phase))**3 if side=='Right' else 0
  world_turn(joint(side+'ForeArm'),(1,0,0),-.18-1.9*gesture+.05*math.sin(phase+.7))
 world_turn(joint('Spine2'),(1,0,0),.027*math.sin(phase))
 world_turn(joint('Head'),(0,0,1),.16*math.sin(phase))
 for p in rig.pose.bones:p.keyframe_insert('rotation_quaternion',frame=frame,group=p.name)
act.use_fake_user=True
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o==rig or (o.type=='MESH' and o.vertex_groups) or (o.type=='EMPTY'):o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'female-cashier.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_apply=False)

# Editable source and front/side previews of the actual clothes and pose.
scene.world=bpy.data.worlds.new('Preview world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.5,.5,1)
for pos,energy in [((-3,-4,5),450),((3,-2,3),200)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=4;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-4,.9));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.05;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=700;scene.render.resolution_y=850;scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'female-cashier.blend'))
for name,pos,frame in [('front',(0,-4,.9),1),('side',(3,-3,.9),81),('back',(0,4,.9),161)]:
 scene.frame_set(frame);cam.location=pos;cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
print('CASHIER_EXPORTED',PUBLIC/'female-cashier.glb')
