/**
 * IFCLoader.js
 *
 * @author realor
 */

import { IFC, Constant } from "./IFC.js";
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
import { Revolver } from "../../builders/Revolver.js";
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
import { GeometryUtils } from "../../utils/GeometryUtils.js";
import { WebUtils } from "../../utils/WebUtils.js";
import { ObjectUtils } from "../../utils/ObjectUtils.js";
import { BIMUtils } from "../../utils/BIMUtils.js";
import * as THREE from "three";

class IFCLoader extends THREE.Loader
{
  static VOIDING_MODE_ALL = "all";
  static VOIDING_MODE_NONE = "none";
  static VOIDING_MODE_PARAMETRIC = "parametric";

  static RETAIN_IFC_FILE_NO = 0; // discard IfcFile
  static RETAIN_IFC_FILE_YES = 1; // retain IfcFile

  static PARAMETRIC_REPRESENTATIONS = [
    "IfcExtrudedAreaSolid",
    "IfcBooleanResult",
    "IfcBooleanClippingResult"
  ];

  static options =
  {
    units : "m", // default model units
    minCircleSegments : 16, // minimum circle segments.
    circleSegmentsPerRadius : 32, // circle segments per meter radius.
    halfSpaceSize : 100, // half space size in meters
    unvoidableClasses : [
      "IfcDoor",
      "IfcWindow",
      "IfcOpeningElement"
    ],
    retainIfcFile: this.RETAIN_IFC_FILE_YES,
    voidingMode : this.VOIDING_MODE_ALL,
    faceSetOptimizationRange : [0, 1000] // range of number of faces [min, max] to optimize the geometry
  };

  constructor(manager)
  {
    super(manager);
    this.helpers = new Map();
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

    console.info("parsing file...");

    const ifcFile = this.parseFile(text);
    ifcFile.updateInverseAttributes();
    this.ifcFile = ifcFile;

    console.info(ifcFile);

    return this.buildModel(ifcFile, onCompleted, onProgress, onError);
  }

  parseFile(text) // abstract, returns IFCFile
  {
    throw "Not implemented";
  }

