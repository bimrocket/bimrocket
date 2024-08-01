/**
 * IFC.js
 *
 * @author realor
 */

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
  ifcClass.schema = schema;

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
    return object.children.find(child => child.name === IFC.RepresentationName);
  }

  static generateIFCGlobalId()
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
    if (IFC.SCHEMAS[schemaName]) return schemaName;

    let index = schemaName.indexOf("_");
    if (index !== -1) schemaName = schemaName.substring(0, index);

    const availableSchemaNames = Object.keys(IFC.SCHEMAS).sort();

    for (let availableSchemaName of availableSchemaNames)
    {
      if (schemaName <= availableSchemaName) return availableSchemaName;
    }

    return IFC.DEFAULT_SCHEMA_NAME;
  }
}

window.IFC = IFC;

export { IFC, Constant, registerIfcClass };
