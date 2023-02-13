import { AnonimizeFunctionName, isAnonimizeFunctionName } from "../util/anonimizeFunctions";

// If changes on interface change this string
const EntityTypesVersion = "EntityTypesStored.v0.0";

export interface EntityTypeI {
    name: string,
    color: string,
    subtype?: string,
    functionName: AnonimizeFunctionName
}

export type TypeNames = "PER" | "ORG" | "DAT" | "LOC" | "PRO" | "MAT" | "CEP" | "TEL" | "EMA";

const EntityTypesDefaults: {[key in TypeNames ] : EntityTypeI} = {
    PER: {name: "PER", color: "#84d2ff", functionName: "Tipo incremental"},
    DAT: {name: "DAT", color: "#66fc03", functionName: "Ofuscação parcial"},
    ORG: {name: "ORG", color: "#00ffa2", functionName: "Tipo incremental"},
    LOC: {name: "LOC", color: "#fc03c2", functionName: "Ofuscação parcial"},
    PRO: {name: "PRO", color: "#eb8634", functionName: "Ofuscação parcial"},
    MAT: {name: "MAT", color: "#007eff", functionName: "Tipo incremental"},
    CEP: {name: "CEP", color: "#eb3434", functionName: "Ofuscação parcial"},
    TEL: {name: "TEL", color: "#ce42f5", functionName: "Ofuscação parcial"},
    EMA: {name: "EMA", color: "#f5d142", functionName: "Ofuscação parcial"}
}

export function getEntityType(label: TypeNames): EntityTypeI{
    return EntityTypesDefaults[label];
}

export function getEntityTypes(): EntityTypeI[]{
    let EntityTypesStored = JSON.parse( localStorage.getItem(EntityTypesVersion) || "null" );
    if( !EntityTypesStored ){
        localStorage.setItem(EntityTypesVersion, JSON.stringify(EntityTypesDefaults))
        return Object.values(EntityTypesDefaults);
    } 

    for( let key in EntityTypesDefaults ){
        let currentDefault = EntityTypesDefaults[key as TypeNames];
        // Check local overrides
        if( key in EntityTypesStored ){
            currentDefault.color = isColor( EntityTypesStored[key].color, currentDefault.color );
            currentDefault.functionName = isAnonimizeFunctionName( EntityTypesStored[key], currentDefault.functionName)
        }
    }

    return Object.values(EntityTypesDefaults);
}

export function updateEntityType(key: TypeNames, color: string, functionName: AnonimizeFunctionName): EntityTypeI[]{
    
    EntityTypesDefaults[key].color = color
    EntityTypesDefaults[key].functionName = functionName

    localStorage.setItem(EntityTypesVersion, JSON.stringify(EntityTypesDefaults));
    return Object.values(EntityTypesDefaults);
}

export function restoreEntityTypes(){
    // TODO: update without refresh
    localStorage.removeItem(EntityTypesVersion);
}

// https://stackoverflow.com/a/56266358 (adapted)
function isColor(color: string, defaultColor: string){
    const s = new Option().style;
    s.color = color;
    return s.color !== '' ? color : defaultColor;
}