  buildModel(ifcFile, onCompleted, onProgress, onError)
  {
    let model = null;
    let types = null;
    this.helpers.clear();
    this.modelFactor = 1.0;
    this.blockCount = 0;
    this.blocks = new Set();

    const schema = ifcFile.schema;

    /* process project info */
    const processProjectInfo = () =>
    {
      let project = ifcFile.entitiesByClass.has("IfcProject") ?
        ifcFile.entitiesByClass.get("IfcProject")[0] : new schema.IfcProject();

      model = this.helper(project).getObject3D();
      types = model.getObjectByName(IFC.TypesName);
      this.model = model;
    };

    /* applyStyles */
    const applyStyles = () =>
    {
      let styledItems = ifcFile.entitiesByClass.get("IfcStyledItem");
      if (styledItems)
      {
        for (let i = 0; i < styledItems.length; i++)
        {
          let styledItem = styledItems[i];
          this.helper(styledItem).applyStyle();
        }
      }
    };

    /* create objects */
    const createObject = index =>
    {
      let product = ifcFile.products[index];
      let object3D = this.helper(product).getObject3D();
      if (product.ObjectPlacement instanceof schema.IfcLocalPlacement)
      {
        let matrixWorld = this.helper(product.ObjectPlacement).getMatrixWorld();
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
        this.helper(relationship).relate();
      }
      model.updateMatrixWorld();
    };

    /* process layer assigments */
    const processLayerAssignments = () =>
    {
      let assignments =
        ifcFile.entitiesByClass.get("IfcPresentationLayerAssignment");
      if (assignments)
      {
        for (let assignment of assignments)
        {
          this.helper(assignment).assign();
        }
      }
      model.updateMatrixWorld();
    };

    /* voiding objects */
    const voidObject = index =>
    {
      const voidingMode = this.options.voidingMode;
      if (voidingMode === IFCLoader.VOIDING_MODE_NONE) return;

      const voidingFilter = voidingMode === IFCLoader.VOIDING_MODE_PARAMETRIC ?
        IFCLoader.PARAMETRIC_REPRESENTATIONS : [];

      let product = ifcFile.products[index];
      let productObject3D = this.helper(product).getObject3D();
      if (productObject3D)
      {
        if (BIMUtils.createVoidings(productObject3D, voidingFilter))
        {
          let reprObject3D = IFC.getRepresentation(productObject3D);
          if (reprObject3D)
          {
            ObjectBuilder.build(reprObject3D);
          }
          else
          {
            ObjectBuilder.build(productObject3D);
          }
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
        let typeGroup = this.helper(typeProduct).getObject3D();
        types.add(typeGroup);

        if (typeProduct.RepresentationMaps &&
            typeProduct.RepresentationMaps.length > 0)
        {
          // add typeProduct representation
          const reprMap = typeProduct.RepresentationMaps[0];
          const mappedObject3D = this.helper(reprMap).getObject3D();
          if (mappedObject3D && mappedObject3D.parent === null)
          {
            typeGroup.add(mappedObject3D);
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
          let ifcClassName = object.userData.IFC.ifcClassName;
          if (ifcClassName === "IfcOpeningElement" ||
              ifcClassName === "IfcSpace")
          {
            let repr = IFC.getRepresentation(object);
            if (repr)
            {
              ObjectUtils.updateStyle(repr, false, false);
            }
          }
          else if (ifcClassName === "IfcSite" ||
            ifcClassName === "IfcBuilding" ||
            ifcClassName === "IfcBuildingStorey")
          {
            ObjectUtils.setSelectionHighlight(object, ObjectUtils.HIGHLIGHT_BOX);
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
        let object3D = this.helper(product).getObject3D();
        if (object3D && object3D.userData && object3D.userData.IFC)
        {
          let reprObject3D = IFC.getRepresentation(object3D);
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
      let storeys = ifcFile.entitiesByClass.get("IfcBuildingStorey");
      if (storeys)
      {
        for (let i = 0; i < storeys.length; i++)
        {
          let storey = storeys[i];
          let storeyObject3D = this.helper(storey).getObject3D();
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

      const getIterations = () => ifcFile.products.length;

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

  helper(entity)
  {
    if (!entity) return undefined;

    let helper = this.helpers.get(entity);
    if (helper === undefined)
    {
      let ifcClass = entity.constructor;
      while (ifcClass)
      {
        let helperClass = IFC_HELPERS[ifcClass.name + "Helper"];
        if (helperClass)
        {
          helper = new helperClass(this, entity);
          if (helperClass.cacheable)
          {
            this.helpers.set(entity, helper);
          }
          break;
        }
        let ifcSuperClass = ifcClass.__proto__;
        ifcClass = ifcSuperClass.name ?
          ifcClass.schema[ifcSuperClass.name] : null;
      }
    }
    return helper;
  }

  unBox(value)
  {
    // unbox defined types: IfcLabel, IfcReal, IfcBoolean, etc.
    return value?.Value === undefined ? value : value.Value;
  }

  getIfcData(ifcEntity)
  {
    const data = { ifcClassName: ifcEntity.constructor.name };

    const attributes = Object.getOwnPropertyNames(ifcEntity)
          .filter(name => !name.startsWith("_"));

    for (let attribute of attributes)
    {
      let value = ifcEntity[attribute];
      if (value instanceof Constant)
      {
        data[attribute] = "." + value.value + ".";
      }
      else
      {
        if (value && value.Value !== undefined)
        {
          // unbox
          value = value.Value;
        }

        if (ObjectUtils.isBasicType(value) || ObjectUtils.isBasicArray(value))
        {
          data[attribute] = value;
        }
      }
    }
    return data;
  }

  getCircleSegments(radius)
  {
    let meterRadius = radius * this.modelFactor;

    let segments = Math.max(
      this.options.minCircleSegments,
      Math.ceil(this.options.circleSegmentsPerRadius * meterRadius));

    if (segments % 2 === 1) segments++;

    return segments;
  }

  cloneObject3D(object, full = false)
  {
    // is required yet?
    let clonedObject = object.clone(false);

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

/* IFC helper classes */

const IFC_HELPERS = {};

function registerIfcHelperClass(ifcHelperClass)
{
  IFC_HELPERS[ifcHelperClass.name] = ifcHelperClass;
}

class IfcHelper
{
  static cacheable = true;

  constructor(loader, entity)
  {
    this.loader = loader;
    this.entity = entity;
  }

  helper(entity)
  {
    return this.loader.helper(entity);
  }
};
registerIfcHelperClass(IfcHelper);


class IfcProjectHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const project = this.entity;
      const schema = project.constructor.schema;
      const loader = this.loader;

      this.object3D = new THREE.Group();
      const model = this.object3D;

      model.name = project.Name || project.LongName || "IFC";
      model.userData.IFC = loader.getIfcData(project);

      const types = new THREE.Group();
      types.name = IFC.TypesName;
      types.visible = false;
      ObjectUtils.setSelectionHighlight(types, ObjectUtils.HIGHLIGHT_NONE);
      model.add(types);

      const retainIfcFile = loader.options.retainIfcFile;
      if (retainIfcFile === undefined)
      {
        retainIfcFile = IFCLoader.RETAIN_IFC_FILE_YES;
      }

      if (retainIfcFile === IFCLoader.RETAIN_IFC_FILE_YES)
      {
        model._ifcFile = loader.ifcFile;
      }

      // load length unit
      // TODO: load all units as properties
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
                unit.UnitType.value === "LENGTHUNIT")
            {
              // unit name = METRE
              let factor = 1;

              if (unit.Prefix)
              {
                let prefix = IFC.UNIT_PREFIXES[unit.Prefix.value];
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
              loader.modelFactor = factor;
            }
          }
        }
      }

      // process IfcMapConversion
      const mapCons = loader.ifcFile.entitiesByClass.get("IfcMapConversion");
      if (mapCons)
      {
        const mapConversion = mapCons[0];
        const targetCRS = mapConversion.TargetCRS;

        model.userData.IFC_target_crs = loader.getIfcData(targetCRS);
        model.userData.IFC_map_conversion = loader.getIfcData(mapConversion);

        const x = mapConversion.Eastings;
        const y = mapConversion.Northings;
        const z = mapConversion.OrthogonalHeight;

        if (typeof x === "number" &&
            typeof y === "number" &&
            typeof z === "number")
        {
          model.position.set(x, y, z);
        }

        const vx = mapConversion.XAxisAbscissa;
        const vy = mapConversion.XAxisOrdinate;
        console.info(vx, vy);
        if (typeof vx === "number" && typeof vy === "number")
        {
          model.rotation.z = Math.atan2(vy, vx);
        }
        model.updateMatrix();
      }
    }
    return this.object3D;
  }
}
registerIfcHelperClass(IfcProjectHelper);


class IfcTypeProductHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const typeProduct = this.entity;
      const loader = this.loader;

      let typeName = typeProduct.Name || typeProduct.GlobalId;
      if (typeName.startsWith(THREE.Object3D.HIDDEN_PREFIX))
      {
        typeName = typeName.substring(1);
      }
      let typeGroup = new THREE.Group();
      typeGroup.name = typeName;

      typeGroup.userData.selection = { "highlight" : "none" };
      const typeData = loader.getIfcData(typeProduct);
      typeGroup.userData.IFC = typeData;

      const propertySets = typeProduct.HasPropertySets;
      if (propertySets instanceof Array)
      {
        for (let propertySet of propertySets)
        {
          if (this.helper(propertySet)?.getProperties)
          {
            typeGroup.userData["IFC_" + propertySet.Name] =
              this.helper(propertySet).getProperties();
          }
        }
      }
      this.object3D = typeGroup;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcTypeProductHelper);


class IfcProductHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const product = this.entity;
      const schema = this.entity.constructor.schema;
      const loader = this.loader;

      let object3D = new THREE.Object3D();
      ObjectUtils.setSelectionGroup(object3D, true);

      let name = product.Name ?
        product.Name : product.constructor.name;

      if (name.length >= 2 && name[0] === THREE.Object3D.HIDDEN_PREFIX)
      {
        name = name.substring(1);
      }

      object3D.name = name;
      object3D.userData.IFC = loader.getIfcData(product);

      let objectPlacement = product.ObjectPlacement;
      if (objectPlacement instanceof schema.IfcLocalPlacement)
      {
        let matrix = this.helper(objectPlacement).getMatrix();
        matrix.decompose(object3D.position,
          object3D.quaternion, object3D.scale);
        object3D.matrix.copy(matrix);
        object3D.matrixWorldNeedsUpdate = true;
      }

      let productRepr = product.Representation;
      if (productRepr instanceof schema.IfcProductRepresentation)
      {
        // add object representation as first child

        let reprObject3D = this.helper(productRepr).getObject3D("Body");
        if (reprObject3D)
        {
          if (reprObject3D.parent)
          {
            // representation already added to scene, clone it.
            reprObject3D = loader.cloneObject3D(reprObject3D, true);
          }
          reprObject3D.name = IFC.RepresentationName;

          object3D.add(reprObject3D);
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
  static cacheable = false;

  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D(representationIdentifier)
  {
    let reprObject3D = null;
    const productRepr = this.entity;
    const loader = this.loader;

    for (let repr of productRepr.Representations)
    {
      if (repr.RepresentationIdentifier === representationIdentifier)
      {
        reprObject3D = this.helper(repr).getObject3D();
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const representation = this.entity;

      let group = new THREE.Group();
      for (let i = 0; i < representation.Items.length; i++)
      {
        let item = representation.Items[i];
        let itemHelper = this.helper(item);
        if (item && itemHelper.getObject3D)
        {
          let itemObject3D = itemHelper.getObject3D();
          if (itemObject3D)
          {
            itemObject3D.name = "Item" + i;
            itemObject3D.userData.IFC =
              {"ifcClassName" : item.constructor.name};
            group.add(itemObject3D);
            if (itemObject3D instanceof Solid && itemHelper.material)
            {
              itemObject3D.material = itemHelper.material;
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
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcRepresentationHelper);


/* Geometric representation item helpers */

class IfcGeometricRepresentationItemHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.object3D = null;
  }

  getObject3D()
  {
    let ifcClassName = this.entity.constructor.name;
    console.warn("Unsupported item: " + ifcClassName, this);
    return null;
  }
};
registerIfcHelperClass(IfcGeometricRepresentationItemHelper);


class IfcGeometricSetHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.object3D = null;
  }

  getObject3D()
  {
    const entity = this.entity;
    const schema = entity.constructor.schema;
    const elements = entity.Elements;

    if (elements.length > 0)
    {
      this.object3D = new THREE.Group();
      this.object3D.name = "IfcGeometricSet";
      if (elements[0] instanceof schema.IfcCurve)
      {
        // TODO: create Profiles from Points
      }
    }
    return this.object3D;
  }
}
registerIfcHelperClass(IfcGeometricSetHelper);



class IfcHalfSpaceSolidHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const halfSpace = this.entity;
      const reverseSolid = halfSpace.AgreementFlag === true;
      this.object3D = this.getPlaneSolid(reverseSolid);
    }
    return this.object3D;
  }

  getPlaneSolid(reverseSolid)
  {
    const halfSpace = this.entity;
    const loader = this.loader;

    const size = loader.options.halfSpaceSize / loader.modelFactor;

    const surface = halfSpace.BaseSurface;
    const plane = surface.Position;

    let planeProfile = new Profile();
    planeProfile.builder = new RectangleBuilder(size, size);
    planeProfile.name = "plane";
    planeProfile.visible = false;
    planeProfile.userData.IFC = {
      ifcClassName : surface.constructor.name
    };

    let matrix = this.helper(plane).getMatrix();
    if (reverseSolid)
    {
      matrix = matrix.clone();
      const rotMatrix = new THREE.Matrix4();
      rotMatrix.makeRotationX(Math.PI);
      matrix.multiply(rotMatrix);
    }
    const extruder = new Extruder(size);

    let planeSolid = new Solid();
    planeSolid.add(planeProfile);
    planeSolid.builder = extruder;
    planeSolid.name = "halfSpace";
    matrix.decompose(planeSolid.position, planeSolid.rotation, planeSolid.scale);
    planeSolid.updateMatrix();
    planeSolid.userData.IFC = {
      ifcClassName : halfSpace.constructor.name
    };
    ObjectBuilder.build(planeSolid);

    return planeSolid;
  }
};
registerIfcHelperClass(IfcHalfSpaceSolidHelper);


class IfcPolygonalBoundedHalfSpaceHelper extends IfcHalfSpaceSolidHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const halfSpace = this.entity;
      const loader = this.loader;
      const schema = halfSpace.constructor.schema;

      const surface = halfSpace.BaseSurface;
      const base = halfSpace.Position;
      const reverseSolid = halfSpace.AgreementFlag === false;
      const boundary = halfSpace.PolygonalBoundary;

      if (surface instanceof schema.IfcPlane)
      {
        try
        {
          const size = loader.options.halfSpaceSize / loader.modelFactor;
          const extruder = new Extruder(size);

          // polygon solid
          const curvePoints = this.helper(boundary).getPoints();
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
          const polygonSolid = new Solid();
          polygonSolid.add(polygonProfile);
          polygonSolid.builder = extruder;
          polygonProfile.userData.IFC = {
            ifcClassName : boundary.constructor.name
          };

          let matrix = this.helper(base).getMatrix();
          matrix.decompose(polygonSolid.position, polygonSolid.rotation,
            polygonSolid.scale);
          polygonSolid.updateMatrix();

          // plane solid
          let planeSolid = this.getPlaneSolid(reverseSolid);

          let halfSpaceSolid = new Solid();
          halfSpaceSolid.name = "polygonalHalfSpace";
          halfSpaceSolid.add(polygonSolid);
          halfSpaceSolid.add(planeSolid);
          halfSpaceSolid.builder = new BooleanOperator(BooleanOperator.SUBTRACT);
          halfSpaceSolid.userData.IFC = {
            ifcClassName : halfSpace.constructor.name
          };
          ObjectBuilder.build(halfSpaceSolid);

          this.object3D = halfSpaceSolid;
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const result = this.entity;

      const operator = result.Operator;
      const firstOperand = result.FirstOperand;
      const secondOperand = result.SecondOperand;

      const firstHelper = this.helper(firstOperand);
      const secondHelper = this.helper(secondOperand);

      const firstObject = firstHelper.getObject3D();
      const secondObject = secondHelper.getObject3D();
      if (firstObject instanceof Solid && firstHelper.material)
      {
        firstObject.material = firstHelper.material;
      }

      if (firstObject instanceof Solid && secondObject instanceof Solid)
      {
        let oper = "subtract";
        switch (operator.value)
        {
          case "UNION":
            oper = BooleanOperator.UNION;
            break;
          case "INTERSECTION":
            oper = BooleanOperator.INTERSECT;
            break;
          case "DIFFERENCE" :
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
        object3D.userData.IFC = {
          ifcClassName: result.constructor.name
        };
        ObjectBuilder.build(object3D);
        if (object3D.isValid())
        {
          this.object3D = object3D;
          this.object3D.material = firstObject.material;
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.entity;

      let geometry = new SolidGeometry();

      geometry.vertices =
        GeometryUtils.cloneRing(this.helper(faceSet.Coordinates).getPoints());

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
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcTriangulatedFaceSetHelper);


class IfcPolygonalFaceSetHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.entity;

      let geometry = new SolidGeometry();

      geometry.vertices =
        GeometryUtils.cloneRing(this.helper(faceSet.Coordinates).getPoints());

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
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcPolygonalFaceSetHelper);


class IfcSweptAreaSolidHelper extends IfcGeometricRepresentationItemHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  createSolid(builder)
  {
    const swept = this.entity;
    const schema = swept.constructor.schema;
    const profileDef = swept.SweptArea;

    let profiles = []; // Profile[]

    if (profileDef instanceof schema.IfcCompositeProfileDef)
    {
      const compositeProfileDef = profileDef;
      const profileDefs = compositeProfileDef.Profiles;
      for (let subProfileDef of profileDefs)
      {
        let profile = this.helper(subProfileDef).getProfile();
        if (profile)
        {
          profiles.push(profile);
        }
        else
        {
          console.warn("Unsupported profile", profileDef);
        }
      }
    }
    else if (profileDef instanceof schema.IfcProfileDef)
    {
      let profile = this.helper(profileDef).getProfile();
      if (profile) profiles.push(profile);
      else console.warn("Unsupported profile", profileDef);
    }

    let solids = [];

    for (let profile of profiles)
    {
      try
      {
        if (profile.parent)
        {
          profile = profile.clone();
        }

        let solid = new Solid();
        solid.add(profile);
        solid.builder = builder;
        ObjectBuilder.build(solid);

        if (swept.Position)
        {
          const matrix = this.helper(swept.Position).getMatrix();
          matrix.decompose(solid.position, solid.quaternion, solid.scale);
          solid.updateMatrix();
        }
        solids.push(solid);
      }
      catch (ex)
      {
        console.warn(ex);
      }
    }
    if (solids.length === 0)
    {
      this.object3D = new Solid();
      this.object3D = swept;
    }
    else if (solids.length === 1)
    {
      this.object3D = solids[0];
    }
    else if (solids.length > 1)
    {
      const union = new Solid();
      union.name = "Composite";
      union.builder = new BooleanOperator(BooleanOperator.UNION);
      for (let solid of solids)
      {
        union.add(solid);
      }
      ObjectBuilder.build(union);
      this.object3D = union;
    }
  }
}
registerIfcHelperClass(IfcSweptAreaSolidHelper);


class IfcExtrudedAreaSolidHelper extends IfcSweptAreaSolidHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const swept = this.entity;
      const direction = this.helper(swept.ExtrudedDirection).getDirection();
      const depth = swept.Depth;

      this.createSolid(new Extruder(depth, direction));
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcExtrudedAreaSolidHelper);


class IfcRevolvedAreaSolidHelper extends IfcSweptAreaSolidHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const swept = this.entity;
      const loader = this.loader;
      const axisHelper = this.helper(swept.Axis);
      const location = axisHelper.getLocation();
      const axis = axisHelper.getAxis();
      const angle = THREE.MathUtils.radToDeg(swept.Angle);

      const radius = location.length() + 10; // radius estimate

      const segments = loader.getCircleSegments(radius);

      this.createSolid(new Revolver(angle, location, axis, segments));
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcRevolvedAreaSolidHelper);


class IfcSurfaceCurveSweptAreaSolidHelper
  extends IfcGeometricRepresentationItemHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const swept = this.entity;
      const profileDef = swept.SweptArea; // IfcProfileDef
      const position = swept.Position; // IfcAxis2Placement3D
      const matrix = this.helper(position).getMatrix();
      const directrix = swept.Directrix; // IfcCurve
      const startParam = swept.StartParam; // IfcParameterValue : number
      const endParam = swept.EndParam; // IfcParameterValue : number
      const surface = swept.ReferenceSurface; // IfcSurface: ignored

      const cordPoints =
        GeometryUtils.cloneRing(this.helper(directrix).getPoints());

      if (cordPoints)
      {
        const profile = this.helper(profileDef).getProfile();
        if (profile)
        {
          try
          {
            const solid = new Solid();

            solid.name = "swept";
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const swept = this.entity;
      const loader = this.loader;
      const directrix = swept.Directrix; // IfcCurve
      const radius = swept.Radius;
      const innerRadius = swept.InnerRadius;
      const segments = loader.getCircleSegments(radius);

      try
      {
        this.object3D = new Solid();
        const object3D = this.object3D;

        object3D.name = "disk";
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

        const cordPoints =
          GeometryUtils.cloneRing(this.helper(directrix).getPoints());
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const brep = this.entity;

      const outerShell = brep.Outer;
      this.object3D = this.helper(outerShell).getObject3D();
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcManifoldSolidBrepHelper);


class IfcFaceBasedSurfaceModelHelper
  extends IfcGeometricRepresentationItemHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      this.object3D = new THREE.Group();
      const surface = this.entity;
      const faceSets = surface.FbsmFaces; // IfcConnectedFaceSet[...]
      for (let i = 0; i < faceSets.length; i++)
      {
        let faceSet = faceSets[i]; // IfcConnectedFaceSet
        let faceSetObject3D = this.helper(faceSet).getObject3D();
        faceSetObject3D.name = "FaceSet" + i;
        this.object3D.add(faceSetObject3D);
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcFaceBasedSurfaceModelHelper);


class IfcShellBasedSurfaceModelHelper
  extends IfcGeometricRepresentationItemHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      this.object3D = new THREE.Group();
      const surface = this.entity;
      const shells = surface.SbsmBoundary; // IfcShell[...]
      for (var i = 0; i < shells.length; i++)
      {
        let shell = shells[i]; // IfcConnectedFaceSet
        let shellObject3D = this.helper(shell).getObject3D();
        shellObject3D.name = "Shell" + i;
        this.object3D.add(shellObject3D);
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcShellBasedSurfaceModelHelper);


class IfcRepresentationMapHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const reprMap = this.entity;
      const loader = this.loader;

      const repr = reprMap.MappedRepresentation; // IfcRepresentation
      const origin = reprMap.MappingOrigin;

      let object3D = this.helper(repr).getObject3D();
      if (object3D.parent)
      {
        // already added to scene, clone it
        object3D = loader.cloneObject3D(object3D, true);
      }

      object3D.name = "block-" + (++loader.blockCount);
      object3D.userData.IFC = { ifcClassName : "IfcRepresentationMap" };
      loader.blocks.add(object3D);

      if (origin)
      {
        let matrix = this.helper(origin).getMatrix();
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const mappedItem = this.entity;
      const loader = this.loader;

      const source = mappedItem.MappingSource; // IfcRepresentationMap
      const target = mappedItem.MappingTarget;

      const mappedObject3D = this.helper(source).getObject3D();

      if (mappedObject3D)
      {
        const instanceGroup = new THREE.Group();

        if (target)
        {
          let matrix = this.helper(target).getMatrix();
          matrix.decompose(instanceGroup.position,
            instanceGroup.quaternion, instanceGroup.scale);
          instanceGroup.updateMatrix();
        }
        instanceGroup.builder = new Cloner(mappedObject3D);
        ObjectBuilder.build(instanceGroup);

        this.object3D = instanceGroup;
      }
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcMappedItemHelper);


/* Profile helpers */

class IfcProfileDefHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfile()
  {
    if (this.profile === null)
    {
      const builder = this.getProfileBuilder();
      if (builder)
      {
        const profileDef = this.entity;

        const profile = new Profile();

        let name = builder.constructor.name;
        let index = name.indexOf("Builder");
        if (index !== -1) name = name.substring(0, index);
        profile.name = name;
        profile.builder = builder;

        ObjectBuilder.build(profile);

        if (profileDef.Position)
        {
          const profMat = this.helper(profileDef.Position).getMatrix();
          profMat.decompose(profile.position, profile.quaternion, profile.scale);
          profile.updateMatrix();
        }

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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;

    return new RectangleBuilder(profileDef.XDim, profileDef.YDim);
  }
};
registerIfcHelperClass(IfcRectangleProfileDefHelper);


class IfcRectangleHollowProfileDefHelper extends IfcRectangleProfileDefHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;

    return new RectangleHollowBuilder(
      profileDef.XDim, profileDef.YDim, profileDef.WallThickness);
  }
};
registerIfcHelperClass(IfcRectangleHollowProfileDefHelper);


class IfcCircleProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
    const loader = this.loader;
    const radius = profileDef.Radius;
    const segments = loader.getCircleSegments(radius);

    return new CircleBuilder(radius, segments);
  }
};
registerIfcHelperClass(IfcCircleProfileDefHelper);


class IfcCircleHollowProfileDefHelper extends IfcCircleProfileDefHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
    const loader = this.loader;
    const radius = profileDef.Radius;
    const thickness = profileDef.WallThickness;
    const segments = loader.getCircleSegments(radius);

    return new CircleHollowBuilder(radius, thickness, segments);
  }
};
registerIfcHelperClass(IfcCircleHollowProfileDefHelper);


class IfcEllipseProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
    const loader = this.loader;
    const xradius = profileDef.SemiAxis1;
    const yradius = profileDef.SemiAxis2;
    const maxRadius = Math.max(xradius, yradius);
    const segments = loader.getCircleSegments(maxRadius);

    return new EllipseBuilder(xradius, yradius, segments);
  }
};
registerIfcHelperClass(IfcEllipseProfileDefHelper);


class IfcIShapeProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
    const width = profileDef.Width;
    const height = profileDef.Depth;
    const thickness = profileDef.Thickness;

    return new LProfileBuilder(width, height, thickness);
  }
};
registerIfcHelperClass(IfcLShapeProfileDefHelper);


