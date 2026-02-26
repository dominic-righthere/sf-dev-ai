import type Connection from "jsforce/lib/connection";

export async function deployFlowMetadata(
  conn: Connection,
  flowXml: string,
  apiName: string
): Promise<{ id: string; success: boolean; errors: string[] }> {
  // Build a deploy package with the flow XML
  const packageXml = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>${apiName}</members>
    <name>Flow</name>
  </types>
  <version>62.0</version>
</Package>`;

  // Use jsforce metadata API to deploy
  const zipEntries: Record<string, string> = {
    "package.xml": packageXml,
    [`flows/${apiName}.flow-meta.xml`]: flowXml,
  };

  // Create zip buffer using jsforce's deploy
  const result = await conn.metadata.deploy(
    createDeployZip(zipEntries),
    { singlePackage: true, rollbackOnError: true }
  );

  // Poll for deployment status
  const deployResult = await checkDeployStatus(conn, result.id);

  return {
    id: result.id,
    success: deployResult.success,
    errors: deployResult.errors || [],
  };
}

function createDeployZip(_entries: Record<string, string>): Buffer {
  // MVP: use metadata CRUD API instead of zip deploy
  // Zip deployment requires a zip library (jszip) which can be added later
  throw new Error("Zip deployment not yet implemented — use metadata CRUD API");
}

async function checkDeployStatus(
  conn: Connection,
  deployId: string
): Promise<{ success: boolean; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const result = await conn.metadata.checkDeployStatus(deployId, true);
        if (result.done) {
          resolve({
            success: result.success,
            errors: Array.isArray(result.details?.componentFailures)
              ? result.details.componentFailures.map(
                  (f) => f.problem ?? "Unknown error"
                )
              : [],
          });
        } else {
          setTimeout(check, 2000);
        }
      } catch (err) {
        reject(err);
      }
    };
    check();
  });
}

export async function deployFlowViaCrud(
  conn: Connection,
  flowMetadata: Record<string, unknown>
): Promise<{ success: boolean; errors: string[] }> {
  try {
    const result = await conn.metadata.upsert("Flow", flowMetadata as any);
    const results = Array.isArray(result) ? result : [result];
    const errors = results
      .filter((r) => !r.success)
      .flatMap((r) => (r.errors || []).map((e: { message: string }) => e.message));

    return {
      success: errors.length === 0,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : "Unknown deployment error"],
    };
  }
}

export async function retrieveFlow(
  conn: Connection,
  apiName: string
): Promise<Record<string, unknown> | null> {
  try {
    const result = await conn.metadata.read("Flow", apiName);
    return result as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function listFlows(
  conn: Connection
): Promise<Array<{ fullName: string; type: string }>> {
  try {
    const result = await conn.metadata.list([{ type: "Flow" }]);
    const items = Array.isArray(result) ? result : result ? [result] : [];
    return items.map((r: any) => ({ fullName: r.fullName, type: r.type }));
  } catch {
    return [];
  }
}
