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
    this.entitiesByGlobalId = {};
    this.entitiesByClass = {};
    this.products = [];
    this.typeProducts = [];
    this.relationships = [];
  }

  add(entity)
  {
    // register entity by GlobalId
    this.entitiesByGlobalId[entity.GlobalId] = entity;

    // register entity by class
    let ifcClassName = entity.constructor.name;
    let classEntities = this.entitiesByClass[ifcClassName];
    if (classEntities === undefined)
    {
      classEntities = [];
      this.entitiesByClass[ifcClassName] = classEntities;
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



