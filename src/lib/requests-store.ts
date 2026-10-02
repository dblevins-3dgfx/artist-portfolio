import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { PrintRequest, RequestStatus } from "@/lib/types";

const filePath = path.join(process.cwd(), "data", "requests.json");

export async function readRequests(): Promise<PrintRequest[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as PrintRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRequests(requests: PrintRequest[]) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await writeFile(temporary, JSON.stringify(requests, null, 2));
  await rename(temporary, filePath);
}

export async function saveRequest(request: PrintRequest) {
  const requests = await readRequests();
  requests.unshift(request);
  await writeRequests(requests);
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  const requests = await readRequests();
  const match = requests.find((request) => request.id === id);
  if (!match) return false;
  match.status = status;
  await writeRequests(requests);
  return true;
}
