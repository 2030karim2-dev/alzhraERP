// ============================================
// Share Service - Send invoices, reports, statements
// as text or images via WhatsApp & Telegram
// ============================================

import { messagingApi } from './messagingApi';
import { supabase } from '../../lib/supabaseClient';

export type ShareContentType =
    | 'sale_invoice'
    | 'purchase_invoice'
    | 'customer_statement'
    | 'debt_report'
    | 'general_report';

/**
 * Convert an HTML element to a base64 PNG image
 */
const elementToBase64 = async (element: HTMLElement): Promise<string> => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });
    // Return base64 without the data:image/png;base64, prefix
    return canvas.toDataURL('image/png').split(',')[1];
};

export const shareService = {
    /**
     * Share a text message via configured channels
     */
    shareText: async (
        companyId: string,
        message: string,
        eventType: string = 'share'
    ): Promise<{ success: boolean; results?: any[] }> => {
        return await messagingApi.sendNotification(companyId, eventType, message);
    },

    /**
     * Share an HTML element as an image (e.g., invoice, report)
     */
    shareImage: async (
        companyId: string,
        element: HTMLElement,
        caption: string,
        eventType: string = 'share'
    ): Promise<{ success: boolean; results?: any[] }> => {
        try {
            const imageBase64 = await elementToBase64(element);

            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || ''}`,
                    },
                    body: JSON.stringify({
                        company_id: companyId,
                        event_type: eventType,
                        message: caption,
                        image_base64: imageBase64,
                    }),
                }
            );

            const result = await response.json();
            return { success: response.ok, results: result.results };
        } catch (error) {
            console.error('[ShareService] Image share failed:', error);
            return { success: false };
        }
    },

    /**
     * Share multiple messages in bulk (e.g., multiple invoices)
     */
    shareBulk: async (
        companyId: string,
        messages: string[],
        eventType: string = 'share'
    ): Promise<{ success: boolean; sent: number; failed: number }> => {
        let sent = 0;
        let failed = 0;

        // Combine all messages into one to avoid rate limiting
        const combined = messages.join('\n\n━━━━━━━━━━━━━━\n\n');

        // If combined is too long (>4000 chars), split into chunks
        if (combined.length <= 4000) {
            const result = await messagingApi.sendNotification(companyId, eventType, combined);
            if (result.success) sent = messages.length;
            else failed = messages.length;
        } else {
            // Send in chunks
            for (let i = 0; i < messages.length; i += 5) {
                const chunk = messages.slice(i, i + 5).join('\n\n━━━━━━━━━━━━━━\n\n');
                const result = await messagingApi.sendNotification(companyId, eventType, chunk);
                if (result.success) sent += Math.min(5, messages.length - i);
                else failed += Math.min(5, messages.length - i);

                // Small delay between chunks to avoid rate limiting
                if (i + 5 < messages.length) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        return { success: failed === 0, sent, failed };
    },
};
