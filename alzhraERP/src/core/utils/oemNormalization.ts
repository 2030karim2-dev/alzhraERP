/**
 * OEM Normalization Utility - Version 1
 * 
 * Rules:
 * 1. Strips all spaces, hyphens, slashes, and periods.
 * 2. Converts to UPPERCASE.
 * 3. Preserves alphanumeric characters only.
 * 
 * Example:
 * "90919-01240" -> "9091901240"
 * " 100 " -> "100"
 */
export function normalizeOem(input: string | null | undefined): string {
    if (!input) return '';
    // Strip spaces, hyphens, slashes, periods, and uppercase it
    return input.replace(/[\s\-\/\.]/g, '').toUpperCase();
}
