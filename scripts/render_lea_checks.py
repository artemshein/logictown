import bpy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'art'/'lea'/'model'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'lea-b.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Lea_Rig'];scene.cycles.samples=24;scene.render.resolution_percentage=65
results={}
for name,frame in [('Walk',9),('Interact',31),('Celebrate',31)]:
    action=bpy.data.actions[name];rig.animation_data.action=action
    if action.slots:rig.animation_data.action_slot=action.slots[0]
    scene.frame_set(frame);bpy.context.view_layer.update()
    results[name]={p.name:list(p.rotation_euler)for p in rig.pose.bones if sum(abs(v) for v in p.rotation_euler)>.01}
    scene.render.filepath=str(OUT/('check-'+name.lower()+'.png'));bpy.ops.render.render(write_still=True)
(OUT/'animation-checks.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print('ANIMATION_CHECKS', {k:len(v) for k,v in results.items()})