class IfcTShapeProfileDefHelper extends IfcParameterizedProfileDefHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getProfileBuilder()
  {
    const profileDef = this.entity;
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.profile = null;
  }

  getProfile()
  {
    if (this.profile === null)
    {
      const profileDef = this.entity;

      const curve = profileDef.OuterCurve; // IfcCurve
      const curvePoints = this.helper(curve).getPoints();
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.profile = null;
  }

  getProfile()
  {
    if (this.profile === null)
    {
      const profileDef = this.entity;
      const curve = profileDef.OuterCurve; // IfcCurve
      let curvePoints = this.helper(curve).getPoints();
      if (curvePoints)
      {
        const shape = new THREE.Shape();
        this.addPointsToPath(shape, curvePoints);

        const innerCurves = profileDef.InnerCurves; // IfcCurve[]
        for (let innerCurve of innerCurves)
        {
          curvePoints = this.helper(innerCurve).getPoints();
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.points = null;
  }

  getPoints()
  {
    return this.points;
  }
};
registerIfcHelperClass(IfcCurveHelper);


class IfcLineHelper extends IfcCurveHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const line = this.entity;

      const pnt = this.helper(line.Pnt).getPoint();
      const dir = this.helper(line.Dir).getVector();
      const pnt2 = new THREE.Vector3();
      pnt2.copy(pnt).add(dir);
      this.points = [pnt, pnt2];
    }
    return this.points;
  }
}
registerIfcHelperClass(IfcLineHelper);


