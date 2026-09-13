import { eq, and } from "drizzle-orm";
import { documentSequencesTable } from "../features/settings/sequences.schema";
import { branchesTable } from "../features/branches/branches.schema";
import { routesTable } from "../features/routes/routes.schema";

export async function getNextSequence(
  tx: any, 
  branchId: string, 
  documentType: string,
  options?: { routeId?: string }
): Promise<string> {
  // 1. SELECT ... FOR UPDATE locks the row so no other transaction can read it until we commit
  const sequenceRows = await tx.select()
    .from(documentSequencesTable)
    .where(and(
      eq(documentSequencesTable.branch_id, branchId),
      eq(documentSequencesTable.document_type, documentType)
    ))
    .for('update'); // CRITICAL for concurrency

  let sequenceRow = sequenceRows[0];

  // If no sequence exists for this branch/type, create a default one
  if (!sequenceRow) {
    let defaultPrefix = '';
    switch (documentType) {
      case 'INVOICE': defaultPrefix = 'INV-{YYYY}-{MM}-'; break;
      case 'QUOTATION': defaultPrefix = 'QT-{YYYY}-{MM}-'; break;
      case 'RECEIPT': defaultPrefix = 'REC-{YYYY}-{MM}-'; break;
      case 'BOOKING': defaultPrefix = 'BKG-{ROUTE}-{YYYY}-'; break;
      default: defaultPrefix = `${documentType}-`;
    }

    await tx.insert(documentSequencesTable).values({
      branch_id: branchId,
      document_type: documentType,
      prefix_format: defaultPrefix,
      sequence_length: 4,
      current_sequence: 1, // initialize at 1 since we are consuming the first one now
    });

    sequenceRow = {
      branch_id: branchId,
      document_type: documentType,
      prefix_format: defaultPrefix,
      sequence_length: 4,
      current_sequence: 1,
    };
  } else {
    // 2. Increment existing
    const nextSeq = sequenceRow.current_sequence + 1;
    await tx.update(documentSequencesTable)
      .set({ current_sequence: nextSeq })
      .where(and(
        eq(documentSequencesTable.branch_id, branchId),
        eq(documentSequencesTable.document_type, documentType)
      ));
      
    sequenceRow.current_sequence = nextSeq;
  }

  // 3. Format string replacing {YYYY}, {MM}, etc.
  const date = new Date();
  let prefix = sequenceRow.prefix_format
    .replace(/{YYYY}/g, date.getFullYear().toString())
    .replace(/{YY}/g, date.getFullYear().toString().slice(-2))
    .replace(/{MM}/g, (date.getMonth() + 1).toString().padStart(2, '0'))
    .replace(/{DD}/g, date.getDate().toString().padStart(2, '0'));
    
  if (prefix.includes('{BRANCH}')) {
    const br = await tx.select({ code: branchesTable.code }).from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
    prefix = prefix.replace(/{BRANCH}/g, br[0]?.code || 'BR');
  }

  if (prefix.includes('{ROUTE}')) {
    let routeCode = 'RT';
    if (options?.routeId) {
      const rt = await tx.select({ name: routesTable.name }).from(routesTable).where(eq(routesTable.id, options.routeId)).limit(1);
      if (rt[0]?.name) {
        // Use first 3 letters of route name capitalized as code if no code exists
        routeCode = rt[0].name.substring(0, 3).toUpperCase();
      }
    }
    prefix = prefix.replace(/{ROUTE}/g, routeCode);
  }

  // 4. Pad sequence (e.g., 1 -> '0001')
  const seqStr = sequenceRow.current_sequence.toString().padStart(sequenceRow.sequence_length, '0');
  
  return `${prefix}${seqStr}`;
}
