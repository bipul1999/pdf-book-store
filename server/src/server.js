import app from "./app.js";
import { connectDB } from "./config/db.js";
import { ensureAdmin } from "./utils/ensureAdmin.js";

const port = process.env.PORT || 5000;

connectDB()
  .then(ensureAdmin)
  .then(() => {
    app.listen(port, () => console.log(`API running on port ${port}`));
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
