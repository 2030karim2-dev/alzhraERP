/**
 * Chat Service Facade (Clean Architecture)
 * Aggregates modular services for channels, messages, attachments, reactions, actions, and search.
 */

import { channelService } from './channelService';
import { messageService } from './messageService';
import { attachmentService } from './attachmentService';
import { reactionService } from './reactionService';
import { actionService } from './actionService';
import { entitySearchService } from './entitySearchService';

export const chatService = {
  // Channel operations
  getChannels: channelService.getChannels,
  getChannelsLegacy: channelService.getChannelsLegacy,
  markAsRead: channelService.markAsRead,
  getOrCreateDirectChannel: channelService.getOrCreateDirectChannel,
  getOrCreateContextualChannel: channelService.getOrCreateContextualChannel,
  createGroupChannel: channelService.createGroupChannel,
  getCompanyEmployees: channelService.getCompanyEmployees,
  getCompanyBranches: channelService.getCompanyBranches,

  // Message operations
  getMessages: messageService.getMessages,
  sendMessage: messageService.sendMessage,
  pinMessage: messageService.pinMessage,
  deleteMessage: messageService.deleteMessage,
  getPinnedMessages: messageService.getPinnedMessages,

  // Attachment operations
  uploadAttachment: attachmentService.uploadAttachment,
  getAttachmentSignedUrl: attachmentService.getAttachmentSignedUrl,

  // Reaction operations
  toggleReaction: reactionService.toggleReaction,

  // Action operations
  executeAction: actionService.executeAction,

  // Entity search operations
  searchProducts: entitySearchService.searchProducts,
  searchInvoices: entitySearchService.searchInvoices,
  searchTransfers: entitySearchService.searchTransfers,
  searchVins: entitySearchService.searchVins,
};

// Also re-export all specialized services for direct consumption in new components
export {
  channelService,
  messageService,
  attachmentService,
  reactionService,
  actionService,
  entitySearchService,
};
