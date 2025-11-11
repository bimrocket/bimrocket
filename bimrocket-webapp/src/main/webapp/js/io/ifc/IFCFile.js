/**
 * IfcFile
 *
 * @author realor
 */

import { IFC } from "./IFC.js";

class IFCFile
{
  constructor()
  {
    this.schema = IFC.SCHEMAS[IFC.DEFAULT_SCHEMA_NAME];
    this.entitiesByGlobalId = new Map();
    this.entitiesByClass = new Map();
    this.products = [];
    this.typeProducts = [];
    this.relationships = [];
    this.header = {
      filename : "",
      description : [""],
      author : [""],
      organization : [""],
      timeStamp : null,
      schemas : [""]
    };
  }

  getSchemaName()
  {
    return this.schema.IfcRoot.schemaName;
  }

  add(entity)
  {
    // register entity by GlobalId
    if (entity.GlobalId)
    {
      this.entitiesByGlobalId.set(entity.GlobalId, entity);
    }

    // register entity by class
    let ifcClassName = entity.constructor.name;
    let classEntities = this.entitiesByClass.get(ifcClassName);
    if (classEntities === undefined)
    {
      classEntities = [];
      this.entitiesByClass.set(ifcClassName, classEntities);
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

  updateInverseAttributes()
  {
    const schema = this.schema;
    const schemaName = this.getSchemaName();

    const add = (entity, name, element) =>
    {
      if (entity)
      {
        if (entity[name] === null)
        {
          entity[name] = [];
        }
        if (entity[name])
        {
          entity[name].push(element);
        }
      }
    };

    for (let rel of this.relationships)
    {
      if (rel instanceof schema.IfcRelDefinesByType)
      {
        add(rel.RelatingType, "_Types", rel); // IFC4
        for (let relatedObject of rel.RelatedObjects)
        {
          add(relatedObject, "_ObjectTypeOf", rel); // IFC2X3
          add(relatedObject, "_IsTypedBy", rel); // IFC4
        }
      }
      else if (rel instanceof schema.IfcRelAssociatesMaterial)
      {
      }
      else if (rel instanceof schema.IfcRelAssociatesClassification)
      {
        if (schemaName !== "IFC2X3")
        {
          add(rel.RelatingClassification, "_ClassificationRefForObjects", rel);
        }
        for (let relatedObject of rel.RelatedObjects)
        {
          add(relatedObject, "_HasAssociations", rel);
        }
      }
      else if (rel instanceof schema.IfcRelAssignsToGroup)
      {
        add(rel.RelatingGroup, "_IsGroupedBy", rel);
        for (let relatedObject of rel.RelatedObjects)
        {
          add(relatedObject, "_HasAssigments", rel);
        }
      }
      else if (rel instanceof schema.IfcRelAggregates)
      {
        add(rel.RelatingObject, "_IsDecomposedBy", rel);
        for (let relatedObject of rel.RelatedObjects)
        {
          add(relatedObject, "_Decomposes", rel);
        }
      }
      else if (rel instanceof schema.IfcRelContainedInSpatialStructure)
      {
        add(rel.RelatingStructure, "_ContainsElements", rel);
        for (let relatedObject of rel.RelatedElements)
        {
          add(relatedObject, "_ContainedInStructure", rel);
        }
      }
      else if (rel instanceof schema.IfcRelVoidsElement)
      {
        rel.RelatedOpeningElement._VoidsElement = rel;
        add(rel.RelatingBuildingElement, "_HasOpenings", rel);
      }
      else if (rel instanceof schema.IfcRelFillsElement)
      {
        add(rel.RelatedBuildingElement, "_FillsVoids", rel);
        add(rel.RelatingOpeningElement, "_HasFillings", rel);
      }
      else if (rel instanceof schema.IfcRelConnectsPortToElement)
      {
        add(rel.RelatingPort, "_ContainedIn", rel);
        add(rel.RelatedElement, "_HasPorts", rel);
      }
      else if (rel instanceof schema.IfcRelDefinesByProperties)
      {
        add(rel.RelatingPropertyDefinition, "_PropertyDefinitionOf", rel); // IFC2X3
        add(rel.RelatingPropertyDefinition, "_DefinesOccurrence", rel); // IFC4
        for (let relatedObject of rel.RelatedObjects)
        {
          if (relatedObject instanceof schema.IfcObject)
          {
            add(relatedObject, "_IsDefinedBy", rel);
          }
        }
      }
    }

    const styledItems = this.entitiesByClass.get("IfcStyledItem");
    if (styledItems)
    {
      for (let styledItem of styledItems)
      {
        if (styledItem.Item)
        {
          add(styledItem.Item, "_StyledByItem", styledItem);
        }
      }
    }

    const layerAssignments = this.entitiesByClass.get("IfcPresentationLayerAssignment");
    if (layerAssignments)
    {
      for (let layerAssignment of layerAssignments)
      {
        for (let assignedItem of layerAssignment.AssignedItems)
        {
          add(assignedItem, "_LayerAssignments", layerAssignment);
        }
      }
    }
  }

  findReferencesTo(object)
  {
    const references = [];

    for (let entry of this.entitiesByClass)
    {
      let array = entry[1];
      let attributes = Object.getOwnPropertyNames(array[0])
        .filter(name => !name.startsWith("_"));

      for (let entity of array)
      {
        for (let attribute of attributes)
        {
          let value = entity[attribute];
          if (value === object) references.push(entity);
          else if (value instanceof Array)
          {
            const array = value;
            for (let item of array)
            {
              if (item === object) references.push(entity);
            }
          }
        }
      }
    }
    return references;
  }
};

export { IFCFile };



