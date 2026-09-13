import { eq, like, or, sql, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import * as ExcelJS from "exceljs";
import { db } from "../../db";
import { categoriesTable, brandsTable } from "./catalog.schema";
import { productsTable } from "../products/products.schema";
import { 
  CreateCategoryPayload, UpdateCategoryPayload, 
  CreateBrandPayload, UpdateBrandPayload,
  CreateProductPayload, UpdateProductPayload 
} from "./catalog.types";
import { S3Util } from "../../utils/s3.util";
import { saleItemsTable } from "../sale/sales.schema";
import { inventoryBalancesTable, serialItemsTable } from "../inventory/inventory.schema";

export class CatalogService {
  // --- CATEGORIES ---
  static async createCategory(payload: CreateCategoryPayload) {
    const id = uuidv7();
    await db.insert(categoriesTable).values({
      id,
      name: payload.name,
      description: payload.description || null,
      is_active: payload.is_active,
    });
    return this.getCategory(id);
  }

  static async getCategory(id: string) {
    const result = await db.query.categoriesTable.findFirst({
      where: eq(categoriesTable.id, id),
    });
    return result || null;
  }

  static async listCategories() {
    return db.query.categoriesTable.findMany({
      orderBy: (categories, { desc }) => [desc(categories.created_at)],
    });
  }

  static async updateCategory(id: string, payload: UpdateCategoryPayload) {
    if (Object.keys(payload).length > 0) {
      await db.update(categoriesTable).set(payload).where(eq(categoriesTable.id, id));
    }
    return this.getCategory(id);
  }

  static async deleteCategory(id: string) {
    // Check if any products exist for this category
    const linkedProducts = await db.query.productsTable.findFirst({
      where: eq(productsTable.category_id, id),
    });

    if (linkedProducts) {
      throw new Error("Cannot delete category: Existing products are linked to this category.");
    }

    const result = await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    return result[0].affectedRows > 0;
  }

  // --- BRANDS ---
  static async createBrand(payload: CreateBrandPayload) {
    const id = uuidv7();
    await db.insert(brandsTable).values({
      id,
      name: payload.name,
      description: payload.description || null,
      is_active: payload.is_active,
    });
    return this.getBrand(id);
  }

  static async getBrand(id: string) {
    const result = await db.query.brandsTable.findFirst({
      where: eq(brandsTable.id, id),
    });
    return result || null;
  }

  static async listBrands() {
    return db.query.brandsTable.findMany({
      orderBy: (brands, { desc }) => [desc(brands.created_at)],
    });
  }

  static async updateBrand(id: string, payload: UpdateBrandPayload) {
    if (Object.keys(payload).length > 0) {
      await db.update(brandsTable).set(payload).where(eq(brandsTable.id, id));
    }
    return this.getBrand(id);
  }

  static async deleteBrand(id: string) {
    // Nullify brand_id on all linked products instead of preventing deletion
    await db.update(productsTable)
      .set({ brand_id: null })
      .where(eq(productsTable.brand_id, id));

    const result = await db.delete(brandsTable).where(eq(brandsTable.id, id));
    return result[0].affectedRows > 0;
  }

  // --- PRODUCTS ---
  static async createProduct(payload: CreateProductPayload) {
    const id = uuidv7();
    await db.insert(productsTable).values({
      id,
      category_id: payload.category_id,
      brand_id: payload.brand_id || null,
      name: payload.name,
      sku: payload.sku,
      description: payload.description || null,
      base_price: payload.base_price.toString(),
      uom: payload.uom,
      is_serialized: payload.is_serialized,
      min_downpayment_amount: payload.min_downpayment_amount.toString(),
      warranty_type: payload.warranty_type,
      warranty_period_years: payload.warranty_period_years,
      warranty_period_months: payload.warranty_period_months,
      avg_cost: payload.avg_cost.toString(),
      image_url: payload.image_url || null,
      is_active: payload.is_active,
    });
    return this.getProduct(id);
  }

  static async getProduct(id: string) {
    const result = await db.query.productsTable.findFirst({
      where: eq(productsTable.id, id),
      with: { category: true, brand: true }
    });
    
    if (!result) return null;
    
    let image_signed_url = null;
    if (result.image_url) {
       image_signed_url = await S3Util.getSignedDownloadUrl(result.image_url, 604800);
    }
    
    return { ...result, image_signed_url };
  }

  static async listProducts(page: number = 1, limit: number = 100, search: string = '', filters: { categoryId?: string, type?: string, status?: string } = {}) {
    const offset = (page - 1) * limit;
    
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(productsTable.name, `%${search}%`),
          like(productsTable.sku, `%${search}%`)
        )
      );
    }

    if (filters.categoryId) {
      conditions.push(eq(productsTable.category_id, filters.categoryId));
    }

    if (filters.type === 'SERIAL') {
      conditions.push(eq(productsTable.is_serialized, true));
    } else if (filters.type === 'BULK') {
      conditions.push(eq(productsTable.is_serialized, false));
    }

    if (filters.status === 'ACTIVE') {
      conditions.push(eq(productsTable.is_active, true));
    } else if (filters.status === 'INACTIVE') {
      conditions.push(eq(productsTable.is_active, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.query.productsTable.findMany({
      where: whereClause,
      with: { category: true, brand: true },
      orderBy: (products, { desc }) => [desc(products.created_at)],
      limit,
      offset,
    });

    const productsWithUrls = await Promise.all(data.map(async (product) => {
       let image_signed_url = null;
       if (product.image_url) {
          image_signed_url = await S3Util.getSignedDownloadUrl(product.image_url, 604800);
       }
       return { ...product, image_signed_url };
    }));

    const totalRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(productsTable)
      .where(whereClause);
      
    const total = Number(totalRes[0].count);

    return {
      data: productsWithUrls,
      meta: {
        total_records: total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  static async syncProducts() {
    const products = await db.select({
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      base_price: productsTable.base_price,
      min_downpayment_amount: productsTable.min_downpayment_amount,
      is_serialized: productsTable.is_serialized,
      warranty_type: productsTable.warranty_type,
      warranty_period_years: productsTable.warranty_period_years,
      warranty_period_months: productsTable.warranty_period_months,
      image_url: productsTable.image_url,
    }).from(productsTable).where(eq(productsTable.is_active, true));
    
    return Promise.all(products.map(async (product) => {
      let image_signed_url = null;
      if (product.image_url) {
        image_signed_url = await S3Util.getSignedDownloadUrl(product.image_url, 604800); // 7 days
      }
      return { ...product, image_url: image_signed_url };
    }));
  }

  static async updateProduct(id: string, payload: UpdateProductPayload) {
    if (Object.keys(payload).length > 0) {
      const updateData: any = { ...payload };
      if (payload.base_price !== undefined) updateData.base_price = payload.base_price.toString();
      if (payload.avg_cost !== undefined) updateData.avg_cost = payload.avg_cost.toString();
      if (payload.min_downpayment_amount !== undefined) updateData.min_downpayment_amount = payload.min_downpayment_amount.toString();
      if (payload.image_url !== undefined) updateData.image_url = payload.image_url;
      await db.update(productsTable).set(updateData).where(eq(productsTable.id, id));
    }
    return this.getProduct(id);
  }

  static async deleteProduct(id: string) {
    // Check if product exists in sale_items
    const hasSales = await db.query.saleItemsTable.findFirst({
      where: eq(saleItemsTable.product_id, id),
    });
    if (hasSales) throw new Error("Cannot delete product: Existing sales records found for this product.");

    // Check if product exists in serial_items
    const hasSerials = await db.query.serialItemsTable.findFirst({
      where: eq(serialItemsTable.product_id, id),
    });
    if (hasSerials) throw new Error("Cannot delete product: Existing serial items found in inventory for this product.");

    // Check if product exists in inventory_balances
    const hasBalances = await db.query.inventoryBalancesTable.findFirst({
      where: eq(inventoryBalancesTable.product_id, id),
    });
    if (hasBalances) throw new Error("Cannot delete product: Existing inventory balances found for this product.");

    const result = await db.delete(productsTable).where(eq(productsTable.id, id));
    return result[0].affectedRows > 0;
  }

  // --- BULK OPERATIONS ---
  static async generateBulkTemplate(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Master House System";
    const sheet = workbook.addWorksheet("Products");
    
    sheet.columns = [
      { header: "Category Name (Required)", key: "category", width: 25 },
      { header: "Brand Name", key: "brand", width: 25 },
      { header: "SKU (Required, Unique)", key: "sku", width: 20 },
      { header: "Product Name (Required)", key: "name", width: 35 },
      { header: "Description", key: "description", width: 40 },
      { header: "Base Price (Required)", key: "basePrice", width: 15 },
      { header: "UOM (pieces/kg/g/l/ml/box/pack)", key: "uom", width: 15 },
      { header: "Is Serialized (Yes/No)", key: "isSerialized", width: 15 },
      { header: "Min Downpayment Amount", key: "minDownpaymentAmount", width: 25 },
      { header: "Warranty Type (NONE/WARRANTY/GUARANTY)", key: "warrantyType", width: 25 },
      { header: "Warranty Years", key: "warrantyYears", width: 15 },
      { header: "Warranty Months", key: "warrantyMonths", width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Example row
    sheet.addRow({
      category: "Electronics",
      brand: "Samsung",
      sku: "ELEC-TV-001",
      name: "Samsung 55' 4K TV",
      description: "Smart TV with Crystal Display",
      basePrice: 120000,
      uom: "pieces",
      isSerialized: "Yes",
      minDownpaymentAmount: 5000,
      warrantyType: "WARRANTY",
      warrantyYears: 1,
      warrantyMonths: 0,
    });

    return workbook.xlsx.writeBuffer();
  }

  static async bulkUploadProducts(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) throw new Error("Excel file must contain at least one worksheet");

    const categories = await db.select().from(categoriesTable);
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    const brands = await db.select().from(brandsTable);
    const brandMap = new Map(brands.map(b => [b.name.toLowerCase(), b.id]));
    const products = await db.select().from(productsTable);
    const skuMap = new Map(products.map(p => [p.sku, p.id]));

    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors: string[] = [];

    const rowsToProcess: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      try {
        const categoryName = row.getCell(1).text?.trim();
        const brandName = row.getCell(2).text?.trim();
        const sku = row.getCell(3).text?.trim();
        const name = row.getCell(4).text?.trim();
        const description = row.getCell(5).text?.trim();
        const basePrice = parseFloat(row.getCell(6).text?.trim() || "0");
        const uomRaw = row.getCell(7).text?.trim()?.toLowerCase() || "pieces";
        const isSerializedRaw = row.getCell(8).text?.trim()?.toLowerCase();
        const minDownpaymentAmount = parseFloat(row.getCell(9).text?.trim() || "0");
        const wTypeRaw = row.getCell(10).text?.trim()?.toUpperCase() || "NONE";
        const warrantyType = ["WARRANTY", "GUARANTY", "NONE"].includes(wTypeRaw) ? (wTypeRaw as any) : "NONE";
        const warrantyYears = parseInt(row.getCell(11).text?.trim() || "0", 10);
        const warrantyMonths = parseInt(row.getCell(12).text?.trim() || "0", 10);

        if (!categoryName || !sku || !name || isNaN(basePrice)) {
          errors.push(`Row ${rowNumber}: Missing required fields (Category, SKU, Name, Base Price)`);
          return;
        }

        const validUoms = ["pieces", "kg", "g", "l", "ml", "box", "pack"];
        const uom = validUoms.includes(uomRaw) ? (uomRaw as any) : "pieces";
        const isSerialized = isSerializedRaw === "yes" || isSerializedRaw === "true" || isSerializedRaw === "1";

        rowsToProcess.push({
          rowNumber, categoryName, brandName, sku, name, description, basePrice, uom, isSerialized, minDownpaymentAmount, warrantyType, warrantyYears, warrantyMonths
        });
      } catch (err: any) {
        errors.push(`Row ${rowNumber}: ${err.message}`);
      }
    });

    for (const row of rowsToProcess) {
      try {
        let categoryId = categoryMap.get(row.categoryName.toLowerCase());
        if (!categoryId) {
          categoryId = uuidv7();
          await db.insert(categoriesTable).values({
            id: categoryId,
            name: row.categoryName,
            is_active: true,
          });
          categoryMap.set(row.categoryName.toLowerCase(), categoryId);
        }
        
        let brandId = null;
        if (row.brandName) {
          brandId = brandMap.get(row.brandName.toLowerCase());
          if (!brandId) {
            brandId = uuidv7();
            await db.insert(brandsTable).values({
              id: brandId,
              name: row.brandName,
              is_active: true,
            });
            brandMap.set(row.brandName.toLowerCase(), brandId);
          }
        }

        const productData = {
          category_id: categoryId,
          brand_id: brandId,
          name: row.name,
          description: row.description || null,
          base_price: row.basePrice.toString(),
          uom: row.uom,
          is_serialized: row.isSerialized,
          min_downpayment_amount: row.minDownpaymentAmount.toString(),
          warranty_type: row.warrantyType,
          warranty_period_years: row.warrantyYears,
          warranty_period_months: row.warrantyMonths,
          is_active: true,
        };

        const existingId = skuMap.get(row.sku);
        if (existingId) {
          await db.update(productsTable).set(productData).where(eq(productsTable.id, existingId));
          updated++;
        } else {
          const newId = uuidv7();
          await db.insert(productsTable).values({
            id: newId,
            sku: row.sku,
            ...productData,
          });
          skuMap.set(row.sku, newId);
          created++;
        }
        processed++;
      } catch (err: any) {
        errors.push(`Row ${row.rowNumber}: DB Error - ${err.message}`);
      }
    }

    return { processed, created, updated, errors };
  }
}
