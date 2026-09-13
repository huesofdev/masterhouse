import { SettingsService } from "../../settings/settings.service";

export interface TextLkResponse {
  status: string;
  message?: string;
  data?: any;
}

export class TextLkProvider {
  private static readonly API_URL = "https://app.text.lk/api/v3/sms/send";
  
  static async sendSMS(phone: string, message: string): Promise<TextLkResponse> {
    const apiToken = await SettingsService.getSetting("textlk_api_key") || process.env.TEXTLK_API_TOKEN;
    const senderId = await SettingsService.getSetting("textlk_sender_id") || process.env.TEXTLK_SENDER_ID || "MasterHouse";

    if (!apiToken) {
      console.warn("TEXTLK API token is not set in settings or env. Simulating SMS send.");
      console.log(`[SIMULATED SMS to ${phone}]: ${message}`);
      return { status: "success", message: "Simulated sending" };
    }

    try {
      // Normalize phone number (Sri Lankan format usually wants 947...)
      let normalizedPhone = phone.trim();
      if (normalizedPhone.startsWith("0")) {
        normalizedPhone = "94" + normalizedPhone.substring(1);
      } else if (normalizedPhone.startsWith("+94")) {
        normalizedPhone = normalizedPhone.substring(1);
      }

      const payload = {
        recipient: normalizedPhone,
        sender_id: senderId,
        message: message
      };

      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to send SMS via Text.lk");
      }

      return data;
    } catch (error: any) {
      console.error("[Text.lk Error]", error);
      throw error;
    }
  }
}
