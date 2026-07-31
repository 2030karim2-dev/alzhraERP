// Invoice Settings Types
export interface InvoiceSettings {
    // Numbering
    invoice_prefix: string;
    invoice_start_number: number;
    invoice_suffix_format: string;
    quote_prefix: string;
    quote_start_number: number;
    return_prefix: string;

    // Defaults
    default_payment_terms: number;
    default_due_date_days: number;
    auto_generate_number: boolean;

    // Template
    invoice_template: 'simple' | 'detailed' | 'custom';
    show_logo: boolean;

    show_bank_details: boolean;

    // Notes
    default_notes_ar: string;
    default_notes_en: string;
    default_terms_ar: string;
    default_terms_en: string;
    default_currency: string;
    default_invoice_type: 'cash' | 'credit';

    // Company Branding
    company_name_ar: string;
    company_name_en: string;
    company_specialization: string;
    company_phone: string;
    company_email: string;
    company_address: string;
    invoice_header_text: string;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
    invoice_prefix: 'INV-',
    invoice_start_number: 1,
    invoice_suffix_format: 'YYYY-MM-XXXX',
    quote_prefix: 'Q-',
    quote_start_number: 1,
    return_prefix: 'RET-',
    default_payment_terms: 30,
    default_due_date_days: 30,
    auto_generate_number: true,
    invoice_template: 'simple',
    show_logo: true,

    show_bank_details: false,
    default_notes_ar: '',
    default_notes_en: '',
    default_terms_ar: '',
    default_terms_en: '',
    default_currency: 'YER',
    default_invoice_type: 'cash',

    // Default Branding
    company_name_ar: '',
    company_name_en: '',
    company_specialization: '',
    company_phone: '',
    company_email: '',
    company_address: '',
    invoice_header_text: '',
};
