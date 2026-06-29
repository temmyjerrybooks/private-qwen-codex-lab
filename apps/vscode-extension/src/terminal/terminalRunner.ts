export interface CapturedCommandExecution {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const maxBufferBytes = 5 * 1024 * 1024;
const timeoutMs = 10 * 60 * 1000;

export async function runCapturedCommand(command: string, cwd: string): Promise<CapturedCommandExecution> {
  const { execaCommand } = await import("execa");

  try {
    const result = await execaCommand(command, {
      cwd,
      shell: true,
      reject: false,
      timeout: timeoutMs,
      maxBuffer: maxBufferBytes
    });

    return {
      exitCode: result.exitCode ?? 0,
      stdout: normalizeOutput(result.stdout),
      stderr: normalizeOutput(result.stderr)
    };
  } catch (error) {
    const commandError = error as {
      exitCode?: number;
      stdout?: unknown;
      stderr?: unknown;
      shortMessage?: string;
      message?: string;
      timedOut?: boolean;
    };

    const stderr = normalizeOutput(commandError.stderr) || commandError.shortMessage || commandError.message || String(error);
    return {
      exitCode: commandError.timedOut ? 124 : commandError.exitCode ?? 1,
      stdout: normalizeOutput(commandError.stdout),
      stderr
    };
  }
}

function normalizeOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("utf8");
  }
  return value === undefined || value === null ? "" : String(value);
}
