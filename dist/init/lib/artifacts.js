import {
  require_artifact
} from "../../main-gfg7sja2.js";
import"../../main-yansfnd3.js";
import {
  require_core
} from "../../main-d4h7eace.js";
import"../../main-c7r720rd.js";
import {
  __toESM
} from "../../main-ynsbc1hx.js";

// init/lib/artifacts.ts
var import_artifact = __toESM(require_artifact(), 1), import_core = __toESM(require_core(), 1);
import * as fs from "node:fs";
async function uploadArtifacts(name, artifacts, cwd) {
  let artifactClient = new import_artifact.DefaultArtifactClient, rootDirectory = cwd || process.cwd(), files = [];
  for (let artifact of artifacts) {
    if (!fs.existsSync(artifact.path)) {
      import_core.warning(`Artifact source missing: ${artifact.path}`);
      continue;
    }
    files.push(artifact.path);
  }
  if (files.length === 0) {
    import_core.warning("No artifacts to upload");
    return;
  }
  try {
    let { id } = await artifactClient.uploadArtifact(name, files, rootDirectory, {
      retentionDays: 1
    });
    import_core.info(`Uploaded ${files.length} file(s) as artifact ${name} (id: ${id})`);
  } catch (error) {
    import_core.warning(`Failed to upload artifacts: ${String(error)}`);
  }
}
export {
  uploadArtifacts
};

export { uploadArtifacts };

//# debugId=F5DA5F416A239EE964756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vaW5pdC9saWIvYXJ0aWZhY3RzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJ0aWZhY3RGaWxlIHtcblx0bmFtZTogc3RyaW5nXG5cdHBhdGg6IHN0cmluZ1xufVxuXG4vKipcbiAqIFVwbG9hZHMgYXJ0aWZhY3RzIHRvIEdpdEh1YiBBY3Rpb25zIGFzIGEgc2luZ2xlIGJ1bmRsZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBsb2FkQXJ0aWZhY3RzKG5hbWU6IHN0cmluZywgYXJ0aWZhY3RzOiBBcnRpZmFjdEZpbGVbXSwgY3dkPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXHRsZXQgcm9vdERpcmVjdG9yeSA9IGN3ZCB8fCBwcm9jZXNzLmN3ZCgpXG5cblx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGFydGlmYWN0LnBhdGgpKSB7XG5cdFx0XHR3YXJuaW5nKGBBcnRpZmFjdCBzb3VyY2UgbWlzc2luZzogJHthcnRpZmFjdC5wYXRofWApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0XHRmaWxlcy5wdXNoKGFydGlmYWN0LnBhdGgpXG5cdH1cblxuXHRpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG5cdFx0d2FybmluZygnTm8gYXJ0aWZhY3RzIHRvIHVwbG9hZCcpXG5cdFx0cmV0dXJuXG5cdH1cblxuXHR0cnkge1xuXHRcdC8vIEtlZXAgYXJ0aWZhY3RzIGZvciAxIGRheSBvbmx5IHRvIHNhdmUgc3RvcmFnZSBzcGFjZVxuXHRcdGxldCB7IGlkIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC51cGxvYWRBcnRpZmFjdChuYW1lLCBmaWxlcywgcm9vdERpcmVjdG9yeSwge1xuXHRcdFx0cmV0ZW50aW9uRGF5czogMSxcblx0XHR9KVxuXG5cdFx0aW5mbyhgVXBsb2FkZWQgJHtmaWxlcy5sZW5ndGh9IGZpbGUocykgYXMgYXJ0aWZhY3QgJHtuYW1lfSAoaWQ6ICR7aWR9KWApXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIHVwbG9hZCBhcnRpZmFjdHM6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHR9XG59XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7O0FBRUEsc0RBQ0E7QUFIQTtBQWFBLGVBQXNCLGVBQWUsQ0FBQyxNQUFjLFdBQTJCLEtBQTZCO0FBQUEsRUFDM0csSUFBSSxpQkFBaUIsSUFBSSx1Q0FDckIsZ0JBQWdCLE9BQU8sUUFBUSxJQUFJLEdBRW5DLFFBQWtCLENBQUM7QUFBQSxFQUV2QixTQUFTLFlBQVksV0FBVztBQUFBLElBQy9CLElBQUksQ0FBSSxjQUFXLFNBQVMsSUFBSSxHQUFHO0FBQUEsTUFDbEMsb0JBQVEsNEJBQTRCLFNBQVMsTUFBTTtBQUFBLE1BQ25EO0FBQUE7QUFBQSxJQUVELE1BQU0sS0FBSyxTQUFTLElBQUk7QUFBQTtBQUFBLEVBR3pCLElBQUksTUFBTSxXQUFXLEdBQUc7QUFBQSxJQUN2QixvQkFBUSx3QkFBd0I7QUFBQSxJQUNoQztBQUFBO0FBQUEsRUFHRCxJQUFJO0FBQUEsSUFFSCxNQUFNLE9BQU8sTUFBTSxlQUFlLGVBQWUsTUFBTSxPQUFPLGVBQWU7QUFBQSxNQUM1RSxlQUFlO0FBQUEsSUFDaEIsQ0FBQztBQUFBLElBRUQsaUJBQUssWUFBWSxNQUFNLDhCQUE4QixhQUFhLEtBQUs7QUFBQSxJQUN0RSxPQUFPLE9BQU87QUFBQSxJQUNmLG9CQUFRLCtCQUErQixPQUFPLEtBQUssR0FBRztBQUFBO0FBQUE7IiwKICAiZGVidWdJZCI6ICJGNURBNUY0MTZBMjM5RUU5NjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
