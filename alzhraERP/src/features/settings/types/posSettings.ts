// POS Settings Types
export interface POSSettings {
    // Display
    show_product_images: boolean;
    grid_view_default: boolean;
    categories_on_top: boolean;

    // Printing
    auto_print_receipt: boolean;
    receipt_printer: string;
    receipt_paper_size: '58mm' | '80mm';
    receipt_template: 'simple' | 'detailed';

    // Cart
    allow_discount_in_cart: boolean;
    allow_price_edit: boolean;
    require_customer_for_sale: boolean;

    // Sound
    scan_beep_enabled: boolean;

    // Close
    auto_clear_cart_after_sale: boolean;
    ask_for_cash_drawer: boolean;

    // Payment
    default_payment_method: 'cash' | 'card' | 'mobile';

    // Printer Settings
    default_printer: string;
    receipt_copies: number;

    // Display Settings
    show_customer_screen: boolean;
    gift_receipt_option: boolean;

    // Employee Discount
    employee_discount_enabled: boolean;
    max_employee_discount_percent: number;

    // Offline Mode
    offline_mode_enabled: boolean;
}

export const DEFAULT_POS_SETTINGS: POSSettings = {
    show_product_images: true,
    grid_view_default: true,
    categories_on_top: true,
    auto_print_receipt: true,
    receipt_printer: '',
    receipt_paper_size: '80mm',
    receipt_template: 'simple',
    allow_discount_in_cart: true,
    allow_price_edit: false,
    require_customer_for_sale: false,
    scan_beep_enabled: true,
    auto_clear_cart_after_sale: true,
    ask_for_cash_drawer: false,
    default_payment_method: 'cash',
    default_printer: '',
    receipt_copies: 1,
    show_customer_screen: false,
    gift_receipt_option: true,
    employee_discount_enabled: false,
    max_employee_discount_percent: 15,
    offline_mode_enabled: true,
};
