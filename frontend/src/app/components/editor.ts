import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { openSearchPanel } from '@codemirror/search';
import { Key } from '../domain';
@Component({selector:'json-editor',standalone:true,template:`<div class="toolrow"><button (click)="format(false)">Formater</button><button (click)="format(true)">Minifier</button><button (click)="copy()">Copier</button><button (click)="find()">Chercher</button><button class="primary" (click)="apply()">Appliquer</button></div><div class="editor-error" role="status">{{error}}</div><div #host class="editor-host"></div>`,styles:[`:host{display:flex;flex-direction:column;height:100%;min-height:0}.editor-host{flex:1;overflow:auto;min-height:350px}.editor-error{color:#b22b30;font-size:12px;padding:0 8px}.cm-editor{height:100%}`]})
export class EditorComponent implements AfterViewInit,OnChanges,OnDestroy {
 @Input() text='';@Input() selected?:Key;@Input() selectedType:'node'|'link'='node';@Output() applyText=new EventEmitter<string>();@Output() selectedKey=new EventEmitter<{key:Key,type:'node'|'link'}>();@Output() dirty=new EventEmitter<boolean>();
 @ViewChild('host',{static:true})host!:ElementRef;view?:EditorView;error='';private syncing=false;
 ngAfterViewInit(){this.view=new EditorView({parent:this.host.nativeElement,state:EditorState.create({doc:this.text,extensions:[basicSetup,json(),EditorView.lineWrapping,EditorView.theme({'&':{height:'100%',fontSize:'12px'},'.cm-scroller':{overflow:'auto'},'.cm-gutters':{background:'#f6f9ff',border:'none'}}),EditorView.updateListener.of(u=>{
  if(u.docChanged&&!this.syncing){this.dirty.emit(true);try{JSON.parse(u.state.doc.toString());this.error='';}catch(e){this.error=String(e);}}
  if(u.selectionSet&&!this.syncing){const source=u.state.doc.toString(),pos=u.state.selection.main.head;const matches=[...source.slice(0,pos+50).matchAll(/"key"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?)/g)].filter(m=>m.index!<=pos);const m=matches.at(-1);if(m){try{this.selectedKey.emit({key:JSON.parse(m[1]),type:source.lastIndexOf('"linkDataArray"',m.index)>source.lastIndexOf('"nodeDataArray"',m.index)?'link':'node'});}catch{}}}
 })]})});}
 ngOnChanges(changes:any){if(!this.view)return;if(changes.text&&this.text!==this.view.state.doc.toString()){this.syncing=true;this.view.dispatch({changes:{from:0,to:this.view.state.doc.length,insert:this.text}});this.syncing=false;this.dirty.emit(false);}if(changes.selected||changes.selectedType)this.highlight();}
 highlight(){if(this.selected===undefined||!this.view)return;const source=this.view.state.doc.toString();const field=this.selectedType==='node'?'nodeDataArray':'linkDataArray';const start=source.indexOf('"'+field+'"');const expression=new RegExp('"key"\\s*:\\s*'+JSON.stringify(this.selected).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));const m=expression.exec(source.slice(start));if(m){const from=start+m.index;this.syncing=true;this.view.dispatch({selection:{anchor:from,head:from+m[0].length},effects:EditorView.scrollIntoView(from,{y:'center'})});this.syncing=false;}}
 apply(){this.applyText.emit(this.view?.state.doc.toString()??'');}
 format(minify:boolean){try{const text=JSON.stringify(JSON.parse(this.view!.state.doc.toString()),null,minify?undefined:2);this.view!.dispatch({changes:{from:0,to:this.view!.state.doc.length,insert:text}});this.error='';}catch(e){this.error=String(e);}}
 async copy(){try{await navigator.clipboard.writeText(this.view!.state.doc.toString());this.error='Copié.';}catch{this.error='Copie indisponible : sélectionnez le texte puis Ctrl+C.';}}
 find(){if(this.view)openSearchPanel(this.view);}ngOnDestroy(){this.view?.destroy();}
}
