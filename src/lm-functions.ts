import { prisma } from './revos-prisma-generated/prisma-client';

const num2Date = (n:number):string => {
    let date = n.toString();
    if(date.length < 12) {
        while(date.length != 12){
            date = '0' + date;
        }
    }
    date = date.substring(0,2)+':'+date.substring(2,4)+' '+date.substring(4,6)+'-'+date.substring(6,8)+'-'+date.substring(8,12);
    return date;
}

/* const date2Num = (date:string):number => {
    let dateArr = new Array();
    dateArr.push(date.substr(0, 4));
    dateArr.push(date[5] + date[6]);
    dateArr.push(date[8] + date[9]);
    dateArr.push(date[11] + date[12]);
    dateArr.push(date[14] + date[15]);
    return parseInt(dateArr.join(''));
} */

const date2Num = (date:string):number => {
    let d = new Date(date);
    let num:string = d.getFullYear().toString() +
                    (d.getMonth()+1 < 10 ? '0' : '') + (d.getMonth()+1).toString() +
                    (d.getDate() < 10 ? '0' : '') + d.getDate().toString() +
                    (d.getHours() < 10 ? '0' : '') + d.getHours().toString() +
                    (d.getMinutes() < 10 ? '0' : '') + d.getMinutes().toString();
    return parseInt(num);
}

const dateStr2Num = (date:string, adder:number):number => {
    let d = new Date(date);
    d.setDate(d.getDate() + adder);
    let num:string = d.getFullYear().toString() +
                    (d.getMonth()+1 < 10 ? '0' : '') + (d.getMonth()+1).toString() +
                    (d.getDate() < 10 ? '0' : '') + d.getDate().toString() +
                    (d.getHours() < 10 ? '0' : '') + d.getHours().toString() +
                    (d.getMinutes() < 10 ? '0' : '') + d.getMinutes().toString();
    return parseInt(num);
}

export class Node {
    id:string = '';
    startTime:number = 0;
    endTime:number = 0;
    next:any = null;

    constructor(id:string, start:number, end:number) {
        this.id = id;
        this.startTime = start;
        this.endTime = end;
    }
}

export class Vehicle {
    rentalStatus:string = '';
    offset:number = 0;
    next:any = null;

    insertNode(node:{[k:string]:any}, after:string):void {
        if(after == '-1') {
            node.next = this.next;
            this.next = node;
            return;
        }
        let temp = this.next;
        while(temp!=null) {
            if(temp.id == after) {
                node.next = temp.next;
                temp.next = node;
            }
            temp = temp.next;
        }
    }

    deleteNode(id:string):void {
        let temp = this.next;
    
        if(temp.id == id) {
            this.next = temp.next;
            return;
        }

        temp = temp.next;
        while(temp!=null){
            if(temp.next == null) 
                return;
            
            else if(temp.next.id == id) {
                temp.next = temp.next.next;
                return;
            }

            temp = temp.next;
        }
    }

    getAvailSlots(currTS:string) {
        let temp = this.next;
        let avail = new Array();
        let offset = this.offset;

        if(temp == null){
            avail.push({
                'status': 'NoBookings'
            });
            return avail;
        }
        if(date2Num(currTS) < date2Num(temp.startTime)) {
            avail.push({
                'after': 'Current', 
                'from':currTS, 
                'till':temp.startTime
            });
        }

        while(temp!=null) {
            let endTime = (temp.next==null)? 'NextNewBooking': temp.next.startTime;
            let fromTS = new Date(temp.endTime);
            fromTS.setDate(fromTS.getDate() + offset);
            let slots = {
                'after': temp.id,
                'from': fromTS,
                'till':endTime
            };
            avail.push(slots);
            temp = temp.next;
        }
        return avail;
    }

    checkAvailability(avail:object[], requirement:{[k:string]: any}) {
        let availability:object[] = new Array();
        let req = dateStr2Num(requirement['from'], requirement['for']);

        avail.forEach(temp => {
            let obj:{[k:string]: any} = temp;
            if(obj['till'] == 'NextNewBooking'){
                availability.push(obj);
            }
            else if( (requirement['from'] === undefined) && 
                     (req <= date2Num(obj['till']))
                    ){
                availability.push(obj);
            }
            else if( (date2Num(requirement['from']) >= date2Num(obj['from'])) && 
                     (req <= date2Num(obj['till']))
                    ){
                availability.push(obj);
            }
        });

        return availability;
    }

    deleteAccordingToTS(currTS:string):void {
        let temp = this.next;

        if(date2Num(currTS) < date2Num(temp.startTime)) 
            return;

        while(temp!=null){
            if(temp.next == null){
                if(date2Num(currTS) > date2Num(temp.endTime)){
                    this.next = null;
                    this.rentalStatus = 'AVAILABLE';
                }
            }
            else if((date2Num(currTS) > date2Num(temp.endTime)) && (date2Num(currTS) <= date2Num(temp.next.startTime))){
                if(date2Num(currTS) < date2Num(temp.next.startTime)) 
                    this.rentalStatus = 'AVAILABLE';
                this.next = temp.next;
                break;
            }
            temp = temp.next;
        }
    }
}

export const getRentalSubscriptions = async () => {
    const rentalSubs:{[k:string]: any} = await prisma.rentalSubscriptions();
    let subs = new Array();
    for(let i=0; i<rentalSubs.length; i++){
        const id = rentalSubs[i].id;
        const startTime = rentalSubs[i].startTime;
        const endTime = rentalSubs[i].endTime;
        const status = rentalSubs[i].status;

        const vin = await prisma.rentalSubscription({id: id}).vehicle().vin();
        const rentalDetails = await {
            'id': id,
            'vin': vin,
            'startTime': startTime,
            'endTime': endTime,
            'status': status
        }
        subs.push(rentalDetails);
    }
    return subs;
}
