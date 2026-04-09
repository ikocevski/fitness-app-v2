/**
 * Utility for wrapping promises with timeouts to prevent hanging requests
 */

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  operationName: string = "Operation",
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `${operationName} timed out after ${timeoutMs}ms. Please check your connection.`,
        ),
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw error;
  }
};

/**
 * Execute a query function with automatic timeout handling
 */
export const executeQueryWithTimeout = async <T>(
  query: () => Promise<T>,
  timeoutMs: number = 15000,
  operationName: string = "Query",
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const data = await withTimeout(query(), timeoutMs, operationName);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};
