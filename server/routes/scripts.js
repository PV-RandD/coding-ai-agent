const express = require("express");
const { ScriptsController } = require("../controllers/scriptsController");

function scriptsRouter({ qvacClient }) {
  const router = express.Router();
  const controller = new ScriptsController({ qvacClient });

  // Generation
  router.post("/", controller.createScript);

  // Logs
  router.get("/:id/log", controller.getLog);

  // CRUD
  router.get("/", controller.listScripts);
  router.get("/:id", controller.getScript);
  router.put("/:id", controller.updateScript);

  // Run / Stop
  router.post("/:id/run", controller.runScript);
  router.post("/:id/stop", controller.stopScript);

  return router;
}

module.exports = { scriptsRouter };
