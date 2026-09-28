// Cross-section follows the mattress top, rounds its edge, then hangs outside it.
// Mattress: half-width .83, top .825. Frame: half-width .85.
export function quiltPoint(u:number,v:number){
 const side=u<.5?-1:1,arc=.12*Math.PI/2;
 const distance=Math.abs(u-.5)*2*(.78+arc+.43);
 let x:number,y:number;
 if(distance<=.78){x=distance;y=.90}
 else if(distance<=.78+arc){const angle=(distance-.78)/.12;x=.78+.12*Math.sin(angle);y=.78+.12*Math.cos(angle)}
 else{const drop=distance-.78-arc,t=drop/.43;x=.90+.03*t+Math.sin(v*23)*.012*t;y=.78-drop}
 y+=.006+Math.sin(v*23+u*38)*.004;
 return {x:-2.72+side*x,y,z:.08+v*1.88};
}
