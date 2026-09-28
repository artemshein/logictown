import bpy,json,math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
source=root/'.asset-cache/polyhaven'
output=root/'public/assets/polyhaven'
output.mkdir(parents=True,exist_ok=True)
stats=[]
for path in source.glob('*/model.gltf'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    total=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
    budget=12000 if path.parent.name=='potted_plant_01' else 16000
    if total>budget:
        for obj in meshes:
            bpy.context.view_layer.objects.active=obj
            mod=obj.modifiers.new('Mobile triangle budget','DECIMATE');mod.ratio=budget/total
            bpy.ops.object.modifier_apply(modifier=mod.name)
    # Bake object transforms; keep the artist's model orientation and proportions.
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
    lo=Vector(tuple(min(v[i] for v in points) for i in range(3)))
    hi=Vector(tuple(max(v[i] for v in points) for i in range(3)))
    offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    for o in meshes:o.location-=offset
    target=output/(path.parent.name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_image_format='AUTO',export_yup=True)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
    stats.append(dict(id=path.parent.name,triangles=triangles,dimensions=list(hi-lo),bytes=target.stat().st_size))
    print('PREPARED',stats[-1],flush=True)
(output/'models.json').write_text(json.dumps(stats,indent=2))
