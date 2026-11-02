export interface Diagnostic {
  category: string;
  message: string;
}
export type DiagnosticReporter = (event: Diagnostic) => void | Promise<void>;
/** Reporting is disabled until an explicitly configured reporter is supplied. */
export function createDiagnostics(reporter?: DiagnosticReporter) {
  return {
    async report(event: Diagnostic): Promise<boolean> {
      if (!reporter) return false;
      try {
        await reporter(event);
        return true;
      } catch {
        return false;
      }
    },
  };
}
