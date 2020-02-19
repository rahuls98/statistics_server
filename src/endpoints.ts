import express, {Request, Response} from 'express';
import * as IMFunctions from './im-functions';

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

module.exports = router;