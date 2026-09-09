import { Injectable, signal } from '@angular/core';
import { openDB } from 'idb';
import { DocumentRecord, Settings, clone, makeDocument, parseGraph } from './domain';
@Injectable({providedIn:'root'})
export class Store {
 readonly documents=signal<DocumentRecord[]>([]);
 readonly settings=signal<Settings>({project:'Dataset V2',validator:'Abou',modelVersion:'non renseigné',datasetVersion:'v1',gojsLicense:''});
 private db=openDB('flowchart-validator',1,{upgrade(db){db.createObjectStore('documents',{keyPath:'id'});db.createObjectStore('settings');}});
 async load(){const db=await this.db;this.documents.set(await db.getAll('documents'));const s=await db.get('settings','current');if(s)this.settings.set(s);}
 async put(d:DocumentRecord){await (await this.db).put('documents',clone(d));this.documents.update(all=>all.some(x=>x.id===d.id)?all.map(x=>x.id===d.id?{...clone(d),pdf:d.pdf}:x):[...all,clone(d)]);}
 async configure(s:Settings){await (await this.db).put('settings',clone(s),'current');this.settings.set(clone(s));}
 async remove(id:string){await (await this.db).delete('documents',id);this.documents.update(a=>a.filter(x=>x.id!==id));}
 async import(files:File[]):Promise<string[]> {
  const messages:string[]=[];const batch=new Set<string>();
  for(const f of files){
   const ext=f.name.split('.').pop()?.toLowerCase();if(!['pdf','json'].includes(ext??'')){messages.push(`${f.name} : extension ignorée`);continue;}
   if(f.size>50*1024*1024){messages.push(`${f.name} : limite 50 Mo par fichier`);continue;}
   const name=f.name.replace(/\.(pdf|json)$/i,'');const match=this.documents().find(d=>d.name.toLowerCase()===name.toLowerCase());
   if(!match&&this.documents().length>=50){messages.push(`${f.name} : limite de 50 documents atteinte`);continue;}
   const identity=name.toLowerCase()+'.'+ext;if(batch.has(identity)){messages.push(`${f.name} : doublon dans cet import`);continue;}batch.add(identity);
   const d=match?clone(match):makeDocument(name,this.settings());
   if((ext==='pdf'&&d.pdf)||(ext==='json'&&d.original)){messages.push(`${f.name} : original déjà présent, non remplacé`);continue;}
   try{
    if(ext==='pdf'){const magic=new TextDecoder().decode(await f.slice(0,1024).arrayBuffer());if(!magic.includes('%PDF-'))throw Error('Signature PDF absente');d.pdf=f;d.pdfName=f.name;}
    else{const raw=await f.text();d.original=parseGraph(raw);d.corrected=clone(d.original);d.rawOriginal=raw;d.jsonName=f.name;d.error=undefined;}
    d.updatedAt=new Date().toISOString();await this.put(d);
   }catch(e){messages.push(`${f.name} : ${e instanceof Error?e.message:e}`);}
  }return messages;
 }
 async pair(sourceId:string,targetId:string){
  if(sourceId===targetId)return;const source=clone(this.documents().find(x=>x.id===sourceId)!),target=clone(this.documents().find(x=>x.id===targetId)!);
  if(!source?.pdf||target?.pdf)throw Error('Choisissez un PDF source et un document sans PDF.');
  const db=await this.db;const tx=db.transaction('documents','readwrite');
  target.pdf=source.pdf;target.pdfName=source.pdfName;delete source.pdf;delete source.pdfName;
  await tx.store.put(target);if(source.original)await tx.store.put(source);else await tx.store.delete(source.id);await tx.done;
  await this.load();
 }
}
