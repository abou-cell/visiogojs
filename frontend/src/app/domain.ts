export type Key = string | number;
export interface Graph { class: string; nodeDataArray: Record<string, any>[]; linkDataArray: Record<string, any>[]; [key: string]: any; }
export type Status = 'review' | 'valid' | 'partial' | 'invalid';
export interface Difference {
 id: string; page: number; element_id: Key; element_type: 'node'|'link'; category: string; error_type: string;
 property: string; predicted_value: any; expected_value: any; confidence: number|null; validated: boolean;
 comment: string; created_at: string; validated_at?: string; validated_by?: string;
 source: 'human'|'reference';
}
export interface Revision {version:number; date:string; author:string; reason:string; graph:Graph;}
export interface DocumentRecord {
 id:string; name:string; jsonName?:string; pdfName?:string; pdf?:Blob;
 original?:Graph; corrected?:Graph; reference?:Graph; rawOriginal?:string;
 status:Status; differences:Difference[]; revisions:Revision[]; error?:string;
 modelVersion:string; datasetVersion:string; createdAt:string; updatedAt:string;
}
export interface Settings {project:string; validator:string; modelVersion:string; datasetVersion:string; gojsLicense:string;}
export const categories:Record<string,string[]>={
 node:['missing_node','extra_node','wrong_type','wrong_shape','wrong_size'],
 link:['missing_link','extra_link','wrong_source','wrong_target','wrong_direction','wrong_routing','wrong_type'],
 ocr:['wrong_text','missing_text','character_error','word_error','line_break'],
 geometry:['wrong_position','wrong_size','wrong_rotation','wrong_alignment'],
 structure:['wrong_hierarchy','wrong_sequence','wrong_branch','wrong_relationship']
};
export const clone=<T>(value:T):T=>structuredClone(value);
export const keyEqual=(a:Key,b:Key)=>a===b;
export const keyToken=(k:Key)=>`${typeof k}:${k}`;
export function parseGraph(text:string):Graph {
 const v=JSON.parse(text);
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Le JSON doit être un objet GraphLinksModel.');
 if(!Array.isArray(v.nodeDataArray)||!Array.isArray(v.linkDataArray))throw Error('nodeDataArray et linkDataArray sont requis.');
 if(v.nodeKeyProperty&&v.nodeKeyProperty!=='key')throw Error('Convertissez nodeKeyProperty en "key" avant import.');
 if((v.linkFromKeyProperty&&v.linkFromKeyProperty!=='from')||(v.linkToKeyProperty&&v.linkToKeyProperty!=='to'))throw Error('Les liens doivent utiliser les propriétés from et to.');
 const keys=new Set<string>();
 for(const n of v.nodeDataArray){
  if(!n||!['string','number'].includes(typeof n.key)||n.key===''||(typeof n.key==='number'&&!Number.isFinite(n.key)))throw Error('Chaque nœud doit posséder une clé string ou number.');
  const k=keyToken(n.key);if(keys.has(k))throw Error(`Clé de nœud dupliquée : ${n.key}`);keys.add(k);
  if(n.text!==undefined&&typeof n.text!=='string')throw Error(`Le texte du nœud ${n.key} doit être une chaîne.`);
  for(const field of ['loc','size'])if(n[field]!==undefined&&(!/^-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?$/.test(String(n[field]))))throw Error(`${field} invalide pour ${n.key} : attendu "x y".`);
 }
 const linkKeys=new Set<string>();
 const links=v.linkDataArray.map((l:any,i:number)=>{
  if(!l||!keys.has(keyToken(l.from))||!keys.has(keyToken(l.to)))throw Error(`Lien ${i+1} : source ou cible absente.`);
  const key=l.key??`link-${i+1}`;if(!['string','number'].includes(typeof key)||linkKeys.has(keyToken(key)))throw Error(`Clé de lien invalide ou dupliquée : ${key}`);
  linkKeys.add(keyToken(key));return {...l,key};
 });
 return {...v,class:'GraphLinksModel',linkKeyProperty:'key',nodeDataArray:clone(v.nodeDataArray),linkDataArray:links};
}
export function makeDocument(name:string,settings:Settings):DocumentRecord {
 const now=new Date().toISOString();return {id:crypto.randomUUID(),name,status:'review',differences:[],revisions:[],modelVersion:settings.modelVersion,datasetVersion:settings.datasetVersion,createdAt:now,updatedAt:now};
}
export function addRevision(d:DocumentRecord,g:Graph,author:string,reason:string):DocumentRecord {
 const now=new Date().toISOString();return {...d,corrected:clone(g),status:'review',updatedAt:now,revisions:[...d.revisions,{version:d.revisions.length+1,date:now,author,reason,graph:clone(g)}]};
}
export function applyDifference(graph:Graph,d:Difference):Graph {
 const g=clone(graph);const list=d.element_type==='node'?g.nodeDataArray:g.linkDataArray;
 const idx=list.findIndex(x=>keyEqual(x.key,d.element_id));
 if(d.error_type.startsWith('missing_')&&d.property==='$object'){
  if(idx>=0)throw Error('Cet objet existe déjà.');
  if(!d.expected_value||typeof d.expected_value!=='object'||Array.isArray(d.expected_value))throw Error('La correction doit être un objet JSON complet.');
  list.push({...d.expected_value,key:d.element_id});
 }else if(d.error_type.startsWith('extra_')&&d.property==='$object'){
  if(idx<0)throw Error('Objet introuvable.');list.splice(idx,1);
  if(d.element_type==='node')g.linkDataArray=g.linkDataArray.filter(l=>!keyEqual(l.from,d.element_id)&&!keyEqual(l.to,d.element_id));
 }else{
  if(idx<0)throw Error('Objet introuvable.');
  if(['__proto__','constructor','prototype','key'].includes(d.property)||!d.property)throw Error('Propriété non modifiable.');
  if(d.expected_value===null)delete list[idx][d.property];else list[idx][d.property]=clone(d.expected_value);
 }
 return parseGraph(JSON.stringify(g));
}
const same=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
export function compareGraphs(predicted:Graph,reference:Graph):Difference[]{
 const out:Difference[]=[];
 const add=(kind:'node'|'link',id:Key,cat:string,type:string,prop:string,p:any,e:any)=>out.push({id:crypto.randomUUID(),page:1,element_id:id,element_type:kind,category:cat,error_type:type,property:prop,predicted_value:p??null,expected_value:e??null,confidence:null,validated:false,comment:'Comparaison avec JSON de référence ; vérifier la page PDF.',source:'reference',created_at:new Date().toISOString()});
 for(const kind of ['node','link'] as const){
  const a=kind==='node'?predicted.nodeDataArray:predicted.linkDataArray,b=kind==='node'?reference.nodeDataArray:reference.linkDataArray;
  for(const n of b){const found=a.find(x=>keyEqual(x.key,n.key));if(!found){add(kind,n.key,kind,`missing_${kind}`,'$object',null,n);continue;}
   const fields=kind==='node'?['text','category','figure','loc','size','angle','group']:['from','to','text','points'];
   for(const p of fields){if(same(found[p],n[p]))continue;const cat=p==='text'?'ocr':['loc','size','angle'].includes(p)?'geometry':kind;
    const type=p==='text'?'wrong_text':p==='loc'?'wrong_position':p==='to'?'wrong_target':p==='from'?'wrong_source':p==='points'?'wrong_routing':p==='size'?'wrong_size':p==='angle'?'wrong_rotation':p==='figure'?'wrong_shape':'wrong_type';
    add(kind,n.key,cat,type,p,found[p],n[p]);}
  }
  for(const n of a)if(!b.some(x=>keyEqual(x.key,n.key)))add(kind,n.key,kind,`extra_${kind}`,'$object',n,null);
 }return out;
}
export function referenceMetrics(p:Graph,r:Graph){
 const exact=(a:Record<string,any>[],b:Record<string,any>[],props:string[])=>{
  const denom=new Set([...a,...b].map(x=>keyToken(x.key))).size;
  return denom? a.filter(x=>b.some(y=>keyEqual(x.key,y.key)&&props.every(k=>same(x[k],y[k])))).length/denom:null;
 };
 return {nodes:exact(p.nodeDataArray,r.nodeDataArray,['category','figure']),links:exact(p.linkDataArray,r.linkDataArray,['from','to']),text:exact(p.nodeDataArray,r.nodeDataArray,['text']),geometry:exact(p.nodeDataArray,r.nodeDataArray,['loc','size','angle'])};
}
export function trainingRows(d:DocumentRecord){return d.differences.filter(x=>x.validated).map(x=>({
 schema_version:'1.0',sample_id:`${d.id}_${x.id}`,document_id:d.id,document_name:d.name,page:x.page,
 element_id:x.element_id,element_type:x.element_type,error_category:x.category,error_type:x.error_type,
 property:x.property,predicted_value:x.predicted_value,expected_value:x.expected_value,confidence:x.confidence,
 validated_by_human:true,validated_by:x.validated_by,validated_at:x.validated_at,
 model_version:d.modelVersion,dataset_version:d.datasetVersion,prediction_version:1,validation_version:d.revisions.length,
 coordinate_system:'GoJS document coordinates; PDF page coordinates require registration',
 delta:x.property==='loc'&&typeof x.predicted_value==='string'&&typeof x.expected_value==='string'?positionDelta(x.predicted_value,x.expected_value):undefined
 }));}
