interface GoogleIdentityOAuth2 {
    initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string }) => void;
        error_callback?: (error: unknown) => void;
    }): { requestAccessToken(): void };
}

declare global {
    interface Window {
        google?: {
            accounts?: {
                oauth2?: GoogleIdentityOAuth2;
            };
        };
    }
}

export class GoogleDriveService {
    private static CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    private static SCOPES = 'https://www.googleapis.com/auth/drive.file';

    private static loadGsiScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts?.oauth2) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
            document.head.appendChild(script);
        });
    }

    public static async authenticateAndGetToken(): Promise<string> {
        if (!this.CLIENT_ID) {
            throw new Error('يرجى إضافة VITE_GOOGLE_CLIENT_ID في ملف .env للسماح بالاتصال بجوجل درايف');
        }

        await this.loadGsiScript();

        return new Promise((resolve, reject) => {
            const oauth2 = window.google?.accounts?.oauth2;
            if (!oauth2) {
                reject(new Error('تعذر تهيئة Google Identity Services'));
                return;
            }

            const client = oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        resolve(tokenResponse.access_token);
                    } else {
                        reject(new Error('فشل الحصول على إذن الدخول من Google'));
                    }
                },
                error_callback: (_error) => {
                    reject(new Error('تم إلغاء عملية المصادقة أو حدث خطأ'));
                }
            });
            client.requestAccessToken();
        });
    }

    public static async uploadJSONFile(filename: string, jsonContent: unknown, accessToken: string): Promise<string> {
        const fileMetadata = {
            name: `${filename}.json`,
            mimeType: 'application/json',
        };

        const fileContent = JSON.stringify(jsonContent, null, 2);
        const file = new Blob([fileContent], { type: 'application/json' });

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: form,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'فشل رفع الملف إلى جوجل درايف');
        }

        const data = await response.json();
        return data.id;
    }
}
