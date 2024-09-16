'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Define validation schema for the form
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

// Schema for updating invoices (excluding id and date)
const UpdateInvoiceSchema = FormSchema.omit({ id: true, date: true });

// Function to create a new invoice
export async function createInvoice(formData: FormData) {
  try {
    // Extract and parse form data
    const customerId = formData.get('customerId')?.toString();
    const amount = parseFloat(formData.get('amount')?.toString() || '0');
    const status = formData.get('status')?.toString();

    // Validate form data
    const parsedData = FormSchema.pick({ customerId: true, amount: true, status: true }).parse({
      customerId,
      amount,
      status
    });

    const amountInCents = parsedData.amount * 100;
    const date = new Date().toISOString().split('T')[0];

    // Insert the new invoice into the database
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${parsedData.customerId}, ${amountInCents}, ${parsedData.status}, ${date})
    `;

    // Revalidate the path and redirect
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  } catch (error) {
    // Handle errors
    return { message: 'Database Error: Failed to Create Invoice.' };
  }
}

// Function to update an existing invoice
export async function updateInvoice(id: string, formData: FormData) {
  try {
    // Extract and parse form data
    const customerId = formData.get('customerId')?.toString();
    const amount = parseFloat(formData.get('amount')?.toString() || '0');
    const status = formData.get('status')?.toString();

    // Validate form data
    const parsedData = UpdateInvoiceSchema.parse({
      customerId,
      amount,
      status
    });

    const amountInCents = parsedData.amount * 100;

    // Update the invoice in the database
    await sql`
      UPDATE invoices
      SET customer_id = ${parsedData.customerId}, amount = ${amountInCents}, status = ${parsedData.status}
      WHERE id = ${id}
    `;

    // Revalidate the path and redirect
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  } catch (error) {
    // Handle errors
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
}

// Function to delete an invoice
export async function deleteInvoice(id: string) {
  try {
    // Delete the invoice from the database
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    
    // Revalidate the path
    revalidatePath('/dashboard/invoices');

    return { message: 'Deleted Invoice.' };
  } catch (error) {
    // Handle errors
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}
