import type { ValidationResult } from "./types.mts";

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateType<T>(value: unknown, expectedType: T): boolean {
    // Handle null and undefined
    if (value === null || value === undefined) {
        return false;
    }

    // Get the expected shape from the type parameter
    const expectedShape = expectedType as Record<string, unknown>;

    // If expected type is not an object, compare types directly
    if (!isObject(expectedShape)) {
        return typeof value === typeof expectedShape;
    }

    // Check if value is an object
    if (!isObject(value)) {
        return false;
    }

    // Check if all expected properties exist with correct types
    return Object.entries(expectedShape).every(([key, expectedValue]) => {
        if (!(key in value)) {
            return false;
        }

        const actualValue = value[key];

        // Recursively validate nested objects
        if (isObject(expectedValue)) {
            return validateType(actualValue, expectedValue);
        }

        // Compare types for primitive values
        return typeof actualValue === typeof expectedValue;
    });
}

export function validateJSON<T>(jsonString: string, typeExample: T): ValidationResult<T> {
    try {
        // Try to parse the JSON string
        const parsed = JSON.parse(jsonString);

        // Validate the parsed data against the expected type
        if (!validateType(parsed, typeExample)) {
            return {
                success: false,
                error: 'Parsed JSON does not match expected type structure'
            };
        }

        return {
            success: true,
            data: parsed as T
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown JSON parsing error'
        };
    }
}