function positionDelta(a:string,b:string){const p=a.split(/\s+/).map(Number),q=b.split(/\s+/).map(Number);return {x:q[0]-p[0],y:q[1]-p[1]};}
export function csv(rows:Record<string,any>[]){
 if(!rows.length)return '';const headers=Array.from(new Set(rows.flatMap(Object.keys)));
 const quote=(v:any)=>{let s=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 return [headers.map(quote).join(','),...rows.map(r=>headers.map(k=>quote(r[k])).join(','))].join('\r\n');
}
export const demoGraph:Graph={class:'GraphLinksModel',linkKeyProperty:'key',nodeDataArray:[
 {key:'N1',text:'Start',category:'start',loc:'120 35'}, {key:'N2',text:'Check pump status',category:'process',loc:'120 115'},
 {key:'N3',text:'Is pump running?',category:'decision',loc:'120 205'}, {key:'N4',text:'Continue operation',category:'process',loc:'340 205'},
 {key:'N17',text:'Purnp Failu re',category:'process',loc:'120 300'}, {key:'N20',text:'Repair pump',category:'process',loc:'120 380'},
 {key:'N22',text:'Test pump',category:'process',loc:'120 460'}, {key:'N8',text:'End',category:'end',loc:'120 540'}
],linkDataArray:[{key:'L1',from:'N1',to:'N2'},{key:'L2',from:'N2',to:'N3'},{key:'L3',from:'N3',to:'N4',text:'Yes'},{key:'L4',from:'N3',to:'N17',text:'No'},{key:'L5',from:'N17',to:'N20'},{key:'L6',from:'N20',to:'N22'},{key:'L7',from:'N4',to:'N22'},{key:'L8',from:'N22',to:'N8'}]};
