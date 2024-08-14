/**
 * IFC.js
 *
 * @author realor
 */
import * as THREE from "../../lib/three.module.js";

class Constant
{
  constructor(value)
  {
    this.value = value;
  }
}

function registerIfcClass(ifcClass)
{
  const schemaName = ifcClass.schemaName;

  let schema = IFC.SCHEMAS[schemaName];
  if (schema === undefined)
  {
    schema = {};
    IFC.SCHEMAS[schemaName] = schema;
  }
  const ifcClassName = ifcClass.name;
  schema[ifcClassName] = ifcClass;
  schema[ifcClassName.toUpperCase()] = ifcClass;
}

class IFC
{
  static TypesName = "Types";
  static RepresentationName = "IfcRepresentation";
  static DEFAULT_SCHEMA_NAME = "IFC4";

  static SCHEMAS = {};

  static UNIT_PREFIXES =
  {
    "EXA" : { symbol: "E", factor : 10e17 },
    "PETA" : { symbol : "P", factor: 10e14 },
    "TERA" : { symbol : "T", factor : 10e11 },
    "GIGA" : { symbol : "G", factor : 10e8 },
    "MEGA" : { symbol : "M", factor : 10e5 },
    "KILO" : { symbol : "k", factor : 10e2 },
    "HECTO" : { sybol : "h", factor : 100 },
    "DECA" : { symbol : "da", factor : 10 },
    "DECI" : { symbol : "d", factor : 0.1 },
    "CENTI" : { symbol : "c", factor : 0.01 },
    "MILLI" : { symbol : "m", factor : 0.001 },
    "MICRO" : { symbol : "u", factor : 10e-7 },
    "NANO" : { symbol : "n", factor : 10e-10 },
    "PICO" : { symbol : "p", factor : 10e-13 },
    "FEMTO" : { symbol : "f", factor : 10e-16 },
    "ATTO" : { symbol : "a", factor : 10e-19 }
  };

  static getRepresentation(object)
  {
    return object.children.find(child => child.name === this.RepresentationName);
  }

  static generateIfcGlobalId()
  {
    const base64Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";

    let buffer = new Uint8Array(16);
    window.crypto.getRandomValues(buffer);

    let globalId = "";
    for (let i = 0; i < 16; i += 3)
    {
      globalId += base64Chars[buffer[i] >> 2];
      globalId += base64Chars[((buffer[i] & 0x03) << 4) | (buffer[i + 1] >> 4)];
      globalId += base64Chars[((buffer[i + 1] & 0x0F) << 2) | (buffer[i + 2] >> 6)];
      globalId += base64Chars[buffer[i + 2] & 0x3F];
    }
    return globalId.substring(0, 22);
  }

  static findBestIfcSchemaName(schemaName)
  {
    if (this.SCHEMAS[schemaName]) return schemaName;

    let index = schemaName.indexOf("_");
    if (index !== -1) schemaName = schemaName.substring(0, index);

    const availableSchemaNames = Object.keys(this.SCHEMAS).sort();

    for (let availableSchemaName of availableSchemaNames)
    {
      if (schemaName <= availableSchemaName) return availableSchemaName;
    }

    return this.DEFAULT_SCHEMA_NAME;
  }

