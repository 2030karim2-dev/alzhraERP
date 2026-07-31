/**
 * Enhanced Party Types for Phase 1
 * Extends the base Party type with customer and supplier enhancements
 */

import type { Party } from '@/features/parties/types';

// ============================================================
// Customer Enhancements
// ============================================================

export type CustomerType = 'individual' | 'company' | 'government';
export type ContactMethod = 'phone' | 'email' | 'whatsapp';
export type ActivityType =
    | 'call'
    | 'email'
    | 'meeting'
    | 'visit'
    | 'note'
    | 'task'
    | 'invoice_created'
    | 'payment_received'
    | 'complaint'
    | 'follow_up';

export type ActivityStatus = 'pending' | 'completed' | 'cancelled' | 'overdue';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type NoteType = 'general' | 'complaint' | 'feedback' | 'preference' | 'warning';

export interface CustomerActivity {
    id: string;
    companyId: string;
    customerId: string;
    activityType: ActivityType;
    subject: string;
    description?: string;
    scheduledAt?: string;
    completedAt?: string;
    status: ActivityStatus;
    priority: Priority;
    assignedTo?: string;
    assignedToName?: string;
    outcome?: string;
    durationMinutes?: number;
    createdBy: string;
    createdByName?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerNote {
    id: string;
    companyId: string;
    customerId: string;
    noteType: NoteType;
    content: string;
    isImportant: boolean;
    createdBy: string;
    createdByName?: string;
    createdAt: string;
}

export interface CustomerTag {
    id: string;
    companyId: string;
    name: string;
    color: string;
    assignedCount?: number;
    createdAt?: string;
}

export interface CustomerStats {
    totalCustomers: number;
    activeCustomers: number;
    newThisMonth: number;
    avgInvoicesPerCustomer: number;
    totalOutstanding: number;
    highValueCustomers: number;
}

export interface TopCustomer {
    id: string;
    name: string;
    totalRevenue: number;
    invoiceCount: number;
}

// ============================================================
// Supplier Enhancements
// ============================================================

export type SupplierType = 'local' | 'import' | 'manufacturer' | 'distributor';

export interface SupplierRating {
    id: string;
    companyId: string;
    supplierId: string;
    ratedBy: string;
    ratedByName?: string;
    ratingDate: string;
    qualityRating: number;
    deliveryRating: number;
    priceRating: number;
    communicationRating: number;
    overallRating: number;
    notes?: string;
    createdAt: string;
}

export interface SupplierPriceHistory {
    id: string;
    companyId: string;
    supplierId: string;
    productId: string;
    productName?: string;
    unitPrice: number;
    currency: string;
    effectiveDate: string;
    notes?: string;
    createdAt: string;
}

export interface PriceComparison {
    productId: string;
    supplierId: string;
    supplierName?: string;
    unitPrice: number;
    currency: string;
    effectiveDate: string;
    priceRank: number;
    lowestPrice: number;
    highestPrice: number;
}

export interface SupplierStats {
    totalSuppliers: number;
    activeSuppliers: number;
    avgRating: number;
    topRatedSuppliers: number;
    totalPurchases: number;
}

export interface SupplierPerformance {
    supplierId: string;
    supplierName: string;
    avgRating: number;
    totalOrders: number;
    totalPurchaseAmount: number;
    avgDeliveryDays: number;
    lastPurchaseDate?: string;
}

// ============================================================
// Enhanced Party Interface
// ============================================================

export interface EnhancedParty extends Party {
    // Customer fields
    customerType?: CustomerType;
    leadSource?: string;
    birthDate?: string;
    preferredContactMethod?: ContactMethod;
    creditLimit?: number;
    paymentTerms?: number;
    totalInvoicesCount?: number;
    totalPaidAmount?: number;
    lastContactDate?: string;
    lastInvoiceDate?: string;
    customerSince?: string;
    loyaltyPoints?: number;
    satisfactionScore?: number;

    // Supplier fields
    supplierType?: SupplierType;
    taxNumber?: string;
    commercialRegistration?: string;
    paymentTermsDays?: number;
    minOrderAmount?: number;
    deliveryLeadDays?: number;
    isActiveSupplier?: boolean;
    avgRating?: number;
    totalOrdersCount?: number;
    totalPurchasesAmount?: number;
    lastPurchaseDate?: string;

    // Related data
    tags?: CustomerTag[];
    activities?: CustomerActivity[];
    notes?: CustomerNote[];
    ratings?: SupplierRating[];
}

// ============================================================
// Form Data Types
// ============================================================

export interface CustomerActivityFormData {
    activityType: ActivityType;
    subject: string;
    description?: string;
    scheduledAt?: string;
    priority: Priority;
    assignedTo?: string;
}

export interface CustomerNoteFormData {
    noteType: NoteType;
    content: string;
    isImportant?: boolean;
}

export interface CustomerTagFormData {
    name: string;
    color: string;
}

export interface SupplierRatingFormData {
    qualityRating: number;
    deliveryRating: number;
    priceRating: number;
    communicationRating: number;
    overallRating: number;
    notes?: string;
}

export interface SupplierPriceFormData {
    productId: string;
    unitPrice: number;
    currency: string;
    effectiveDate: string;
    notes?: string;
}

// ============================================================
// Filter and Sort Types
// ============================================================

export interface CustomerActivityFilters {
    activityType?: ActivityType;
    status?: ActivityStatus;
    priority?: Priority;
    assignedTo?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface CustomerFilters {
    tags?: string[];
    customerType?: CustomerType;
    hasOutstandingBalance?: boolean;
    lastContactBefore?: string;
}

export interface SupplierFilters {
    supplierType?: SupplierType;
    isActive?: boolean;
    minRating?: number;
    hasPriceHistory?: boolean;
}

// ============================================================
// Activity Timeline Item (for UI display)
// ============================================================

export interface TimelineItem {
    id: string;
    type: 'activity' | 'note' | 'invoice' | 'payment';
    date: string;
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    data?: CustomerActivity | CustomerNote | unknown;
}

// ============================================================
// Activity Statistics
// ============================================================

export interface ActivityStats {
    totalActivities: number;
    pendingActivities: number;
    completedActivities: number;
    overdueActivities: number;
    activitiesByType: Record<ActivityType, number>;
    activitiesByMonth: Array<{
        month: string;
        count: number;
    }>;
}
