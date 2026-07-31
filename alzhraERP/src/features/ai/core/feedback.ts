/**
 * AI Module - Feedback & Evaluation
 * Handles user feedback on AI suggestions to improve accuracy over time.
 */

export interface AIFeedback {
    id: string;
    timestamp: string;
    taskType: string;
    originalInput: any;
    aiOutput: any;
    userAccepted: boolean;
    userCorrectedOutput?: any;
    comments?: string;
}

class AIFeedbackTracker {
    private feedbackList: AIFeedback[] = [];
    private readonly MAX_STORED_FEEDBACK = 500;

    /**
     * Record user feedback on an AI suggestion
     */
    recordFeedback(feedback: Omit<AIFeedback, 'id' | 'timestamp'>) {
        const newFeedback: AIFeedback = {
            ...feedback,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };

        this.feedbackList.push(newFeedback);

        if (this.feedbackList.length > this.MAX_STORED_FEEDBACK) {
            this.feedbackList.shift();
        }

        // In production, sync to backend
        console.debug('[AI Feedback]', newFeedback);
    }

    /**
     * Get all recorded feedback
     */
    getFeedback(): AIFeedback[] {
        return [...this.feedbackList];
    }

    /**
     * Get accuracy metrics based on feedback
     */
    getAccuracyMetrics(taskType?: string) {
        const relevantFeedback = taskType
            ? this.feedbackList.filter(f => f.taskType === taskType)
            : this.feedbackList;

        if (relevantFeedback.length === 0) return null;

        const accepted = relevantFeedback.filter(f => f.userAccepted).length;
        const rejected = relevantFeedback.length - accepted;

        return {
            totalEvaluated: relevantFeedback.length,
            acceptanceRate: (accepted / relevantFeedback.length) * 100,
            acceptedCount: accepted,
            rejectedCount: rejected
        };
    }
}

export const aiFeedback = new AIFeedbackTracker();
