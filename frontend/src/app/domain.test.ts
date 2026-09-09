import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addRevision,applyDifference,clone,compareGraphs,csv,demoGraph,makeDocument,parseGraph,referenceMetrics,trainingRows} from './domain';
const settings={project:'Test',validator:'Expert',modelVersion:'v1',datasetVersion:'v1',gojsLicense:''};
test('Reject duplicate keys and dangling endpoints; preserve numeric keys',()=>{
 assert.throws(()=>parseGraph(JSON.stringify({...demoGraph,nodeDataArray:[...demoGraph.nodeDataArray,demoGraph.nodeDataArray[0]]})),/dupliquée/);
 assert.throws(()=>parseGraph(JSON.stringify({...demoGraph,linkDataArray:[{from:'absent',to:'N1'}]})),/absente/);
 const g=parseGraph('{"nodeDataArray":[{"key":0},{"key":"0"}],"linkDataArray":[{"from":0,"to":"0"}]}');assert.equal(g.nodeDataArray.length,2);
});
test('Correction is immutable; original and revision history survive',()=>{
 const ref=clone(demoGraph);ref.nodeDataArray.find(x=>x.key==='N17')!.text='Pump Failure';
 const [diff]=compareGraphs(demoGraph,ref);const result=applyDifference(demoGraph,diff);
 assert.equal(demoGraph.nodeDataArray.find(x=>x.key==='N17')!.text,'Purnp Failu re');assert.equal(result.nodeDataArray.find(x=>x.key==='N17')!.text,'Pump Failure');
 const d=makeDocument('test',settings);d.original=clone(demoGraph);d.corrected=clone(demoGraph);const n=addRevision(d,result,'Expert','OCR');assert.equal(n.revisions.length,1);assert.deepEqual(n.original,demoGraph);
});
test('Dataset excludes unvalidated annotations; includes provenance and geometry delta',()=>{
 const ref=clone(demoGraph);ref.nodeDataArray[0].loc='100 36';const d=makeDocument('test',settings);d.differences=compareGraphs(demoGraph,ref);assert.equal(trainingRows(d).length,0);d.differences[0].validated=true;d.differences[0].validated_by='Expert';const row=trainingRows(d)[0];assert.deepEqual(row.delta,{x:-20,y:1});assert.equal(row.model_version,'v1');
});
test('Node removal removes incident links; missing node requires an object',()=>{
 const ref=clone(demoGraph);ref.nodeDataArray=ref.nodeDataArray.filter(n=>n.key!=='N1');ref.linkDataArray=ref.linkDataArray.filter(l=>l.from!=='N1');const d=compareGraphs(demoGraph,ref).find(d=>d.error_type==='extra_node')!;const result=applyDifference(demoGraph,d);assert.equal(result.nodeDataArray.length,7);assert.equal(result.linkDataArray.length,7);
});
test('Metrics penalize extra objects and represent empty denominator as null',()=>{
 assert.equal(referenceMetrics(demoGraph,demoGraph).nodes,1);const g=clone(demoGraph);g.nodeDataArray.push({key:'EXTRA'});assert.equal(referenceMetrics(g,demoGraph).nodes,8/9);const empty={class:'GraphLinksModel',nodeDataArray:[],linkDataArray:[]};assert.equal(referenceMetrics(empty,empty).nodes,null);
});
test('CSV preserves multiline strings and neutralizes spreadsheet formulas',()=>{const out=csv([{text:'=HYPERLINK("x")',comment:'a\nb'}]);assert.ok(out.includes("'=HYPERLINK"));assert.ok(out.includes('"a\nb"'));});
test('Prototype and key mutation are rejected',()=>{const ref=clone(demoGraph);ref.nodeDataArray[0].text='Other';const d=compareGraphs(demoGraph,ref)[0];d.property='__proto__';assert.throws(()=>applyDifference(demoGraph,d),/non modifiable/);});
