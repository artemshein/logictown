# Blender: -b --python scripts/prepare-outdoor-houses.py -- SOURCE.blend OUTPUT.glb
# Sources: OGA old-house-argentina-1872 and old-house-argentina-1872-2 (CC0).
import bpy,sys,math
from mathutils import Matrix
source,output=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=source)
# Keep authored geometry, transform the entrance (-X) toward the street (+Y in Blender, -Z in glTF).
for o in list(bpy.data.objects):
 if o.type!='MESH' or not o.data.polygons or (o.name.startswith('Techo.') and not ('casaprota' in source and 17<=int(o.name.split('.')[-1])<=26)):bpy.data.objects.remove(o,do_unlink=True)
 else:
  if 'casaprota' in source and o.name=='Puerta':
   transform=o.matrix_world.copy();transform.translation.y+=2.34;o.matrix_world=transform
  o.matrix_world=Matrix.Rotation(-math.pi/2,4,'Z')@o.matrix_world
for m in bpy.data.materials:
 if m.use_nodes:
  for n in m.node_tree.nodes:
   if n.type=='BSDF_PRINCIPLED':n.inputs['Metallic'].default_value=0;n.inputs['Roughness'].default_value=.9
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',export_animations=False,export_image_format='JPEG',export_jpeg_quality=85)
