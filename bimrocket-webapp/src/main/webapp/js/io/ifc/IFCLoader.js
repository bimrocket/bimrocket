/**
 * IfcLoader.js
 *
 * @author realor
 */

import { IFC } from "./IFC.js";
import { IFCFile } from "./IFCFile.js";
import { Solid } from "../../core/Solid.js";
import { ObjectUtils } from "../../utils/ObjectUtils.js";
import { WebUtils } from "../../utils/WebUtils.js";
import { schema as IFC2X3 } from "./schemas/IFC2x3.js";
import { schema as IFC4 } from "./schemas/IFC4.js";
import * as THREE from "../../lib/three.module.js";

const IFC_SCHEMAS = {};
IFC_SCHEMAS.IFC2X3 = IFC2X3;
IFC_SCHEMAS.IFC4 = IFC4;

class IFCLoader extends THREE.Loader
{
	constructor(manager)
  {
    super(manager);
  }

  load(url, onLoad, onProgress, onError)
  {
    const loader = new THREE.FileLoader(this.manager);
    loader.load(url, text => onLoad(this.parse(text)), onProgress, onError);
  }

  parse(text, onCompleted, onProgress, onError)
  {
    let file = new IFCFile();

    console.info("parsing file...");

    this.parseFile(file, text);

    console.info(file);

    return this.buildModel(file, onCompleted, onProgress, onError,
      this.options);
  }

  parseFile(file, text)
  {
    throw "Not implemented";
  }

