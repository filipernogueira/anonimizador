import React, { useId, useMemo } from "react"
import { AnonimizeImage } from "../../types/AnonimizeImage"
import { AnonimizeStateState } from "../../types/AnonimizeState"
import { Entity } from "../../types/Entity"
import { EntityTypeI } from "../../types/EntityTypes"
import AnonimizeToken from "./Token"


interface AnonimizeBlockProps{
    element: ChildNode
    offset: number
    ents: Entity[]
    types: EntityTypeI[]
    anonimizeState: AnonimizeStateState
}


export default function AnonimizeBlock(props: AnonimizeBlockProps){
    let elmt = props.element;

    if( elmt.nodeType === Node.TEXT_NODE ){
        let elmtStr = elmt.nodeValue || ""; // should never be null tho...
        let tokensElems = [];
        var reg = /([0-9]+)|([A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9])/g;
        var token: RegExpExecArray | null;
        while((token = reg.exec(elmtStr)) !== null) {
            let ent = props.ents.find( e => e.offsets.some( o => o.start <= props.offset+token!.index && o.end+1 >= props.offset+token!.index+token![0].length))
            tokensElems.push(<AnonimizeToken entityTypes={props.types} key={token.index} string={token[0]} offset={props.offset+token.index} ent={ent} anonimizeState={props.anonimizeState} />);
        }
        return <>{tokensElems}</>
    }

    let Tag = elmt.nodeName.toLowerCase();
    let elmtElmt: HTMLElement = elmt as HTMLElement;

    let r = [];
    let suboffset = 0;
    for(let i = 0; i < elmt.childNodes.length; i++){
        let size = (elmt.childNodes[i].textContent || "").length;
        let cents = props.ents.filter( e => e.offsets.some( o => o.start >= props.offset+suboffset && o.end <= props.offset+suboffset+size))
        r.push(<AnonimizeBlock key={i} element={elmt.childNodes[i]} offset={props.offset + suboffset} ents={cents} types={props.types} anonimizeState={props.anonimizeState}/>)
        suboffset += (elmt.childNodes[i].textContent || "").length
    }
    
    let attrs: any  = {};
    for(let attr of elmtElmt.getAttributeNames()){
        attrs[attr] = elmtElmt.getAttribute(attr);
    }
    if( 'style' in attrs ){
        let s = attrs['style'];
        delete attrs['style'];
        attrs['STYLE'] = s; // style should be a JS objecy, STYLE gives warning but its not intercepted
    }
    
    if( 'class' in attrs ){
        let c = attrs['class'];
        delete attrs['class'];
        attrs['className'] = c;
    }

    if( Tag === 'a' && attrs['href'] && !attrs['href'].startsWith('#')){
        attrs['target'] = '_blank'; // prevent user to exit page
    }

    if( r.length === 0 ){
        return React.createElement(Tag, attrs);
    }
    else{
        return React.createElement(Tag, attrs, r);
    }
}