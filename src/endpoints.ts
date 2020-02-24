import express, {Request, Response} from 'express';
import * as IMFunctions from './im-functions';
import * as LMFunctions from './lm-functions';

const router = express.Router();
router.use(express.json());

router.get('/:role/inStock', async (req:Request, res:Response) => {
    const role = req.params.role;
    if(role == "INVENTORY_MANAGER"){
        const compStocks_json:{[k:string]: any} = await IMFunctions.getIncomingComponentStocks();
        res.send(compStocks_json);
    }
});

router.get('/:role/:resource/inStock', async (req:Request, res:Response) => {
    const role = req.params.role;
    
    if(role == "INVENTORY_MANAGER"){
        const component = req.params.resource;
        const compStocks_json:{[k:string]: any} = await IMFunctions.getIncomingComponentStocks();
        for(let i=0; i<compStocks_json.length; i++){
            if(compStocks_json[i]["name"] == component){
                res.send(compStocks_json[i]);
            }
        }
    }
});

router.get('/:role/:resource/safetyStock', async (req:Request, res:Response) => {
    const params = req.body;
    const role = req.params.role;

    if(role == "INVENTORY_MANAGER"){
        const resource = req.params.resource;
        const safetyStock = Math.floor(params.leadTime * params.demandAvg);
        const compStocks_json:{[k:string]: any} = await IMFunctions.getIncomingComponents();
        for(let i=0; i<compStocks_json.length; i++){
            if(compStocks_json[i]["name"] == resource){
                const data = {
                    "id": compStocks_json[i]["id"],
                    "name": compStocks_json[i]["name"],
                    "safetyStock": safetyStock
                };
    
                res.send(data);
            }
        }
    } 
});

router.get('/:role/:resource/daysOfStock', async (req:Request, res:Response) => {
    const details = req.body;
    const dailyDemand = details.demand;
    const role = req.params.role;
    
    if(role == "INVENTORY_MANAGER"){
        const resource = req.params.resource;
        const compStocks_json:{[k:string]: any} = await IMFunctions.getIncomingComponentStocks(); 
        for(let i=0; i<compStocks_json.length; i++){
            if(compStocks_json[i]["name"] == resource){
                const inStock = compStocks_json[i]["inStock"];
                const daysOfStock = Math.floor(inStock/dailyDemand);
                const data = {
                    "id":compStocks_json[i]["id"],
                    "name":compStocks_json[i]["name"],
                    "inStock":compStocks_json[i]["inStock"], 
                    "daysOfStock": daysOfStock
                };
                res.send(data);
            }
        }
    }
});

router.get('/:role/:model/components', async (req:Request, res:Response) => {
    const role = req.params.role;
    const model = req.params.model;

    if(role == "ASSEMBLY_MANAGER"){
        const modelComp = await IMFunctions.getModelComponents(model);
        res.send(modelComp);
    }
})

router.get('/:role/:model/makes', async (req:Request, res:Response) => {
    const role = req.params.role;
    const model = req.params.model;

    if(role == "ASSEMBLY_MANAGER"){
        const modelMakes = await IMFunctions.getModelMakes(model);
        res.send(modelMakes);
    }
});

router.get('/:role/:model/counts', async (req:Request, res:Response) => {
    const model = req.params.model;
    const role = req.params.role;
    const available = req.body["available"];

    if(role == 'ASSEMBLY_MANAGER'){
        res.send(await IMFunctions.getModelCounts(model, available));
    }
});


let vehicleObjectStore:{[k:string]: any} = new Object();

router.get('/lm/getData', async (req:Request, res:Response) => {
    res.send(await LMFunctions.getRentalSubscriptions());
});

router.get('/lm/getObjectStore', async (req:Request, res:Response) => {
    res.send(vehicleObjectStore);
})

router.get('/lm/newVehicle/:vin/:offset', async (req:Request, res:Response) => {
    const vin = req.params.vin;
    const offset = parseInt(req.params.offset);
    const keys = Object.keys(vehicleObjectStore);
    if(keys.indexOf(vin) == -1){
        const vehicleDetails = await LMFunctions.getRentalSubscriptions();
        for(let i=0; i<vehicleDetails.length; i++) {
            if(vehicleDetails[i].vin === vin) {
                let vehicleObj = await new LMFunctions.Vehicle();
                vehicleObj.rentalStatus = vehicleDetails[i].status;
                vehicleObj.offset = offset
                vehicleObjectStore[vin] = vehicleObj;
                break;
            }
        }
        res.send(await vehicleObjectStore);
    }
    else res.send("Vehicle already present");
});

router.get('/lm/addNode/:vin/:id/:after', async (req:Request, res:Response) => {
    const vin = req.params.vin;
    const id  = req.params.id;
    const after = req.params.after
    const vehicleDetails = await LMFunctions.getRentalSubscriptions();
    for(let i=0; i<vehicleDetails.length; i++) {
        if((vehicleDetails[i].vin === vin) && (vehicleDetails[i].id === id)) {
            let node = await new LMFunctions.Node(id, vehicleDetails[i].startTime, vehicleDetails[i].endTime);
            const keys = Object.keys(vehicleObjectStore);
            if(keys.indexOf(vin) == -1) res.send("No vehicle record");
            else{
                await vehicleObjectStore[vin].insertNode(node, after);
                break;
            }
        }
    }
    res.send(await vehicleObjectStore);
});

router.get('/lm/availSlots/:vin/:currTS', async (req:Request, res:Response) => {
    const vin = req.params.vin;
    const currTS = req.params.currTS;
    const keys = Object.keys(vehicleObjectStore);
    if(keys.indexOf(vin) > -1){
        const slots = vehicleObjectStore[vin].getAvailSlots(currTS);
        res.send(slots);
    }
});

router.get('/lm/getAvail/:vin/:fromTS/:forDays', async (req:Request, res:Response) => {
    const avail = req.body.avail;
    const fromTS = req.params.fromTS;
    const forDays = parseInt(req.params.forDays);
    const vin = req.params.vin;
    const requirement = {
        from : fromTS,
        for : forDays
    };const keys = Object.keys(vehicleObjectStore);
    if(keys.indexOf(vin) > -1){
        res.send(vehicleObjectStore[vin].checkAvailability(avail, requirement));
    }
});

router.post('/lm/deleteNode/:vin/:id', async (req:Request, res:Response) => {
    const vin = req.params.vin;
    const id = req.params.id;
    vehicleObjectStore[vin].deleteNode(id);
    res.send("Node deleted");
});

router.post('/lm/updateObjStore/:vin/:currTS', async (req:Request, res:Response) => {
    const vin = req.params.vin;
    const currTS = req.params.currTS;
    vehicleObjectStore[vin].deleteAccordingToTS(currTS);
    res.send("Updated");
})

module.exports = router;