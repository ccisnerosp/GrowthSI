import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try { const n = await p.organizacion.count(); console.log("OK_CONEXION orgs="+n); }
catch(e){ console.log("FALLA "+e.message.split("\n")[0]); }
await p.$disconnect();
