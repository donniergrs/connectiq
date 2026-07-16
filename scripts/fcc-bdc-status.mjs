import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
const dbPath=path.resolve(process.argv[2]||"functions/data/fcc-bdc.sqlite");
if(!fs.existsSync(dbPath)){console.error(`Database not found: ${dbPath}`);process.exit(1);}
const db=new DatabaseSync(dbPath,{readOnly:true});
console.log({dbPath,dataset:db.prepare("SELECT * FROM datasets ORDER BY imported_at DESC LIMIT 1").get(),locations:Number(db.prepare("SELECT COUNT(*) count FROM locations").get().count),availability:Number(db.prepare("SELECT COUNT(*) count FROM availability").get().count)}); db.close();
