import { AnonimizeStateState } from "../../types/AnonimizeState"
import { Entity } from "../../types/Entity"
import { EntityTypeI, getEntityType } from "../../types/EntityTypes"

type AnonimizeTokenProps = {
    string: string
    offset: number
    ents: Entity[]
    anonimizeState: AnonimizeStateState
}

export default function AnonimizeToken(props: AnonimizeTokenProps){
    // Token Anonimized
    let isPartAnonimize = null; 
    let isPartAnonimizeOffset = null;
    for( let ent of props.ents ){
        for(let offset of ent.offsets){
            if(offset.start <= props.offset && props.offset + props.string.length-1 <= offset.end){
                isPartAnonimizeOffset = offset;
                isPartAnonimize = ent;
                break;
            }
            if( offset.start > props.offset ) break;
        }
        if( isPartAnonimize ){
            break
        }
    }

    let dataAttrs: {[_:string]: string} = {
        'data-offset': props.offset.toString()
    };

    
    if( isPartAnonimize && isPartAnonimizeOffset ){
        let type: EntityTypeI = getEntityType(isPartAnonimize.type);
        dataAttrs['data-anonimize-cod'] = isPartAnonimize.anonimizingFunction()(isPartAnonimize.offsets[0].preview, isPartAnonimize.type, isPartAnonimize.index, isPartAnonimize.typeIndex, isPartAnonimize.funcIndex);
        dataAttrs['data-anonimize-type'] = type.name;
        dataAttrs['data-anonimize-color'] = type.color;
        dataAttrs['data-anonimize-offset-start'] = isPartAnonimizeOffset.start.toString()
        dataAttrs['data-anonimize-offset-end'] = isPartAnonimizeOffset.end.toString()
        if( isPartAnonimizeOffset.start === props.offset ){
            dataAttrs['data-anonimize-first'] = "true";
        }
        if(  props.offset === isPartAnonimizeOffset.end-props.string.length+1 ){
            dataAttrs['data-anonimize-last'] = "true";
        }
    }

    switch(props.anonimizeState){
        case AnonimizeStateState.ANONIMIZED:
            if( isPartAnonimize && 'data-anonimize-first' in dataAttrs ){
                return <>{dataAttrs['data-anonimize-cod']}</>;
            }
            else if( isPartAnonimize ){
                return <></>
            }
            else{
                return <>{props.string}</>
            }
        case AnonimizeStateState.ORIGINAL:
            return <>{props.string}</>;
        case AnonimizeStateState.TAGGED:
            return <span {...dataAttrs}>{props.string}</span>;
        default:
            return <></>;
    }
}