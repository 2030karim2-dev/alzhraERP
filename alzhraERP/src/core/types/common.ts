// ============================================
// Common Types - الأنواع الأساسية المشتركة
// Al-Zahra Smart ERP
// ============================================

// قاعدة: استخدام UnknownRecord بدلاً من any
export type UnknownRecord = Record<string, unknown>;

// قاعدة: استخدام EntityId لجميع المعرفات
export type EntityId = string & { readonly __brand: unique symbol };

// قاعدة: إنشاء factory function للـ IDs
export const createEntityId = (id: string): EntityId => id as EntityId;

// قاعدة: Timestamp type
export type Timestamp = string; // ISO 8601

// قاعدة: Optional timestamp
export type OptionalTimestamp = Timestamp | null;

// قاعدة: Pagination types
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// قاعدة: API Response wrapper
export interface ApiResponse<T> {
    data: T | null;
    error: AppError | null;
    success: boolean;
}

// قاعدة: AppError - بديل الـ any في الأخطاء
export class AppError extends Error {
    constructor(
        message: string,
        public code: ErrorCode,
        public statusCode: number = 500,
        public details?: UnknownRecord
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export enum ErrorCode {
    // الأخطاء العامة
    UNKNOWN = 'UNKNOWN',
    VALIDATION = 'VALIDATION',
    NOT_FOUND = 'NOT_FOUND',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',

    // أخطاء قاعدة البيانات
    DB_ERROR = 'DB_ERROR',
    DB_CONSTRAINT = 'DB_CONSTRAINT',

    // أخطاء المعاملات
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

    // أخطاء الذكاء الاصطناعي
    AI_ERROR = 'AI_ERROR',
    AI_TIMEOUT = 'AI_TIMEOUT',
}

// قاعدة: Error factory functions
export const createError = {
    notFound: (resource: string, id?: string): AppError =>
        new AppError(`${resource} غير موجود${id ? `: ${id}` : ''}`, ErrorCode.NOT_FOUND, 404),

    unauthorized: (message = 'غير مصرح'): AppError =>
        new AppError(message, ErrorCode.UNAUTHORIZED, 401),

    forbidden: (message = 'وصول مرفوض'): AppError =>
        new AppError(message, ErrorCode.FORBIDDEN, 403),

    validation: (message: string, details?: UnknownRecord): AppError =>
        new AppError(message, ErrorCode.VALIDATION, 400, details),

    dbError: (message: string, details?: UnknownRecord): AppError =>
        new AppError(message, ErrorCode.DB_ERROR, 500, details),

    unknown: (message = 'حدث خطأ غير متوقع'): AppError =>
        new AppError(message, ErrorCode.UNKNOWN, 500),
};

// قاعدة: تحويل أي خطأ إلى AppError
export const toAppError = (error: unknown, context?: string): AppError => {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof Error) {
        return new AppError(
            error.message,
            ErrorCode.UNKNOWN,
            500,
            { originalError: error.name, context }
        );
    }

    return new AppError(
        'حدث خطأ غير متوقع',
        ErrorCode.UNKNOWN,
        500,
        { context }
    );
};

// ============================================
// Toast Types - أنواع الإشعارات
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

// ============================================
// User & Permissions Types - أنواع المستخدمين والصلاحيات
// ============================================

export type Permission =
    | 'sales:create' | 'sales:read' | 'sales:update' | 'sales:delete'
    | 'purchases:create' | 'purchases:read' | 'purchases:update' | 'purchases:delete'
    | 'accounting:create' | 'accounting:read' | 'accounting:update' | 'accounting:delete'
    | 'inventory:create' | 'inventory:read' | 'inventory:update' | 'inventory:delete'
    | 'customers:create' | 'customers:read' | 'customers:update' | 'customers:delete'
    | 'expenses:create' | 'expenses:read' | 'expenses:update' | 'expenses:delete'
    | 'reports:read' | 'reports:export'
    | 'ai:use' | 'admin:access';

export type Role = 'admin' | 'manager' | 'accountant' | 'sales' | 'viewer';

export interface UserPermissions {
    role: Role;
    permissions: Permission[];
}

// ============================================
// Form Types - أنواع النماذج
// ============================================

export interface FormFieldError {
    field: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: FormFieldError[];
}

// ============================================
// Filter & Search Types - أنواع الفلترة والبحث
// ============================================

export interface FilterParams {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
}

export interface SortParams {
    field: string;
    order: 'asc' | 'desc';
}
