import AjvPkg from "ajv";
import type { ErrorObject, ValidateFunction } from "ajv";
import { SchemaValidationError } from "../types.js";

const ajv = new (AjvPkg as unknown as new (opts?: object) => {
  compile: (schema: object) => ValidateFunction;
})({ allErrors: true, strict: false });

export function validateDataAgainstSchema(
  data: Record<string, unknown>,
  schema: object,
): void {
  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (!ok) {
    throw new SchemaValidationError(
      "Data does not match JSON Schema",
      validate.errors as ErrorObject[],
    );
  }
}
