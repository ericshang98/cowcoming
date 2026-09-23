import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {translateText,readLanguage,saveLanguage} from '../src/i18n/core.mjs';
import {localizeTree} from '../src/i18n/tree.mjs';

test('translated static sibling clones get stable keys and explicit keys remain intact',()=>{
 const children=[React.createElement('span',null,'HOME'),React.createElement('span',{key:'named'},'HOME')];
 const first=localizeTree(children,'zh'),second=localizeTree(children,'zh');
 assert.equal(first[0].key,'localized-0');assert.equal(second[0].key,first[0].key);
 assert.equal(first[1].key,'named');assert.equal(first[0].props.children,'首页');
});

test('language preferences survive refresh and unavailable storage is harmless',()=>{
 let value;const storage={getItem:()=>value,setItem:(_,v)=>{value=v}};
 assert.equal(readLanguage(storage),'zh');assert.equal(saveLanguage(storage,'en'),true);assert.equal(readLanguage(storage),'en');
 value='bad';assert.equal(readLanguage(storage),'zh');assert.equal(readLanguage(null),'zh');assert.equal(saveLanguage(null,'en'),false);
});
test('static and dynamic collection copy translates without changing numbers',()=>{
 assert.equal(translateText('集齐星光，听它叫妈妈','en'),'Collect every star to hear Mama');
 assert.equal(translateText('  还差 1 颗星光 ','en'),'  1 star to go ');
 assert.equal(translateText('星光 12，设为目标','en'),'Star 12, set as destination');
 assert.equal(translateText('WORLD 星光 26/27 · 集齐解锁','en'),'WORLD 26/27 stars · Collect all to unlock');
 assert.equal(translateText('HOME','zh'),'首页');
 assert.equal(translateText('An unrelated proper name','en'),'An unrelated proper name');
});
test('localization preserves handlers, refs, route IDs, input values and untranslatable content',()=>{
 const onClick=()=>{},ref=React.createRef();
 const original=React.createElement('button',{key:'blog',ref,onClick,'data-route':'blog','aria-label':'打开星光地图'},'已点亮');
 const next=localizeTree(original,'en');
 assert.equal(next.key,'blog');assert.equal(next.props.ref,ref);assert.equal(next.props.onClick,onClick);assert.equal(next.props['data-route'],'blog');
 assert.equal(next.props['aria-label'],'Open starlight map');assert.equal(next.props.children,'COLLECTED');
 const input=React.createElement('input',{value:'已点亮'});assert.strictEqual(localizeTree(input,'en'),input);
 const userText=React.createElement('span',{translate:'no'},'已点亮');assert.strictEqual(localizeTree(userText,'en'),userText);
});
