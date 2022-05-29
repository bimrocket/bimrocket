/**
 * IfcLoader.js
 *
 * @author realor
 */

import { IFC } from "./IFC.js";
import { IFCFile } from "./IFCFile.js";
import { Cord } from "../../core/Cord.js";
import { CordGeometry } from "../../core/CordGeometry.js";
import { Profile } from "../../core/Profile.js";
import { ProfileGeometry } from "../../core/ProfileGeometry.js";
import { Solid } from "../../core/Solid.js";
import { SolidGeometry } from "../../core/SolidGeometry.js";
import { ObjectBuilder } from "../../builders/ObjectBuilder.js";
import { Cloner } from "../../builders/Cloner.js";
import { Extruder } from "../../builders/Extruder.js";
import { BooleanOperator } from "../../builders/BooleanOperator.js";
import { RectangleBuilder } from "../../builders/RectangleBuilder.js";
import { RectangleHollowBuilder } from "../../builders/RectangleHollowBuilder.js";
import { CircleBuilder } from "../../builders/CircleBuilder.js";
import { CircleHollowBuilder } from "../../builders/CircleHollowBuilder.js";
import { EllipseBuilder } from "../../builders/EllipseBuilder.js";
import { IProfileBuilder } from "../../builders/IProfileBuilder.js";
import { LProfileBuilder } from "../../builders/LProfileBuilder.js";
import { TProfileBuilder } from "../../builders/TProfileBuilder.js";
import { UProfileBuilder } from "../../builders/UProfileBuilder.js";
import { ZProfileBuilder } from "../../builders/ZProfileBuilder.js";
import { TrapeziumBuilder } from "../../builders/TrapeziumBuilder.js";
import { IFCVoider } from "../../builders/IFCVoider.js";
import { GeometryUtils } from "../../utils/GeometryUtils.js";
import { WebUtils } from "../../utils/WebUtils.js";
import { ObjectUtils } from "../../utils/ObjectUtils.js";
import { registerIfcHelperClass } from "./BaseEntity.js";
import * as THREE from "../../lib/three.module.js";

class IFCLoader extends THREE.Loader
{
  static options =
  {
    units : "m", // default model units
    minCircleSegments : 16, // minimum circle segments
    circleSegmentsByRadius : 64, // circle segments by meter of radius
    halfSpaceSize : 30 // half space size in meters
  };

  constructor(manager)
  {
    super(manager);
  }

  load(url, onLoad, onProgress, onError, options)
  {
    const fileLoader = new THREE.FileLoader(this.manager);
    fileLoader.load(url,
      text => this.parse(text, onLoad, onProgress, onError, options),
      onProgress, onError);
  }

  parse(text, onCompleted, onProgress, onError, options)
  {
    this.options = Object.assign({}, IFCLoader.options, options);

    let ifcFile = new IFCFile();

    console.info("parsing file...");

    this.parseFile(ifcFile, text);

    console.info(ifcFile);

    return this.buildModel(ifcFile, onCompleted, onProgress, onError);
  }

  parseFile(ifcFile, text)
  {
    throw "Not implemented";
  }

  buildModel(ifcFile, onCompleted, onProgress, onError)
  {
    const model = new THREE.Group();
    const types = new THREE.Group();
    types.name = "Types";
    types.visible = false;
    types.userData.selection = { type : "none" };
    model.add(types);

    this.modelFactor = 1.0;
    this.blockCount = 0;
    this.blocks = new Set();

    const schema = ifcFile.schema;

    /* process project info */
    const processProjectInfo = () =>
    {
      if (ifcFile.entities.IfcProject)
      {
        let project = ifcFile.entities.IfcProject[0];

        model.name = project.Name || project.LongName || "IFC";
        model._ifc = project;
        model.userData.IFC = {
          ifcClassName : "IfcProject",
          GlobalId : project.GlobalId,
          Name: this.unBox(project.Name),
          Description : this.unBox(project.Description)
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
                let factor = 1;

                if (unit.Prefix)
                {
                  let prefix = IFC.UNIT_PREFIXES[unit.Prefix];
                  if (prefix)
                  {
                    // set factor respect metre unit
                    factor = prefix.factor;
                    model.userData.units = prefix.symbol + "m";
                  }
                }
                else
                {
                  // meters
                  model.userData.units = "m";
                }
                project._loader.modelFactor = factor;
              }
            }
          }
        }
      }
    };

    /* applyStyles */
    const applyStyles = () =>
    {
      let styledItems = ifcFile.entities.IfcStyledItem;
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
      let product = ifcFile.products[index];
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
      else
      {
        model.add(object3D);
      }
    };

    const createObjects = () =>
    {
      let products = ifcFile.products;
      for (let i = 0; i < products.length; i++)
      {
        createObject(i);
      }
    };

    /* process relationships */
    const processRelationships = () =>
    {
      let relationships = ifcFile.relationships;
      for (let relationship of relationships)
      {
        relationship.helper.relate();
      }
      model.updateMatrixWorld();
    };

    /* process layer assigments */
    const processLayerAssignments = () =>
    {
      let assignments = ifcFile.entities.IfcPresentationLayerAssignment;
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
      let product = ifcFile.products[index];
      let productObject3D = product.helper.getObject3D();
      if (productObject3D)
      {
        let productRepr =
          productObject3D.getObjectByName(IFC.RepresentationName);

        if (productRepr && productRepr.builder instanceof IFCVoider)
        {
          ObjectBuilder.build(productRepr);
        }
      }
    };

    const voidObjects = () =>
    {
      let products = ifcFile.products;
      for (let i = 0; i < products.length; i++)
      {
        voidObject(i);
      }
    };

    const processTypeProducts = () =>
    {
      let typeProducts = ifcFile.typeProducts;
      for (let typeProduct of typeProducts)
      {
        if (typeProduct.RepresentationMaps &&
            typeProduct.RepresentationMaps.length > 0)
        {
          const reprMap = typeProduct.RepresentationMaps[0];
          const mappedObject3D = reprMap.helper.getObject3D();
          if (mappedObject3D && mappedObject3D.parent === null)
          {
            let typeName = typeProduct.Name || typeProduct.GlobalId;
            if (typeName.startsWith(THREE.Object3D.HIDDEN_PREFIX))
            {
              typeName = typeName.substring(1);
            }
            let typeGroup = new THREE.Group();
            typeGroup.name = typeName;
            typeGroup._ifc = typeProduct;
            typeGroup.add(mappedObject3D);
            typeGroup.userData.IFC =
            {
              ifcClassName: typeProduct.constructor.name,
              GlobalId : typeProduct.GlobalId,
              Name : this.unBox(typeProduct.Name)
            };
            types.add(typeGroup);

            this.blocks.delete(mappedObject3D);
          }
        }
      }
      // rest of blocks
      for (let mappedObject3D of this.blocks)
      {
        types.add(mappedObject3D);
      }
    };

    /* setup objects */
    const setupObjects = () =>
    {
      model.traverse(object =>
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
      if (types.children.length > 0)
      {
        ObjectUtils.updateVisibility(types, false);
      }
    };

    const paintObject = (object, material) =>
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

    const setCastShadowForObject = (object) =>
    {
      object.traverse(function(object)
      {
        if (object instanceof Solid)
        {
          if (object.material.transparent)
          {
            object.castShadow = false;
          }
        }
      });
    };

    const paintObjects = () =>
    {
      let products = ifcFile.products;
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
            let material = IFCLoader.MATERIALS[ifcClassName];
            if (material)
            {
              paintObject(reprObject3D, material);
            }
            setCastShadowForObject(reprObject3D);
          }
        }
      }
    };

    // group objects
    const groupObjects = () =>
    {
      const groupObject = object =>
      {
        let groups = {};
        let children = object.children.slice(0); // clone children
        for (let child of children)
        {
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
        let typeNames = Object.getOwnPropertyNames(groups);
        typeNames = typeNames.sort();
        for (let typeName of typeNames)
        {
          let group = groups[typeName];
          object.add(group);
        }
      };

      // group types
      groupObject(types);

      // group storeys
      let storeys = ifcFile.entities.IfcBuildingStorey;
      if (storeys)
      {
        for (let i = 0; i < storeys.length; i++)
        {
          let storey = storeys[i];
          let storeyObject3D = storey.helper.getObject3D();
          if (storeyObject3D)
          {
            groupObject(storeyObject3D);
          }
        }
      }
    };

    if (onCompleted)
    {
      // asynchronous operation

      const getIterations = function()
      {
        return ifcFile.products.length;
      };

      WebUtils.executeTasks([
        { run : processProjectInfo, message : "Processing project info..." },
        { run : applyStyles, message : "Applying styles..." },
        { run : createObject, message : "Creating objects...", iterations : getIterations },
        { run : processRelationships, message : "Processing relationships..." },
        { run : processLayerAssignments, message : "Processing layers..." },
        { run : voidObject, message : "Voiding objects...", iterations : getIterations },
        { run : processTypeProducts, message : "Processing types..." },
        { run : setupObjects, message : "Setting object properties..." },
        { run : paintObjects, message : "Painting objects..." },
        { run : groupObjects, message : "Grouping objects..." }],
        () => onCompleted(model), onProgress, error => onError(error), 100, 10);
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
      processTypeProducts();
      setupObjects();
      paintObjects();
      groupObjects();
    }
    return model;
  }

  unBox(value)
  {
    return value && value.Value !== undefined ? value.Value : value;
  }

  getCircleSegments(radius)
  {
    let meterRadius = radius * this.modelFactor;

    let segments = Math.max(
      this.options.minCircleSegments,
      Math.ceil(this.options.circleSegmentsByRadius * meterRadius));

    if (segments % 2 === 1) segments++;

    return segments;
  }

  cloneObject3D(object, full = false)
  {
    // clone preserving _ifc property
    let clonedObject = object.clone(false);
    clonedObject._ifc = object._ifc;

    if (full)
    {
      const start = object instanceof Solid ? 2 : 0;
      for (let i = start; i < object.children.length; i++)
      {
        let child = object.children[i];
        clonedObject.add(this.cloneObject3D(child, full));
      }
    }
    return clonedObject;
  }

  /* default materials */

  static MATERIALS =
  {
    IfcWall : new THREE.MeshPhongMaterial({
      name : "Wall",
      color: 0xC0C080, shininess: 1,
      flatShading: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1.0,
      polygonOffsetUnits: 0.5 }),

    IfcWallStandardCase : new THREE.MeshPhongMaterial({
      name : "Wall",
      color: 0xC0C080, shininess: 1,
      flatShading: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1.0,
      polygonOffsetUnits: 0.5 }),

    IfcSlab : new THREE.MeshPhongMaterial({
      name : "Slab",
      color: 0xC0C0C0, shininess: 1,
      flatShading: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1.0,
      polygonOffsetUnits: 0.5 }),

    IfcRailing : new THREE.MeshPhongMaterial({
      name : "Railing",
      flatShading: false,
      color: 0x606060,
      shininess: 1,
      side: THREE.DoubleSide }),

    IfcWindow : new THREE.MeshPhongMaterial({
      name : "Window",
      flatShading: false,
      color: 0x8080FF,
      opacity: 0.3,
      transparent: true,
      side: THREE.DoubleSide }),

    IfcDoor : new THREE.MeshPhongMaterial({
      name : "Door",
      flatShading: false,
      color: 0xC0C040,
      side: THREE.DoubleSide }),

    IfcCovering : new THREE.MeshPhongMaterial({
      name : "Covering",
      flatShading: false,
      color: 0xC0C0C0,
      side: THREE.FrontSide }),

    IfcBeam : new THREE.MeshPhongMaterial({
      name : "Beam",
      flatShading: false,
      color: 0x606070,
      side: THREE.FrontSide }),

    IfcColumn : new THREE.MeshPhongMaterial({
      name : "Column",
      flatShading: false,
      color: 0x808080,
      side: THREE.FrontSide }),

    IfcOpeningElement : new THREE.MeshPhongMaterial({
      name : "Opening",
      flatShading: false,
      color: 0x8080FF,
      opacity: 0.2,
      transparent: true,
      side: THREE.DoubleSide }),

    IfcSpace : new THREE.MeshPhongMaterial({
      name : "Space",
      flatShading: false,
      color: 0xC0C0F0,
      opacity: 0.2,
      transparent: true,
      side: THREE.DoubleSide }),

    IfcFlowTerminal : new THREE.MeshPhongMaterial({
      name : "FlowTerminal",
      flatShading: false,
      color: 0xFFFFFF,
      side: THREE.DoubleSide }),

    IfcFurnishingElement : new THREE.MeshPhongMaterial({
      name : "FurnishingElement",
      flatShading: false,
      color: 0xDEB887,
      side: THREE.DoubleSide }),

    IfcStair : new THREE.MeshPhongMaterial({
      name : "FurnishingElement",
      flatShading: false,
      color: 0xA0522D,
      side: THREE.DoubleSide }),

    IfcStairFlight : new THREE.MeshPhongMaterial({
      name : "FurnishingElement",
      flatShading: false,
      color: 0xA0522D,
      side: THREE.DoubleSide })
  };
}