class IfcPolylineHelper extends IfcCurveHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const polyline = this.entity;

      this.points = [];
      const points = polyline.Points;
      for (let i = 0; i < points.length; i++)
      {
        let point = this.helper(points[i]).getPoint();
        this.points.push(point);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcPolylineHelper);


class IfcIndexedPolyCurveHelper extends IfcCurveHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const polyCurve = this.entity;
      const loader = this.loader;
      const segments = polyCurve.Segments;
      const schema = polyCurve.constructor.schema;
      let points = this.helper(polyCurve.Points).getPoints();
      if (segments)
      {
        this.points = [];
        for (let segment of segments)
        {
          if (segment instanceof schema.IfcLineIndex)
          {
            for (let index of segment.Value)
            {
              this.points.push(points[index - 1]);
            }
          }
          else if (segment instanceof schema.IfcArcIndex)
          {
            const arcPoints = [];
            for (let index of segment.Value)
            {
              arcPoints.push(points[index - 1]);
            }
            let center = arcPoints.length === 3 ?
              GeometryUtils.getCircleCenter(...arcPoints) : null;

            if (center)
            {
              const p1 = arcPoints[0];
              const p2 = arcPoints[1];
              const p3 = arcPoints[2];

              const d1x = p1.x - center.x;
              const d1y = p1.y - center.y;
              let startAngle = Math.atan2(d1y, d1x);

              const d2x = p2.x - center.x;
              const d2y = p2.y - center.y;
              let middleAngle = Math.atan2(d2y, d2x);

              const d3x = p3.x - center.x;
              const d3y = p3.y - center.y;
              let endAngle = Math.atan2(d3y, d3x);

              if ((startAngle < middleAngle && middleAngle > endAngle) ||
                  (startAngle > middleAngle && middleAngle < endAngle))
              {
                const angle = startAngle === 0 ? middleAngle : startAngle;
                endAngle += Math.sign(angle) * 2 * Math.PI;
              }

              const radius = Math.sqrt(d1x * d1x + d1y * d1y);

              const divisions = loader.getCircleSegments(radius);
              const delta = (endAngle - startAngle) / divisions;

              for (let i = 0; i <= divisions; i++)
              {
                let angle = startAngle + i * delta;
                let x = radius * Math.cos(angle) + center.x;
                let y = radius * Math.sin(angle) + center.y;
                this.points.push(new THREE.Vector2(x, y));
              }
            }
            else
            {
              this.points.push(...arcPoints);
            }
          }
        }
      }
      else
      {
        this.points = points;
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcIndexedPolyCurveHelper);


