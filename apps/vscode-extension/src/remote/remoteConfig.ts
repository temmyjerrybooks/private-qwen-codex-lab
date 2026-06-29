import * as vscode from "vscode";
import { z } from "zod";
import { ensureBorgerDir, fileExists, getBorgerDirUri } from "../permissions/permissionConfig";
import { RemoteHostConfig, RemoteHostsLocalConfig, RemoteConfigLoadResult } from "./remoteTypes";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const remoteHostSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535).default(22),
    username: z.string().min(1).optional(),
    authMode: z.enum(["ssh-agent", "ssh-config", "private-key-path"]).default("ssh-agent"),
    privateKeyPath: z.string().min(1).optional(),
    defaultRemoteCwd: z.string().min(1),
    allowedRemoteCwds: z.array(z.string().min(1)).min(1),
    enabled: z.boolean().default(false)
  })
  .strict();

const remoteHostsSchema = z
  .object({
    hosts: z.array(remoteHostSchema).default([])
  })
  .strict();

export function getRemoteHostsConfigUri(): vscode.Uri {
  return vscode.Uri.joinPath(getBorgerDirUri(), "remote-hosts.local.json");
}

export async function loadRemoteHostsConfig(): Promise<RemoteConfigLoadResult> {
  const uri = getRemoteHostsConfigUri();
  if (!(await fileExists(uri))) {
    return {
      config: { hosts: [] },
      source: "default",
      uri: uri.fsPath
    };
  }

  try {
    const raw = decoder.decode(await vscode.workspace.fs.readFile(uri));
    const parsed = remoteHostsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        config: { hosts: [] },
        source: "malformed",
        uri: uri.fsPath,
        warning: parsed.error.issues.map((issue) => issue.message).join("; ")
      };
    }
    return {
      config: normalizeRemoteHostsConfig(parsed.data),
      source: "local",
      uri: uri.fsPath
    };
  } catch (error) {
    return {
      config: { hosts: [] },
      source: "malformed",
      uri: uri.fsPath,
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function createRemoteHostsTemplateIfMissing(): Promise<vscode.Uri> {
  await ensureBorgerDir();
  const uri = getRemoteHostsConfigUri();
  if (await fileExists(uri)) {
    return uri;
  }
  await vscode.workspace.fs.writeFile(uri, encoder.encode(`${JSON.stringify(getRemoteHostsTemplate(), null, 2)}\n`));
  return uri;
}

export async function openRemoteHostsConfig(): Promise<vscode.Uri> {
  const uri = await createRemoteHostsTemplateIfMissing();
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  return uri;
}

export function getEnabledRemoteHosts(config: RemoteHostsLocalConfig): RemoteHostConfig[] {
  return config.hosts.filter((host) => host.enabled);
}

export function findRemoteHost(config: RemoteHostsLocalConfig, hostId: string | undefined): RemoteHostConfig {
  const enabledHosts = getEnabledRemoteHosts(config);
  const host = hostId ? enabledHosts.find((entry) => entry.id === hostId) : enabledHosts[0];
  if (!host) {
    throw new Error("No enabled remote host is configured in .borger/remote-hosts.local.json.");
  }
  return host;
}

export function validateRemoteCwd(host: RemoteHostConfig, requestedCwd?: string): string {
  const cwd = normalizeRemotePath(requestedCwd || host.defaultRemoteCwd);
  const allowed = host.allowedRemoteCwds.map(normalizeRemotePath);
  const match = allowed.some((allowedCwd) => cwd === allowedCwd || cwd.startsWith(`${allowedCwd.replace(/\/$/, "")}/`));
  if (!match) {
    throw new Error(`Remote cwd '${cwd}' is not inside allowedRemoteCwds for host '${host.id}'.`);
  }
  return cwd;
}

export function normalizeRemotePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error("Remote cwd must be an absolute POSIX path.");
  }
  if (/[\0\r\n]/.test(trimmed)) {
    throw new Error("Remote cwd contains unsafe control characters.");
  }

  const parts: string[] = [];
  for (const part of trimmed.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return `/${parts.join("/")}`;
}

function normalizeRemoteHostsConfig(config: RemoteHostsLocalConfig): RemoteHostsLocalConfig {
  const seen = new Set<string>();
  return {
    hosts: config.hosts.map((host) => {
      if (seen.has(host.id)) {
        throw new Error(`Duplicate remote host id '${host.id}'.`);
      }
      seen.add(host.id);
      return {
        ...host,
        port: host.port || 22,
        defaultRemoteCwd: normalizeRemotePath(host.defaultRemoteCwd),
        allowedRemoteCwds: host.allowedRemoteCwds.map(normalizeRemotePath)
      };
    })
  };
}

function getRemoteHostsTemplate(): RemoteHostsLocalConfig {
  return {
    hosts: [
      {
        id: "staging",
        label: "Staging Server",
        host: "example.com",
        port: 22,
        username: "ubuntu",
        authMode: "ssh-agent",
        defaultRemoteCwd: "/var/www/app",
        allowedRemoteCwds: ["/var/www/app"],
        enabled: false
      }
    ]
  };
}
