// Print Settings Types
export interface PrintSettings {
    // General
    default_paper_size: 'A4' | 'A5' | 'Letter';
    default_orientation: 'portrait' | 'landscape';

    // Invoice
    invoice_paper_size: 'A4' | 'A5' | 'thermal';
    invoice_copies: number;
    print_invoice_logo: boolean;

    // Reports
    report_paper_size: 'A4' | 'A3';
    report_orientation: 'portrait' | 'landscape';

    // Headers
    company_header_on_all: boolean;
    show_page_numbers: boolean;

    // PDF
    pdf_quality: 'low' | 'medium' | 'high';
    embed_fonts: boolean;

    // Printer Settings
    default_printer: string;
    printer_name: string;

    // Paper Settings
    paper_size: 'A4' | 'A5' | 'Letter' | 'Legal';
    copies: number;
    orientation: 'portrait' | 'landscape';

    // Margins
    margin_top: number;
    margin_bottom: number;
    margin_left: number;
    margin_right: number;

    // Font Settings
    font_family: string;
    font_size: number;
    line_spacing: number;

    // Print Options
    print_header: boolean;
    print_footer: boolean;
    print_logo: boolean;
    print_qr_code: boolean;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
    default_paper_size: 'A4',
    default_orientation: 'portrait',
    invoice_paper_size: 'A4',
    invoice_copies: 1,
    print_invoice_logo: true,
    report_paper_size: 'A4',
    report_orientation: 'portrait',
    company_header_on_all: true,
    show_page_numbers: true,
    pdf_quality: 'medium',
    embed_fonts: true,
    default_printer: '',
    printer_name: '',
    paper_size: 'A4',
    copies: 1,
    orientation: 'portrait',
    margin_top: 10,
    margin_bottom: 10,
    margin_left: 10,
    margin_right: 10,
    font_family: 'Arial',
    font_size: 12,
    line_spacing: 1.5,
    print_header: true,
    print_footer: true,
    print_logo: true,
    print_qr_code: true,
};
