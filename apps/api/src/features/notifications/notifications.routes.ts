import { Router } from "express";
import { getTemplates, updateTemplate, getSmsLogs, retrySms, sendCustomSms } from "./notifications.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);

router.get("/templates", requirePermission("settings:read"), getTemplates);
router.put("/templates/:id", requirePermission("settings:update"), updateTemplate);

router.get("/sms-logs", requirePermission("settings:read"), getSmsLogs);
router.post("/sms-logs/:id/retry", requirePermission("settings:update"), retrySms);

router.post("/send-custom-sms", requirePermission("customers:read"), sendCustomSms);

export default router;
