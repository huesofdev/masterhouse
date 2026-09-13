import { customType } from "drizzle-orm/mysql-core";
import { parse, stringify } from "uuid";

/**
 * Custom Drizzle type for UUIDv7 stored as BINARY(16) in MySQL.
 * 
 * - Maps to `binary(16)` in the database schema.
 * - Reads as a standard UUID string from the driver.
 * - Writes as a binary Buffer to the driver.
 */
export const uuidv7Type = customType<{ data: string; driverData: Buffer }>({
  dataType() {
    return "binary(16)";
  },
  fromDriver(value: Buffer | string): string {
    if (Buffer.isBuffer(value)) {
      return stringify(value);
    }
    if (typeof value === "string" && value.startsWith("base64:type254:")) {
      const b64 = value.replace("base64:type254:", "");
      return stringify(Buffer.from(b64, "base64"));
    }
    // Fallback if driver returns string for some reason
    return value;
  },
  toDriver(value: string): Buffer {
    try {
      return Buffer.from(parse(value) as Uint8Array);
    } catch (err) {
      console.error("Invalid UUID passed to toDriver:", value);
      throw err;
    }
  },
});
