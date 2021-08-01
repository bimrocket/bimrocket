/**
 * IFCStepLoader
 *
 * @author realor
 */

import { IFCLoader, IFC_SCHEMAS } from "./IFCLoader.js";
import { STEPParser, STEPFile } from "../STEP.js";

class IFCSTEPLoader extends IFCLoader
{
	constructor(manager)
  {
    super(manager);
  }

  loadFile(file, text)
  {
    let parser = new STEPParser();
    parser.schema = IFC_SCHEMAS.IFC4; // default schema
    parser.getSchemaTypes = schemaName =>
    {
      schemaName = schemaName.toUpperCase();
      console.info("schema: " + schemaName);
      let schema = IFC_SCHEMAS[schemaName] || IFC_SCHEMAS.IFC4;
      file.schema = schema;
      return schema;
    };
    parser.onEntityCreated = entity =>
    {
      file.add(entity);
    };
    parser.parse(text);
  }
};

export { IFCSTEPLoader };