/* helper classes*/

class IfcHelper
{
  constructor(instance)
  {
    this.instance = instance;
  }
};
registerIfcHelperClass(IfcHelper);


class IfcProductHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const product = this.instance;
      const schema = this.instance.constructor.schema;
      const loader = product._loader;

      var object3D = new THREE.Object3D();
      object3D.userData.selection = { group: true };

      let name = product.Name ?
        product.Name : product.constructor.name;

      if (name.length >= 2 && name[0] === THREE.Object3D.HIDDEN_PREFIX)
      {
        name = name.substring(1);
      }

      object3D.name = name;
      object3D.userData.IFC = {
        ifcClassName : product.constructor.name,
        GlobalId : product.GlobalId,
        Name: loader.unBox(product.Name),
        Description : loader.unBox(product.Description)
      };
      object3D._ifc = product;

      let objectPlacement = product.ObjectPlacement;
      if (objectPlacement instanceof schema.IfcLocalPlacement)
      {
        let matrix = objectPlacement.helper.getMatrix();
        matrix.decompose(object3D.position,
          object3D.quaternion, object3D.scale);
        object3D.matrix.copy(matrix);
        object3D.matrixWorldNeedsUpdate = true;
      }

      let productRepr = product.Representation;
      if (productRepr instanceof schema.IfcProductRepresentation)
      {
        let reprObject3D = productRepr.helper.getObject3D("Body");
        if (reprObject3D)
        {
          if (reprObject3D.parent)
          {
            reprObject3D = loader.cloneObject3D(reprObject3D, true);
          }

          reprObject3D.name =  IFC.RepresentationName;

          let ifcClassName = null;
          if (reprObject3D.userData.IFC)
          {
            ifcClassName = reprObject3D.userData.IFC.ifcClassName;
          }

          if (product instanceof schema.IfcElement
              && !(product instanceof schema.IfcOpeningElement)
              && (ifcClassName === "IfcExtrudedAreaSolid"
                  || ifcClassName === "IfcBooleanResult"
                  || ifcClassName === "IfcBooleanClippingResult"))
          {
            // set IFCVoider representation
            if (reprObject3D instanceof Solid)
            {
              let voider = new Solid();
              voider.name = IFC.RepresentationName;
              voider.material = reprObject3D.material;
              voider.userData = reprObject3D.userData;
              voider.position.copy(reprObject3D.position);
              voider.rotation.copy(reprObject3D.rotation);
              voider.scale.copy(reprObject3D.scale);
              voider.updateMatrix();
              voider.builder = new IFCVoider();
              voider.add(reprObject3D);
              reprObject3D.name = "Unvoided";
              reprObject3D.visible = false;
              reprObject3D.facesVisible = false;
              reprObject3D.edgesVisible = false;
              reprObject3D.position.set(0, 0, 0);
              reprObject3D.rotation.set(0, 0, 0);
              reprObject3D.scale.set(1, 1, 1);
              reprObject3D.updateMatrix();
              object3D.add(voider);
            }
            else if (reprObject3D instanceof THREE.Group)
            {
              reprObject3D.builder = new IFCVoider();
              object3D.add(reprObject3D);
            }
            else throw "Unexpected representacion object";
          }
          else
          {
            object3D.add(reprObject3D);
          }
        }
      }
      this.object3D = object3D;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcProductHelper);


class IfcProductRepresentationHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D(representationIdentifier)
  {
    var reprObject3D = null;
    var productRepr = this.instance;

    var repCount = productRepr.Representations.length;
    for (var i = 0; i < repCount; i++)
    {
      var repr = productRepr.Representations[i]; // IfcRepresentation
      if (repr.RepresentationIdentifier === representationIdentifier)
      {
        reprObject3D = repr.helper.getObject3D();
        if (reprObject3D === null)
        {
          console.warn("Unsupported representation",
            representationIdentifier, repr);
        }
        break;
      }
    }
    return reprObject3D;
  }
};
registerIfcHelperClass(IfcProductRepresentationHelper);


class IfcRepresentationHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      var representation = this.instance;

      var group = new THREE.Group();
      for (var i = 0; i < representation.Items.length; i++)
      {
        var item = representation.Items[i];
        if (item && item.helper.getObject3D)
        {
          var itemObject3D = item.helper.getObject3D();
          if (itemObject3D)
          {
            itemObject3D.name = "Item" + i;
            itemObject3D.userData.IFC =
              {"ifcClassName" : item.constructor.name};
            group.add(itemObject3D);
            if (itemObject3D instanceof Solid && item.helper.material)
            {
              itemObject3D.material = item.helper.material;
            }
          }
        }
      }
      if (group.children.length === 1)
      {
        this.object3D = group.children[0];
        group.remove(this.object3D);
      }
      else
      {
        this.object3D = group;
      }
      this.object3D._ifc = representation;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcRepresentationHelper);


/* Geometric representation item helpers */

class IfcGeometricRepresentationItemHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.object3D = null;
  }

  getObject3D()
  {
    let ifcClassName = this.instance.constructor.name;
    console.warn("Unsupported item: " + ifcClassName, this);
    return null;
  }
};
registerIfcHelperClass(IfcGeometricRepresentationItemHelper);


class IfcHalfSpaceSolidHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const halfSpace = this.instance;

      const size = halfSpace._loader.options.halfSpaceSize /
        halfSpace._loader.modelFactor;

      const surface = halfSpace.BaseSurface;
      const flag = halfSpace.AgreementFlag === '.T.';
      const plane = surface.Position;

      const geometry = new SolidGeometry();
      let vertices = geometry.vertices;
      vertices.push(new THREE.Vector3(-size, -size, 0));
      vertices.push(new THREE.Vector3(size, -size, 0));
      vertices.push(new THREE.Vector3(size, size, 0));
      vertices.push(new THREE.Vector3(-size, size, 0));

      vertices.push(new THREE.Vector3(-size, -size, size));
      vertices.push(new THREE.Vector3(size, -size, size));
      vertices.push(new THREE.Vector3(size, size, size));
      vertices.push(new THREE.Vector3(-size, size, size));

      geometry.addFace(3, 2, 1, 0);
      geometry.addFace(4, 5, 6, 7);
      geometry.addFace(0, 1, 5, 4);
      geometry.addFace(1, 2, 6, 5);
      geometry.addFace(2, 3, 7, 6);
      geometry.addFace(3, 0, 4, 7);

      var matrix = plane.helper.getMatrix();
      if (flag)
      {
        matrix = matrix.clone();
        var rotMatrix = new THREE.Matrix4();
        rotMatrix.makeRotationX(Math.PI);
        matrix.multiply(rotMatrix);
      }
      geometry.applyMatrix4(matrix);
      const planeSolid = new Solid(geometry);
      planeSolid.name = "halfSpace";

      this.object3D = planeSolid;
      this.object3D._ifc = halfSpace;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcHalfSpaceSolidHelper);


class IfcPolygonalBoundedHalfSpaceHelper
  extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const halfSpace = this.instance;
      const schema = this.instance.constructor.schema;

      const surface = halfSpace.BaseSurface;
      const base = halfSpace.Position;
      const flag = halfSpace.AgreementFlag === '.T.';
      const boundary = halfSpace.PolygonalBoundary;

      if (surface instanceof schema.IfcPlane)
      {
        try
        {
          const size = halfSpace._loader.options.halfSpaceSize /
            halfSpace._loader.modelFactor;
          const extruder = new Extruder(size);

          // polygon solid
          const curvePoints = boundary.helper.getPoints();
          let shape = new THREE.Shape();
          shape.moveTo(curvePoints[0].x, curvePoints[0].y);
          for (let i = 1; i < curvePoints.length; i++)
          {
            shape.lineTo(curvePoints[i].x, curvePoints[i].y);
          }
          shape.closePath();

          const polygonProfile = new Profile(new ProfileGeometry(shape));
          polygonProfile.name = "polygon";
          polygonProfile.visible = false;
          polygonProfile._ifc = boundary;
          const polygonSolid = new Solid();
          polygonSolid.add(polygonProfile);
          polygonSolid.builder = extruder;

          let matrix = base.helper.getMatrix();
          matrix.decompose(polygonSolid.position, polygonSolid.rotation,
            polygonSolid.scale);
          polygonSolid.updateMatrix();

          // plane solid
          const plane = surface.Position;

          shape = new THREE.Shape();
          shape.moveTo(-size, -size);
          shape.lineTo(size, -size);
          shape.lineTo(size, size);
          shape.lineTo(-size, size);
          shape.closePath();

          let planeProfile = new Profile(new ProfileGeometry(shape));
          planeProfile.name = "plane";
          planeProfile.visible = false;
          let planeSolid = new Solid();
          planeSolid.add(planeProfile);
          planeSolid.builder = extruder;

          matrix = plane.helper.getMatrix();
          if (!flag)
          {
            matrix = matrix.clone();
            let rotMatrix = new THREE.Matrix4();
            rotMatrix.makeRotationX(Math.PI);
            matrix.multiply(rotMatrix);
          }
          matrix.decompose(planeSolid.position, planeSolid.rotation,
            planeSolid.scale);
          planeSolid.updateMatrix();

          let halfSpaceSolid = new Solid();
          halfSpaceSolid.name = "polygonalHalfSpace";
          halfSpaceSolid.add(polygonSolid);
          halfSpaceSolid.add(planeSolid);
          halfSpaceSolid.builder = new BooleanOperator(BooleanOperator.SUBTRACT);
          ObjectBuilder.build(halfSpaceSolid);

          this.object3D = halfSpaceSolid;
          this.object3D._ifc = halfSpace;
        }
        catch (ex)
        {
          console.warn(ex);
        }
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcPolygonalBoundedHalfSpaceHelper);


class IfcBooleanResultHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      var result = this.instance;

      var operator = result.Operator;
      var firstOperand = result.FirstOperand;
      var secondOperand = result.SecondOperand;

      var firstObject = firstOperand.helper.getObject3D();
      var secondObject = secondOperand.helper.getObject3D();
      if (firstObject instanceof Solid && firstOperand.helper.material)
      {
        firstObject.material = firstOperand.helper.material;
      }

      if (firstObject instanceof Solid && secondObject instanceof Solid)
      {
        let oper = "subtract";
        switch (operator)
        {
          case ".UNION.":
            oper = BooleanOperator.UNION;
            break;
          case ".INTERSECTION.":
            oper = BooleanOperator.INTERSECT;
            break;
          case ".DIFFERENCE." :
            oper = BooleanOperator.SUBTRACT;
            break;
          default:
            console.warn("Invalid operator: " + operator.constant);
        }
        let object3D = new Solid();
        object3D.name = oper;
        object3D.builder = new BooleanOperator(oper);
        firstObject.visible = false;
        firstObject.facesVisible = false;
        firstObject.edgesVisible = false;
        secondObject.visible = false;
        secondObject.facesVisible = false;
        secondObject.edgesVisible = false;
        object3D.attach(firstObject);
        object3D.attach(secondObject);
        ObjectBuilder.build(object3D);
        if (object3D.isValid())
        {
          this.object3D = object3D;
          this.object3D.material = firstObject.material;
          this.object3D._ifc = result;
        }
        else
        {
          console.warn("boolean operation failed", result);
          this.object3D = firstObject;
        }
      }
      else
      {
        this.object3D = firstObject || secondObject;
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcBooleanResultHelper);


class IfcTriangulatedFaceSetHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.instance;

      let geometry = new SolidGeometry();

      geometry.vertices = faceSet.Coordinates.helper.getPoints();

      let coordIndex = faceSet.CoordIndex;
      for (let t = 0; t < coordIndex.length; t++)
      {
        let triangle = coordIndex[t];
        let a = triangle[0] - 1;
        let b = triangle[1] - 1;
        let c = triangle[2] - 1;
        geometry.addFace(a, b, c);
      }
      let solid = new Solid();
      solid.updateGeometry(geometry, true);
      this.object3D = solid;
      this.object3D._ifc = faceSet;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcTriangulatedFaceSetHelper);


class IfcPolygonalFaceSetHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.instance;

      let geometry = new SolidGeometry();

      geometry.vertices = faceSet.Coordinates.helper.getPoints();

      let faces = faceSet.Faces;
      for (let f = 0; f < faces.length; f++)
      {
        let face = faces[f];
        let coordIndex = face.CoordIndex;

        let faceIndices = [];
        for (let i = 0; i < coordIndex.length; i++)
        {
          let vertexIndex = coordIndex[i] - 1;  // 1-base index
          faceIndices.push(vertexIndex);
        }
        let geomFace = geometry.addFace(...faceIndices);

        let innerCoordIndices = face.InnerCoordIndices;
        if (innerCoordIndices)
        {
          for (let h = 0; h < innerCoordIndices.length; h++)
          {
            let hole = innerCoordIndices[h];
            let holeIndices = [];
            for (let hv = 0; hv < hole.length; hv++)
            {
              let vertexIndex = hole[hv] - 1; // 1-base index
              holeIndices.push(vertexIndex);
            }
            geomFace.addHole(...holeIndices);
          }
        }
      }
      this.object3D = new Solid(geometry);
      this.object3D._ifc = faceSet;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcPolygonalFaceSetHelper);


class IfcExtrudedAreaSolidHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const solid = this.instance;
      const schema = this.instance.constructor.schema;

      const profileDef = solid.SweptArea;
      const matrix = solid.Position.helper.getMatrix();
      const direction = solid.ExtrudedDirection.helper.getDirection();
      const depth = solid.Depth;

      if (profileDef instanceof schema.IfcProfileDef)
      {
        let profile = profileDef.helper.getProfile();
        if (profile)
        {
          try
          {
            if (profile.parent)
            {
              profile = profile.clone();
            }
            profile._ifc = profileDef;

            let solid = new Solid();
            solid.add(profile);
            solid.builder = new Extruder(depth, direction);
            ObjectBuilder.build(solid);
            solid._ifc = solid;

            if (matrix)
            {
              matrix.decompose(solid.position, solid.quaternion, solid.scale);
              solid.updateMatrix();
            }
            this.object3D = solid;
          }
          catch (ex)
          {
            console.warn(ex);
          }
        }
        else console.warn("Unsupported profile", profileDef);
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcExtrudedAreaSolidHelper);


class IfcSurfaceCurveSweptAreaSolidHelper
  extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const swept = this.instance;
      const profileDef = swept.SweptArea; // IfcProfileDef
      const position = swept.Position; // IfcAxis2Placement3D
      const matrix = position.helper.getMatrix();
      const directrix = swept.Directrix; // IfcCurve
      const startParam = swept.StartParam; // IfcParameterValue : number
      const endParam = swept.EndParam; // IfcParameterValue : number
      const surface = swept.ReferenceSurface; // IfcSurface: ignored

      const cordPoints = directrix.helper.getPoints();
      if (cordPoints)
      {
        const profile = profileDef.helper.getProfile();
        if (profile)
        {
          try
          {
            const solid = new Solid();

            solid.name = "swept";
            solid._ifc = swept;
            solid.builder = new Extruder();
            solid.add(profile);

            const cord = new Cord(new CordGeometry(cordPoints));
            solid.add(cord);

            ObjectBuilder.build(solid);

            if (matrix)
            {
              matrix.decompose(solid.position, solid.quaternion, solid.scale);
              solid.updateMatrix();
            }
            this.object3D = solid;
          }
          catch (ex)
          {
            console.warn(ex);
          }
        }
        else
        {
          console.warn("Unsupported profile", profileDef);
        }
      }
      else
      {
        console.warn("Unsupported curve", directrix);
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcSurfaceCurveSweptAreaSolidHelper);


class IfcSweptDiskSolidHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const swept = this.instance;
      const directrix = swept.Directrix; // IfcCurve
      const radius = swept.Radius;
      const innerRadius = swept.InnerRadius;
      const segments = swept._loader.getCircleSegments(radius);

      try
      {
        this.object3D = new Solid();
        const object3D = this.object3D;

        object3D.name = "disk";
        object3D._ifc = swept;
        object3D.builder = new Extruder();

        const profile = new Profile();

        if (typeof innerRadius === "number")
        {
          profile.builder = new CircleHollowBuilder(radius,
            radius - innerRadius, segments);
        }
        else
        {
          profile.builder = new CircleBuilder(radius, segments);
        }
        object3D.add(profile);

        const cordPoints = directrix.helper.getPoints();
        const cord = new Cord(new CordGeometry(cordPoints));
        object3D.add(cord);

        ObjectBuilder.build(object3D);
      }
      catch (ex)
      {
        console.warn(ex);
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcSweptDiskSolidHelper);


class IfcManifoldSolidBrepHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      var brep = this.instance;

      var outerShell = brep.Outer;
      this.object3D = outerShell.helper.getObject3D();
      this.object3D._ifc = brep;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcManifoldSolidBrepHelper);


class IfcFaceBasedSurfaceModelHelper
  extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      this.object3D = new THREE.Group();
      var surface = this.instance;
      var faceSets = surface.FbsmFaces; // IfcConnectedFaceSet[...]
      for (var i = 0; i < faceSets.length; i++)
      {
        var faceSet = faceSets[i]; // IfcConnectedFaceSet
        var faceSetObject3D = faceSet.helper.getObject3D();
        faceSetObject3D.name = "FaceSet" + i;
        this.object3D.add(faceSetObject3D);
        this.object3D._ifc = surface;
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcFaceBasedSurfaceModelHelper);


class IfcShellBasedSurfaceModelHelper
  extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      this.object3D = new THREE.Group();
      var surface = this.instance;
      var shells = surface.SbsmBoundary; // IfcShell[...]
      for (var i = 0; i < shells.length; i++)
      {
        var shell = shells[i]; // IfcConnectedFaceSet
        var shellObject3D = shell.helper.getObject3D();
        shellObject3D.name = "Shell" + i;
        shellObject3D._ifc = shell;
        this.object3D.add(shellObject3D);
        this.object3D._ifc = surface;
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcShellBasedSurfaceModelHelper);


class IfcRepresentationMapHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const reprMap = this.instance;

      const repr = reprMap.MappedRepresentation; // IfcRepresentation
      const origin = reprMap.MappingOrigin;
      const loader = reprMap._loader;

      let object3D = repr.helper.getObject3D();
      if (object3D.parent)
      {
        // already added to scene, clone it
        object3D = loader.cloneObject3D(object3D, true);
      }

      object3D.name = "block-" + (++loader.blockCount);
      object3D.userData.IFC = { ifcClassName : "IfcRepresentationMap" };
      object3D._ifc = reprMap;
      loader.blocks.add(object3D);

      if (origin)
      {
        let matrix = origin.helper.getMatrix();
        object3D.matrix.multiplyMatrices(matrix, object3D.matrix);
        object3D.matrix.decompose(object3D.position,
          object3D.quaternion, object3D.scale);
        object3D.matrixWorldNeedsUpdate = true;
      }
      this.object3D = object3D;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcRepresentationMapHelper);


class IfcMappedItemHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const mappedItem = this.instance;

      const source = mappedItem.MappingSource; // IfcRepresentationMap
      const target = mappedItem.MappingTarget;
      const loader = mappedItem._loader;

      const mappedObject3D = source.helper.getObject3D();

      if (mappedObject3D)
      {
        const instanceGroup = new THREE.Group();

        if (target)
        {
          let matrix = target.helper.getMatrix();
          matrix.decompose(instanceGroup.position,
            instanceGroup.quaternion, instanceGroup.scale);
          instanceGroup.updateMatrix();
        }
        instanceGroup.builder = new Cloner(mappedObject3D);
        ObjectBuilder.build(instanceGroup);

        this.object3D = instanceGroup;
        this.object3D._ifc = mappedItem;
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcMappedItemHelper);


/* Profile helpers */

class IfcProfileDefHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.profile = null;
  }

  getProfile()
  {
    return this.profile;
  }
};
registerIfcHelperClass(IfcProfileDefHelper);


class IfcParameterizedProfileDefHelper extends IfcProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfile()
  {
    if (this.profile === null)
    {
      const builder = this.getProfileBuilder();
      if (builder)
      {
        const profileDef = this.instance;

        const profile = new Profile();

        let name = builder.constructor.name;
        let index = name.indexOf("Builder");
        if (index !== -1) name = name.substring(0, index);
        profile.name = name;
        profile.builder = builder;

        ObjectBuilder.build(profile);

        const profMat = profileDef.Position.helper.getMatrix();
        profMat.decompose(profile.position, profile.quaternion, profile.scale);
        profile.updateMatrix();

        this.profile = profile;
      }
    }
    return this.profile;
  }

  getProfileBuilder()
  {
    return null;
  }
};
registerIfcHelperClass(IfcParameterizedProfileDefHelper);


class IfcRectangleProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;

    return new RectangleBuilder(profileDef.XDim, profileDef.YDim);
  }
};
registerIfcHelperClass(IfcRectangleProfileDefHelper);


class IfcRectangleHollowProfileDefHelper extends IfcRectangleProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;

    return new RectangleHollowBuilder(
      profileDef.XDim, profileDef.YDim, profileDef.WallThickness);
  }
};
registerIfcHelperClass(IfcRectangleHollowProfileDefHelper);


class IfcCircleProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const radius = profileDef.Radius;
    const segments = profileDef._loader.getCircleSegments(radius);

    return new CircleBuilder(radius, segments);
  }
};
registerIfcHelperClass(IfcCircleProfileDefHelper);


class IfcCircleHollowProfileDefHelper extends IfcCircleProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const radius = profileDef.Radius;
    const thickness = profileDef.WallThickness;
    const segments = profileDef._loader.getCircleSegments(radius);

    return new CircleHollowBuilder(radius, thickness, segments);
  }
};
registerIfcHelperClass(IfcCircleHollowProfileDefHelper);


class IfcEllipseProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const xradius = profileDef.SemiAxis1;
    const yradius = profileDef.SemiAxis2;
    const maxRadius = Math.max(xradius, yradius);
    const segments = profileDef._loader.getCircleSegments(maxRadius);

    return new EllipseBuilder(xradius, yradius, segments);
  }
};
registerIfcHelperClass(IfcEllipseProfileDefHelper);


class IfcIShapeProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const width = profileDef.OverallWidth;
    const height = profileDef.OverallDepth;
    const webThickness = profileDef.WebThickness;
    const flangeThickness = profileDef.FlangeThickness;

    return new IProfileBuilder(width, height, webThickness, flangeThickness);
  }
};
registerIfcHelperClass(IfcIShapeProfileDefHelper);


class IfcLShapeProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const width = profileDef.Width;
    const height = profileDef.Depth;
    const thickness = profileDef.Thickness;

    return new LProfileBuilder(width, height, thickness);
  }
};
registerIfcHelperClass(IfcLShapeProfileDefHelper);


class IfcTShapeProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const flangeWidth = profileDef.FlangeWidth;
    const height = profileDef.Depth;
    const webThickness = profileDef.WebThickness;
    const flangeThickness = profileDef.FlangeThickness;

    return new TProfileBuilder(flangeWidth, height,
      webThickness, flangeThickness);
  }
};
registerIfcHelperClass(IfcTShapeProfileDefHelper);


class IfcUShapeProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const flangeWidth = profileDef.FlangeWidth;
    const height = profileDef.Depth;
    const webThickness = profileDef.WebThickness;
    const flangeThickness = profileDef.FlangeThickness;

    return new UProfileBuilder(flangeWidth, height,
      webThickness, flangeThickness);
  }
};
registerIfcHelperClass(IfcUShapeProfileDefHelper);


class IfcZShapeProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const flangeWidth = profileDef.FlangeWidth;
    const height = profileDef.Depth;
    const webThickness = profileDef.WebThickness;
    const flangeThickness = profileDef.FlangeThickness;

    return new ZProfileBuilder(flangeWidth, height,
      webThickness, flangeThickness);
  }
};
registerIfcHelperClass(IfcZShapeProfileDefHelper);


class IfcTrapeziumProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getProfileBuilder()
  {
    const profileDef = this.instance;
    const bottomXDim = profileDef.BottomXDim;
    const height = profileDef.YDim;
    const topXDim = profileDef.TopXDim;
    const topXOffset = profileDef.TopXOffset;

    return new TrapeziumBuilder(bottomXDim, height, topXDim, topXOffset);
  }
};
registerIfcHelperClass(IfcTrapeziumProfileDefHelper);


class IfcArbitraryClosedProfileDefHelper extends IfcProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
    this.profile = null;
  }

  getProfile()
  {
    if (this.profile === null)
    {
      const profileDef = this.instance;

      const curve = profileDef.OuterCurve; // IfcCurve
      const curvePoints = curve.helper.getPoints();
      if (curvePoints)
      {
        const shape = new THREE.Shape();
        this.addPointsToPath(shape, curvePoints);
        this.profile = new Profile(new ProfileGeometry(shape));
      }
      else
      {
        console.warn("Unsupported curve", curve);
      }
    }
    return this.profile;
  }

  addPointsToPath(path, curvePoints)
  {
    path.moveTo(curvePoints[0].x, curvePoints[0].y);
    for (let i = 1; i < curvePoints.length; i++)
    {
      path.lineTo(curvePoints[i].x, curvePoints[i].y);
    }
    path.closePath();
  }
};
registerIfcHelperClass(IfcArbitraryClosedProfileDefHelper);


class IfcArbitraryProfileDefWithVoidsHelper
  extends IfcArbitraryClosedProfileDefHelper
{
  constructor(instance)
  {
    super(instance);
    this.profile = null;
  }

  getProfile()
  {
    if (this.profile === null)
    {
      const profileDef = this.instance;
      const curve = profileDef.OuterCurve; // IfcCurve
      let curvePoints = curve.helper.getPoints();
      if (curvePoints)
      {
        const shape = new THREE.Shape();
        this.addPointsToPath(shape, curvePoints);

        const innerCurves = profileDef.InnerCurves; // IfcCurve[]
        for (let innerCurve of innerCurves)
        {
          curvePoints = innerCurve.helper.getPoints();
          if (curvePoints)
          {
            let hole = new THREE.Path();
            this.addPointsToPath(hole, curvePoints);
            shape.holes.push(hole);
          }
          else
          {
            console.warn("Unsupported inner curve", innerCurve);
          }
        }
        this.profile = new Profile(new ProfileGeometry(shape));
      }
    }
    return this.profile;
  }
};
registerIfcHelperClass(IfcArbitraryProfileDefWithVoidsHelper);


/* Curve helpers */

class IfcCurveHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.points = null;
  }

  getPoints()
  {
    return this.points;
  }
};
registerIfcHelperClass(IfcCurveHelper);


class IfcPolylineHelper extends IfcCurveHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const polyline = this.instance;

      this.points = [];
      const points = polyline.Points;
      for (let i = 0; i < points.length; i++)
      {
        let point = points[i].helper.getPoint();
        this.points.push(point);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcPolylineHelper);


class IfcIndexedPolyCurveHelper extends IfcCurveHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getPoints()
  {
    const polyCurve = this.instance;
    return polyCurve.Points.helper.getPoints();
  }
};
registerIfcHelperClass(IfcIndexedPolyCurveHelper);


class IfcTrimmedCurveHelper extends IfcCurveHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const curve = this.instance;
      const schema = this.instance.constructor.schema;

      const basisCurve = curve.BasisCurve;
      const trim1 = curve.Trim1[0];
      const trim2 = curve.Trim2[0];
      if (basisCurve instanceof schema.IfcConic &&
          trim1 instanceof schema.IfcParameterValue &&
          trim2 instanceof schema.IfcParameterValue)
      {
        let startAngle = trim1.Value;
        let endAngle = trim2.Value;
        let sense = curve.SenseAgreement === ".T.";
        this.points =
          basisCurve.helper.getTrimmedPoints(startAngle, endAngle, sense);
      }
      else
      {
        console.info("unsupported trimmed curve segment", curve);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcTrimmedCurveHelper);


class IfcCompositeCurveHelper extends IfcCurveHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const compositeCurve = this.instance;
      const schema = this.instance.constructor.schema;

      let points = [];
      let segments = compositeCurve.Segments;
      for (let i = 0; i < segments.length; i++)
      {
        let segment = segments[i]; // IfcCompositeCurveSegment
        let curve = segment.ParentCurve;
        let curvePoints = curve.helper.getPoints();
        if (curvePoints)
        {
          if (segment.SameSense === ".T.")
          {
            for (let j = 0; j < curvePoints.length; j++)
            {
              points.push(curvePoints[j]);
            }
          }
          else
          {
            for (let j = curvePoints.length - 1; j >= 0; j--)
            {
              points.push(curvePoints[j]);
            }
          }
        }
        else
        {
          console.info("unsupported curve segment", curve);
        }
      }
      if (points.length > 0)
      {
        this.points = points;
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcCompositeCurveHelper);


