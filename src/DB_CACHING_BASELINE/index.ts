import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

class myDb<T extends BaseRecord> {

    dbFileLocation = join('.', 'test_db.json');
    data: T[] = [];
    pendingDBWrite = false;
    dbWriteDelay = 500;

    constructor() {

    }

    async loadDB() {

        let file;

        try {
            file = await readFile(this.dbFileLocation);
            this.data = JSON.parse(file.toString());
        } catch (e) {
            console.error(e);
            file = undefined;
        }

        if (!file) {
            await writeFile(this.dbFileLocation, JSON.stringify(this.data));
        }
    }

    async insert(record: T) {

        record.id = randomUUID(); //always generate new UUID, this way can insert existing records..

        this.data.push(record);

        if(!this.pendingDBWrite){
            this.pendingDBWrite = true
            setTimeout(async () => {
                const dataToWrite = [...this.data];
                console.log('About to write DB File!');
                await writeFile(this.dbFileLocation,  JSON.stringify(dataToWrite));
                console.log('DB File written!');
                this.pendingDBWrite = false;
            }, this.dbWriteDelay);
        }
        

    }

    async update(record: T) {

    }


    async query(filterPredicate: Function): Promise<T[]> {

        let records: T[];
        records = this.data.filter(function (a, b) { return filterPredicate(a, b) });
        return records;
    }
}

(async function () {
    var test = new myDb<sampleRec>();

    await test.loadDB();
    console.log('db loaded?');

    for(let i = 0; i < 15; i++){
        if(i % 5 == 0){
            setTimeout(() => {
                console.log('executing timeout func ' + i);
                test.insert({name: i+""});
            }, 1000 + (i * 100));
        } else {
            test.insert({name: i+''});
        }
        
    }
    console.log('All inserts called');
    

})();

declare interface BaseRecord {
    id?: string;
}

declare interface sampleRec extends BaseRecord {
    
    name?: string;
    state?: "open" | "closed";
}