import { z } from 'zod';
import { BillingMode, InvoicePaymentMethod, MarkupType, MICROS_PER_UNIT } from './billing.constants.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
/** Money in micros: positive integer, capped at 1 crore per operation. */
const amount = z.number().int().positive().max(10_000_000 * MICROS_PER_UNIT);

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  serviceKey: z.string().max(60).optional(),
});

export const transferSchema = z.object({ toUserId: objectId, amount, note: z.string().trim().max(200).default('') });
export const topUpSchema = z.object({ userId: objectId, amount, reference: z.string().trim().min(3).max(200) });
export const adjustSchema = z.object({
  userId: objectId, amount, direction: z.enum(['credit', 'debit']), reason: z.string().trim().min(5).max(200),
});

export const configureBillingSchema = z
  .object({
    mode: z.enum([BillingMode.PREPAID, BillingMode.POSTPAID]).optional(),
    creditLimit: z.number().int().min(0).max(100_000_000 * MICROS_PER_UNIT).nullable().optional(),
    cycleDay: z.number().int().min(1).max(28).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const markupSchema = z.object({
  serviceKey: z.string().min(1).max(60),
  type: z.enum([MarkupType.PERCENT, MarkupType.FIXED]),
  /** percent: basis points (1250 = 12.5%); fixed: micros per unit. */
  value: z.number().int().min(0).max(1_000_000 * MICROS_PER_UNIT),
});

export const customerMarkupSchema = markupSchema.extend({ customerId: objectId.nullable().default(null) });

export const payInvoiceSchema = z.object({
  method: z.enum([InvoicePaymentMethod.WALLET, InvoicePaymentMethod.PROVIDER, InvoicePaymentMethod.OFFLINE]),
  reference: z.string().trim().max(200).optional(),
});

export const quoteQuerySchema = z.object({ serviceKey: z.string().min(1).max(60), units: z.coerce.number().int().min(1).max(1_000_000).default(1) });
export const invoiceQuerySchema = z.object({
  status: z.enum(['issued', 'paid', 'void']).optional(),
  userId: objectId.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().max(1000),
    status: z.enum(['active', 'beta', 'disabled']),
    selfServe: z.boolean(),
    basePrice: z.number().int().min(0).max(1_000_000 * MICROS_PER_UNIT),
    sortOrder: z.number().int().min(0).max(10_000),
  })
  .partial()
  .strict();

export const toggleServiceSchema = z.object({ enabled: z.boolean() });
export const serviceConfigSchema = z.object({ config: z.record(z.string(), z.unknown()) });
export const assignServiceSchema = z.object({ allowed: z.boolean() });
