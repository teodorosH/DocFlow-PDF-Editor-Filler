// טיפוס עבור שורה בודדת בחשבונית / הסכם (פריט/שירות)
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

// טיפוס עבור כל הנתונים של המסמך המלא
export interface InvoiceData {
  documentTitle: string;
  documentNumber: string;
  date: string;
  clientName: string;
  clientTaxId: string;
  items: InvoiceItem[];
  notes?: string;
}