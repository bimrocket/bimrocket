/**
 * IFCSTEPLoader
 *
 * @author realor
 */

import { IFCLoader } from "./IFCLoader.js";
import { IFCFile } from "./IFCFile.js";
import { STEPParser, HEADER_SCHEMA } from "../STEP.js";
import { IFC, Constant } from "./IFC.js";

class IFCSTEPLoader extends IFCLoader
{
	constructor(manager)
  {
    super(manager);
  }

  parseFile(text)
  {
    const ifcFile = new IFCFile();

    const parser = new class IFCSTEPParser extends STEPParser
    {
      constructor()
      {
        super();
        // set default schema
        this.schema = IFC.SCHEMAS[IFC.DEFAULT_SCHEMA_NAME];
        this.constantClass = Constant;
      }

      getSchemaTypes(schemaName)
      {
        schemaName = schemaName.toUpperCase();
        console.info("Model schema: " + schemaName);

        let parseSchemaName = IFC.findBestIfcSchemaName(schemaName);

        if (schemaName !== parseSchemaName)
        {
          console.warn("Using schema " + parseSchemaName);
        }

        let schema = IFC.SCHEMAS[parseSchemaName];

        ifcFile.schema = schema;
        return schema;
      }

      setHeader(entity)
      {
        if (entity instanceof HEADER_SCHEMA.FILE_NAME)
        {
          ifcFile.filename = entity;
        }
        else if (entity instanceof HEADER_SCHEMA.FILE_DESCRIPTION)
        {
          ifcFile.description = entity;
        }
      }

      addEntity(entity)
      {
        ifcFile.add(entity);
      }
    };

    parser.parse(text);

    return ifcFile;
  }
};

export { IFCSTEPLoader };
