// Localization Settings Types
export interface LocalizationSettings {
    // Language
    default_language: 'ar' | 'en';
    fallback_language: 'ar' | 'en';

    // Date
    date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    hijri_dates_enabled: boolean;
    timezone: string;

    // Numbers
    number_format: 'arabic' | 'western';
    decimal_separator: '.' | ',';
    thousands_separator: ',' | '.' | ' ';

    // Currency
    currency_symbol_position: 'before' | 'after';
    currency_decimal_places: number;

    // Additional Currency Settings
    default_currency: string;
    currency_symbol: string;
    decimal_places: number;

    // Time Format
    time_format: '12h' | '24h';

    // Number Formatting
    thousand_separator: ',' | '.' | ' ';
}

export const DEFAULT_LOCALIZATION_SETTINGS: LocalizationSettings = {
    default_language: 'ar',
    fallback_language: 'ar',
    date_format: 'DD/MM/YYYY',
    hijri_dates_enabled: true,
    timezone: 'Asia/Riyadh',
    number_format: 'arabic',
    decimal_separator: '.',
    thousands_separator: ',',
    currency_symbol_position: 'after',
    currency_decimal_places: 2,
    default_currency: 'SAR',
    currency_symbol: 'ر.س',
    decimal_places: 2,
    time_format: '24h',
    thousand_separator: ',',
};
