const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
const FOLDER_MIME = "application/vnd.google-apps.folder";

function withKey(url) {
  const next = new URL(url);
  if (GOOGLE_API_KEY) next.searchParams.set("key", GOOGLE_API_KEY);
  return next.toString();
}

async function driveRequest(providerToken, url, init = {}) {
  if (!providerToken) throw new Error("Google Drive authorization has expired. Please reconnect.");
  const response = await fetch(withKey(url), {
    ...init,
    headers: {
      Authorization: `Bearer ${providerToken}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message || `Google Drive request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function listDriveContent(providerToken) {
  const files = [];
  let pageToken = "";
  do {
    const url = new URL(`${DRIVE_API}/files`);
    url.searchParams.set("q", "trashed = false");
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("orderBy", "folder,name_natural");
    url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,parents,thumbnailLink,modifiedTime,capabilities(canDelete,canMoveItemWithinDrive,canRename))");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const result = await driveRequest(providerToken, url.toString());
    files.push(...(result.files || []));
    pageToken = result.nextPageToken || "";
  } while (pageToken);

  const folders = [
    { id: "root", name: "My Drive", parentId: null, capabilities: {} },
    ...files.filter((file) => file.mimeType === FOLDER_MIME).map((file) => ({
      id: file.id,
      name: file.name,
      parentId: file.parents?.[0] || "root",
      parents: file.parents || [],
      capabilities: file.capabilities || {},
    })),
  ];
  const photos = files.filter((file) => file.mimeType?.startsWith("image/")).map((file) => ({
    id: file.id,
    name: file.name,
    folderId: file.parents?.[0] || "root",
    parents: file.parents || [],
    dataUrl: file.thumbnailLink || "",
    createdAt: file.modifiedTime,
    capabilities: file.capabilities || {},
  }));
  return { folders, photos };
}

export function createDriveFolder(providerToken, name, parentId = "root") {
  return driveRequest(providerToken, `${DRIVE_API}/files?fields=id,name,mimeType,parents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
}

export function renameDriveItem(providerToken, itemId, name) {
  return driveRequest(providerToken, `${DRIVE_API}/files/${encodeURIComponent(itemId)}?fields=id,name,parents`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function trashDriveItem(providerToken, itemId) {
  return driveRequest(providerToken, `${DRIVE_API}/files/${encodeURIComponent(itemId)}?fields=id,trashed`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
}

export function moveDriveItem(providerToken, itemId, currentParents, destinationId) {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(itemId)}`);
  url.searchParams.set("addParents", destinationId);
  if (currentParents?.length) url.searchParams.set("removeParents", currentParents.join(","));
  url.searchParams.set("fields", "id,name,parents");
  return driveRequest(providerToken, url.toString(), { method: "PATCH" });
}

function dataUrlToBytes(dataUrl) {
  const [header, encoded] = dataUrl.split(",");
  const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes, mimeType };
}

export async function uploadDrivePhoto(providerToken, dataUrl, name, parentId = "root") {
  const { bytes, mimeType } = dataUrlToBytes(dataUrl);
  const boundary = `drivecam_${crypto.randomUUID?.() || Date.now()}`;
  const metadata = JSON.stringify({ name, mimeType, parents: [parentId] });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    bytes,
    `\r\n--${boundary}--`,
  ]);
  return driveRequest(providerToken, `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,parents,thumbnailLink,modifiedTime`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
}
