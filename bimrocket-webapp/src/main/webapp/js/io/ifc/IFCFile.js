/**
 * IfcFile
 *
 * @author realor
 */

import { IFC_SCHEMAS } from "./BaseEntity.js";

class IFCFile
{
  constructor()
  {
    this.schema = IFC_SCHEMAS.IFC4;
    this.entities = {};
    this.products = [];
    this.typeProducts = [];
    this.relationships = [];
  }

  add(entity)
  {
    let entities = this.entities;
    let ifcClassName = entity.constructor.name;
    let classEntities = entities[ifcClassName];
    if (classEntities === undefined)
    {
      classEntities = [];
      entities[ifcClassName] = classEntities;
    }
    classEntities.push(entity);

    if (entity instanceof this.schema.IfcProduct)
    {
      this.products.push(entity);
    }
    else if (entity instanceof this.schema.IfcTypeProduct)
    {
      this.typeProducts.push(entity);
    }
    else if (entity instanceof this.schema.IfcRelationship)
    {
      this.relationships.push(entity);
    }
  }
};

export { IFCFile };



