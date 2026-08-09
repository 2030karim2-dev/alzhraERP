/**
 * FitmentEngine — evidence-based fitment classification.
 *
 * STRICT RULES:
 * - CONFIRMED: only when authoritative evidence exists from a trusted provider.
 * - POSSIBLE: cross-reference or vehicle application data suggests compatibility.
 * - UNKNOWN: no evidence available.
 * - NOT_COMPATIBLE: explicit exclusion data.
 *
 * AI prediction ≠ authoritative fitment (per Phase 5 requirement §22).
 * Inventory existence alone ≠ compatibility.
 */

import type {
  FitmentEvidence,
  FitmentStatus,
  PartReference,
  ProviderSource,
} from '../types/models';

export interface FitmentAssessment {
  partNumber: string;
  vehicleVin: string;
  status: FitmentStatus;
  evidence: FitmentEvidence | null;
  crossReferenceCount: number;
  vehicleApplicationCount: number;
  reasoning: string[];
}

export class FitmentEngine {
  /**
   * Assess fitment for a part on a vehicle given available evidence.
   */
  assess(
    partNumber: string,
    vin: string,
    crossReferences: PartReference[],
    vehicleApplications: Array<{ make: string; model: string }>,
    fitmentEvidence: FitmentEvidence | null,
  ): FitmentAssessment {
    const reasoning: string[] = [];

    // Rule 1: Direct fitment evidence from provider → CONFIRMED
    if (fitmentEvidence && fitmentEvidence.status === 'CONFIRMED') {
      reasoning.push(`Authoritative fitment evidence from ${fitmentEvidence.provider}.`);
      return {
        partNumber,
        vehicleVin: vin,
        status: 'CONFIRMED',
        evidence: fitmentEvidence,
        crossReferenceCount: crossReferences.length,
        vehicleApplicationCount: vehicleApplications.length,
        reasoning,
      };
    }

    // Rule 2: High-confidence cross-references → POSSIBLE
    const highConfRefs = crossReferences.filter(
      r => r.matchQuality === 'EXACT' || r.matchQuality === 'EQUIVALENT'
    );
    if (highConfRefs.length > 0) {
      reasoning.push(
        `Found ${highConfRefs.length} high-confidence cross-reference(s). ` +
        `Fitment requires verification.`
      );
      return {
        partNumber,
        vehicleVin: vin,
        status: 'POSSIBLE',
        evidence: fitmentEvidence,
        crossReferenceCount: crossReferences.length,
        vehicleApplicationCount: vehicleApplications.length,
        reasoning,
      };
    }

    // Rule 3: Vehicle application data exists → POSSIBLE
    if (vehicleApplications.length > 0) {
      reasoning.push(
        `Part has ${vehicleApplications.length} vehicle application(s) in catalog. ` +
        `VIN-specific fitment not confirmed.`
      );
      return {
        partNumber,
        vehicleVin: vin,
        status: 'POSSIBLE',
        evidence: fitmentEvidence,
        crossReferenceCount: crossReferences.length,
        vehicleApplicationCount: vehicleApplications.length,
        reasoning,
      };
    }

    // Rule 4: Some cross-references exist → POSSIBLE (low confidence)
    if (crossReferences.length > 0) {
      reasoning.push(
        `Found ${crossReferences.length} cross-reference(s) with low confidence. ` +
        `Manual verification recommended.`
      );
      return {
        partNumber,
        vehicleVin: vin,
        status: 'POSSIBLE',
        evidence: null,
        crossReferenceCount: crossReferences.length,
        vehicleApplicationCount: vehicleApplications.length,
        reasoning,
      };
    }

    // Rule 5: No evidence → UNKNOWN
    reasoning.push('No fitment evidence, cross-references, or vehicle applications found.');
    return {
      partNumber,
      vehicleVin: vin,
      status: 'UNKNOWN',
      evidence: null,
      crossReferenceCount: 0,
      vehicleApplicationCount: 0,
      reasoning,
    };
  }

  /**
   * Can this assessment be used for a procurement/inventory decision?
   */
  isSafeForProcurement(assessment: FitmentAssessment): boolean {
    return assessment.status === 'CONFIRMED';
  }

  /**
   * Can this assessment be used for a sales recommendation?
   */
  isSafeForRecommendation(assessment: FitmentAssessment): boolean {
    return assessment.status === 'CONFIRMED' || assessment.status === 'POSSIBLE';
  }

  /**
   * Map external provider fitment to internal terminology.
   */
  normalizeExternalStatus(
    externalStatus: string,
    providerSource: ProviderSource
  ): FitmentStatus {
    // Only FAPI/TECDOC statuses mapped; everything else is UNKNOWN
    switch (externalStatus.toUpperCase()) {
      case 'VERIFIED':
      case 'CONFIRMED':
      case 'EXACT':
        return 'CONFIRMED';
      case 'POSSIBLE':
      case 'EQUIVALENT':
      case 'CROSS_REFERENCE':
        return 'POSSIBLE';
      case 'NOT_COMPATIBLE':
      case 'EXCLUDED':
        return 'NOT_COMPATIBLE';
      default:
        return 'UNKNOWN';
    }
  }
}

export const fitmentEngine = new FitmentEngine();
