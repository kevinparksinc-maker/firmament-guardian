import { exportSportsCanon } from "../server/astrologyKnowledge/canon/methodCatalog";

process.stdout.write(JSON.stringify(exportSportsCanon(), null, 2) + "\n");
