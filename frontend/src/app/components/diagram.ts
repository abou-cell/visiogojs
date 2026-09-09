import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import * as go from 'gojs';
import { Difference, Graph, Key } from '../domain';
@Component({selector:'graph-view',standalone:true,template:`<div class="toolrow"><button (click)="zoom(.8)" aria-label="Réduire diagramme">−</button><button (click)="zoom(1.25)" aria-label="Agrandir diagramme">+</button><button (click)="fit()">Ajuster</button><button (click)="undo()">Annuler</button><button (click)="redo()">Rétablir</button><button (click)="fullscreen()" aria-label="Plein écran diagramme">⛶</button></div><div #host class="go-host" aria-label="Diagramme GoJS interactif"></div>`,styles:[`:host{display:flex;flex-direction:column;min-height:0;height:100%}.go-host{flex:1;min-height:420px;background:#fff}.toolrow{flex-shrink:0}`]})
export class DiagramComponent implements AfterViewInit,OnChanges,OnDestroy {
 @ViewChild('host',{static:true}) host!:ElementRef<HTMLDivElement>;
 @Input() graph?:Graph;@Input() selected?:Key;@Input() selectedType:'node'|'link'='node';@Input() ids=true;@Input() highlights=true;@Input() differences:Difference[]=[];@Input() license='';
 @Output() select=new EventEmitter<{key:Key,type:'node'|'link'}>();@Output() change=new EventEmitter<Graph>();
 diagram?:go.Diagram;private loading=false;private loaded?:Graph;private observer?:ResizeObserver;
 ngAfterViewInit(){
  if(this.license)go.Diagram.licenseKey=this.license;
  const $=go.GraphObject.make;
  this.diagram=$(go.Diagram,this.host.nativeElement,{'undoManager.isEnabled':true,initialContentAlignment:go.Spot.Center,allowDrop:false,allowDelete:false,'animationManager.isEnabled':false,layout:$(go.Layout)});
  const node=(figure:string,fill:string)=>$(go.Node,'Spot',{locationSpot:go.Spot.Center},new go.Binding('location','loc',go.Point.parse).makeTwoWay(go.Point.stringify),
   $(go.Panel,'Auto',$(go.Shape,figure,{fill,stroke:'#7c9fce',strokeWidth:1.2,minSize:new go.Size(100,42)},new go.Binding('figure','figure'),new go.Binding('desiredSize','size',s=>s?go.Size.parse(s):new go.Size(NaN,NaN)),new go.Binding('angle','angle'),new go.Binding('fill','_error',v=>v?'#ffe4df':fill)),
    $(go.TextBlock,{margin:10,maxSize:new go.Size(130,NaN),font:'13px sans-serif',stroke:'#173252',wrap:go.Wrap.Fit,editable:false},new go.Binding('text','text'))),
   $(go.TextBlock,{alignment:new go.Spot(1,0,10,-7),font:'10px sans-serif',stroke:'#567194'},new go.Binding('text','key',String),new go.Binding('visible','_ids')));
  this.diagram.nodeTemplate=node('RoundedRectangle','#edf5ff');
  for(const c of ['start','end','Start','End','terminator'])this.diagram.nodeTemplateMap.add(c,node('RoundedRectangle','#e3f3e5'));
  for(const c of ['decision','Decision','diamond'])this.diagram.nodeTemplateMap.add(c,node('Diamond','#e7f1ff'));
  this.diagram.groupTemplate=$(go.Group,'Auto',$(go.Shape,'RoundedRectangle',{fill:'#f5f8ff',stroke:'#adc3e0'}),$(go.Panel,'Vertical',$(go.TextBlock,{margin:8},new go.Binding('text','text')),$(go.Placeholder,{padding:18})));
  this.diagram.linkTemplate=$(go.Link,{routing:go.Routing.AvoidsNodes,corner:5,selectable:true},new go.Binding('points','points'),
    $(go.Shape,{stroke:'#56708f',strokeWidth:1.3},new go.Binding('stroke','_error',v=>v?'#d23e38':'#56708f')),
    $(go.Shape,{toArrow:'Standard',fill:'#56708f',stroke:null}),
    $(go.TextBlock,{segmentOffset:new go.Point(0,-12),background:'#fff',font:'11px sans-serif'},new go.Binding('text','text')));
  this.diagram.addDiagramListener('ChangedSelection',()=>{if(this.loading)return;const p=this.diagram!.selection.first();if(p?.data)this.select.emit({key:p.data.key,type:p instanceof go.Link?'link':'node'});});
  this.diagram.addModelChangedListener(e=>{if(this.loading||!e.isTransactionFinished)return;const g=JSON.parse(this.diagram!.model.toJson());for(const n of [...g.nodeDataArray,...g.linkDataArray]){delete n._ids;delete n._error;}this.change.emit(g);});
  this.observer=new ResizeObserver(()=>this.diagram?.requestUpdate());this.observer.observe(this.host.nativeElement);this.refresh();
 }
 ngOnChanges(){this.refresh();}
 private refresh(){if(!this.diagram||!this.graph)return;this.loading=true;
  const current=JSON.parse(this.diagram.model.toJson());for(const n of [...(current.nodeDataArray??[]),...(current.linkDataArray??[])]){delete n._ids;delete n._error;}
  if(this.loaded!==this.graph && JSON.stringify(current)!==JSON.stringify(this.graph)){const g=structuredClone(this.graph);for(const n of g.nodeDataArray){n._ids=this.ids;n._error=this.hasError(n.key,'node');}for(const l of g.linkDataArray)l._error=this.hasError(l.key,'link');
   this.diagram.model=go.Model.fromJson(g);this.diagram.layout=g.nodeDataArray.every(n=>n.loc)?new go.Layout():new go.LayeredDigraphLayout({direction:90,layerSpacing:35});this.loaded=this.graph;
  }else{this.diagram.skipsUndoManager=true;this.diagram.startTransaction('display');for(const n of this.diagram.model.nodeDataArray){this.diagram.model.setDataProperty(n,'_ids',this.ids);this.diagram.model.setDataProperty(n,'_error',this.hasError(n['key'],'node'));}for(const l of (this.diagram.model as go.GraphLinksModel).linkDataArray)this.diagram.model.setDataProperty(l,'_error',this.hasError(l['key'],'link'));this.diagram.commitTransaction('display');this.diagram.skipsUndoManager=false;}
  this.loaded=this.graph;const p=this.selectedType==='node'?this.diagram.findNodeForKey(this.selected):this.diagram.findLinkForData((this.diagram.model as go.GraphLinksModel).findLinkDataForKey(this.selected)!);if(p)this.diagram.select(p);this.loading=false;
 }
 private hasError(key:Key,type:string){return this.highlights&&this.differences.some(x=>x.element_id===key&&x.element_type===type&&!x.validated);}
 fit(){this.diagram?.zoomToFit();}zoom(factor:number){if(this.diagram)this.diagram.scale*=factor;}undo(){this.diagram?.commandHandler.undo();}redo(){this.diagram?.commandHandler.redo();}
 fullscreen(){this.host.nativeElement.requestFullscreen?.();}
 png(){return this.diagram?.makeImageData({background:'white',scale:1,maxSize:new go.Size(1600,1600)}) as string|undefined;}
 ngOnDestroy(){this.observer?.disconnect();if(this.diagram)this.diagram.div=null;}
}
