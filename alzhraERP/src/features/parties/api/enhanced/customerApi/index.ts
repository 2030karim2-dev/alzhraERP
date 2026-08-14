/**
 * Enhanced Customer API
 * Handles customer activities, notes, tags, and statistics.
 *
 * Public entry point — re-exports the per-domain modules as a single object
 * so existing `customerApi.*` call sites keep working unchanged.
 */
import {
    getCustomerActivities,
    getCompanyActivities,
    createActivity,
    completeActivity,
    updateActivity,
    deleteActivity,
} from './activities';
import { getCustomerNotes, addNote, deleteNote } from './notes';
import {
    getCompanyTags,
    createTag,
    updateTag,
    deleteTag,
    assignTag,
    removeTag,
    getCustomerTags,
} from './tags';
import {
    getCustomerStats,
    getTopCustomers,
    getUpcomingActivities,
    getOverdueActivities,
} from './stats';

export * from './types';

export const customerApi = {
    // Activities
    getCustomerActivities,
    getCompanyActivities,
    createActivity,
    completeActivity,
    updateActivity,
    deleteActivity,

    // Notes
    getCustomerNotes,
    addNote,
    deleteNote,

    // Tags
    getCompanyTags,
    createTag,
    updateTag,
    deleteTag,
    assignTag,
    removeTag,
    getCustomerTags,

    // Statistics
    getCustomerStats,
    getTopCustomers,
    getUpcomingActivities,
    getOverdueActivities,
};

export default customerApi;
