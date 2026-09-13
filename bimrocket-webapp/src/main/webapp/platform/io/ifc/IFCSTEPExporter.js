/**
 * IFCSTEPExporter.js
 *
 * @author realor
 */

import { IFCExporter } from "./IFCExporter.js";
import { STEPWriter } from "../STEP.js";
import { IFC, Constant } from "./IFC.js";

class IFCSTEPExporter extends IFCExporter
{
  constructor()
  {
    super();
  }

  exportFile(ifcFile)
  {
    const writer = new class IFCSTEPWriter extends STEPWriter
    {
      constructor()
      {
        super();
      }

      createEntityTag(entity)
      {
        const tag = super.createEntityTag(entity);
        entity._id = tag;
        return tag;
      }
    };

    writer.schemaName = ifcFile.header.schemas[0] || IFC.DEFAULT_SCHEMA_NAME;
    writer.constantClass = Constant;

    writer.header.fileName.Name = ifcFile.header.filename || "model";
    writer.header.fileName.Author = ifcFile.header.author || [""];
    writer.header.fileName.Organization = ifcFile.header.organization || [""];
    writer.header.fileDescription.Description = ifcFile.header.description || ["model"];
    writer.header.fileSchema.Schemas = ifcFile.header.schemas || [IFC.DEFAULT_SCHEMA_NAME];

    let entry;

    // IfcRoots first (and dependent entities)
    for (entry of ifcFile.entitiesByGlobalId)
    {
      let entity = entry[1];
      writer.addEntities(entity);
    }

    // Other entities
    for (entry of ifcFile.entitiesByClass)
    {
      let entity = entry[1];
      if (!entity.GlobalId)
      {
        writer.addEntities(entity);
      }
    }
    const output = writer.write();

    return output;
  }
}

export { IFCSTEPExporter };
