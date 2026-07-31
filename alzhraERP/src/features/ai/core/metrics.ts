/**
 * AI Module - Metrics & Performance Tracking
 * Handles tracking of AI API calls, latency, success rates, and token usage.
 */

export interface AIMetric {
    id: string;
    timestamp: string;
    model: string;
    taskType: string;
    latencyMs: number;
    success: boolean;
    errorType?: string;
    tokensUsed?: {
        prompt?: number;
        completion?: number;
        total?: number;
    };
    costEstimate?: number;
}

class AIMetricsTracker {
    private metrics: AIMetric[] = [];
    private readonly MAX_STORED_METRICS = 1000;

    /**
     * Record a new AI API call metric
     */
    recordMetric(metric: Omit<AIMetric, 'id' | 'timestamp'>) {
        const newMetric: AIMetric = {
            ...metric,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };

        this.metrics.push(newMetric);

        // Keep array size manageable
        if (this.metrics.length > this.MAX_STORED_METRICS) {
            this.metrics.shift();
        }

        // In a real production environment, we would periodically sync this to the backend
        // For now, we log it to console in development
        console.debug('[AI Metrics]', newMetric);
    }

    /**
     * Get all recorded metrics
     */
    getMetrics(): AIMetric[] {
        return [...this.metrics];
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        if (this.metrics.length === 0) return null;

        const successful = this.metrics.filter(m => m.success);
        const failed = this.metrics.filter(m => !m.success);

        const totalLatency = successful.reduce((sum, m) => sum + m.latencyMs, 0);
        const avgLatency = successful.length > 0 ? totalLatency / successful.length : 0;

        return {
            totalCalls: this.metrics.length,
            successRate: (successful.length / this.metrics.length) * 100,
            averageLatencyMs: avgLatency,
            totalErrors: failed.length,
            errorTypes: failed.reduce((acc, m) => {
                if (m.errorType) {
                    acc[m.errorType] = (acc[m.errorType] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>)
        };
    }

    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics = [];
    }
}

export const aiMetrics = new AIMetricsTracker();
