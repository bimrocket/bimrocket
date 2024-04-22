/**
 * IFCStepLoader
 *
 * @author realor
 */

import { IFCLoader } from "./IFCLoader.js";
import { IFC_SCHEMAS, DEFAULT_IFC_SCHEMA_NAME, findBestIfcSchema } from "./BaseEntity.js";
import { STEPParser, STEPFile } from "../STEP.js";

class IFCSTEPLoader extends IFCLoader
{
	constructor(manager)
  {
    super(manager);
  }

  parseFile(ifcFile, text)
  {
    let parser = new STEPParser();
    // set default schema
    parser.schema = IFC_SCHEMAS[DEFAULT_IFC_SCHEMA_NAME];

    parser.getSchemaTypes = schemaName =>
    {
      schemaName = schemaName.toUpperCase();
      console.info("Model schema: " + schemaName);

      let parseSchemaName = findBestIfcSchema(schemaName);

      if (schemaName !== parseSchemaName)
      {
        console.warn("Using schema " + parseSchemaName);
      }

      let schema = IFC_SCHEMAS[parseSchemaName];

      ifcFile.schema = schema;
      return schema;
    };

    parser.onEntityCreated = entity =>
    {
      entity._loader = this;
      ifcFile.add(entity);
    };
    parser.parse(text);
  }
};

export { IFCSTEPLoader };
