/**
 * BaseEntity.js
 *
 * @author realor
 */

const IFC_SCHEMAS = {};
const IFC_HELPERS = {};
const DEFAULT_IFC_SCHEMA_NAME = "IFC4";

class BaseEntity
{
  get helper()
  {
    if (this._helper === undefined)
    {
      let ifcClass = this.constructor;
      while (ifcClass)
      {
        let helperClass = IFC_HELPERS[ifcClass.name + "Helper"];
        if (helperClass)
        {
          this._helper = new helperClass(this);
          break;
        }
        let ifcSuperClass = ifcClass.__proto__;
        ifcClass = ifcSuperClass.name ?
          ifcClass.schema[ifcSuperClass.name] : null;
      }
    }
    return this._helper;
  }

  toJSON()
  {
    let names = Object.getOwnPropertyNames(this);
    let json = { "ifcClassName" : this.constructor.name };
    for (let name of names)
    {
      if (name !== "_helper" && name !== "_loader")
      {
        json[name] = this[name];
      }
    }
    return json;
  }
}

function registerIfcClass(ifcClass)
{
  const schemaName = ifcClass.schemaName;

  let schema = IFC_SCHEMAS[schemaName];
  if (schema === undefined)
  {
    schema = {};
    IFC_SCHEMAS[schemaName] = schema;
  }
  ifcClass.schema = schema;

  const ifcClassName = ifcClass.name;
  schema[ifcClassName] = ifcClass;
  schema[ifcClassName.toUpperCase()] = ifcClass;
}

function registerIfcHelperClass(ifcHelperClass)
{
  IFC_HELPERS[ifcHelperClass.name] = ifcHelperClass;
}

function findBestIfcSchema(schemaName)
{
  if (IFC_SCHEMAS[schemaName]) return schemaName;

  let index = schemaName.indexOf("_");
  if (index !== -1) schemaName = schemaName.substring(0, index);

  const availableSchemaNames = Object.keys(IFC_SCHEMAS).sort();

  for (let availableSchemaName of availableSchemaNames)
  {
    if (schemaName <= availableSchemaName) return availableSchemaName;
  }

  return DEFAULT_IFC_SCHEMA_NAME;
}

export { IFC_SCHEMAS, IFC_HELPERS, DEFAULT_IFC_SCHEMA_NAME,
  BaseEntity, registerIfcClass, registerIfcHelperClass, findBestIfcSchema };


