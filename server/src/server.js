import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ensureAdmin } from "./utils/ensureAdmin.js";
import { seedCatalogIfEmpty } from "./utils/seedCatalog.js";

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`API running on port ${port}`));

connectDB()
  .then(seedCatalogIfEmpty)
  .then(ensureAdmin)
  .catch((error) => {
    console.error("Database startup failed", error);
  });
