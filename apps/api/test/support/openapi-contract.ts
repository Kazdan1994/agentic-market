import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { load as loadYaml } from "js-yaml";
import { expect } from "vitest";

type OpenApiDoc = {
  paths: Record<string, Record<string, { operationId?: string; responses?: Record<string, unknown> }>>;
  components?: { responses?: Record<string, { content?: Record<string, { schema?: unknown }> }> };
};

const CONTRACT_PATH = path.resolve(
  process.cwd(),
  "../../specs/001-agent-mandate-checkout/contracts/openapi.yaml",
);
const CONTRACT_ID = "contract";
const contract = loadYaml(readFileSync(CONTRACT_PATH, "utf8")) as OpenApiDoc;

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ ...contract, $id: CONTRACT_ID });

const escapePointer = (segment: string) => segment.replace(/~/g, "~0").replace(/\//g, "~1");

function findOperation(doc: OpenApiDoc, operationId: string) {
  for (const [route, methods] of Object.entries(doc.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (operation.operationId === operationId) return { route, method, operation };
    }
  }
  return undefined;
}

function validate(ref: string, body: unknown, label: string): void {
  const check = ajv.compile({ $ref: ref });
  const ok = check(body);
  expect(ok, `${label}: ${ajv.errorsText(check.errors)}\nbody: ${JSON.stringify(body)}`).toBe(true);
}

/** Asserts a body matches a named schema in contracts/openapi.yaml. */
export function expectSchema(schemaName: string, body: unknown): void {
  validate(`${CONTRACT_ID}#/components/schemas/${schemaName}`, body, `schema ${schemaName}`);
}

/** Asserts a response body matches what the contract declares for an operation and status. */
export function expectResponse(operationId: string, status: number, body: unknown): void {
  const found = findOperation(contract, operationId);
  expect(found, `operation ${operationId} is not in the contract`).toBeDefined();
  if (!found) return;
  const response = found.operation.responses?.[String(status)] as
    | { $ref?: string; content?: Record<string, unknown> }
    | undefined;
  expect(response, `${operationId} declares no ${status} response`).toBeDefined();
  if (!response) return;
  const pointer = response.$ref
    ? `${CONTRACT_ID}${response.$ref}/content/application~1json/schema`
    : `${CONTRACT_ID}#/paths/${escapePointer(found.route)}/${found.method}/responses/${status}/content/application~1json/schema`;
  validate(pointer, body, `${operationId} ${status}`);
}

/** Asserts the running API's generated OpenAPI declares the operation at the contract's route. */
export function expectOperationDeclared(generated: unknown, operationId: string): void {
  const expected = findOperation(contract, operationId);
  const actual = findOperation(generated as OpenApiDoc, operationId);
  expect(actual, `generated OpenAPI lacks operationId ${operationId}`).toBeDefined();
  const normalize = (route: string) => route.replace(/\{[^}]+\}/g, "{}");
  expect(actual && `${actual.method} ${normalize(actual.route)}`).toBe(
    expected && `${expected.method} ${normalize(expected.route)}`,
  );
}
