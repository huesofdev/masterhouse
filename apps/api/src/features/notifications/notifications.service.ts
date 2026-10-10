import { eq, desc, or, like, sql } from "drizzle-orm";
import { customersTable } from "../customers/customers.schema";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { smsTemplatesTable, smsLogsTable } from "./notifications.schema";
import { TextLkProvider } from "./providers/textlk.provider";
import { SettingsService } from "../settings/settings.service";

export class NotificationsService {
  
  /**
   * Replaces variables in a template string, e.g. "Hello {{name}}" -> "Hello John"
   */
  static parseTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      return variables[key.trim()] || match;
    });
  }

  /**
   * Queues an SMS to be sent asynchronously to prevent blocking the main API thread.
   */
  static async queueSms(
    triggerEvent: "SALE_CREATED" | "COLLECTION_RECEIPT" | "PAYMENT_OVERDUE" | "DIRECT_SALE_CREATED",
    customerId: string,
    phone: string,
    variables: Record<string, string>,
    referenceId?: string
  ): Promise<void> {
    
    // Process in background event loop
    let logId = uuidv7();
    try {
      // 0. Check if global SMS is enabled
      const smsEnabled = await SettingsService.getSetting("sms_enabled");
      if (smsEnabled === "false") {
        console.log(`[SMS] SMS service is globally disabled. Skipping ${triggerEvent}.`);
        return;
      }

      // 1. Fetch the active template for this event
      const templateResults = await db.select().from(smsTemplatesTable).where(eq(smsTemplatesTable.trigger_event, triggerEvent)).limit(1);
      const template = templateResults[0];

      if (!template || !template.is_active) {
        console.log(`[SMS] No active template for ${triggerEvent}. Skipping.`);
        return;
      }

      // 2. Parse the body
      const messageBody = this.parseTemplate(template.body_template, variables);

      // 3. Log the pending SMS
      await db.insert(smsLogsTable).values({
        id: logId,
        customer_id: customerId,
        trigger_event: triggerEvent,
        reference_id: referenceId,
        phone_number: phone,
        message_body: messageBody,
        status: "PENDING"
      });

      // 4. Fire the HTTP request to the telecom provider
      const response = await TextLkProvider.sendSMS(phone, messageBody);

      // 5. Mark as successful
      await db.update(smsLogsTable)
        .set({ 
          status: "SENT", 
          sent_at: new Date(), 
          provider_response: JSON.stringify(response) 
        })
        .where(eq(smsLogsTable.id, logId));

    } catch (error: any) {
      console.error(`[SMS Error for ${triggerEvent}]`, error.message);
      // Attempt to mark as failed if log was created
      try {
        await db.update(smsLogsTable)
          .set({ status: "FAILED", provider_response: error.message })
          .where(eq(smsLogsTable.id, logId));
      } catch(e) {}
    }
  }

  /**
   * Fetch paginated SMS logs with customer details
   */
  static async getSmsLogs(page: number = 1, limit: number = 50, search: string = "") {
    const offset = (page - 1) * limit;
    
    let whereClause = undefined;
    
    if (search) {
      whereClause = or(
        like(smsLogsTable.phone_number, `%${search}%`),
        like(customersTable.full_name, `%${search}%`)
      );
    }
    
    const logs = await db
      .select({
        id: smsLogsTable.id,
        trigger_event: smsLogsTable.trigger_event,
        phone_number: smsLogsTable.phone_number,
        message_body: smsLogsTable.message_body,
        status: smsLogsTable.status,
        provider_response: smsLogsTable.provider_response,
        created_at: smsLogsTable.created_at,
        sent_at: smsLogsTable.sent_at,
        customer_name: customersTable.full_name,
      })
      .from(smsLogsTable)
      .leftJoin(customersTable, eq(smsLogsTable.customer_id, customersTable.id))
      .where(whereClause)
      .orderBy(desc(smsLogsTable.created_at))
      .limit(limit)
      .offset(offset);
      
    // Count total for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(smsLogsTable)
      .leftJoin(customersTable, eq(smsLogsTable.customer_id, customersTable.id))
      .where(whereClause);

    return {
      data: logs,
      total: Number(countResult?.count || 0),
      page,
      limit,
    };
  }

  /**
   * Retry sending a failed SMS message
   */
  static async retrySms(logId: string): Promise<boolean> {
    const logs = await db.select().from(smsLogsTable).where(eq(smsLogsTable.id, logId)).limit(1);
    if (logs.length === 0) throw new Error("SMS log not found");
    
    const log = logs[0];
    if (log.status === "SENT") throw new Error("SMS was already sent successfully");

    try {
      // Re-attempt sending
      const response = await TextLkProvider.sendSMS(log.phone_number, log.message_body);
      
      await db.update(smsLogsTable)
        .set({ 
          status: "SENT", 
          sent_at: new Date(), 
          provider_response: JSON.stringify(response) 
        })
        .where(eq(smsLogsTable.id, logId));
        
      return true;
    } catch (error: any) {
      console.error(`[SMS Retry Error]`, error.message);
      await db.update(smsLogsTable)
        .set({ 
          status: "FAILED", 
          provider_response: `Retry failed: ${error.message}` 
        })
        .where(eq(smsLogsTable.id, logId));
        
      return false;
    }
  }

  /**
   * Send a direct custom SMS to a customer with audit logging
   */
  static async sendCustomSms(
    customerId: string,
    phone: string,
    message: string,
    sentBy?: string
  ): Promise<{ success: boolean; message: string; logId: string }> {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      throw new Error("Message content cannot be empty");
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      throw new Error("Customer phone number is missing or invalid");
    }

    // 0. Check global SMS setting
    const smsEnabled = await SettingsService.getSetting("sms_enabled");
    if (smsEnabled === "false") {
      throw new Error("SMS service is currently disabled in system settings");
    }

    const logId = uuidv7();

    // 1. Insert pending SMS log
    await db.insert(smsLogsTable).values({
      id: logId,
      customer_id: customerId,
      trigger_event: "CUSTOM",
      phone_number: trimmedPhone,
      message_body: trimmedMessage,
      status: "PENDING"
    });

    try {
      // 2. Send via Text.lk Provider
      const response = await TextLkProvider.sendSMS(trimmedPhone, trimmedMessage);

      // 3. Mark as sent
      await db.update(smsLogsTable)
        .set({
          status: "SENT",
          sent_at: new Date(),
          provider_response: JSON.stringify(response)
        })
        .where(eq(smsLogsTable.id, logId));

      return {
        success: true,
        message: "SMS sent successfully",
        logId
      };
    } catch (error: any) {
      console.error(`[Custom SMS Error to ${trimmedPhone}]`, error.message);
      await db.update(smsLogsTable)
        .set({
          status: "FAILED",
          provider_response: error.message || "Failed to send SMS"
        })
        .where(eq(smsLogsTable.id, logId));

      throw new Error(error.message || "Failed to send SMS via telecom provider");
    }
  }
}