class IfcTrimmedCurveHelper extends IfcCurveHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const curve = this.entity;
      const schema = curve.constructor.schema;

      const basisCurve = curve.BasisCurve;
      const basisHelper = this.helper(basisCurve);
      const trim1 = curve.Trim1[0];
      const trim2 = curve.Trim2[0];
      if (basisCurve instanceof schema.IfcConic)
      {
        let startAngle = (trim1 instanceof schema.IfcParameterValue) ?
          trim1.Value : trim1;

        let endAngle = (trim2 instanceof schema.IfcParameterValue) ?
          trim2.Value : trim2;

        let sense = curve.SenseAgreement === true;
        this.points =
          basisHelper.getTrimmedPoints(startAngle, endAngle, sense);
      }
      else if (basisCurve instanceof schema.IfcLine)
      {
        this.points = basisHelper.getPoints();
        //console.warn("unsupported trimmming of IfcLine", curve);
      }
      else
      {
        //console.warn("unsupported trimmed curve segment", curve);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcTrimmedCurveHelper);


class IfcCompositeCurveHelper extends IfcCurveHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const compositeCurve = this.entity;
      const schema = compositeCurve.constructor.schema;

      let points = [];
      let segments = compositeCurve.Segments;
      for (let i = 0; i < segments.length; i++)
      {
        let segment = segments[i]; // IfcCompositeCurveSegment
        let curve = segment.ParentCurve;
        let curvePoints = this.helper(curve).getPoints();
        if (curvePoints)
        {
          if (segment.SameSense === true)
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
          console.warn("unsupported curve segment", curve);
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
  constructor(loader, entity)
  {
    super(loader, entity);
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      this.points = [];
      const circle = this.entity;
      const loader = this.loader;

      const matrix = this.helper(circle.Position).getMatrix();
      const radius = circle.Radius;
      const segments = loader.getCircleSegments(radius);
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
    const circle = this.entity;
    const loader = this.loader;

    const matrix = this.helper(circle.Position).getMatrix();
    const radius = circle.Radius;
    const startAngle = THREE.MathUtils.degToRad(param1);
    const endAngle = THREE.MathUtils.degToRad(param2);
    const segments = loader.getCircleSegments(radius);

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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      this.points = [];
      const ellipse = this.entity;
      const loader = this.loader;
      const matrix = this.helper(ellipse.Position).getMatrix();
      const semiAxis1 = ellipse.SemiAxis1;
      const semiAxis2 = ellipse.SemiAxis2;
      const maxAxis = Math.max(semiAxis1, semiAxis2);
      const segments = loader.getCircleSegments(maxAxis);
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
    const ellipse = this.entity;
    const loader = this.loader;
    const matrix = this.helper(ellipse.Position).getMatrix();
    const semiAxis1 = ellipse.SemiAxis1;
    const semiAxis2 = ellipse.SemiAxis2;
    const maxAxis = Math.max(semiAxis1, semiAxis2);
    const startAngle = THREE.MathUtils.degToRad(param1);
    const endAngle = THREE.MathUtils.degToRad(param2);
    const segments = loader.getCircleSegments(maxAxis);

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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.entity;
      const loader = this.loader;

      let faces = faceSet.CfsFaces;

      let geometry = new SolidGeometry();

      for (let face of faces)
      {
        // IfcFace | IfcAdvancedFace
        this.helper(face).addFaces(geometry);
      }
      let solid = new Solid();
      let optimize = false;
      const range = loader.options.faceSetOptimizationRange;
      if (range instanceof Array)
      {
        const minFaces = range[0] || 0;
        const maxFaces = range[1] || 0;
        const numFaces = geometry.faces.length;
        optimize = numFaces >= minFaces && numFaces <= maxFaces;
      }
      solid.updateGeometry(geometry, optimize);
      this.object3D = solid;
    }
    return this.object3D;
  }
};
registerIfcHelperClass(IfcConnectedFaceSetHelper);


class IfcFaceHelper extends IfcHelper
{
  static cacheable = false;

  constructor(loader, entity)
  {
    super(loader, entity);
  }

  addFaces(solidGeometry)
  {
    const face = this.entity;
    const schema = face.constructor.schema;

    let bounds = face.Bounds; // IfcFaceBound[...]

    let faceVertices = null;
    let holes = [];
    for (let b = 0; b < bounds.length; b++)
    {
      let bound = bounds[b]; // IfcFaceBound
      let loop = bound.Bound; // IfcLoop:

      // (IfcPolyLoop, IfcEdgeLoop, IfcVertexLoop)
      let loopVertices =
        GeometryUtils.cloneRing(this.helper(loop).getPoints());

      let loopOrientation = bound.Orientation;
      if (loopOrientation === false)
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
      let face = solidGeometry.addFace(...faceVertices);
      for (let holeVertices of holes)
      {
        if (holeVertices.length >= 3)
        face.addHole(...holeVertices);
      }
    }
  }
}
registerIfcHelperClass(IfcFaceHelper);


class IfcAdvancedFaceHelper extends IfcFaceHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  addFaces(solidGeometry)
  {
    super.addFaces(solidGeometry);
  }
}
registerIfcHelperClass(IfcAdvancedFaceHelper);


class IfcPolyLoopHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const loop = this.entity;
      const polygon = loop.Polygon;

      this.points = [];
      for (let i = 0; i < polygon.length; i++)
      {
        let point = this.helper(polygon[i]).getPoint();
        this.points.push(point);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcPolyLoopHelper);


class IfcEdgeLoopHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const edges = this.entity.EdgeList;

      this.points = [];
      for (let i = 0; i < edges.length; i++)
      {
        let edge = edges[i];
        let edgePoints = this.helper(edge).getPoints();
        GeometryUtils.joinPointArrays(this.points, edgePoints);
      }
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcEdgeLoopHelper);


class IfcEdgeHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const edge = this.entity;

      this.points = [];
      if (edge.EdgeStart)
      {
        this.points.push(this.helper(edge.EdgeStart.VertexGeometry).getPoint());
      }
      if (edge.EdgeEnd)
      {
        this.points.push(this.helper(edge.EdgeEnd.VertexGeometry).getPoint());
      }
    }
    return this.points;
  }
}
registerIfcHelperClass(IfcEdgeHelper);


class IfcOrientedEdgeHelper extends IfcEdgeHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const edge = this.entity;

      this.points = this.helper(edge.EdgeElement).getPoints();

      if (this.points.length > 0)
      {
        if (edge.Orientation === false)
        {
          this.points = [...this.points];
          this.points.reverse();
        }
      }
    }
    return this.points;
  }
}
registerIfcHelperClass(IfcOrientedEdgeHelper);


class IfcEdgeCurveHelper extends IfcEdgeHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoints()
  {
    if (this.points === null)
    {
      const edge = this.entity;
      const schema = edge.constructor.schema;

      const edgePoints = super.getPoints();
      const edgeGeometry = edge.EdgeGeometry;
      const geometryHelper = this.helper(edgeGeometry);

      let geomPoints = geometryHelper.getPoints();
      if (geomPoints && geomPoints.length > 0 && edgeGeometry instanceof schema.IfcConic)
      {
        this.points = geomPoints;
      }
      else
      {
        this.points = edgePoints;
      }
    }
    return this.points;
  }
}
registerIfcHelperClass(IfcEdgeCurveHelper);


class IfcVertexLoopHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const vertex = this.entity.LoopVertex; // IfcVertexPoint
      const point = this.helper(vertex.VertexGeometry).getPoint();
      this.points = [point];
    }
    return this.points;
  }
};
registerIfcHelperClass(IfcVertexLoopHelper);


class IfcCartesianPointList2DHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const list = this.entity;

      this.points = [];
      for (let coord of list.CoordList)
      {
        let point = new THREE.Vector3();
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      const list = this.entity;

      this.points = [];
      for (let coord of list.CoordList)
      {
        let point = new THREE.Vector3();
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.matrix = null; // relative matrix
    this.matrixWorld = null; // matrixWorld
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      const placement = this.entity;
      const relativePlacement = placement.RelativePlacement;
      this.matrix = relativePlacement ?
        this.helper(relativePlacement).getMatrix() : new THREE.Matrix4();
    }
    return this.matrix;
  }

  getMatrixWorld()
  {
    if (this.matrixWorld === null)
    {
      const placement = this.entity;
      const schema = placement.constructor.schema;

      const placementRelTo = placement.PlacementRelTo;
      if (placementRelTo instanceof schema.IfcLocalPlacement)
      {
        this.matrixWorld = this.helper(placementRelTo).getMatrixWorld().clone();
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.matrix = null;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      const operator = this.entity;

      this.matrix = new THREE.Matrix4();
      const origin = this.helper(operator.LocalOrigin).getPoint();
      const axis1 = this.helper(operator.Axis1)?.getDirection();
      const axis2 = this.helper(operator.Axis2)?.getDirection();
      const scale = operator.Scale;

      if (axis1 && axis2)
      {
        axis1.normalize();
        axis2.normalize();

        const axis3 = new THREE.Vector3();
        axis3.crossVectors(axis1, axis2);
        this.matrix.makeBasis(axis1, axis2, axis3);
        if (typeof scale === "number")
        {
          this.matrix.scale(new THREE.Vector3(scale, scale, scale));
        }
        this.matrix.setPosition(origin);
      }
      else
      {
        this.matrix.makeTranslation(origin.x, origin.y, origin.z);
      }
    }
    return this.matrix;
  }
};
registerIfcHelperClass(IfcCartesianTransformationOperatorHelper);


class IfcPlacementHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.matrix = null;
    this.location = null;
  }

  getLocation()
  {
    if (this.location === null)
    {
      const placement = this.entity;
      const loc = placement.Location;
      this.location = loc ?
        this.helper(loc).getPoint() : new THREE.Vector3(0, 0, 0);
    }
    return this.location;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      this.matrix = new THREE.Matrix4();
      this.matrix.setPosition(this.getLocation());
    }
    return this.matrix;
  };
};
registerIfcHelperClass(IfcPlacementHelper);


