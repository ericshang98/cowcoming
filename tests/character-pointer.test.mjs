import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from '@babel/parser';

// Exercise the real DOM pointer handlers independently of WebGL rendering.
const source=readFileSync(new URL('../src/scene/Character.jsx',import.meta.url),'utf8');
const ast=parse(source,{sourceType:'module',plugins:['jsx']});
let setup;
function visit(node){
 if(!node || typeof node!=='object') return;
 if(node.type==='CallExpression' && node.callee.name==='useEffect') {
  const body=node.arguments[0]?.body;
  if(body && source.slice(body.start,body.end).includes('let drag = null')) setup=source.slice(body.start+1,body.end-1);
 }
 for(const [key,value] of Object.entries(node)) if(!['loc','start','end'].includes(key)) {
  if(Array.isArray(value)) value.forEach(visit);else if(value && typeof value==='object')visit(value);
 }
}
visit(ast);
function fixture(){
 const handlers={};let now=0,cleared=0;
 const controller={bodyYaw:.4,dragYaw:.4,dragging:false,mouse:{active:false},queue:{clear(){cleared++}},gesture(){},onCharacterTap(){}};
 const target={closest:selector=>selector==='.character-stage'?{}:null};
 const event=(x=100,y=100,pointerId=1)=>({clientX:x,clientY:y,pointerId,button:0,isPrimary:true,pointerType:'mouse',target});
 const run=new Function('controller','mode','overlay','onTap','stageRef','innerWidth','innerHeight','addEventListener','removeEventListener','performance',setup);
 run(controller,'home',false,undefined,null,1000,800,(name,handler)=>handlers[name]=handler,()=>{},{now:()=>now});
 return {controller,handlers,event,advance:ms=>now+=ms,get cleared(){return cleared}};
}
test('press and small pointer jitter stay a tap without rotating or cancelling animations',()=>{
 const f=fixture();f.handlers.pointerdown(f.event());
 assert.equal(f.controller.dragging,false);
 f.handlers.pointermove(f.event(104,103));
 assert.equal(f.controller.dragging,false);assert.equal(f.controller.dragYaw,.4);assert.equal(f.cleared,0);
 f.handlers.pointerup(f.event(104,103));assert.equal(f.controller.lastPointerWasDrag,false);
});
test('a stationary press longer than half a second is still a tap',()=>{
 const f=fixture();f.handlers.pointerdown(f.event());f.advance(800);f.handlers.pointerup(f.event());
 assert.equal(f.controller.lastPointerWasDrag,false);
});
test('a real drag rotates and remains a drag even after returning to its origin',()=>{
 const f=fixture();f.handlers.pointerdown(f.event());f.handlers.pointermove(f.event(120));
 assert.equal(f.controller.dragging,true);assert.ok(f.controller.dragYaw>.4);assert.equal(f.cleared,1);
 f.handlers.pointermove(f.event());f.handlers.pointerup(f.event());
 assert.equal(f.controller.lastPointerWasDrag,true);assert.equal(f.controller.dragging,false);
});
test('other pointers cannot rotate or end the active gesture',()=>{
 const f=fixture();f.handlers.pointerdown(f.event());f.handlers.pointermove(f.event(200,100,2));f.handlers.pointerup(f.event(200,100,2));
 assert.equal(f.controller.dragging,false);f.handlers.pointerup(f.event());assert.equal(f.controller.lastPointerWasDrag,false);
});
test('cancel prevents a late click from becoming a tap',()=>{
 const f=fixture();f.handlers.pointerdown(f.event());f.handlers.pointercancel(f.event());
 assert.equal(f.controller.dragging,false);assert.equal(f.controller.lastPointerWasDrag,true);
});