  static initIfcObject(object3D, isProject = false)
  {
    if (object3D.type === "Object3D" || isProject)
    {
      // main IFC attributes
      if (!object3D.userData.IFC)
      {
        object3D.userData.IFC = {
          ifcClassName : isProject ? "IfcProject" : "IfcBuildingElementProxy",
          GlobalId : null,
          Name: object3D.name
        };
      }

      // automatic relationships
      const schema = this.SCHEMAS[this.DEFAULT_SCHEMA_NAME];

      let parent = object3D.parent;
      while (parent && parent.userData.IFC === undefined)
      {
        parent = parent.parent;
      }

      const ifcClassName = object3D.userData.IFC?.ifcClassName;
      const parentIfcClassName = parent?.userData.IFC?.ifcClassName;

      const ifcClass = schema[ifcClassName];
      const parentIfcClass = schema[parentIfcClassName];

      if (ifcClass && parentIfcClass)
      {
        let isParentProject = parentIfcClass === schema.IfcProject;
        let isSpatial = ifcClass.prototype instanceof schema.IfcSpatialStructureElement;
        let isParentSpatial = parentIfcClass.prototype instanceof schema.IfcSpatialStructureElement;

        if (isParentProject ||
            isSpatial && isParentSpatial)
        {
          if (!object3D.userData.IFC_rel_aggregated)
          {
            object3D.userData.IFC_rel_aggregated = {};
          }
        }
        if (!isSpatial && isParentSpatial)
        {
          if (!object3D.userData.IFC_rel_contained)
          {
            object3D.userData.IFC_rel_contained = {};
          }
        }
        if (parentIfcClass === schema.IfcOpeningElement &&
            ifcClass.prototype instanceof schema.IfcElement)
        {
          if (!object3D.userData.IFC_rel_fills)
          {
            object3D.userData.IFC_rel_fills = {};
          }
        }
        else if (parentIfcClass.prototype instanceof schema.IfcElement &&
                 ifcClass === schema.IfcOpeningElement)
        {
          if (!object3D.userData.IFC_rel_voids)
          {
            object3D.userData.IFC_rel_voids = {};
          }
        }
      }

      // complete Ifc data
      let dataNames = Object.getOwnPropertyNames(object3D.userData)
        .filter(name => name === "IFC" || name.startsWith("IFC_"));

      for (let dataName of dataNames)
      {
        this.completeIfcData(object3D, dataName);
      }
    }

    for (let child of object3D.children)
    {
      this.initIfcObject(child);
    }
  }

  static completeIfcData(object3D, dataName)
  {
    let ifcData = object3D.userData[dataName];
    if (typeof ifcData !== "object") return;

    let ifcClassName = null;
    let name = null;
    let isRoot = true;
    if (dataName === "IFC_rel_aggregated")
    {
      ifcClassName = "IfcRelAggregates";
      name = "Aggregates";
    }
    else if (dataName === "IFC_rel_contained")
    {
      ifcClassName = "IfcRelContainedInSpatialStructure";
      name = "Contains";
    }
    else if (dataName === "IFC_rel_fills")
    {
      ifcClassName = "IfcRelFillsElement";
      name = "Fills";
    }
    else if (dataName === "IFC_rel_voids")
    {
      ifcClassName = "IfcRelVoidsElement";
      name = "Voids";
    }
    else if (dataName === "IFC_type")
    {
      // TODO: complete
    }
    else if (dataName === "IFC_group")
    {
      // TODO: complete
    }
    else if (dataName === "IFC_material_layerset")
    {
      ifcClassName = "IfcMaterialLayerSet";
      isRoot = false;
    }
    else if (dataName.startsWith("IFC_material_layer"))
    {
      ifcClassName = "IfcMaterialLayer";
      isRoot = false;
    }
    else if (dataName.startsWith("IFC_") &&
            !dataName.startsWith("IFC_rel_")) // property set
    {
      ifcClassName = "IfcPropertySet";
      let psetName = dataName.substring(4).trim();
      let relDataName = "IFC_rel_" + psetName;
      if (!object3D.userData[relDataName])
      {
        object3D.userData[relDataName] = {
          ifcClassName : "IfcRelDefinesByProperties",
          GlobalId : IFC.generateIfcGlobalId()
        };
      }
    }

    if (ifcClassName && typeof ifcData.ifcClassName !== "string")
    {
      ifcData.ifcClassName = ifcClassName;
    }
    if (isRoot)
    {
      if (typeof ifcData.GlobalId !== "string")
      {
        ifcData.GlobalId = this.generateIfcGlobalId();
      }
      if (typeof ifcData.Name !== "string")
      {
        ifcData.Name = name;
      }
    }
  }
}

window.IFC = IFC;

export { IFC, Constant, registerIfcClass };