class IfcAxis1PlacementHelper extends IfcPlacementHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.axis = null;
  }

  getAxis()
  {
    if (this.axis === null)
    {
      const placement = this.entity;
      const axis = placement.Axis;
      this.axis = axis ?
        this.helper(axis).getDirection() : new THREE.Vector3(0, 0, 1);
    }
    return this.axis;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      let loc = this.getLocation();
      let vz = this.getAxis();
      let vy = GeometryUtils.orthogonalVector(vz);
      let vx = new THREE.Vector3();
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.refDirection = null;
  }

  getRefDirection()
  {
    if (this.refDirection === null)
    {
      const placement = this.entity;
      const refd = placement.RefDirection;
      this.refDirection = refd ?
        this.helper(refd).getDirection() : new THREE.Vector3(1, 0, 0);
    }
    return this.refDirection;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      const loc = this.getLocation();
      const vx = this.getRefDirection();
      const vz = new THREE.Vector3(0, 0, 1);
      const vy = new THREE.Vector3();
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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.axis = null;
    this.refDirection = null;
  }

  getAxis()
  {
    if (this.axis === null)
    {
      const placement = this.entity;
      const axis = placement.Axis;
      this.axis = axis ?
        this.helper(axis).getDirection() : new THREE.Vector3(0, 0, 1);
    }
    return this.axis;
  }

  getRefDirection()
  {
    if (this.refDirection === null)
    {
      const placement = this.entity;
      const refd = placement.RefDirection;
      this.refDirection = refd ?
        this.helper(refd).getDirection() : new THREE.Vector3(1, 0, 0);
    }
    return this.refDirection;
  }

  getMatrix()
  {
    if (this.matrix === null)
    {
      const loc = this.getLocation();
      const vz = this.getAxis();
      const vx = this.getRefDirection();
      const vy = new THREE.Vector3();
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
  static cacheable = false;

  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
  }
};
registerIfcHelperClass(IfcRelationshipHelper);


class IfcRelDefinesByTypeHelper extends IfcRelationshipHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;
    const schema = rel.constructor.schema;

    let relatedObjects = rel.RelatedObjects;
    let ifcType = rel.RelatingType;

    const typeGroup = this.helper(ifcType)?.getObject3D();

    const typeData = typeGroup?.userData.IFC;

    for (let relatedObject of relatedObjects)
    {
      let relatedHelper = this.helper(relatedObject);
      if (relatedHelper.getObject3D)
      {
        let object3D = relatedHelper.getObject3D();

        if (object3D.links === undefined)
        {
          object3D.links = {};
        }
        object3D.links.ifcType = typeGroup;

        if (typeData)
        {
          object3D.userData["IFC_type"] = typeData;
        }
        object3D.userData["IFC_rel_type"] = loader.getIfcData(rel);
      }
    }
  }
};
registerIfcHelperClass(IfcRelDefinesByTypeHelper);


class IfcRelAssociatesMaterialHelper extends IfcRelationshipHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;
    const schema = rel.constructor.schema;

    const ifcObjects = rel.RelatedObjects;
    const materialSelect = rel.RelatingMaterial;

    let layerSetData;
    const materialLayerDataArray = [];

    const processLayerSet = (layerSet) =>
    {
      layerSetData = loader.getIfcData(layerSet);
      for (let materialLayer of layerSet.MaterialLayers)
      {
        let materialLayerData = loader.getIfcData(materialLayer);
        materialLayerData.Material = materialLayer?.Material.Name || "";
        materialLayerDataArray.push(materialLayerData);
      }
    };

    if (materialSelect instanceof schema.IfcMaterialLayerSetUsage)
    {
      const layerSet = materialSelect.ForLayerSet;
      processLayerSet(layerSet);
    }
    else if (materialSelect instanceof schema.IfcMaterialLayerSet)
    {
      const layerSet = materialSelect;
      processLayerSet(layerSet);
    }
    else if (materialSelect instanceof schema.IfcMaterialList)
    {
      const materials = materialSelect.Materials;
      for (let material of materials)
      {
        let materialLayerData = {
          ifcClassName: "IfcMaterialList",
          Material: material.Name
        };
        materialLayerDataArray.push(materialLayerData);
      }
    }
    else if (materialSelect instanceof schema.IfcMaterial)
    {
      const material = materialSelect;
      let materialLayerData = {
        ifcClassName: "IfcMaterial",
        Material: material.Name
      };
      materialLayerDataArray.push(materialLayerData);
    }

    // set material properties to ifcObjects
    if (ifcObjects instanceof Array)
    {
      for (let ifcObject of ifcObjects)
      {
        let objectHelper = this.helper(ifcObject);
        if (objectHelper?.getObject3D)
        {
          let object3D = objectHelper.getObject3D();
          if (layerSetData)
          {
            object3D.userData["IFC_material_layerset"] = layerSetData;
          }
          for (let i = 0; i < materialLayerDataArray.length; i++)
          {
            let materialLayerData = materialLayerDataArray[i];
            object3D.userData["IFC_material_layer_" + i] = materialLayerData;
          }
        }
      }
    }
  }
}
registerIfcHelperClass(IfcRelAssociatesMaterialHelper);


class IfcRelAssociatesClassificationHelper extends IfcRelationshipHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;
    const schema = rel.constructor.schema;

    const ifcObjects = rel.RelatedObjects;
    const ifcClassifRef = rel.RelatingClassification;

    if (ifcClassifRef instanceof schema.IfcClassificationReference)
    {
      for (let ifcObject of ifcObjects)
      {
        let objectHelper = this.helper(ifcObject);
        if (objectHelper?.getObject3D)
        {
          let object3D = objectHelper.getObject3D();

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
          const classifData = loader.getIfcData(ifcClassifRef);

          object3D.userData["IFC_classification_" + classifName] = classifData;
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelAssociatesClassificationHelper);


class IfcRelAssignsToGroupHelper extends IfcRelationshipHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;
    const schema = rel.constructor.schema;

    const ifcGroup = rel.RelatingGroup;
    const ifcObjects = rel.RelatedObjects;

    const groupData = loader.getIfcData(ifcGroup);

    let groupName = ifcGroup.Name || ifcGroup.GlobalId;
    groupName = ifcGroup.constructor.name + "_" + groupName;

    for (let i = 0; i < ifcObjects.length; i++)
    {
      let ifcObject = ifcObjects[i];
      let objectHelper = this.helper(ifcObject);

      if (objectHelper?.getObject3D)
      {
        let object3D = objectHelper.getObject3D();
        object3D.userData["IFC_group_" + groupName] = groupData;
        object3D.userData["IFC_rel_group"] = loader.getIfcData(rel);
      }
    }
  }
};
registerIfcHelperClass(IfcRelAssignsToGroupHelper);


