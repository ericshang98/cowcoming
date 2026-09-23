import {cloneElement,isValidElement} from 'react';
import {translateText} from './core.mjs';
const textProps=['title','aria-label','aria-description','placeholder','alt','statusLabel'];
// Localize React output before reconciliation, never mutate the DOM. Keep refs,
// keys, handlers, form values, route IDs and non-text props intact.
export function localizeTree(node,language) {
  if(typeof node==='string') return translateText(node,language);
  if(Array.isArray(node)) {
    const translated=node.map((child,index)=>{
      const next=localizeTree(child,language);
      // Cloning translated static JSX children clears React's static-list
      // validation. Give those clones stable keys; preserve explicit keys.
      return next!==child && isValidElement(next) && next.key===null
        ? cloneElement(next,{key:`localized-${index}`}) : next;
    });
    return translated.every((child,index)=>child===node[index])?node:translated;
  }
  if(!isValidElement(node) || node.props.translate==='no') return node;
  const changes={};
  for(const prop of textProps) {
    const value=node.props[prop];
    if(typeof value==='string') {const next=translateText(value,language);if(next!==value)changes[prop]=next;}
  }
  if(node.props.children!==undefined) {
    const children=localizeTree(node.props.children,language);
    if(children!==node.props.children)changes.children=children;
  }
  return Object.keys(changes).length?cloneElement(node,changes):node;
}
