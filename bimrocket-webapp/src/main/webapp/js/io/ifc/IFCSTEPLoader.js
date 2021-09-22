/**
 * IFCStepLoader
 *
 * @author realor
 */

import { IFCLoader } from "./IFCLoader.js";
import { IFC_SCHEMAS } from "./BaseEntity.js";
import { STEPParser, STEPFile } from "../STEP.js";

class IFCSTEPLoader extends IFCLoader
{
	constructor(manager)
  {
    super(manager);
  }

  parseFile(file, text)
  {
    let parser = new STEPParser();
    parser.schema = IFC_SCHEMAS.IFC4; // default schema
    parser.getSchemaTypes = schemaName =>
    {
      schemaName = schemaName.toUpperCase();
      console.info("schema: " + schemaName);
      let schema = IFC_SCHEMAS[schemaName] || IFC_SCHEMAS.IFC4;
      if (schema === undefined) throw "Unsupported schema " + schemaName;
      file.schema = schema;
      return schema;
    };
    parser.onEntityCreated = entity =>
    {
      entity._loader = this;
      file.add(entity);
    };
    parser.parse(text);
  }
};

export { IFCSTEPLoader };