class IfcRelAggregatesHelper extends IfcRelationshipHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;
    const schema = rel.constructor.schema;

    const ifcObject = rel.RelatingObject;
    const relatedObjects = rel.RelatedObjects;

    if (ifcObject instanceof schema.IfcObjectDefinition)
    {
      const containerObject3D = this.helper(ifcObject).getObject3D();
      if (containerObject3D)
      {
        for (let i = 0; i < relatedObjects.length; i++)
        {
          let ifcRelatedObject = relatedObjects[i];

          if (ifcRelatedObject instanceof schema.IfcObjectDefinition)
          {
            let object3D = this.helper(ifcRelatedObject).getObject3D();
            if (object3D)
            {
              object3D.userData["IFC_rel_aggregated"] = loader.getIfcData(rel);

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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;
    const schema = rel.constructor.schema;

    const ifcSpatialElement = rel.RelatingStructure;
    if (ifcSpatialElement)
    {
      let containerObject3D = this.helper(ifcSpatialElement).getObject3D();
      if (containerObject3D)
      {
        for (let i = 0; i < rel.RelatedElements.length; i++)
        {
          let ifcRelatedProduct = rel.RelatedElements[i];

          if (ifcRelatedProduct instanceof schema.IfcProduct)
          {
            let object3D = this.helper(ifcRelatedProduct).getObject3D();
            if (object3D)
            {
              object3D.userData["IFC_rel_contained"] = loader.getIfcData(rel);

              if (object3D.parent !== containerObject3D)
              {
                let parentIFC = object3D.parent.userData.IFC;
                if (parentIFC?.ifcClassName === 'IfcOpeningElement')
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;

    const element = rel.RelatingBuildingElement;
    const opening = rel.RelatedOpeningElement;
    if (element && opening)
    {
      let object3D = this.helper(element).getObject3D();
      if (object3D)
      {
        let openingObject3D = this.helper(opening).getObject3D();
        if (openingObject3D)
        {
          let className = object3D.userData.IFC.ifcClassName;
          if (loader.options.unvoidableClasses.includes(className))
          {
            console.warn(`Unsupported voiding of ${className} element`,
              object3D, openingObject3D);
            openingObject3D.parent.remove(openingObject3D);
          }
          else
          {
            openingObject3D.userData["IFC_rel_voids"] = loader.getIfcData(rel);

            if (object3D !== openingObject3D.parent)
            {
              object3D.attach(openingObject3D);
            }
          }
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelVoidsElementHelper);


class IfcRelFillsElementHelper extends IfcRelationshipHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;

    const opening = rel.RelatingOpeningElement;
    const element = rel.RelatedBuildingElement;
    if (element && opening)
    {
      let object3D = this.helper(element).getObject3D();
      if (object3D)
      {
        let openingObject3D = this.helper(opening).getObject3D();
        if (openingObject3D)
        {
          object3D.userData["IFC_rel_fills"] = loader.getIfcData(rel);

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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const port = rel.RelatingPort;
    const element = rel.RelatedElement;

    if (port && element)
    {
      let object3D = this.helper(element).getObject3D();
      if (object3D)
      {
        let portObject3D = this.helper(port).getObject3D();
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  relate()
  {
    const rel = this.entity;
    const loader = this.loader;
    const schema = rel.constructor.schema;

    let propertySet = rel.RelatingPropertyDefinition;
    let relatedObjects = rel.RelatedObjects;

    const ifcRelData = loader.getIfcData(rel);

    if (propertySet instanceof schema.IfcPropertySet)
    {
      let psetName = propertySet.Name;
      let properties = this.helper(propertySet).getProperties();
      for (let relatedObject of relatedObjects)
      {
        if (relatedObject instanceof schema.IfcProduct)
        {
          let object3D = this.helper(relatedObject).getObject3D();
          if (object3D)
          {
            object3D.userData["IFC_" + psetName] = properties;
          }
          object3D.userData["IFC_rel_" + psetName] = ifcRelData;
        }
        else if (relatedObject instanceof schema.IfcProject)
        {
          const project = relatedObject;
          loader.model.userData["IFC_" + psetName] = properties;
          loader.model.userData["IFC_rel_" + psetName] = ifcRelData;
        }
      }
    }
  }
};
registerIfcHelperClass(IfcRelDefinesByPropertiesHelper);


/* Other helpers */

class IfcPointHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
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
  constructor(loader, entity)
  {
    super(loader, entity);
  }

  getPoint()
  {
    if (this.point === null)
    {
      const point = this.entity;

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
  constructor(loader, entity)
  {
    super(loader, entity);
    this.direction = null;
  }

  getDirection()
  {
    if (this.direction === null)
    {
      const direction = this.entity;

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


class IfcVectorHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.vector = null;
  }

  getVector()
  {
    if (this.vector === null)
    {
      const vector = this.entity;
      const loader = this.loader;
      const helper = entity => loader.helper(entity);

      const direction = helper(vector.Orientation).getDirection();
      const magnitude = loader.unBox(vector.Magnitude);

      this.vector = new THREE.Vector3();
      this.vector.copy(direction);
      if (magnitude !== 0)
      {
        this.vector.normalize();
        this.vector.multiplyScalar(magnitude);
      }
    }
    return this.vector;
  }
}
registerIfcHelperClass(IfcVectorHelper);


class IfcPresentationLayerAssignmentHelper extends IfcHelper
{
  static cacheable = false;

  constructor(loader, entity)
  {
    super(loader, entity);
  }

  assign()
  {
    const assignment = this.entity;
    const schema = assignment.constructor.schema;

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
          let itemHelper = this.helper(item);
          if (itemHelper.getObject3D)
          {
            let object = itemHelper.getObject3D();
            if (object)
            {
              object.userData.IFC_layer =
              {
                Name : layerName,
                Description : layerDescription,
                Identifier : identifier
              };
            }
          }
        }
      }
    }
  }
}
registerIfcHelperClass(IfcPresentationLayerAssignmentHelper);


class IfcStyledItemHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.properties = null;
  }

  applyStyle()
  {
    const styledItem = this.entity;
    const schema = styledItem.constructor.schema;

    const item = styledItem.Item; // item to apply style
    const styles = styledItem.Styles; // style to apply
    if (item === null || styles === null) return;

    let style = styles[0]; // apply only first style
    if (schema.IfcPresentationStyleAssignment &&
        style instanceof schema.IfcPresentationStyleAssignment)
    {
      style = style.Styles[0];
    }

    if (style instanceof schema.IfcSurfaceStyle)
    {
      const material = this.helper(style).getMaterial();
      if (this.helper(item) && material)
      {
        this.helper(item).material = material;
      }
    }
  }
}
registerIfcHelperClass(IfcStyledItemHelper);


class IfcSurfaceStyleHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.material = null;
  }

  getMaterial()
  {
    if (this.material === null)
    {
      const style = this.entity;
      const schema = style.constructor.schema;

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
          side: side.value === "BOTH" ? THREE.DoubleSide :
            (side.value === "POSITIVE" ? THREE.FrontSide : THREE.BackSide)
        });
      }
    }
    return this.material;
  }
};
registerIfcHelperClass(IfcSurfaceStyleHelper);


class IfcPropertySetHelper extends IfcHelper
{
  constructor(loader, entity)
  {
    super(loader, entity);
    this.properties = null;
  }

  getProperties()
  {
    if (this.properties === null)
    {
      const pset = this.entity;
      const loader = this.loader;
      const schema = pset.constructor.schema;

      this.properties =  {
        ifcClassName : "IfcPropertySet",
        GlobalId : pset.GlobalId
      };

      if (pset.HasProperties)
      {
        for (let i = 0; i < pset.HasProperties.length; i++)
        {
          let prop = pset.HasProperties[i];
          if (prop instanceof schema.IfcPropertySingleValue)
          {
            let name = loader.unBox(prop.Name);
            let value = loader.unBox(prop.NominalValue);
            this.properties[name] = value;
          }
        }
      }
    }
    return this.properties;
  }
};
registerIfcHelperClass(IfcPropertySetHelper);

export { IFCLoader };
