// Local duplicate tracking removed. We rely solely on the Google Sheet status
// column for de-duplication. These stubs preserve imports without touching disk.

export async function isEmailAlreadySent() {
  return false;
}

export async function saveSentEmail() {
  // no-op
}