  buildModel(file, onCompleted, onProgress, onError, options)
  {
    const model = new THREE.Group();

    const schema = file.schema;

    /* process project info */
    const processProjectInfo = function()
    {
      IFC.modelFactor = 1.0;

      if (file.entities.IfcProject)
      {
        let project = file.entities.IfcProject[0];

        model.name = project.Name || project.LongName || "IFC";
        model._ifc = project;
        model.userData.IFC = {
          ifcClassName : "IfcProject",
          GlobalId : project.GlobalId,
          Name: project.Name,
          Description : project.Description
        };
        let contextUnits = project.UnitsInContext;
        if (contextUnits)
        {
          let units = contextUnits.Units;
          if (units)
          {
            for (let u = 0; u < units.length; u++)
            {
              let unit = units[u];
              if (unit instanceof schema.IfcSIUnit &&
                  unit.UnitType === '.LENGTHUNIT.')
              {
                // unit name = METRE
                let scale = 1;

                if (unit.Prefix)
                {
                  let factor = IFC.FACTOR_PREFIX[unit.Prefix] || 1;
                  IFC.modelFactor = factor; // factor respect metre
                  scale = factor;
                }
                let appUnits = options.units || "m";
                if (appUnits === "cm")
                {
                  scale *= 100;
                }
                else if (appUnits === "mm")
                {
                  scale *= 1000;
                }
                else if (appUnits === "in")
                {
                  scale *= 39.3701;
                }
                model.scale.x = scale;
                model.scale.y = scale;
                model.scale.z = scale;
                model.updateMatrix();
              }
            }
          }
        }
      }
    };

    /* applyStyles */
    const applyStyles = () =>
    {
      let styledItems = file.entities.IfcStyledItem;
      if (styledItems)
      {
        for (let i = 0; i < styledItems.length; i++)
        {
          let styledItem = styledItems[i];
          styledItem.helper.applyStyle();
        }
      }
    };

    /* create objects */
    const createObject = index =>
    {
      let product = file.products[index];
      let object3D = product.helper.getObject3D();
      if (product.ObjectPlacement instanceof schema.IfcLocalPlacement)
      {
        let matrixWorld = product.ObjectPlacement.helper.getMatrixWorld();
        matrixWorld.decompose(object3D.position,
          object3D.quaternion, object3D.scale);
        object3D.matrix.copy(matrixWorld);
        object3D.matrixWorldNeedsUpdate = true;
        model.add(object3D);
      }
    };

    const createObjects = () =>
    {
      let products = file.products;
      for (let i = 0; i < products.length; i++)
      {
        createObject(i);
      }
    };

    /* process relationships */
    const processRelationships = () =>
    {
      let relationships = file.relationships;
      for (let relationship of relationships)
      {
        relationship.helper.relate();
      }
      model.updateMatrixWorld();
    };

    /* process layer assigments */
    const processLayerAssignments = () =>
    {
      let assignments = file.entities.IfcPresentationLayerAssignment;
      if (assignments)
      {
        for (let assignment of assignments)
        {
          assignment.helper.assign();
        }
      }
      model.updateMatrixWorld();
    };

    /* voiding objects */
    const voidObject = index =>
    {
      let product = file.products[index];
      let openings = product.helper.openings;
      if (openings.length > 0)
      {
        let productObject3D = product.helper.getObject3D();
        let productRepr =
          productObject3D.getObjectByName(IFC.RepresentationName);

        if (productRepr instanceof Solid &&
            (productRepr.geometry.faces.length <= 24 ||
             productRepr.userData.IFC.ifcClassName === "IfcExtrudedAreaSolid" ||
             productRepr.userData.IFC.ifcClassName === "IfcBooleanResult" ||
             productRepr.userData.IFC.ifcClassName === "IfcBooleanClippingResult"))
        {
          let parts = [];
          for (var op = 0; op < openings.length; op++)
          {
            let opening = openings[op];
            let openingObject3D = opening.helper.getObject3D();
            let openingRepr = openingObject3D.getObjectByName(
              IFC.RepresentationName);
            if (openingRepr instanceof Solid)
            {
              parts.push(openingRepr);
            }
            else if (openingRepr instanceof THREE.Group)
            {
              for (let i = 0; i < openingRepr.children.length; i++)
              {
                let child = openingRepr.children[i];
                if (child instanceof Solid)
                {
                  parts.push(child);
                }
              }
            }
          }
          productRepr.subtract(parts);
        }
      }
    };

    const voidObjects = function()
    {
      let products = file.products;
      for (let i = 0; i < products.length; i++)
      {
        voidObject(i);
      }
    };

    /* setup objects */
    const setupObjects = function()
    {
      model.traverse(function(object)
      {
        if (object.userData.IFC)
        {
          var ifcClassName = object.userData.IFC.ifcClassName;
          if (ifcClassName === "IfcOpeningElement" ||
              ifcClassName === "IfcSpace")
          {
            object = object.getObjectByName(IFC.RepresentationName);
            if (object)
            {
              ObjectUtils.updateStyle(object, false, false);
            }
          }
          else if (ifcClassName === "IfcSite" ||
            ifcClassName === "IfcBuilding" ||
            ifcClassName === "IfcBuildingStorey")
          {
            object.userData.selection.type = "box";
          }
          else if (ifcClassName === "IfcDoor")
          {
            object.userData.collision = { enabled : false };
          }
        }
      });
    };

    const paintObject = function(object, material)
    {
      object.traverse(function(object)
      {
        if (object instanceof Solid)
        {
          if (object.material === Solid.FaceMaterial)
          {
            object.material = material;
          }
        }
      });
    };

    const paintObjects = function()
    {
      let products = file.products;
      for (let i = 0; i < products.length; i++)
      {
        let product = products[i];
        let object3D = product.helper.getObject3D();
        if (object3D && object3D.userData && object3D.userData.IFC)
        {
          let reprObject3D = object3D.getObjectByName(
            IFC.RepresentationName);
          if (reprObject3D)
          {
            let ifcClassName = object3D.userData.IFC.ifcClassName;
            let material = IFC.MATERIALS[ifcClassName];
            if (material)
            {
              paintObject(reprObject3D, material);
            }
          }
        }
      }
    };

    // group objects
    const groupObjects = function()
    {
      let storeys = file.entities.IfcBuildingStorey;
      if (storeys)
      {
        for (let i = 0; i < storeys.length; i++)
        {
          let groups = {};
          let storey = storeys[i];
          let storeyObject3D = storey.helper.getObject3D();
          if (storeyObject3D)
          {
            let children = storeyObject3D.children.slice(0);
            for (let j = 0; j < children.length; j++)
            {
              let child = children[j];
              let ifc = child.userData.IFC;
              if (ifc)
              {
                let group = groups[ifc.ifcClassName];
                if (group === undefined)
                {
                  group = new THREE.Group();
                  group.name = ifc.ifcClassName;
                  groups[ifc.ifcClassName] = group;
                }
                group.add(child);
              }
            }
            let types = Object.getOwnPropertyNames(groups);
            types = types.sort();
            for (let j = 0; j < types.length; j++)
            {
              let group = groups[types[j]];
              storeyObject3D.add(group);
            }
          }
        }
      }
    };

    if (onCompleted)
    {
      // asynchronous operation

      const getIterations = function()
      {
        return file.products.length;
      };

      WebUtils.executeTasks([
        { run : processProjectInfo, message : "Processing project info..."},
        { run : applyStyles, message : "Applying styles..."},
        { run : createObject, message : "Creating objects...", iterations : getIterations},
        { run : processRelationships, message : "Processing relationships..."},
        { run : processLayerAssignments, message : "Processing layers..."},
        { run : voidObject, message : "Voiding objects...", iterations : getIterations},
        { run : setupObjects, message : "Setting object properties..."},
        { run : paintObjects, message : "Painting objects..."},
        { run : groupObjects, message : "Grouping objects..."}],
        () => onCompleted(model), onProgress, error => { console.info(error); onError(error); }, 100, 10);
    }
    else
    {
      // synchronous operation
      processProjectInfo();
      applyStyles();
      createObjects();
      processRelationships();
      processLayerAssignments();
      voidObjects();
      setupObjects();
      paintObjects();
      groupObjects();
    }
    return model;
  }
}

export { IFCLoader, IFC_SCHEMAS };
