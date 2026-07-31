// Integration Settings Types
export interface IntegrationSettings {
    // ZATCA
    zatca_enabled: boolean;
    zatca_environment: 'sandbox' | 'production';
    zatca_vat_number: string;
    zatca_api_key?: string;
    zatca_secret?: string;

    // POS
    pos_integration_enabled: boolean;
    pos_provider?: string;

    // Payment gateway
    payment_gateway_enabled: boolean;
    payment_gateway?: 'mada' | 'visa' | 'mastercard' | 'applepay' | undefined;

    // Accounting
    accounting_integration_enabled: boolean;
    accounting_provider?: string | undefined;

    // Email Integration
    email_enabled: boolean;
    email_smtp_server: string;
    email_smtp_port: number;
    email_username: string;
    email_password: string;

    // SMS Integration
    sms_enabled: boolean;
    sms_provider: string;
    sms_sender_name: string;
    sms_api_key: string;

    // API Keys
    api_public_key: string;
    api_secret_key: string;
}

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
    zatca_enabled: false,
    zatca_environment: 'sandbox',
    zatca_vat_number: '',
    zatca_api_key: '',
    zatca_secret: '',
    pos_integration_enabled: false,
    pos_provider: '',
    payment_gateway_enabled: false,
    accounting_integration_enabled: false,
    email_enabled: false,
    email_smtp_server: '',
    email_smtp_port: 587,
    email_username: '',
    email_password: '',
    sms_enabled: false,
    sms_provider: '',
    sms_sender_name: '',
    sms_api_key: '',
    api_public_key: '',
    api_secret_key: '',
};
