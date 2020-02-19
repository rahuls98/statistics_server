import { prisma } from './Prisma/Prisma-client';
import nodeFetch from 'node-fetch';

//temporary function to fetch JSON data
let fetchJson = async (link:string) => {
    const response = await nodeFetch(link);
    const compReq = await response.json();
    return compReq;
};

/**
 * Function that returns all possible combinations of elements of multiple arrays
 * @param arraysToCombine Array or arrays to combine
 */
let combinationGenerator = async (arraysToCombine:any) => {
    var divisors:any = [];
    for (var i = arraysToCombine.length - 1; i >= 0; i--) {
       divisors[i] = divisors[i + 1] ? divisors[i + 1] * arraysToCombine[i + 1].length : 1;
    }

    function getPermutation(n:any, arraysToCombine:any) {
       var result = [], 
           curArray;    
       for (var i = 0; i < arraysToCombine.length; i++) {
          curArray = arraysToCombine[i];
          result.push(curArray[Math.floor(n / divisors[i]) % curArray.length]);
       }    
       return result;
    }

    var numPerms = arraysToCombine[0].length;
    for(var i = 1; i < arraysToCombine.length; i++) {
        numPerms *= arraysToCombine[i].length;
    }

    var combinations = [];
    for(var i = 0; i < numPerms; i++) {
        combinations.push(getPermutation(i, arraysToCombine));
    }
    return combinations;
};

/**
 * Used to get a template object with all components and their counts initialized to 0
 * @param compNames All the components whose counts need to be initialized
 */
let getTemplate = async (compNames:string[]) => {
    const compTemp:{[k:string]:number} = {};
    for(let i=0; i<compNames.length; i++){
        compTemp[compNames[i]] = 0;
    }
    return compTemp;
};

/**
 * Function for Inventory Manager to get details for all Incoming Components
 * Returns the id and name for each component
 */
export let getIncomingComponents = async () => {
    const compDetails:object[] = [];
    const components = await prisma.products();
    for(let i=0; i<components.length; i++){
        const componentId = components[i].id;
        const productName = await prisma.product({id: componentId}).name();
        const data = {
            "id":componentId,
            "name":productName,
        };
        compDetails.push(data);
    }
    
    return compDetails;
};

/**
 * Function for Inventory Manager to get stock levels for all Incoming Components
 * Returns id, name and inStock details for each component
 */
export let getIncomingComponentStocks = async () => {
    const compStocks:{[k:string]: any} = [];
    const components = await prisma.products();
    for(let i=0; i<components.length; i++){
        const compId = components[i].id;
        const compName = await prisma.product({id: compId}).name();
        const inStock = await prisma.product({id: compId}).inventory();
        const data = {
            "id":compId,
            "name":compName,
            "inStock":inStock.length
        };
        compStocks.push(data);
    }
    
    return compStocks;
};

/**
 * Returns the components that can be used to assemble a model
 * @param model Name of Model
 */
export let getModelComponents = async (model:string) => {
    const modelsData = await fetchJson('https://gist.githubusercontent.com/rahuls98/8818653cb637f79f9b6a7a62529bb2b2/raw/0d2200780ff337afb5ef8eb53a740aa58ab2c3fe/models.json');
    const models = modelsData["data"]["models"];
    //const models = await prisma.models();

    for(let i=0; i<models.length; i++){
        if(models[i]["name"] == model){

            const compNames:string[] = new Array();
            const comps = models[i]["components"];
            //const comps = await prisma.model({name: model}).components();
            const compList:{[k:string]: string[]} = {};

            for(let i=0; i<comps.length; i++){
                if(compList[comps[i]["type"]] === undefined){
                    compList[comps[i]["type"]] = new Array();
                }
                compList[comps[i]["type"]].push(comps[i]["name"]);
                if(compNames.indexOf(comps[i]["name"]) == -1)
                    compNames.push(comps[i]["name"]);
            }

            const data = {
                "List":compNames,
                "Components":compList
            }
            return data;
        }
    }
};

/**
 * Returns different makes of a model based on different combination of component choices
 * @param model Name of Model
 */
export let getModelMakes = async (model:string) => {
    const modelsData = await fetchJson('https://gist.githubusercontent.com/rahuls98/8818653cb637f79f9b6a7a62529bb2b2/raw/0d2200780ff337afb5ef8eb53a740aa58ab2c3fe/models.json');
    const models = modelsData["data"]["models"];
    //const models = await prisma.models();

    for(let i=0; i<models.length; i++){
        if(models[i]["name"] == model){
            const comps = models[i]["components"];
            //const comps = await prisma.model({name: model}).components();
            const compList:{[k:string]: string[]} = {};

            for(let i=0; i<comps.length; i++){
                if(compList[comps[i]["type"]]===undefined){
                    compList[comps[i]["type"]] = new Array();
                }
                compList[comps[i]["type"]].push(comps[i]["name"]);
            }

            const toPass = new Array();
            const compListKeys = Object.keys(compList);
            for(let i=0; i<compListKeys.length; i++){
                toPass.push(compList[compListKeys[i]]);
            }

            const data = {
                //"Components":compList,
                "Combinations":await combinationGenerator(toPass)
            }

            return data;
        }
    }
};

/**
 * Returns the number of models of a particular make that can assembled using the current inventory
 * @param model Name of Model
 * @param available Inventory for all required components
 */
export let getModelCounts = async (model:string, available:number[]) => {
    const modelComp:{[k:string]:any} = (await getModelComponents(model) || {});
    const compNames = await modelComp["List"];
    const modelMakes:{[k:string]:any} = (await getModelMakes(model) || {});

    const counts:{[k:string]: {[k:string]:number}} = {};
    for(let i=0; i<modelMakes["Combinations"].length; i++){
        const comb = modelMakes["Combinations"][i];
        const index = i.toString();
        counts[index] = await getTemplate(compNames);
        for(let j=0; j<comb.length; j++){
            counts[index][comb[j]] += 1;
        }
    }

    const avail:number[] = available;
    
    const data = new Array();
    for(let i=0; i<Object.keys(counts).length; i++){
        let configuration = Object.values(counts[i.toString()]);
        let c = 0;
        let temp:number[] = new Array();
        temp = avail.slice();
        while(temp.indexOf(0) == -1){
            for(let j=0; j<temp.length; j++){
                temp[j] = temp[j] - configuration[j];
            }
            c += 1;
        }

        const configBasedCounts = {
            "Configuration":counts[i.toString()],
            "VehicleCount":c,
            "PostInventory":temp
        }

        data.push(configBasedCounts);
    }

    return data;
};