class IfcConicHelper extends IfcCurveHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getTrimmedPoints(param1, param2, sense)
  {
    return this.points;
  }

  generatePoints(startAngle, endAngle, sense, segments, addPoint)
  {
    let angle;
    if (sense) // anti-clockwise
    {
      if (endAngle < startAngle) endAngle += 2 * Math.PI;
      let dif = endAngle - startAngle;
      let divs = Math.ceil(dif * segments / (2 * Math.PI));
      let angleStep = dif / divs;

      angle = startAngle;
      while (divs > 0)
      {
        addPoint(angle);
        angle += angleStep;
        divs--;
      }
      addPoint(endAngle);
    }
    else // clockwise
    {
      if (endAngle > startAngle) startAngle += 2 * Math.PI;

      let dif = startAngle - endAngle;
      let divs = Math.ceil(dif * segments / (2 * Math.PI));
      let angleStep = dif / divs;

      angle = startAngle;
      while (divs > 0)
      {
        addPoint(angle);
        angle -= angleStep;
        divs--;
      }
      addPoint(endAngle);
    }
  }
};
registerIfcHelperClass(IfcConicHelper);


class IfcCircleHelper extends IfcConicHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getPoints()
  {
    if (this.points === null)
    {
      this.points = [];
      const circle = this.instance;
      const matrix = circle.Position.helper.getMatrix();
      const radius = circle.Radius;
      const segments = circle._loader.getCircleSegments(radius);
      const angleStep = 2 * Math.PI / segments;
      for (let i = 0; i < segments; i++)
      {
        let angle = i * angleStep;
        let point = new THREE.Vector3();
        point.x = Math.cos(angle) * radius;
        point.y = Math.sin(angle) * radius;
        point.z = 0;
        point.applyMatrix4(matrix);
        this.points.push(point);
      }
    }
    return this.points;
  }

  getTrimmedPoints(param1, param2, sense)
  {
    let points = [];
    const circle = this.instance;
    const matrix = circle.Position.helper.getMatrix();
    const radius = circle.Radius;
    const startAngle = THREE.MathUtils.degToRad(param1);
    const endAngle = THREE.MathUtils.degToRad(param2);
    const segments = circle._loader.getCircleSegments(radius);

    const addPoint = angle =>
    {
      let point = new THREE.Vector3();
      point.x = Math.cos(angle) * radius;
      point.y = Math.sin(angle) * radius;
      point.z = 0;
      point.applyMatrix4(matrix);
      points.push(point);
    };

    this.generatePoints(startAngle, endAngle, sense, segments, addPoint);

    return points;
  }
};
registerIfcHelperClass(IfcCircleHelper);


class IfcEllipseHelper extends IfcConicHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getPoints()
  {
    if (this.points === null)
    {
      this.points = [];
      const ellipse = this.instance;
      const matrix = ellipse.Position.helper.getMatrix();
      const semiAxis1 = ellipse.SemiAxis1;
      const semiAxis2 = ellipse.SemiAxis2;
      const maxAxis = Math.max(semiAxis1, semiAxis2);
      const segments = ellipse._loader.getCircleSegments(maxAxis);
      const angleStep = 2 * Math.PI / segments;
      for (let i = 0; i < segments; i++)
      {
        let angle = i * angleStep;
        let point = new THREE.Vector3();
        point.x = Math.cos(angle) * semiAxis1;
        point.y = Math.sin(angle) * semiAxis2;
        point.z = 0;
        point.applyMatrix4(matrix);
        this.points.push(point);
      }
    }
    return this.points;
  }

  getTrimmedPoints(param1, param2, sense)
  {
    let points = [];
    const ellipse = this.instance;
    const matrix = ellipse.Position.helper.getMatrix();
    const semiAxis1 = ellipse.SemiAxis1;
    const semiAxis2 = ellipse.SemiAxis2;
    const maxAxis = Math.max(semiAxis1, semiAxis2);
    const startAngle = THREE.MathUtils.degToRad(param1);
    const endAngle = THREE.MathUtils.degToRad(param2);
    const segments = ellipse._loader.getCircleSegments(maxAxis);

    const addPoint = angle =>
    {
      let point = new THREE.Vector3();
      point.x = Math.cos(angle) * semiAxis1;
      point.y = Math.sin(angle) * semiAxis2;
      point.z = 0;
      point.applyMatrix4(matrix);
      points.push(point);
    };

    this.generatePoints(startAngle, endAngle, sense, segments, addPoint);

    return points;
  }
};
registerIfcHelperClass(IfcEllipseHelper);


/* Geometry helpers */

class IfcConnectedFaceSetHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.instance;
      const schema = this.instance.constructor.schema;

      let faces = faceSet.CfsFaces;

      let geometry = new SolidGeometry();

      for (let f = 0; f < faces.length; f++)
      {
        let face = faces[f]; // IfcFace
        let bounds = face.Bounds; // IfcFaceBound[...]

        let faceVertices = null;
        let holes = [];
        for (let b = 0; b < bounds.length; b++)
        {
          let bound = bounds[b]; // IfcFaceBound
          let loop = bound.Bound; // IfcLoop:
          // (IfcPolyLoop, IfcEdgeLoop, IfcVertexLoop)
          let loopVertices = loop.helper.getPoints();
          let loopOrientation = bound.Orientation;
          if (loopOrientation === ".F.")
          {
            // reverse loop sense
            loopVertices = loopVertices.slice().reverse();
          }
          if (bound instanceof schema.IfcFaceOuterBound)
          {
            faceVertices = loopVertices;
          }
          else
          {
            holes.push(loopVertices);
          }
        }

        if (faceVertices && faceVertices.length >= 3)
        {
          let face = geometry.addFace(...faceVertices);
          for (let holeVertices of holes)
          {
            if (holeVertices.length >= 3)
            face.addHole(...holeVertices);
          }
        }
      }
      let solid = new Solid();
      solid.updateGeometry(geometry, true);
      this.object3D = solid;
      this.object3D._ifc = faceSet;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcConnectedFaceSetHelper);


class IfcPolyLoopHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const loop = this.instance;
      const polygon = loop.Polygon;

      this.points = [];
      for (let i = 0; i < polygon.length; i++)
      {
        let point = polygon[i].helper.getPoint();
        this.points.push(point);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcPolyLoopHelper);


class IfcEdgeLoopHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const edges = this.instance.EdgeList; // IfcOrientedEdge[]

      this.points = [];
      for (let i = 0; i < edges.length; i++)
      {
        let edge = edges[i];
        let point = edge.Orientation === ".T." ?
          edge.EdgeElement.EdgeStart.VertexGeometry.helper.getPoint() :
          edge.EdgeElement.EdgeEnd.VertexGeometry.helper.getPoint();
        this.points.push(point);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcEdgeLoopHelper);


class IfcVertexLoopHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const vertex = this.instance.LoopVertex; // IfcVertexPoint
      const point = vertex.VertexGeometry.helper.getPoint();
      this.points = [point];
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcVertexLoopHelper);


class IfcCartesianPointList2DHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      var list = this.instance;

      this.points = [];
      for (var i = 0; i < list.CoordList.length; i++)
      {
        var coord = list.CoordList[i];
        var point = new THREE.Vector3();
        point.x = coord[0];
        point.y = coord[1];
        this.points.push(point);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcCartesianPointList2DHelper);


class IfcCartesianPointList3DHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      var list = this.instance;

      this.points = [];
      for (var i = 0; i < list.CoordList.length; i++)
      {
        var coord = list.CoordList[i];
        var point = new THREE.Vector3();
        point.x = coord[0];
        point.y = coord[1];
        point.z = coord[2];
        this.points.push(point);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcCartesianPointList3DHelper);


/* Matrix helpers */

class IfcLocalPlacementHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.matrix = null; // relative matrix
    this.matrixWorld = null; // matrixWorld
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      var placement = this.instance;
      var relativePlacement = placement.RelativePlacement;
      this.matrix = relativePlacement ?
        relativePlacement.helper.getMatrix() : new THREE.Matrix4();
    }
    return this.matrix;
  }

  getMatrixWorld()
  {
    if (this.matrixWorld === null)
    {
      const placement = this.instance;
      const schema = this.instance.constructor.schema;

      var placementRelTo = placement.PlacementRelTo;
      if (placementRelTo instanceof schema.IfcLocalPlacement)
      {
        this.matrixWorld = placementRelTo.helper.getMatrixWorld().clone();
        this.matrixWorld.multiply(this.getMatrix());
      }
      else this.matrixWorld = this.getMatrix();
    }
    return this.matrixWorld;
  }
};
registerIfcHelperClass(IfcLocalPlacementHelper);


class IfcCartesianTransformationOperatorHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.matrix = null;
  }

  getMatrix()
  {
    // TODO: process all parameters
    if (this.matrix === null)
    {
      var operator = this.instance;

      this.matrix = new THREE.Matrix4();
      var origin = operator.LocalOrigin;
      if (origin)
      {
        var point = origin.helper.getPoint();
        this.matrix.makeTranslation(point.x, point.y, point.z);
      }
    }
    return this.matrix;
  }
};
registerIfcHelperClass(IfcCartesianTransformationOperatorHelper);


class IfcPlacementHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.matrix = null;
    this.location = null;
  }

  getLocation()
  {
    if (this.location === null)
    {
      var placement = this.instance;
      var loc = placement.Location;
      this.location = loc ?
        loc.helper.getPoint() : new THREE.Vector3(0, 0, 0);
    }
    return this.location;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      var placement = this.instance;
      this.matrix = new THREE.Matrix4();
      this.matrix.setPosition(this.getLocation());
    }
    return this.matrix;
  };
};
registerIfcHelperClass(IfcPlacementHelper);


class IfcAxis1PlacementHelper extends IfcPlacementHelper
{
  constructor(instance)
  {
    super(instance);
    this.axis = null;
  }

  getAxis()
  {
    if (this.axis === null)
    {
      var placement = this.instance;
      var axis = placement.Axis;
      this.axis = axis ?
        axis.helper.getDirection() : new THREE.Vector3(0, 0, 1);
    }
    return this.axis;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      var placement = this.instance;

      var loc = this.getLocation();
      var vz = this.getAxis();
      var vy = GeometryUtils.orthogonalVector(vz);
      var vx = new THREE.Vector3();
      vx.crossVectors(vy, vz);

      this.matrix = new THREE.Matrix4();
      this.matrix.set(
        vx.x, vy.x, vz.x, loc.x,
        vx.y, vy.y, vz.y, loc.y,
        vx.z, vy.z, vz.z, loc.z,
            0,   0,    0,     1);
    }
    return this.matrix;
  }
};
registerIfcHelperClass(IfcAxis1PlacementHelper);


class IfcAxis2Placement2DHelper extends IfcPlacementHelper
{
  constructor(instance)
  {
    super(instance);
    this.refDirection = null;
  }

  getRefDirection()
  {
    if (this.refDirection === null)
    {
      var placement = this.instance;
      var refd = placement.RefDirection;
      this.refDirection = refd ?
        refd.helper.getDirection() : new THREE.Vector3(1, 0, 0);
    }
    return this.refDirection;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      var loc = this.getLocation();
      var vx = this.getRefDirection();
      var vz = new THREE.Vector3(0, 0, 1);
      var vy = new THREE.Vector3();
      vy.crossVectors(vz, vx);

      this.matrix = new THREE.Matrix4();
      this.matrix.set(
        vx.x, vy.x, vz.x, loc.x,
        vx.y, vy.y, vz.y, loc.y,
        vx.z, vy.z, vz.z, loc.z,
            0,   0,    0,     1);
    }
    return this.matrix;
  }
};
registerIfcHelperClass(IfcAxis2Placement2DHelper);


class IfcAxis2Placement3DHelper extends IfcPlacementHelper
{
  constructor(instance)
  {
    super(instance);
    this.axis = null;
    this.refDirection = null;
  }

  getAxis()
  {
    if (this.axis === null)
    {
      var placement = this.instance;
      var axis = placement.Axis;
      this.axis = axis ?
        axis.helper.getDirection() : new THREE.Vector3(0, 0, 1);
    }
    return this.axis;
  }

  getRefDirection()
  {
    if (this.refDirection === null)
    {
      var placement = this.instance;
      var refd = placement.RefDirection;
      this.refDirection = refd ?
        refd.helper.getDirection() : new THREE.Vector3(1, 0, 0);
    }
    return this.refDirection;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      var loc = this.getLocation();
      var vz = this.getAxis();
      var vx = this.getRefDirection();
      var vy = new THREE.Vector3();
      vy.crossVectors(vz, vx);

      this.matrix = new THREE.Matrix4();
      this.matrix.set(
        vx.x, vy.x, vz.x, loc.x,
        vx.y, vy.y, vz.y, loc.y,
        vx.z, vy.z, vz.z, loc.z,
            0,   0,    0,     1);
    }
    return this.matrix;
  }
};
registerIfcHelperClass(IfcAxis2Placement3DHelper);


/* Relationship helpers */

class IfcRelationshipHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
  }
};
registerIfcHelperClass(IfcRelationshipHelper);


class IfcRelDefinesByTypeHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    const rel = this.instance;
    const schema = this.instance.constructor.schema;

    let objects = rel.RelatedObjects;
    let ifcType = rel.RelatingType;
    const typeData = { ifcClassName: ifcType.constructor.name };

    for (let key in ifcType)
    {
      let value = ifcType[key];
      let valueType = typeof value;
      if (valueType === "string"
          || valueType === "number"
          || valueType === "boolean")
      {
        typeData[key] = value;
      }
    }

    for (let i = 0; i < objects.length; i++)
    {
      if (objects[i].helper.getObject3D)
      {
        let object3D = objects[i].helper.getObject3D();
        object3D.userData["IFC_type"] = typeData;
      }
    }
  }
};
registerIfcHelperClass(IfcRelDefinesByTypeHelper);


class IfcRelAssociatesClassificationHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    const rel = this.instance;
    const schema = this.instance.constructor.schema;

    var ifcObjects = rel.RelatedObjects;
    var ifcClassifRef = rel.RelatingClassification;
    if (ifcClassifRef instanceof schema.IfcClassificationReference)
    {
      for (var i = 0; i < ifcObjects.length; i++)
      {
        var ifcObject = ifcObjects[i];
        if (ifcObject.helper && ifcObject.helper.getObject3D)
        {
          let object3D = ifcObject.helper.getObject3D();

          let ifcClassification = ifcClassifRef.ReferencedSource || {};
          let classifName = "Unnamed";
          if (ifcClassification.Name)
          {
            classifName = ifcClassification.Name;
            if (ifcClassification.Edition)
            {
              classifName += "_" + ifcClassification.Edition;
            }
          }
          let classifData = {};

          object3D.userData["IFC_classification_" + classifName] = classifData;

          for (let key in ifcClassifRef)
          {
            let value = ifcClassifRef[key];
            let valueType = typeof value;
            if (valueType === "string"
                || valueType === "number"
                || valueType === "boolean")
            {
              classifData[key] = value;
            }
          };
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelAssociatesClassificationHelper);


class IfcRelAssignsToGroupHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    const rel = this.instance;
    const schema = this.instance.constructor.schema;

    var ifcObjects = rel.RelatedObjects;
    var ifcObjectsType = rel.RelatedObjectsType;
    var ifcGroup = rel.RelatingGroup;
    let groupData = { ifcClassName: ifcGroup.constructor.name };

    for (let key in ifcGroup)
    {
      let value = ifcGroup[key];
      let valueType = typeof value;
      if (valueType === "string"
          || valueType === "number"
          || valueType === "boolean")
      {
        groupData[key] = value;
      }
    }

    let groupName = ifcGroup.Name || ifcGroup.GlobalId;
    groupName = ifcGroup.constructor.name + "_" + groupName;

    for (let i = 0; i < ifcObjects.length; i++)
    {
      let ifcObject = ifcObjects[i];
      if (ifcObject.helper && ifcObject.helper.getObject3D)
      {
        let object3D = ifcObject.helper.getObject3D();
        object3D.userData["IFC_group_" + groupName] = groupData;
      }
    }
  }
};
registerIfcHelperClass(IfcRelAssignsToGroupHelper);


class IfcRelAggregatesHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    const rel = this.instance;
    const schema = this.instance.constructor.schema;

    var ifcObject = rel.RelatingObject;
    if (ifcObject instanceof schema.IfcProduct)
    {
      var containerObject3D = ifcObject.helper.getObject3D();
      if (containerObject3D)
      {
        for (var i = 0; i < rel.RelatedObjects.length; i++)
        {
          var ifcRelatedObject = rel.RelatedObjects[i];
          if (ifcRelatedObject instanceof schema.IfcProduct)
          {
            var object3D = ifcRelatedObject.helper.getObject3D();
            if (object3D)
            {
              if (object3D.parent !== containerObject3D)
              {
                containerObject3D.attach(object3D);
              }
            }
          }
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelAggregatesHelper);


class IfcRelContainedInSpatialStructureHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    const rel = this.instance;
    const schema = this.instance.constructor.schema;

    var ifcProduct = rel.RelatingStructure;
    if (ifcProduct)
    {
      var containerObject3D = ifcProduct.helper.getObject3D();
      if (containerObject3D)
      {
        for (var i = 0; i < rel.RelatedElements.length; i++)
        {
          var ifcRelatedProduct = rel.RelatedElements[i];
          if (ifcRelatedProduct instanceof schema.IfcProduct)
          {
            var object3D = ifcRelatedProduct.helper.getObject3D();
            if (object3D)
            {
              if (object3D.parent !== containerObject3D)
              {
                var parentIFC = object3D.parent.userData.IFC || {};
                if (parentIFC.ifcClassName === 'IfcOpeningElement')
                {
                  // do not change hierarchy
                }
                else
                {
                  containerObject3D.attach(object3D);
                }
              }
            }
          }
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelContainedInSpatialStructureHelper);


class IfcRelVoidsElementHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    var rel = this.instance;
    var element = rel.RelatingBuildingElement;
    var opening = rel.RelatedOpeningElement;
    if (element && opening)
    {
      var object3D = element.helper.getObject3D();
      if (object3D)
      {
        var openingObject3D = opening.helper.getObject3D();
        if (openingObject3D)
        {
          if (object3D !== openingObject3D.parent)
          {
            object3D.attach(openingObject3D);
          }
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelVoidsElementHelper);


class IfcRelFillsElementHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    var rel = this.instance;
    var opening = rel.RelatingOpeningElement;
    var element = rel.RelatedBuildingElement;
    if (element && opening)
    {
      var object3D = element.helper.getObject3D();
      if (object3D)
      {
        var openingObject3D = opening.helper.getObject3D();
        if (openingObject3D)
        {
          if (object3D.parent !== openingObject3D)
          {
            openingObject3D.attach(object3D);
          }
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelFillsElementHelper);


class IfcRelConnectsPortToElementHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    var rel = this.instance;
    var port = rel.RelatingPort;
    var element = rel.RelatedElement;
    if (port && element)
    {
      var object3D = element.helper.getObject3D();
      if (object3D)
      {
        var portObject3D = port.helper.getObject3D();
        if (portObject3D)
        {
          if (object3D !== portObject3D.parent)
          {
            object3D.attach(portObject3D);
          }
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelConnectsPortToElementHelper);


class IfcRelDefinesByPropertiesHelper extends IfcRelationshipHelper
{
  constructor(instance)
  {
    super(instance);
  }

  relate()
  {
    const rel = this.instance;
    const schema = this.instance.constructor.schema;

    var propertySet = rel.RelatingPropertyDefinition;
    if (propertySet instanceof schema.IfcPropertySet)
    {
      var psetName = propertySet.Name;
      var properties = propertySet.helper.getProperties();
      var relatedObjects = rel.RelatedObjects;
      for (var i = 0; i < relatedObjects.length; i++)
      {
        var relatedObject = relatedObjects[i];
        if (relatedObject instanceof schema.IfcProduct)
        {
          var object3D = relatedObject.helper.getObject3D();
          if (object3D)
          {
            object3D.userData["IFC_" + psetName] = properties;
          }
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelDefinesByPropertiesHelper);


/* Other helpers */

class IfcPointHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.point = null;
  }

  getPoint()
  {
    if (this.point === null)
    {
      this.point = new THREE.Vector3();
    }
    return this.point;
  }
};
registerIfcHelperClass(IfcPointHelper);


class IfcCartesianPointHelper extends IfcPointHelper
{
  constructor(instance)
  {
    super(instance);
  }

  getPoint()
  {
    if (this.point === null)
    {
      var point = this.instance;

      this.point = new THREE.Vector3();
      this.point.x = point.Coordinates[0];
      if (point.Coordinates.length > 1)
      {
        this.point.y = point.Coordinates[1];
        if (point.Coordinates.length > 2)
        {
          this.point.z = point.Coordinates[2];
        }
      }
    }
    return this.point;
  }
};
registerIfcHelperClass(IfcCartesianPointHelper);


class IfcDirectionHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.direction = null;
  }

  getDirection()
  {
    if (this.direction === null)
    {
      var direction = this.instance;

      this.direction = new THREE.Vector3();
      this.direction.x = direction.DirectionRatios[0];
      if (direction.DirectionRatios.length > 1)
      {
        this.direction.y = direction.DirectionRatios[1];
        if (direction.DirectionRatios.length > 2)
        {
          this.direction.z = direction.DirectionRatios[2];
        }
      }
    }
    return this.direction;
  }
}
registerIfcHelperClass(IfcDirectionHelper);


class IfcPresentationLayerAssignmentHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
  }

  assign()
  {
    const assignment = this.instance;
    const schema = this.instance.constructor.schema;

    const layerName = assignment.Name;
    const layerDescription = assignment.Description;
    const assignedItems = assignment.AssignedItems;
    const identifier = assignment.Identifier;

    for (let assignedItem of assignedItems)
    {
      if (assignedItem instanceof schema.IfcShapeRepresentation)
      {
        let items = assignedItem.Items;
        for (let item of items)
        {
          if (item.helper.getObject3D)
          {
            try {
            let object = item.helper.getObject3D();
            if (object)
            {
              object.userData.IFC_layer =
              {
                Name : layerName,
                Description : layerDescription,
                Identifier : identifier
              };
            }
            } catch (ex) { console.info(ex); console.info(item.helper); }
          }
        }
      }
    }
  }
}
registerIfcHelperClass(IfcPresentationLayerAssignmentHelper);


class IfcStyledItemHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.properties = null;
  }

  applyStyle()
  {
    const styledItem = this.instance;
    const schema = this.instance.constructor.schema;

    var item = styledItem.Item; // item to apply style
    var styles = styledItem.Styles; // style to apply
    if (item === null || styles === null) return;

    var style = styles[0]; // apply only first style
    if (style instanceof schema.IfcPresentationStyleAssignment)
    {
      style = style.Styles[0];
    }
    if (style instanceof schema.IfcSurfaceStyle)
    {
      const material = style.helper.getMaterial();
      if (item.helper && material)
      {
        item.helper.material = material;
      }
    }
  }
}
registerIfcHelperClass(IfcStyledItemHelper);


class IfcSurfaceStyleHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.material = null;
  }

  getMaterial()
  {
    if (this.material === null)
    {
      const style = this.instance;
      const schema = this.instance.constructor.schema;

      const name = style.Name;
      const side = style.Side;
      const styleItem = style.Styles[0]; // consider only first style item
      if (styleItem instanceof schema.IfcSurfaceStyleShading)
      {
        const color = styleItem.SurfaceColour;
        const transparency = styleItem.Transparency;
        const red = color.Red;
        const green = color.Green;
        const blue = color.Blue;

        let transparent = transparency > 0;
        let opacity = 1 - transparency;

        this.material = new THREE.MeshPhongMaterial({
          name : name,
          color: new THREE.Color(red, green, blue),
          flatShading: false,
          opacity: opacity,
          transparent: transparent,
          side: side === '.BOTH.' ? THREE.DoubleSide : THREE.FrontSide
        });
      }
    }
    return this.material;
  }
};
registerIfcHelperClass(IfcSurfaceStyleHelper);


class IfcPropertySetHelper extends IfcHelper
{
  constructor(instance)
  {
    super(instance);
    this.properties = null;
  }

  getProperties()
  {
    if (this.properties === null)
    {
      const pset = this.instance;
      const schema = this.instance.constructor.schema;
      const loader = pset._loader;

      this.properties =  {};
      for (var i = 0; i < pset.HasProperties.length; i++)
      {
        var prop = pset.HasProperties[i];
        if (prop instanceof schema.IfcPropertySingleValue)
        {
          var name = loader.unBox(prop.Name);
          var value = loader.unBox(prop.NominalValue);
          if (value === ".T.")
          {
            value = true;
          }
          else if (value === ".F.")
          {
            value = false;
          }
          this.properties[name] = value;
        }
      }
    }
    return this.properties;
  }
};
registerIfcHelperClass(IfcPropertySetHelper);

export { IFCLoader };
