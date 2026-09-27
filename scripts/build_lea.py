"""Create Lea B as an editable, UV textured, rigged Blender asset and GLB.
Run: blender --background --python scripts/build_lea.py
All geometry/textures are authored here, without downloaded character meshes.
"""
import bpy, math, os, json, random
import numpy as np
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art'/'lea'/'model'; OUT.mkdir(parents=True,exist_ok=True)
PUBLIC=ROOT/'public'/'models'; PUBLIC.mkdir(parents=True,exist_ok=True)
random.seed(19)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for data in list(bpy.data.materials):bpy.data.materials.remove(data)
parts=[]

def linear(c):
    return tuple(((v/255+.055)/1.055)**2.4 if v/255>.04045 else v/255/12.92 for v in c)
def mat(name,c,rough=.65,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*linear(c),1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=m.diffuse_color
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m
def texmat(name,kind):
    n=1024;y,x=np.mgrid[0:n,0:n].astype(np.float32);u=x/n;v=y/n;rng=np.random.default_rng(18)
    if kind=='cord':
        base=np.array([.72,.43,.30]);grain=(np.cos(u*math.pi*2*150)*.024+np.cos(u*math.pi*2*300)*.008+np.sin(v*210)*.006+rng.normal(0,.006,(n,n)))
        rgb=np.clip(base[None,None,:]+grain[:,:,None],0,1)
    elif kind=='shirt':
        rgb=np.zeros((n,n,3))+np.array([.91,.874,.76]);mask=np.mod(v*13,1)<.12;rgb[mask]=[.44,.51,.43]
        rgb+=((np.sin(u*math.pi*850)+np.sin(v*math.pi*850))*.007+rng.normal(0,.004,(n,n)))[:,:,None]
    elif kind=='face':
        rgb=np.zeros((n,n,3))+np.array([.94,.735,.575]);
        # u=.25 is the front of the parametrized head (negative Y).
        for uc in [.177,.323]:
            blush=np.exp(-((u-uc)/.052)**2-((v-.45)/.045)**2)*.32
            rgb=rgb*(1-blush[:,:,None])+np.array([.91,.36,.29])*blush[:,:,None]
        for i in range(68):
            uc=.25+random.choice([-1,1])*random.uniform(.032,.106);vc=random.uniform(.455,.494)
            dot=np.exp(-((u-uc)/random.uniform(.001,.002))**2-((v-vc)/.0021)**2)*random.uniform(.14,.38)
            rgb=rgb*(1-dot[:,:,None])+np.array([.48,.27,.17])*dot[:,:,None]
        rgb+=rng.normal(0,.0015,(n,n,1))
    elif kind=='iris':
        xx=(u-.5)*2;yy=(v-.5)*2;rr=np.sqrt(xx*xx+yy*yy);a=np.arctan2(yy,xx)
        rays=(np.sin(a*73+rr*14)+np.sin(a*121-rr*27))*.045
        rgb=np.zeros((n,n,3))+np.array([.36,.23,.115])+rays[:,:,None]
        rgb*=np.clip(1-(rr-.7)*2,.32,1)[:,:,None];rgb[rr<.38]=[.035,.026,.021]
    else:raise ValueError(kind)
    rgba=np.ones((n,n,4),dtype=np.float32);rgb=np.clip(rgb,0,1);rgba[:,:,:3]=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
    if kind in ('face','iris'):rgba[:,:,:3]=rgb
    img=bpy.data.images.new(name+' BaseColor',n,n,alpha=True);img.pixels.foreach_set(rgba.ravel());img.filepath_raw=str(OUT/(kind+'.png'));img.file_format='PNG';img.save();img.pack()
    m=mat(name,(255,255,255));node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img
    m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    return m
skin=mat('Skin · warm peach',(235,184,146),.6);face=texmat('Face · painted blush and freckles','face')
cord=texmat('Terracotta · fine corduroy','cord');shirt=texmat('Ivory and sage striped cotton','shirt')
hair=mat('Copper auburn',(119,57,31),.58);hairLight=mat('Hair highlight',(145,72,37),.58);hairDark=mat('Hair groove',(91,42,25),.45)
green=mat('Sage canvas',(106,122,91),.85);rubber=mat('Warm ivory rubber',(229,222,196),.8);brass=mat('Antique brass',(178,139,76),.34,.65)
thread=mat('Topstitch thread',(202,147,103),.8);lip=mat('Soft lip rose',(172,91,75),.6);dark=mat('Eye and mouth detail',(62,32,26),.4)
eyeWhite=mat('Eye ivory',(255,249,231),.2);iris=texmat('Brown radial iris','iris');iris.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.2
glint=mat('Eye catchlight',(255,255,247),.12)

def finish(o,name,m,bind='Head'):
    o.name=name;o.data.materials.append(m)
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    o['bind']=bind;parts.append(o);return o
def mesh(name,verts,faces,m,uv=None,bind='Head'):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    if uv:
        layer=data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for li in poly.loop_indices:layer.data[li].uv=uv[data.loops[li].vertex_index]
    return finish(o,name,m,bind)
def sphere(name,loc,scale,m,bind='Head',segments=24,rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,m,bind)
def curve(name,points,r,m,bind='Head',radii=None):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=3;data.bevel_depth=r;data.bevel_resolution=2
    sp=data.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for i,(p,co) in enumerate(zip(sp.bezier_points,points)):
        p.co=co;p.handle_left_type=p.handle_right_type='AUTO';p.radius=radii[i] if radii else 1
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return finish(o,name,m,bind)
def loft(name,rings,m,bind='Spine',sides=32,fold=0):
    # (center x,y,z, radius x,y), smoothly connected elliptical sections.
    verts=[];uv=[]
    for j,(cx,cy,z,rx,ry) in enumerate(rings):
        for i in range(sides+1):
            a=i/sides*math.pi*2;k=1+fold*math.sin(a*7+j*.8)
            verts.append((cx+math.cos(a)*rx*k,cy+math.sin(a)*ry*k,z));uv.append((i/sides,j/(len(rings)-1)))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(sides):a=j*(sides+1)+i;faces.append((a,a+1,a+sides+2,a+sides+1))
    faces.append(tuple(range(sides,-1,-1)));faces.append(tuple((len(rings)-1)*(sides+1)+i for i in range(sides+1)))
    return mesh(name,verts,faces,m,uv,bind)
def patch(name,rows,m,bind='Spine',thick=.003):
    verts=[v for row in rows for v in row];cols=len(rows[0]);faces=[];uv=[]
    for j in range(len(rows)):
        for i in range(cols):uv.append((i/(cols-1),j/(len(rows)-1)))
    for j in range(len(rows)-1):
        for i in range(cols-1):a=j*cols+i;faces.append((a,a+1,a+cols+1,a+cols))
    o=mesh(name,verts,faces,m,uv,bind)
    if thick:mod=o.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=thick
    return o

# Sculpted face surface: cheeks, sockets, muzzle and nose are one connected mesh.
vs=[];uv=[];fs=[];N=96;R=64
for j in range(R+1):
    v=j/R;theta=v*math.pi;zz=math.cos(theta);z=1.425+zz*.25
    jaw=1-.22*max(0,-zz)**1.1;rx=.222*jaw;ry=.192*(1-.13*max(0,-zz))
    for i in range(N+1):
        u=i/N;a=u*math.pi*2;x=rx*math.sin(theta)*math.cos(a);y=-ry*math.sin(theta)*math.sin(a)
        front=max(0,math.sin(a))**6
        gauss=lambda xx,zz,sx,sz:math.exp(-((x-xx)/sx)**2-((z-zz)/sz)**2)
        displacement=(.054*gauss(0,1.386,.038,.039)+.013*gauss(0,1.445,.023,.063)+.014*gauss(0,1.318,.08,.04)+.018*(gauss(-.115,1.361,.065,.055)+gauss(.115,1.361,.065,.055))-.003*(gauss(-.091,1.44,.067,.055)+gauss(.091,1.44,.067,.055)))
        y-=displacement*front;vs.append((x,y,z));uv.append((u,1-v))
for j in range(R):
    for i in range(N):a=j*(N+1)+i;fs.append((a,a+N+1,a+N+2,a+1))
head=mesh('Lea · sculpted facial surface',vs,fs,face,uv)
# Neck joins underneath the skull and into the neckline.
loft('Neck',[(0,.015,1.075,.072,.059),(0,.018,1.16,.057,.05),(0,.018,1.23,.061,.051)],skin,'Neck',24)
for s in [-1,1]:
    sphere('Ear', (s*.215,.002,1.386),(.039,.027,.061),skin)
    sphere('Ear inner',(s*.227,-.021,1.389),(.019,.009,.034),lip)
    sphere('Earlobe',(s*.215,-.008,1.352),(.027,.024,.029),skin)
    cx=s*.09
    sphere('Eye white',(cx,-.16,1.442),(.056,.038,.058),eyeWhite,segments=32,rings=20)
    # Convex iris with planar UV for radial painted texture.
    vv=[(cx,-.2005,1.442)];tt=[(.5,.5)];ff=[]
    for k in range(33):
        a=k/32*math.pi*2;vv.append((cx+math.cos(a)*.034,-.198,1.442+math.sin(a)*.038));tt.append((.5+math.cos(a)*.5,.5+math.sin(a)*.5))
    for k in range(32):ff.append((0,k+2,k+1))
    mesh('Painted hazel iris',vv,ff,iris,tt)
    sphere('Eye sparkle',(cx-.01,-.202,1.457),(.010,.004,.012),glint,segments=12,rings=8)
    sphere('Secondary sparkle',(cx+.013,-.201,1.429),(.004,.003,.005),glint,segments=10,rings=6)
    # Eyelid rims follow the eyeball contour and hide its boundary in the face.
    upper=[];lower=[]
    for k in range(13):
        a=k/12*math.pi;xx=cx+math.cos(a)*.067
        upper.append((xx,-.174-math.sin(a)*.013,1.442+math.sin(a)*.074))
        lower.append((xx,-.174-math.sin(a)*.016,1.442-math.sin(a)*.067))
    # Eyeballs intersect the sculpted skin naturally at the socket boundary.
    # Upper eye boundary is formed by the face surface.
    brow=[(cx+s*(t-.5)*.13,-.169+abs(t-.5)*.025,1.546+math.sin(t*math.pi)*.014)for t in [0,.2,.4,.6,.8,1]]
    curve('Expressive auburn brow',brow,.008,hair,radii=[.2,.8,1,1,.75,.2])
    sphere('Nostril',(s*.021,-.221,1.368),(.008,.004,.005),lip,segments=12,rings=8)
curve('Gentle smile',[(-.054,-.174,1.315),(-.025,-.192,1.306),(0,-.196,1.303),(.028,-.189,1.309),(.054,-.174,1.322)],.0028,dark,radii=[.3,.8,1,.8,.3])
curve('Lower lip',[(-.042,-.178,1.307),(0,-.194,1.294),(.039,-.178,1.312)],.0045,lip,radii=[.2,1,.2])

# Main scalp mass, irregular flowing outline around the face.
vs=[];uv=[];fs=[];hs=64;hr=22
for j in range(hr+1):
    t=j/hr
    for i in range(hs+1):
        a=i/hs*math.pi*2;front=max(0,math.sin(a));end=2.08-.93*front
        th=.015+t*end;wave=(math.sin(a*9+t*10)*.006+math.sin(a*15-t*4)*.003)*t
        vs.append(((.236+wave)*math.sin(th)*math.cos(a),-(.205+wave)*math.sin(th)*math.sin(a)+.012,1.42+(.284+wave)*math.cos(th)))
        uv.append((i/hs,t))
for j in range(hr):
    for i in range(hs):a=j*(hs+1)+i;fs.append((a,a+hs+1,a+hs+2,a+1))
mesh('Sculpted auburn scalp',vs,fs,hair,uv)

def lock(name,points,width,depth,m=hair):
    # Tapered sculpted lock following a bezier guide, with longitudinal ridges.
    from mathutils.geometry import interpolate_bezier
    p=[Vector(v)for v in points];sample=[]
    for i in range(len(p)-1):
        before=p[max(0,i-1)];after=p[min(len(p)-1,i+2)]
        sample+=interpolate_bezier(p[i],p[i]+(p[i+1]-before)/6,p[i+1]-(after-p[i])/6,p[i+1],7)[:-1]
    sample.append(p[-1]);verts=[];uv=[];faces=[];cross=10
    for j,q in enumerate(sample):
        t=j/(len(sample)-1);tangent=(sample[min(j+1,len(sample)-1)]-sample[max(0,j-1)]).normalized();normal=Vector((0,-1,0));side=tangent.cross(normal).normalized();normal=side.cross(tangent).normalized();taper=max(.015,math.sin(math.pi*t)**.55)
        for k in range(cross+1):
            a=k/cross*math.pi*2;ripple=1+.07*math.cos(a*5)
            v=q+side*(math.cos(a)*width*taper*ripple)+normal*(math.sin(a)*depth*taper)
            verts.append(tuple(v));uv.append((k/cross,t))
    for j in range(len(sample)-1):
        for k in range(cross):a=j*(cross+1)+k;faces.append((a,a+cross+1,a+cross+2,a+1))
    o=mesh(name,verts,faces,m,uv)
    return o
# Swept fringe: carefully layered in front of the forehead, no spherical bang beads.
lock('Sculpted sweeping fringe',[(.115,-.028,1.63),(.045,-.161,1.633),(-.105,-.186,1.555),(-.211,-.103,1.443)],.052,.023,hair)
for i in range(3):
    lock('Fringe soft layer',[(.12+i*.017,-.014,1.62-i*.012),(.044+i*.018,-.169,1.619-i*.016),(-.094+i*.011,-.19,1.54-i*.014),(-.196,-.11,1.435-i*.008)],.024,.014,hairLight if i==1 else hair)
# Curved locks around the back and temples.
for s in [-1,1]:
    for i in range(6):
        y=.02+i*.026
        lock('Side swept wave',[(s*.095,y*.7,1.635),(s*.211,y-.016,1.578),(s*(.237+.012*math.sin(i)),y,1.43),(s*.2,y+.025,1.29)],.026,.021,hairLight if i%4==0 else hair)
# Side braid, three visibly interwoven tapered strands.
for strand in range(3):
    pts=[];rs=[]
    for j in range(31):
        t=j/30;a=t*math.pi*8+strand*math.pi*2/3;r=.020*(1-t*.6)
        pts.append((.204+t*.057+math.cos(a)*r,-.046-t*.094+math.sin(a)*r,1.43-t*.48));rs.append(1-t*.48)
    curve('Braided copper strand',pts,.016,hairLight if strand==0 else hair,radii=rs)
sphere('Braid tie',(.26,-.141,.948),(.027,.025,.017),green)
lock('Braid end',[(.26,-.14,.94),(.264,-.145,.905),(.248,-.142,.881)],.024,.018)
clip=sphere('Sage hair clip',(-.214,-.109,1.571),(.012,.017,.047),green);clip.rotation_euler[1]=-.34
curve('Hairclip highlight',[(-.222,-.121,1.604),(-.231,-.121,1.568),(-.225,-.12,1.54)],.002,brass)

# Cotton torso and sleeve volumes.
loft('Striped cotton shirt',[(0,0,.70,.134,.083),(0,0,.77,.151,.086),(0,0,.87,.145,.087),(0,.005,.99,.156,.092),(0,.01,1.074,.182,.095),(0,.013,1.115,.155,.079),(0,.015,1.144,.068,.055)],shirt,'Spine',40,.012)
curve('Neckline binding',[(math.cos(a)*.069,.015+math.sin(a)*.057,1.145)for a in np.linspace(0,2*math.pi,33)],.007,rubber,'Spine')
# Pants: connected hip and two shaped legs, with a softly rounded crotch.
hips=loft('Overalls hip',[(0,0,.625,.166,.086),(0,0,.68,.18,.097),(0,0,.755,.156,.091),(0,0,.796,.143,.085)],cord,'Hips',40,.012)
for s,side in [(-1,'R'),(1,'L')]:
    bind='Leg.'+side
    loft('Corduroy trouser '+side,[(s*.109,0,.16,.066,.064),(s*.109,0,.205,.075,.073),(s*.104,.005,.27,.066,.066),(s*.096,-.009,.355,.081,.074),(s*.09,0,.44,.069,.075),(s*.088,0,.51,.08,.078),(s*.086,0,.60,.091,.09),(s*.082,0,.683,.098,.09)],cord,bind,32,.027)
    loft('Rolled trouser cuff '+side,[(s*.109,0,.159,.069,.068),(s*.109,0,.168,.079,.078),(s*.109,0,.203,.079,.078),(s*.109,0,.213,.069,.069)],cord,bind,32,.025)
    curve('Trouser side stitching '+side,[(s*.18,0,.71),(s*.184,0,.56),(s*.177,0,.4),(s*.176,0,.23)],.0017,thread,bind)
    # A-pose sleeves, then bare forearms and separated fingers.
    sleeve=loft('Rolled cotton sleeve '+side,[(s*.178,.006,1.092,.061,.076),(s*.21,.006,1.058,.072,.076),(s*.239,.004,1.005,.064,.07),(s*.264,.004,.951,.063,.067),(s*.284,.003,.913,.071,.07),(s*.287,.003,.891,.065,.062)],shirt,'Arm.'+side,28,.025)
    loft('Sleeve cuff '+side,[(s*.282,.003,.894,.066,.065),(s*.286,.003,.915,.073,.07),(s*.28,.003,.936,.068,.067)],rubber,'Arm.'+side,28)
    loft('Forearm '+side,[(s*.289,0,.907,.042,.044),(s*.308,-.007,.85,.037,.039),(s*.33,-.012,.784,.029,.031),(s*.345,-.016,.741,.025,.027)],skin,'Forearm.'+side,24)
    palm=sphere('Hand palm '+side,(s*.356,-.019,.702),(.031,.021,.047),skin,'Hand.'+side)
    for finger in range(4):
        x=s*(.334+finger*.014);length=[.041,.055,.052,.04][finger]
        curve('Finger '+side+str(finger),[(x,-.021,.683),(x+s*.003,-.028,.667),(x+s*.006,-.032,.683-length)],.0067,skin,'Hand.'+side,radii=[1,.9,.65])
    curve('Thumb '+side,[(s*.332,-.02,.716),(s*.32,-.045,.699),(s*.321,-.052,.682)],.01,skin,'Hand.'+side,radii=[1,.85,.65])
    # Canvas high-tops, layered rubber sole and individual laces.
    sphere('Ankle '+side,(s*.109,0,.156),(.036,.04,.05),skin,'Foot.'+side)
    sphere('Rubber sole '+side,(s*.109,-.031,.055),(.073,.132,.036),rubber,'Foot.'+side,32,16)
    sphere('Canvas sneaker '+side,(s*.109,-.016,.095),(.066,.116,.055),green,'Foot.'+side,32,16)
    loft('Sneaker ankle '+side,[(s*.109,.017,.085,.057,.056),(s*.109,.021,.13,.052,.054),(s*.109,.022,.17,.046,.047)],green,'Foot.'+side,28)
    sphere('Rubber toe cap '+side,(s*.109,-.111,.082),(.065,.051,.034),rubber,'Foot.'+side)
    for j in range(4):
        y=-.014-j*.023;z=.157-j*.009
        curve('Crossed lace '+side,[(s*.109-.031,y,z),(s*.109+.028,y-.019,z-.006)],.0035,rubber,'Foot.'+side)
        curve('Crossed lace '+side,[(s*.109+.031,y,z),(s*.109-.028,y-.019,z-.006)],.0035,rubber,'Foot.'+side)
    curve('Lace bow '+side,[(s*.109,-.01,.169),(s*.109-.029,-.019,.181),(s*.109-.024,.001,.18),(s*.109,-.01,.169),(s*.109+.03,-.016,.182),(s*.109+.026,.007,.179),(s*.109,-.01,.169)],.0035,rubber,'Foot.'+side)

# Bib, patch pocket, straps and brass buckles.
rows=[]
for j in range(9):
    t=j/8;z=.783+t*.277;w=.145-t*.018
    rows.append([(u*w,-.095-math.sqrt(max(0,1-u*u))*.009,z)for u in np.linspace(-1,1,13)])
patch('Corduroy bib',rows,cord)
pocket=[]
for j in range(6):
    v=j/5;pocket.append([(u*.061,-.109,.864+v*.106-(1-v)*.012*(1-abs(u)))for u in np.linspace(-1,1,9)])
patch('Bib patch pocket',pocket,cord,thick=.004)
curve('Pocket topstitch',[(-.06,-.115,.97),(-.06,-.115,.866),(0,-.115,.851),(.06,-.115,.866),(.06,-.115,.97)],.0018,thread,'Spine')
for s in [-1,1]:
    curve('Bib border stitching',[(s*.13,-.106,1.054),(s*.134,-.106,.935),(s*.145,-.099,.789)],.0015,thread,'Spine')
    strapPoints=[(s*.119,-.1,1.035),(s*.137,-.08,1.103),(s*.135,.003,1.135),(s*.119,.084,1.068),(s*.08,.098,.917),(s*.08,.101,.81)]
    strip=[]
    for p in strapPoints:strip.append([(p[0]+u*.019,p[1],p[2])for u in np.linspace(-1,1,5)])
    patch('Overall shoulder strap',strip,cord,thick=.004)
    sphere('Brass bib button',(s*.119,-.11,1.035),(.012,.005,.012),brass,'Spine',16,10)
    sphere('Hip button',(s*.153,-.062,.769),(.011,.006,.011),brass,'Hips',16,10)
    curve('Side pocket stitching',[(s*.15,-.063,.752),(s*.147,-.087,.716),(s*.105,-.096,.694)],.002,thread,'Hips')
    # Rear patch pockets remain visible when the player walks away.
    rows=[[(s*.091+u*.046,.096,.624+v*.095)for u in np.linspace(-1,1,5)]for v in np.linspace(0,1,5)]
    patch('Rear pocket',rows,cord,'Hips')
curve('Waistband seam',[(math.cos(a)*.156,math.sin(a)*.096,.786)for a in np.linspace(0,2*math.pi,49)],.002,thread,'Hips')

# Union trouser legs and pelvis into one continuous sculpted cloth volume.
pants=[o for o in parts if o.name.startswith('Corduroy trouser') or o.name=='Overalls hip']
bpy.ops.object.select_all(action='DESELECT')
for o in pants:o.select_set(True)
bpy.context.view_layer.objects.active=hips;bpy.ops.object.join();hips['bind']='Pants'
parts=[o for o in parts if o not in pants]+[hips]
remesh=hips.modifiers.new('Continuous trouser topology','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.005
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=hips.modifiers.new('Relax cloth join','SMOOTH');smooth.factor=.6;smooth.iterations=4;bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate=hips.modifiers.new('Game topology','DECIMATE');decimate.ratio=.12;bpy.ops.object.modifier_apply(modifier=decimate.name)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
hips.select_set(False)

# Convert all curves/modifiers into game meshes; recalculate consistent normals.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    if o.type=='CURVE':bpy.ops.object.convert(target='MESH')
    for modifier in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    o.select_set(False)

# A deforming armature, not an object-only puppet hierarchy.
armdata=bpy.data.armatures.new('Lea skeleton');rig=bpy.data.objects.new('Lea_Rig',armdata);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={}
def bone(name,head,tail,parent=None):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=bones[parent]
    bones[name]=b
bone('Root',(0,0,0),(0,0,.15));bone('Hips',(0,0,.65),(0,0,.79),'Root');bone('Spine',(0,0,.79),(0,0,1.08),'Hips');bone('Neck',(0,0,1.08),(0,0,1.22),'Spine');bone('Head',(0,0,1.22),(0,0,1.63),'Neck')
for s,side in [(-1,'R'),(1,'L')]:
    bone('Thigh.'+side,(s*.085,0,.68),(s*.104,0,.4),'Hips');bone('Shin.'+side,(s*.104,0,.4),(s*.109,0,.16),'Thigh.'+side);bone('Foot.'+side,(s*.109,0,.16),(s*.109,-.13,.07),'Shin.'+side)
    bone('Arm.'+side,(s*.174,0,1.08),(s*.284,0,.91),'Spine');bone('Forearm.'+side,(s*.284,0,.91),(s*.344,-.012,.745),'Arm.'+side);bone('Hand.'+side,(s*.344,-.012,.745),(s*.355,-.025,.68),'Forearm.'+side)
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
def smoothstep(a,b,v):t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
for o in parts:
    kind=o['bind'];groups={}
    for v in o.data.vertices:
        p=o.matrix_world@v.co;z=p.z;weights={kind:1.0}
        if kind.startswith('Leg.') or kind=='Pants':
            side=('L' if p.x>0 else 'R') if kind=='Pants' else kind.split('.')[1];t=smoothstep(.33,.48,z);hip=smoothstep(.55,.69,z)
            weights={'Thigh.'+side:t*(1-hip),'Shin.'+side:(1-t)*(1-hip),'Hips':hip}
        elif kind=='Spine':
            t=smoothstep(.77,.94,z);weights={'Spine':t,'Hips':1-t}
        elif kind.startswith('Arm.'):
            side=kind.split('.')[1];t=smoothstep(.89,.98,z);weights={'Arm.'+side:t,'Forearm.'+side:1-t}
        for name,w in weights.items():
            if w<.0001:continue
            if name not in groups:groups[name]=o.vertex_groups.new(name=name)
            groups[name].add([v.index],w,'REPLACE')
    mod=o.modifiers.new('Lea deformation','ARMATURE');mod.object=rig;o.parent=rig
# Join by material to keep the draw-call count bounded while retaining skin weights.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=head;bpy.ops.object.join();character=bpy.context.object;character.name='Lea_B_SkinnedMesh';character.parent=None
dec=character.modifiers.new('Mobile mesh simplification','DECIMATE');dec.ratio=.5
bpy.ops.object.modifier_move_up(modifier=dec.name)
bpy.ops.object.modifier_apply(modifier=dec.name)

# Four named animation clips, usable by Babylon's AnimationGroup.
scene=bpy.context.scene;scene.render.fps=30
def action(name,frames,pose_fn):
    rig.animation_data_clear();act=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=act
    for frame in range(1,frames+1,3):
        t=(frame-1)/(frames-1)
        for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
        pose_fn(t)
        for p in rig.pose.bones:
            p.keyframe_insert('rotation_euler',frame=frame,group=p.name);p.keyframe_insert('location',frame=frame,group=p.name)
    # Keep each clip in an NLA track for glTF export in ACTIONS mode.
    act.use_fake_user=True
    return act
pb=rig.pose.bones
def idle(t):
    a=t*math.pi*2;pb['Spine'].rotation_euler[1]=math.sin(a)*.015;pb['Head'].rotation_euler[2]=math.sin(a)*.035;pb['Hips'].location.y=math.sin(a)*.003
    for side in ['L','R']:pb['Arm.'+side].rotation_euler[0]=math.sin(a)*.025
def walk(t):
    a=t*math.pi*2
    for s,side in [(-1,'R'),(1,'L')]:
        phase=a+(0 if s==1 else math.pi);pb['Thigh.'+side].rotation_euler[0]=math.sin(phase)*.48;pb['Shin.'+side].rotation_euler[0]=max(0,-math.sin(phase))*.65;pb['Foot.'+side].rotation_euler[0]=-max(0,math.sin(phase))*.16;pb['Arm.'+side].rotation_euler[0]=-math.sin(phase)*.24;pb['Forearm.'+side].rotation_euler[0]=-.12
    pb['Hips'].location.y=abs(math.sin(a))*.013;pb['Spine'].rotation_euler[2]=math.sin(a)*.035;pb['Head'].rotation_euler[2]=-math.sin(a)*.02
def interact(t):
    a=math.sin(t*math.pi);pb['Arm.R'].rotation_euler[0]=-a*.95;pb['Forearm.R'].rotation_euler[0]=-a*.5;pb['Head'].rotation_euler[0]=a*.13;pb['Spine'].rotation_euler[0]=a*.08
def celebrate(t):
    a=math.sin(t*math.pi);pb['Arm.L'].rotation_euler[2]=-a*1.7;pb['Arm.R'].rotation_euler[2]=a*1.7;pb['Forearm.L'].rotation_euler[0]=-a*.3;pb['Forearm.R'].rotation_euler[0]=-a*.3;pb['Hips'].location.y=abs(math.sin(t*math.pi*4))*.045*a;pb['Head'].rotation_euler[0]=-a*.1
clips=[action('Idle',91,idle),action('Walk',31,walk),action('Interact',61,interact),action('Celebrate',61,celebrate)]
rig.animation_data.action=None
for a in clips:
    track=rig.animation_data.nla_tracks.new();track.name=a.name;track.strips.new(a.name,1,a);track.mute=True
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)

# Small local HDR studio environment for the browser PBR materials.
nw,nh=512,256;yy,xx=np.mgrid[0:nh,0:nw].astype(np.float32);u=xx/nw;v=yy/nh
pixels=np.ones((nh,nw,4),np.float32);sky=.18+.28*v
for k,c in enumerate([1,.95,.86]):pixels[:,:,k]=sky*c+np.exp(-((u-.25)/.1)**2-((v-.7)/.17)**2)*1.8*c+np.exp(-((u-.7)/.12)**2-((v-.65)/.2)**2)*.7
hdr=bpy.data.images.new('Studio environment',nw,nh,float_buffer=True);hdr.pixels.foreach_set(pixels.ravel());hdr.filepath_raw=str(PUBLIC/'studio.hdr');hdr.file_format='HDR';hdr.save()

# Save/export before adding presentation lights and the floor to the source file.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);character.select_set(True);bpy.context.view_layer.objects.active=rig
scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'lea-b.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True,export_apply=False,export_materials='EXPORT')
triangles=sum(len(p.vertices)-2 for p in character.data.polygons)
stats={'triangles':triangles,'vertices':len(character.data.vertices),'materials':len(character.data.materials),'bones':len(rig.data.bones),'animations':[a.name for a in clips],'glb_bytes':(PUBLIC/'lea-b.glb').stat().st_size}
(OUT/'stats.json').write_text(json.dumps(stats,indent=2),encoding='utf-8');print('LEA_STATS',stats)

# Studio preview, rendered from the actual model, never a generated stand-in.
floor_mat=mat('Studio ivory',(225,218,201),.8)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.01));plane=bpy.context.object;plane.name='Studio floor';plane.data.materials.append(floor_mat)
world=bpy.data.worlds.new('Warm studio') if not bpy.data.worlds else bpy.data.worlds[0];scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.69,.72,1);world.node_tree.nodes['Background'].inputs[1].default_value=.3
def area(name,loc,power,size,color):
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,.9))-o.location).to_track_quat('-Z','Y').to_euler()
area('Large soft key',(-3,-4,5),430,4,(1,.87,.73));area('Cool fill',(3,-2,2.8),180,3,(.77,.88,1));area('Hair rim',(1,2,3.6),380,2,(1,.77,.52))
bpy.ops.object.camera_add(location=(2.3,-5.6,2.4));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.86))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.05;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'lea-b-render.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lea-b.blend'))
bpy.ops.render.render(write_still=True)
print('LEA_COMPLETE')



