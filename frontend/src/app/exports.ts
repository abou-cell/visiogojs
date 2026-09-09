import { DocumentRecord, Graph, csv, referenceMetrics, trainingRows } from './domain';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import * as go from 'gojs';
import * as pdfjs from 'pdfjs-dist';
export function download(data:Blob|string,name:string,mime='application/json'){
 const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function reportData(d:DocumentRecord){return {schema_version:'1.0',document_id:d.id,document:d.name,pdf:d.pdfName,json:d.jsonName,status:d.status,created_at:d.createdAt,updated_at:d.updatedAt,model_version:d.modelVersion,dataset_version:d.datasetVersion,statistics:{nodes:d.corrected?.nodeDataArray.length??0,links:d.corrected?.linkDataArray.length??0,differences:d.differences.length,validated:d.differences.filter(x=>x.validated).length},scores:d.reference&&d.original?referenceMetrics(d.original,d.reference):null,score_basis:'Exact match against annotated reference JSON, by stable typed object keys. Not OCR confidence. Null when no reference.',differences:d.differences,versions:d.revisions.map(({graph,...v})=>v)};}
async function graphImage(graph:Graph):Promise<string>{
 const host=document.createElement('div');host.style.cssText='position:absolute;left:-10000px;width:1000px;height:1000px';document.body.append(host);const $=go.GraphObject.make;const diagram=$(go.Diagram,host,{'animationManager.isEnabled':false});
 try{
 diagram.nodeTemplate=$(go.Node,'Auto',{locationSpot:go.Spot.Center},new go.Binding('location','loc',go.Point.parse),$(go.Shape,'RoundedRectangle',{fill:'#eaf3ff',stroke:'#8aa8cc'},new go.Binding('figure','category',c=>String(c).toLowerCase()==='decision'?'Diamond':'RoundedRectangle')),$(go.TextBlock,{margin:12,maxSize:new go.Size(150,NaN),wrap:go.Wrap.Fit},new go.Binding('text','text')));
 diagram.linkTemplate=$(go.Link,{routing:go.Routing.Orthogonal},$(go.Shape),$(go.Shape,{toArrow:'Standard'}),$(go.TextBlock,{segmentOffset:new go.Point(0,-10)},new go.Binding('text','text')));
 diagram.model=go.Model.fromJson(graph);if(!graph.nodeDataArray.every(n=>n.loc))diagram.layout=new go.LayeredDigraphLayout({direction:90});diagram.layoutDiagram(true);
 return diagram.makeImageData({background:'white',maxSize:new go.Size(1400,1400),scale:1}) as string;
 }finally{diagram.div=null;host.remove();}
}
async function pdfImage(blob:Blob):Promise<string>{const pdf=await pdfjs.getDocument({data:await blob.arrayBuffer()}).promise;try{const p=await pdf.getPage(1),vp=p.getViewport({scale:1});const canvas=document.createElement('canvas');canvas.width=vp.width;canvas.height=vp.height;await p.render({canvas,viewport:vp}).promise;return canvas.toDataURL('image/png');}finally{await pdf.destroy();}}
export async function reportPdf(d:DocumentRecord):Promise<Blob>{
 const pdf=new jsPDF();let y=22;
 const line=(s:string,size=10)=>{pdf.setFontSize(size);const lines=pdf.splitTextToSize(s,178);for(const l of lines){if(y>275){pdf.addPage();y=20;}pdf.text(l,16,y);y+=size*.46+2;}y+=2;};
 line('FlowChart AI Validator',19);line('Rapport de validation - '+d.name,14);line(`PDF : ${d.pdfName??'Absent'} | JSON : ${d.jsonName??'Absent'}`);line(`Statut : ${d.status} | Modele : ${d.modelVersion} | Dataset : ${d.datasetVersion}`);line(`${d.corrected?.nodeDataArray.length??0} noeuds | ${d.corrected?.linkDataArray.length??0} liens | ${d.differences.length} ecarts`);
 line('La prediction originale est conservee. Les corrections sont validees par un humain.');
 const image=async(label:string,load:()=>Promise<string>)=>{try{const data=await load();pdf.addPage();y=20;line(label,14);const p=pdf.getImageProperties(data),w=Math.min(175,230*p.width/p.height),h=w*p.height/p.width;pdf.addImage(data,'PNG',16,y,w,h);y+=h+8;}catch(e){line(label+' : capture indisponible ('+String(e)+')');}};
 if(d.pdf)await image('PDF original - page 1',()=>pdfImage(d.pdf!));if(d.original)await image('Diagramme predit original',()=>graphImage(d.original!));if(d.corrected)await image('Diagramme corrige',()=>graphImage(d.corrected!));
 pdf.addPage();y=20;line('Ecarts et corrections',16);
 for(const x of d.differences){line(`${x.element_type} ${x.element_id} - ${x.error_type} - Page ${x.page}`,12);line('Detecte : '+JSON.stringify(x.predicted_value));line('Attendu : '+JSON.stringify(x.expected_value));line(`Confiance : ${x.confidence??'non fournie'} | ${x.validated?'Valide par '+x.validated_by+' le '+x.validated_at:'A valider'}`);if(x.comment)line(x.comment);}
 if(!d.differences.length)line('Aucun ecart annote. Cela ne constitue pas une preuve de conformite.');
 if(d.reference&&d.original){line('Exactitude vs JSON de reference',14);for(const [key,val] of Object.entries(referenceMetrics(d.original,d.reference)))line(`${key} : ${val===null?'N/A':(100*val).toFixed(1)+' %'}`);}else line('Scores : indisponibles sans JSON de reference annote.');
 line('Historique de validation',14);for(const r of d.revisions)line(`v${r.version} - ${r.date} - ${r.author} - ${r.reason}`);
 return pdf.output('blob');
}
export async function datasetExport(docs:DocumentRecord[],format:string){
 const rows=docs.flatMap(trainingRows);if(format==='json')return download(JSON.stringify(rows,null,2),'training_dataset.json');if(format==='jsonl')return download(rows.map(r=>JSON.stringify(r)).join('\n'),'training_dataset.jsonl','application/x-ndjson');if(format==='csv')return download(csv(rows),'training_dataset.csv','text/csv;charset=utf-8');
 const zip=new JSZip();zip.file('training_dataset.jsonl',rows.map(r=>JSON.stringify(r)).join('\n'));
 const manifest=docs.map(d=>({document_id:d.id,name:d.name,split:split(d.id),model_version:d.modelVersion,dataset_version:d.datasetVersion,validated_samples:trainingRows(d).length}));
 zip.file('manifest.json',JSON.stringify({schema_version:'1.0',split_policy:'Stable hash by document ID, approximately 70/15/15. All pages/objects stay together. Not stratified.',documents:manifest},null,2));
 for(const d of docs){const dir=zip.folder(d.id)!;if(d.pdf)dir.file('original.pdf',d.pdf);if(d.rawOriginal)dir.file('prediction_raw.json',d.rawOriginal);if(d.original)dir.file('prediction_original.json',JSON.stringify(d.original,null,2));if(d.corrected)dir.file('prediction_corrected.json',JSON.stringify(d.corrected,null,2));if(d.reference)dir.file('reference.json',JSON.stringify(d.reference,null,2));dir.file('report.json',JSON.stringify(reportData(d),null,2));dir.file('revisions.json',JSON.stringify(d.revisions,null,2));}
 download(await zip.generateAsync({type:'blob'}),'training_dataset.zip','application/zip');
}
function split(id:string){let h=2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619);const n=(h>>>0)%100;return n<70?'train':n<85?'val':'test';}
export async function batchExport(docs:DocumentRecord[],progress:(n:number)=>void){const zip=new JSZip();let n=0;const summary=[];
 for(const d of docs){const folder=zip.folder(d.id)!;folder.file('report.json',JSON.stringify(reportData(d),null,2));try{folder.file('report.pdf',await reportPdf(d));}catch(e){folder.file('error.txt',String(e));}summary.push({document:d.name,status:d.status,nodes:d.corrected?.nodeDataArray.length??0,links:d.corrected?.linkDataArray.length??0,errors:d.differences.length,validated:d.differences.filter(x=>x.validated).length});progress(++n);}
 zip.file('batch-summary.csv',csv(summary));zip.file('batch-summary.json',JSON.stringify({documents:summary,total_documents:docs.length,total_differences:docs.reduce((a,d)=>a+d.differences.length,0)},null,2));download(await zip.generateAsync({type:'blob'}),'batch_reports.zip');}
export function demoPdf(graph:Graph):Blob {const p=new jsPDF();p.setFontSize(16);p.text('Pump failure handling process',20,20);p.setFontSize(10);const boxes=new Map<any,{x:number,y:number}>();for(const n of graph.nodeDataArray){const [x,y]=n.loc.split(' ').map(Number);boxes.set(n.key,{x:20+x*.34,y:32+y*.35});}for(const l of graph.linkDataArray){const a=boxes.get(l.from)!,b=boxes.get(l.to)!;p.setDrawColor(80,105,135);p.line(a.x,a.y+8,b.x,b.y-8);}for(const n of graph.nodeDataArray){const {x,y}=boxes.get(n.key)!;p.setFillColor(239,245,255);p.roundedRect(x-24,y-8,48,16,2,2,'FD');p.text(n.key==='N17'?'Pump Failure':n.text,x,y+1,{align:'center',maxWidth:44});}return p.output('blob');}
