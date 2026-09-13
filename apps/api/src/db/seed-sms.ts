import { db } from "./index";
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";
import { systemSettingsTable } from "../features/settings/settings.schema";
import { smsTemplatesTable } from "../features/notifications/notifications.schema";

async function seedNewSmsTemplates() {
  console.log("Seeding new SMS templates and settings...");
  
  try {
    // System Configs
    const defaultSettings = [
      { setting_key: "sms_reminder_days", setting_value: "2" }
    ];

    for (const setting of defaultSettings) {
      const existingSetting = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.setting_key, setting.setting_key)).limit(1);
      if (existingSetting.length === 0) {
        await db.insert(systemSettingsTable).values({
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
        });
        console.log(`Inserted setting ${setting.setting_key}`);
      }
    }

    // SMS Templates
    const defaultTemplates = [
      { trigger_event: "PAYMENT_REMINDER" as const, body_template: "Dear {{name}}, this is a friendly reminder from {{company_name}} that your installment of Rs.{{amount_due}} is due on {{due_date}}. Please ensure payment to avoid late fees. Call {{branch_phone}}." }
    ];

    for (const tpl of defaultTemplates) {
      const existingTpl = await db.select().from(smsTemplatesTable).where(eq(smsTemplatesTable.trigger_event, tpl.trigger_event)).limit(1);
      if (existingTpl.length === 0) {
        await db.insert(smsTemplatesTable).values({
          id: uuidv7(),
          trigger_event: tpl.trigger_event,
          body_template: tpl.body_template,
          is_active: true,
        });
        console.log(`Inserted template ${tpl.trigger_event}`);
      }
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedNewSmsTemplates();
