import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ensureAdmin } from "./utils/ensureAdmin.js";
import { seedCatalogIfEmpty } from "./utils/seedCatalog.js";
import { syncCatalogContent } from "./utils/syncCatalogContent.js";

const port = process.env.PORT || 5000;
const databaseRetryMs = Number(process.env.DB_RETRY_MS || 30000);

app.listen(port, () => console.log(`API running on port ${port}`));

async function startDatabase() {
  try {
    await connectDB();
    await seedCatalogIfEmpty();
    await syncCatalogContent();
    await ensureAdmin();
  } catch (error) {
    console.error("Database startup failed", error.message);
    setTimeout(startDatabase, databaseRetryMs);
  }
}

startDatabase();
