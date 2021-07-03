/**
* @author Ricard Real (realor@santfeliu.cat)
*/
BIMROCKET.IFC = {

  RepresentationName : "IfcRepresentation",
  MIN_CIRCLE_SEGMENTS : 16, // minimum circle segments
  CIRCLE_SEGMENTS_BY_RADIUS : 64, // circle segments by meter of radius
  HALF_SPACE_SIZE : 10000,
  FACTOR_PREFIX : {
    ".EXA." : 10e17,
    ".PETA." : 10e14,
    ".TERA." : 10e11,
    ".GIGA." : 10e8,
    ".MEGA." : 10e5,
    ".KILO." : 10e2,
    ".HECTO." : 100,
    ".DECA." : 10,
    ".DECI." : 0.1,
    ".CENTI." : 0.01,
    ".MILLI." : 0.001,
    ".MICRO." : 10e-7,
    ".NANO." : 10e-10,
    ".PICO." : 10e-13,
    ".FEMTO." : 10e-16,
    ".ATTO." : 10e-19
  },
  modelFactor : 1.0,

  helpers : {},

  createBaseEntity : function(schema)
  {
    return class
    {
      get helper()
      {
        if (this._helper === undefined)
        {
          let ifcClass = this.constructor;
          while (ifcClass)
          {
            let helperClass =
              BIMROCKET.IFC.helpers[ifcClass.ifcClassName + "Helper"];
            if (helperClass)
            {
              this._helper = new helperClass(this, schema);
              break;
            }
            ifcClass = ifcClass.ifcSuperClassName ?
              schema[ifcClass.ifcSuperClassName] : null;
          }
        }
        return this._helper;
      }

      toJSON()
      {
        let names = Object.getOwnPropertyNames(this);
        let json = {"ifcClassName" : this.constructor.ifcClassName};
        for (let i = 0; i < names.length; i++)
        {
          let name = names[i];
          if (name  !== "_helper")
          {
            json[name] = this[name];
          }
        }
        return json;
      }
    };
  },

  getCircleSegments : function(radius)
  {
    let meterRadius = radius * BIMROCKET.IFC.modelFactor;

    let segments = Math.max(
      BIMROCKET.IFC.MIN_CIRCLE_SEGMENTS,
      Math.ceil(BIMROCKET.IFC.CIRCLE_SEGMENTS_BY_RADIUS * meterRadius));

    if (segments % 2 === 1) segments++;

    return segments;
  },

  cloneObject3D : function(object)
  {
    // clone preserving _ifc property
    let clonedObject = object.clone(false);
    clonedObject._ifc = object._ifc;

    if (!(object instanceof BIMROCKET.Solid))
    {
      for (var i = 0; i < object.children.length; i++)
      {
        var child = object.children[i];
        clonedObject.add(BIMROCKET.IFC.cloneObject3D(child));
      }
    }
    return clonedObject;
  },

  buildModel : function(file, onCompleted, onProgress, onError, options)
  {
    const model = new THREE.Group();

    console.info(file);

    const schema = file.schema;

    /* process project info */
    const processProjectInfo = function()
    {
      BIMROCKET.IFC.modelFactor = 1.0;

      if (file.entities.IfcProject)
      {
        let project = file.entities.IfcProject[0];

        model.name = project.Name || project.LongName || "IFC";
        model.userData.STEP = this.file;
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
                  let factor = BIMROCKET.IFC.FACTOR_PREFIX[unit.Prefix] || 1;
                  BIMROCKET.IFC.modelFactor = factor; // factor respect metre
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
    const applyStyles = function()
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
    const createObject = function(index)
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

    const createObjects = function()
    {
      let products = file.products;
      for (let i = 0; i < products.length; i++)
      {
        createObject(i);
      }
    };

    /* process relationships */
    const processRelationships = function()
    {
      let relationships = file.relationships;
      for (var i = 0; i < relationships.length; i++)
      {
        var relationship = relationships[i];
        relationship.helper.relate();
      }
      model.updateMatrixWorld();
    };

    /* voiding objects */
    const voidObject = function(index)
    {
      let product = file.products[index];
      let openings = product.helper.openings;
      if (openings.length > 0)
      {
        let productObject3D = product.helper.getObject3D();
        let productRepr =
          productObject3D.getObjectByName(BIMROCKET.IFC.RepresentationName);

        if (productRepr instanceof BIMROCKET.Solid &&
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
              BIMROCKET.IFC.RepresentationName);
            if (openingRepr instanceof BIMROCKET.Solid)
            {
              parts.push(openingRepr);
            }
            else if (openingRepr instanceof THREE.Group)
            {
              for (let i = 0; i < openingRepr.children.length; i++)
              {
                let child = openingRepr.children[i];
                if (child instanceof BIMROCKET.Solid)
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

    /* update visibility */
    const updateVisibility = function()
    {
      model.traverse(function(object)
      {
        if (object.userData.IFC)
        {
          var ifcClassName = object.userData.IFC.ifcClassName;
          if (ifcClassName === "IfcOpeningElement" ||
              ifcClassName === "IfcSpace")
          {
            object = object.getObjectByName(BIMROCKET.IFC.RepresentationName);
            if (object)
            {
              BIMROCKET.ObjectUtils.updateStyle(object, false, false);
            }
          }
          else if (ifcClassName === "IfcSite" ||
            ifcClassName === "IfcBuilding" ||
            ifcClassName === "IfcBuildingStorey")
          {
            object.userData.selection.type = "box";
          }
        }
      });
    };

    const paintObject = function(object, material)
    {
      object.traverse(function(object)
      {
        if (object instanceof BIMROCKET.Solid)
        {
          if (object.material === BIMROCKET.Solid.FaceMaterial)
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
            BIMROCKET.IFC.RepresentationName);
          if (reprObject3D)
          {
            let ifcClassName = object3D.userData.IFC.ifcClassName;
            let material = BIMROCKET.IFC.Materials[ifcClassName];
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

      executeTasks([
        { run : processProjectInfo, message : "Processing project info..."},
        { run : applyStyles, message : "Applying styles..."},
        { run : createObject, message : "Creating objects...", iterations : getIterations},
        { run : processRelationships, message : "Processing relationships..."},
        { run : voidObject, message : "Voiding objects...", iterations : getIterations},
        { run : updateVisibility, message : "Updating visibility..."},
        { run : paintObjects, message : "Painting objects..."},
        { run : groupObjects, message : "Grouping objects..."}],
        function() { onCompleted(model); }, onProgress, onError, 100, 10);
    }
    else
    {
      // synchronous operation

      processProjectInfo();
      applyStyles();
      createObjects();
      processRelationships();
      voidObjects();
      updateVisibility();
      paintObjects();
      groupObjects();
    }
    return model;
  }
};

BIMROCKET.IFC.File = class
{
  constructor()
  {
    this.schema = BIMROCKET.IFC4;
    this.entities = {};
    this.products = [];
    this.typeProducts = [];
    this.relationships = [];
  }

  add(entity)
  {
    let entities = this.entities;
    let ifcClassName = entity.constructor.ifcClassName;
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

BIMROCKET.IFC.STEPLoader = class extends THREE.Loader
{
	constructor(manager)
  {
    super(manager);
  }

  load(url, onLoad, onProgress, onError)
  {
    const scope = this;
    const loader = new THREE.FileLoader(scope.manager);
    loader.load(url, function (text) {
      onLoad(scope.parse(text));
    }, onProgress, onError);
  }

  parse(text, onCompleted, onProgress, onError)
  {
    let file = new BIMROCKET.IFC.File();

    let parser = new BIMROCKET.STEP.Parser();
    parser.schema = BIMROCKET.IFC4; // default schema
    parser.getSchemaTypes = function(schemaName)
    {
      console.info("schema: " + schemaName);
      let schema = BIMROCKET[schemaName] || BIMROCKET.IFC4;
      file.schema = schema;
      return schema;
    };
    parser.onEntityCreated = function(entity)
    {
      file.add(entity);
    };
    parser.parse(text);

    return new BIMROCKET.IFC.buildModel(file, onCompleted, onProgress, onError,
      this.options);
  }
};

BIMROCKET.IFC.Materials =
{
  IfcWall : new THREE.MeshPhongMaterial({
    name : "Wall",
    color: 0xC0C080, shininess: 1,
    flatShading: false,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.0,
    polygonOffsetUnits: 0.5}),

  IfcWallStandardCase : new THREE.MeshPhongMaterial({
    name : "Wall",
    color: 0xC0C080, shininess: 1,
    flatShading: false,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.0,
    polygonOffsetUnits: 0.5}),

  IfcSlab : new THREE.MeshPhongMaterial({
    name : "Slab",
    color: 0xC0C0C0, shininess: 1,
    flatShading: false,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.0,
    polygonOffsetUnits: 0.5}),

  IfcRailing : new THREE.MeshPhongMaterial({
    name : "Railing",
    flatShading: false,
    color: 0x606060, shininess: 1, side: THREE.DoubleSide}),

  IfcWindow : new THREE.MeshPhongMaterial({
    name : "Window",
    flatShading: false,
    color: 0x8080FF, opacity: 0.5, transparent: true, side: THREE.DoubleSide}),

  IfcDoor : new THREE.MeshPhongMaterial({
    name : "Door",
    flatShading: false,
    color: 0xC0C040, side: THREE.DoubleSide}),

  IfcCovering : new THREE.MeshPhongMaterial({
    name : "Covering",
    flatShading: false,
    color: 0xC0C0C0, side: THREE.FrontSide}),

  IfcBeam : new THREE.MeshPhongMaterial({
    name : "Beam",
    flatShading: false,
    color: 0x606070, side: THREE.FrontSide}),

  IfcColumn : new THREE.MeshPhongMaterial({
    name : "Column",
    flatShading: false,
    color: 0x808080, side: THREE.FrontSide}),

  IfcOpeningElement : new THREE.MeshPhongMaterial({
    name : "Opening",
    flatShading: false,
    color: 0x8080FF, opacity: 0.2, transparent: true, side: THREE.FrontSide}),

  IfcSpace : new THREE.MeshPhongMaterial({
    name : "Space",
    flatShading: false,
    color: 0xC0C0F0, opacity: 0.2, transparent: true}),

  IfcFlowTerminal : new THREE.MeshPhongMaterial({
    name : "FlowTerminal",
    flatShading: false,
    color: 0xFFFFFF, side: THREE.DoubleSide}),

  IfcFurnishingElement : new THREE.MeshPhongMaterial({
    name : "FurnishingElement",
    flatShading: false,
    color: 0xDEB887, side: THREE.DoubleSide}),

  IfcStair : new THREE.MeshPhongMaterial({
    name : "FurnishingElement",
    flatShading: false,
    color: 0xA0522D, side: THREE.DoubleSide}),

  IfcStairFlight : new THREE.MeshPhongMaterial({
    name : "FurnishingElement",
    flatShading: false,
    color: 0xA0522D, side: THREE.DoubleSide})
};

/* Helpers */

BIMROCKET.IFC.helpers.IfcHelper = class
{
  constructor(instance, schema)
  {
    this.instance = instance;
    this.schema = schema;
  }
};

BIMROCKET.IFC.helpers.IfcProductHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.object3D = null;
    this.openings = [];
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      var product = this.instance;
      var schema = this.schema;

      var object3D = new THREE.Object3D();
      object3D.userData.selection = { group: true };

      let name = product.Name ?
        product.Name : product.constructor.ifcClassName;

      if (name.length >= 2 && name[0] === BIMROCKET.HIDDEN_PREFIX)
      {
        name = name.substring(1);
      }

      object3D.name = name;
      object3D.userData.IFC = {
        ifcClassName : product.constructor.ifcClassName,
        GlobalId : product.GlobalId,
        Name: product.Name,
        Description : product.Description
      };
      object3D._ifc = product;

      var objectPlacement = product.ObjectPlacement;
      if (objectPlacement instanceof schema.IfcLocalPlacement)
      {
        var matrix = objectPlacement.helper.getMatrix();
        matrix.decompose(object3D.position,
          object3D.quaternion, object3D.scale);
        object3D.matrix.copy(matrix);
        object3D.matrixWorldNeedsUpdate = true;
      }

      var productRepr = product.Representation;
      if (productRepr instanceof schema.IfcProductRepresentation)
      {
        var reprObject3D = productRepr.helper.getObject3D("Body");
        if (reprObject3D)
        {
          object3D.add(reprObject3D);
        }
      }
      this.object3D = object3D;
    }
    return this.object3D;
  }
};

BIMROCKET.IFC.helpers.IfcProductRepresentationHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcRepresentationHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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
        if (item)
        {
          var itemObject3D = item.helper.getObject3D();
          if (itemObject3D)
          {
            itemObject3D.name = "Item" + i;
            itemObject3D.userData.IFC =
              {"ifcClassName" : item.constructor.ifcClassName};
            group.add(itemObject3D);
            if (itemObject3D instanceof BIMROCKET.Solid && item.helper.material)
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
      this.object3D.name = BIMROCKET.IFC.RepresentationName;
      this.object3D._ifc = representation;
    }
    return this.object3D;
  }
};

/* Geometric representation item helpers */

BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.object3D = null;
  }

  getObject3D()
  {
    console.warn("Unsupported item", this);
    return null;
  }
};

BIMROCKET.IFC.helpers.IfcHalfSpaceSolidHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      var halfSpace = this.instance;

      var size = BIMROCKET.IFC.HALF_SPACE_SIZE;

      var surface = halfSpace.BaseSurface;
      var flag = halfSpace.AgreementFlag === '.T.';
      var plane = surface.Position;

      const geometry = new BIMROCKET.SolidGeometry();
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
      var planeSolid = new BIMROCKET.Solid(geometry);

      this.object3D = planeSolid;
      this.object3D._ifc = halfSpace;
    }
    return this.object3D;
  }
};

BIMROCKET.IFC.helpers.IfcPolygonalBoundedHalfSpaceHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      var halfSpace = this.instance;
      var schema = this.schema;

      var surface = halfSpace.BaseSurface;
      var base = halfSpace.Position;
      var flag = halfSpace.AgreementFlag === '.T.';
      var boundary = halfSpace.PolygonalBoundary;
      var geometry;

      if (surface instanceof schema.IfcPlane)
      {
        var size = BIMROCKET.IFC.HALF_SPACE_SIZE;

        var geometry;
        var plane = surface.Position;
        var curvePoints = boundary.helper.getPoints();

        var shape = new THREE.Shape();
        shape.moveTo(curvePoints[0].x, curvePoints[0].y);
        for (var i = 1; i < curvePoints.length; i++)
        {
          shape.lineTo(curvePoints[i].x, curvePoints[i].y);
        }
        shape.closePath();

        var extrudeSettings = {
          steps: 1,
          depth: size,
          bevelEnabled: false
        };

        geometry = new BIMROCKET.ExtrudeSolidGeometry(shape, extrudeSettings);

        geometry.applyMatrix4(base.helper.getMatrix());
        var polygonSolid = new BIMROCKET.Solid(geometry);

        shape = new THREE.Shape();
        shape.moveTo(-size, -size);
        shape.lineTo(size, -size);
        shape.lineTo(size, size);
        shape.lineTo(-size, size);
        shape.closePath();

        geometry = new BIMROCKET.ExtrudeSolidGeometry(shape, extrudeSettings);

        var matrix = plane.helper.getMatrix();
        if (!flag)
        {
          matrix = matrix.clone();
          var rotMatrix = new THREE.Matrix4();
          rotMatrix.makeRotationX(Math.PI);
          matrix.multiply(rotMatrix);
        }
        geometry.applyMatrix4(matrix);
        var planeSolid = new BIMROCKET.Solid(geometry);

        polygonSolid.subtract(planeSolid);

        this.object3D = polygonSolid;
        this.object3D._ifc = halfSpace;
      }
    }
    return this.object3D;
  }
};

BIMROCKET.IFC.helpers.IfcBooleanResultHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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
      if (firstObject instanceof BIMROCKET.Solid && firstOperand.helper.material)
      {
        firstObject.material = firstOperand.helper.material;
      }

//      var object3D = new THREE.Group();
//
//      var op1 = firstObject.clone();
//      op1.visible = false;
//      op1.name = "first";
//      object3D.add(op1);
//
//      var op2 = secondObject.clone();
//      op2.visible = false;
//      op2.name = "second";
//      object3D.add(op2);
//
//      this.object3D = object3D;

      if (firstObject instanceof BIMROCKET.Solid &&
          secondObject instanceof BIMROCKET.Solid)
      {
        var oper = "subtract";
        switch (operator)
        {
          case ".UNION.":
            oper = "union";
            break;
          case ".INTERSECTION.":
            oper = "intersect";
            break;
          case ".DIFFERENCE." :
            oper = "subtract";
            break;
          default:
            console.warn("Invalid operator: " + operator.constant);
        }
        var object3D = firstObject.clone();
        object3D.booleanOperation(oper, [secondObject]);
        if (object3D.isValid())
        {
          this.object3D = object3D;
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

BIMROCKET.IFC.helpers.IfcTriangulatedFaceSetHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.instance;

      let geometry = new BIMROCKET.SolidGeometry();

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
      this.object3D = new BIMROCKET.Solid(geometry);
      this.object3D._ifc = faceSet;
    }
    return this.object3D;
  }
};

BIMROCKET.IFC.helpers.IfcPolygonalFaceSetHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.instance;

      let geometry = new BIMROCKET.SolidGeometry();

      geometry.vertices = faceSet.Coordinates.helper.getPoints();

      let faces = faceSet.Faces;
      for (let f = 0; f < faces.length; f++)
      {
        let face = faces[f];
        let coordIndex = face.CoordIndex;

        let faceVertices = [];
        let faceIndices = [];
        let faceHoles = [];

        for (let i = 0; i < coordIndex.length; i++)
        {
          let vertexIndex = coordIndex[i] - 1;
          faceVertices.push(vertices[vertexIndex]);
          faceIndices.push(vertexIndex);
        }

        let innerCoordIndices = face.InnerCoordIndices;
        if (innerCoordIndices)
        {
          for (let h = 0; h < innerCoordIndices.length; h++)
          {
            let hole = innerCoordIndices[h];
            let holeVertices = [];
            for (let hv = 0; hv < hole.length; hv++)
            {
              let vertexIndex = hole[hv] - 1;
              holeVertices.push(vertices[vertexIndex]);
              faceIndices.push(vertexIndex);
            }
            faceHoles.push(holeVertices);
          }
        }

        let triangles = BIMROCKET.GeometryUtils.triangulateFace(faceVertices,
          faceHoles);

        for (let t = 0; t < triangles.length; t++)
        {
          let triangle = triangles[t];
          let a = faceIndices[triangle[0]];
          let b = faceIndices[triangle[1]];
          let c = faceIndices[triangle[2]];
          geometry.addFace(a, b, c);
        }
      }
      this.object3D = new BIMROCKET.Solid(geometry);
      this.object3D._ifc = faceSet;
    }
    return this.object3D;
  }
};

BIMROCKET.IFC.helpers.IfcExtrudedAreaSolidHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      var solid = this.instance;
      var schema = this.schema;

      var geometry;
      var profileDef = solid.SweptArea;
      var matrix = solid.Position.helper.getMatrix();
      var direction = solid.ExtrudedDirection.helper.getDirection();
      var depth = solid.Depth;

      var extrudeVector = new THREE.Vector3();
      extrudeVector.copy(direction).normalize();
      extrudeVector.multiplyScalar(depth * Math.sign(direction.z));

      if (profileDef instanceof schema.IfcProfileDef)
      {
        var shape = profileDef.helper.getShape();
        if (shape)
        {
          var extrudeSettings = {
            steps: 1,
            depth: extrudeVector.z,
            bevelEnabled: false
          };

          geometry = new BIMROCKET.ExtrudeSolidGeometry(shape, extrudeSettings);

          var a = extrudeVector.x / extrudeVector.z;
          var b = extrudeVector.y / extrudeVector.z;
          var shearMatrix = new THREE.Matrix4();
          shearMatrix.elements[8] = a;
          shearMatrix.elements[9] = b;
          geometry.applyMatrix4(shearMatrix);

          if (direction.z < 0)
          {
            var reverseMatrix = new THREE.Matrix4();
            extrudeVector.multiplyScalar(-1);
            reverseMatrix.makeTranslation(extrudeVector.x, extrudeVector.y,
              extrudeVector.z);
            geometry.applyMatrix4(reverseMatrix);
          }

          this.object3D = new BIMROCKET.Solid(geometry);
          this.object3D._ifc = solid;
          if (matrix)
          {
            matrix.decompose(this.object3D.position, this.object3D.quaternion,
              this.object3D.scale);
            this.object3D.matrix.copy(matrix);
            this.object3D.matrixWorldNeedsUpdate = true;
          }
        }
        else console.warn("Unsupported profile", profileDef);
      }
    }
    return this.object3D;
  }
};

BIMROCKET.IFC.helpers.IfcManifoldSolidBrepHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcFaceBasedSurfaceModelHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcShellBasedSurfaceModelHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcMappedItemHelper = class
  extends BIMROCKET.IFC.helpers.IfcGeometricRepresentationItemHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      var mappedItem = this.instance;

      var source = mappedItem.MappingSource;
      var target = mappedItem.MappingTarget;

      var origin = source.MappingOrigin;
      var repr = source.MappedRepresentation;

      if (origin && repr)
      {
        var matrix = new THREE.Matrix4();
        matrix.copy(origin.helper.getMatrix());

        if (target)
        {
          var transformMatrix = target.helper.getMatrix();
          matrix.multiply(transformMatrix);
        }

        var mappedObject3D = repr.helper.getObject3D();
        if (mappedObject3D)
        {
          var group = new THREE.Group();
          matrix.decompose(group.position, group.quaternion, group.scale);
          group.matrix.copy(matrix);
          group.matrixWorldNeedsUpdate = true;

          mappedObject3D = BIMROCKET.IFC.cloneObject3D(mappedObject3D);
          group.add(mappedObject3D);

          this.object3D = group;
          this.object3D._ifc = mappedItem;
        }
      }
    }
    return this.object3D;
  }
};

/* Profile helpers */

BIMROCKET.IFC.helpers.IfcProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.shape = null;
  }

  getShape()
  {
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcProfileDefHelper
{
  static vector = new THREE.Vector3();

  constructor(instance, schema)
  {
    super(instance, schema);
    this.shape = null;
  }

  getShape()
  {
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcRectangleProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const profMat = profile.Position.helper.getMatrix();
      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);
      builder.rectangle(profile.XDim, profile.YDim);
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcRectangleHollowProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcRectangleProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const profMat = profile.Position.helper.getMatrix();
      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);
      builder.rectangle(profile.XDim, profile.YDim);

      const hole = new THREE.Path();
      const thickness = 2 * profile.WallThickness;
      builder.setup(hole, profMat);
      builder.rectangle(profile.XDim - thickness, profile.YDim - thickness);
      this.shape.holes.push(hole);
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcCircleProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const radius = profile.Radius;
      const profMat = profile.Position.helper.getMatrix();
      const segments = BIMROCKET.IFC.getCircleSegments(radius);

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);
      builder.circle(radius, segments);
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcCircleHollowProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcCircleProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const radius = profile.Radius;
      const thickness = profile.WallThickness;
      const profMat = profile.Position.helper.getMatrix();
      const segments = BIMROCKET.IFC.getCircleSegments(radius);

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);
      builder.circle(radius, segments);

      const hole = new THREE.Path();
      builder.setup(hole, profMat);
      builder.circle(radius - thickness, segments);
      this.shape.holes.push(hole);
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcEllipseProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const xradius = profile.SemiAxis1;
      const yradius = profile.SemiAxis2;
      const profMat = profile.Position.helper.getMatrix();
      const maxRadius = Math.max(xradius, yradius);
      const segments = BIMROCKET.IFC.getCircleSegments(maxRadius);

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);
      builder.ellipse(xradius, yradius, segments);
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcIShapeProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const profMat = profile.Position.helper.getMatrix();

      const xs = 0.5 * profile.OverallWidth;
      const ys = 0.5 * profile.OverallDepth;
      const xt = 0.5 * profile.WebThickness;
      const yt = profile.FlangeThickness;

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);

      builder.moveTo(-xs, ys - yt);
      builder.lineTo(-xt, ys - yt);
      builder.lineTo(-xt, -ys + yt);
      builder.lineTo(-xs, -ys + yt);
      builder.lineTo(-xs, -ys);
      builder.lineTo(xs, -ys);
      builder.lineTo(xs, -ys + yt);
      builder.lineTo(xt, -ys + yt);
      builder.lineTo(xt, ys - yt);
      builder.lineTo(xs, ys - yt);
      builder.lineTo(xs, ys);
      builder.lineTo(-xs, ys);
      builder.close();
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcLShapeProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const profMat = profile.Position.helper.getMatrix();

      const xs = 0.5 * profile.Width;
      const ys = 0.5 * profile.Depth;
      const t = profile.Thickness;

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);

      builder.moveTo(-xs + t, -ys + t);
      builder.lineTo(-xs + t, ys);
      builder.lineTo(-xs, ys);
      builder.lineTo(-xs, -ys);
      builder.lineTo(xs, -ys);
      builder.lineTo(xs, -ys + t);
      builder.close();
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcTShapeProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const profMat = profile.Position.helper.getMatrix();

      const xs = 0.5 * profile.FlangeWidth;
      const ys = 0.5 * profile.Depth;
      const xt = 0.5 * profile.WebThickness;
      const yt = profile.FlangeThickness;

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);

      builder.moveTo(xt, -ys);
      builder.lineTo(xt, ys - yt);
      builder.lineTo(xs, ys - yt);
      builder.lineTo(xs, ys);
      builder.lineTo(-xs, ys);
      builder.lineTo(-xs, ys - yt);
      builder.lineTo(-xt, ys - yt);
      builder.lineTo(-xt, -ys);
      builder.close();
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcUShapeProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const profMat = profile.Position.helper.getMatrix();

      const xs = 0.5 * profile.FlangeWidth;
      const ys = 0.5 * profile.Depth;
      const xt = profile.WebThickness;
      const yt = profile.FlangeThickness;

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);

      builder.moveTo(xs, -ys);
      builder.lineTo(xs, -ys + yt);
      builder.lineTo(-xs + xt, -ys + yt);
      builder.lineTo(-xs + xt, ys - yt);
      builder.lineTo(xs, ys - yt);
      builder.lineTo(xs, ys);
      builder.lineTo(-xs, ys);
      builder.lineTo(-xs, -ys);
      builder.close();
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcZShapeProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const profMat = profile.Position.helper.getMatrix();

      const xs = profile.FlangeWidth;
      const ys = 0.5 * profile.Depth;
      const xt = 0.5 * profile.WebThickness;
      const yt = profile.FlangeThickness;

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);

      builder.moveTo(xt, ys);
      builder.lineTo(-xs + xt, ys);
      builder.lineTo(-xs + xt, ys - yt);
      builder.lineTo(-xt, ys - yt);
      builder.lineTo(-xt, -ys);
      builder.lineTo(xs - xt, -ys);
      builder.lineTo(xs - xt, -ys + yt);
      builder.lineTo(xt, -ys + yt);
      builder.close();
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcTrapeziumProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcParameterizedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getShape()
  {
    if (this.shape === null)
    {
      this.shape = new THREE.Shape();

      const profile = this.instance;
      const profMat = profile.Position.helper.getMatrix();

      const xb = 0.5 * profile.BottomXDim;
      const yd = 0.5 * profile.YDim;
      const xd = profile.TopXDim;
      const xo = profile.TopXOffset;

      const builder = BIMROCKET.PathBuilder;
      builder.setup(this.shape, profMat);

      builder.moveTo(xb, -yd);
      builder.lineTo(-xb, -yd);
      builder.lineTo(-xb + xo, yd);
      builder.lineTo(-xb + xo + xd, yd);
      builder.close();
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcArbitraryClosedProfileDefHelper = class
  extends BIMROCKET.IFC.helpers.IfcProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.shape = null;
  }

  getShape()
  {
    if (this.shape === null)
    {
      var profile = this.instance;

      var curve = profile.OuterCurve; // IFCCURVE
      var curvePoints = curve.helper.getPoints();
      if (curvePoints)
      {
        var shape = new THREE.Shape();
        shape.moveTo(curvePoints[0].x, curvePoints[0].y);
        for (var i = 1; i < curvePoints.length; i++)
        {
          shape.lineTo(curvePoints[i].x, curvePoints[i].y);
        }
        shape.closePath();
        this.shape = shape;
      }
      else
      {
        // unsupported curve
        console.warn("Unsupported curve", curve);
      }
    }
    return this.shape;
  }
};

BIMROCKET.IFC.helpers.IfcArbitraryProfileDefWithVoidsHelper = class
  extends BIMROCKET.IFC.helpers.IfcArbitraryClosedProfileDefHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.shape = null;
  }

  getShape()
  {
    if (this.shape === null)
    {
      var profile = this.instance;
      var shape = super.getShape();
      var innerCurves = profile.InnerCurves; // IFCCURVE[]
      for (var c = 0; c < innerCurves.length; c++)
      {
        var innerCurve = innerCurves[c];
        var curvePoints = innerCurve.helper.getPoints();
        if (curvePoints)
        {
          var path = new THREE.Path();
          path.moveTo(curvePoints[0].x, curvePoints[0].y);
          for (var i = 1; i < curvePoints.length; i++)
          {
            path.lineTo(curvePoints[i].x, curvePoints[i].y);
          }
          path.closePath();
          shape.holes.push(path);
        }
      }
    }
    return this.shape;
  }
};

/* Curve helpers */

BIMROCKET.IFC.helpers.IfcCurveHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.points = null;
  }

  getPoints()
  {
    return this.points;
  }
};

BIMROCKET.IFC.helpers.IfcPolylineHelper = class
  extends BIMROCKET.IFC.helpers.IfcCurveHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.points = null;
  }

  getPoints()
  {
    if (this.points === null)
    {
      var polyline = this.instance;

      this.points = [];
      var points = polyline.Points;
      for (var i = 0; i < points.length; i++)
      {
        var point = points[i].helper.getPoint();
        this.points.push(point);
      }
    }
    return this.points;
  }
};

BIMROCKET.IFC.helpers.IfcIndexedPolyCurveHelper = class
  extends BIMROCKET.IFC.helpers.IfcCurveHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getPoints()
  {
    var polyCurve = this.instance;
    return polyCurve.Points.helper.getPoints();
  }
};

BIMROCKET.IFC.helpers.IfcCompositeCurveHelper = class
  extends BIMROCKET.IFC.helpers.IfcCurveHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getPoints()
  {
    if (this.points === null)
    {
      var points = [];
      var compositeCurve = this.instance;
      var schema = this.schema;
      var segments = compositeCurve.Segments;
      for (var i = 0; i < segments.length; i++)
      {
        var segment = segments[i]; // IfcCompositeCurveSegment
        var curve = segment.ParentCurve;
        var curvePoints = null;
        if (curve instanceof schema.IfcPolyline)
        {
          curvePoints = curve.helper.getPoints();
        }
        else if (curve instanceof schema.IfcTrimmedCurve)
        {
          var basisCurve = curve.BasisCurve;
          var trim1 = curve.Trim1[0];
          var trim2 = curve.Trim2[0];
          if (basisCurve instanceof schema.IfcCircle &&
              trim1 instanceof schema.IfcParameterValue &&
              trim2 instanceof schema.IfcParameterValue)
          {
            var startAngle = trim1.Value;
            var endAngle = trim2.Value;
            var sense = curve.SenseAgreement === ".T.";
            curvePoints =
              basisCurve.helper.getTrimmedPoints(startAngle, endAngle, sense);
          }
          else
          {
            console.info("unsupported trimmed curve segment", curve);
          }
        }
        else
        {
          console.info("unsupported curve segment", curve);
        }
        if (curvePoints)
        {
          if (segment.SameSense === ".T.")
          {
            for (var j = 0; j < curvePoints.length; j++)
            {
              points.push(curvePoints[j]);
            }
          }
          else
          {
            for (var j = curvePoints.length - 1; j >= 0; j--)
            {
              points.push(curvePoints[j]);
            }
          }
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

BIMROCKET.IFC.helpers.IfcTrimmedCurveHelper = class
  extends BIMROCKET.IFC.helpers.IfcCurveHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  getPoints()
  {
    if (this.points === null)
    {
    }
    return this.points;
  }
};

BIMROCKET.IFC.helpers.IfcCircleHelper = class
  extends BIMROCKET.IFC.helpers.IfcCurveHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.getPoints();
  }

  getPoints()
  {
    if (this.points === null)
    {
      this.points = [];
      var circle = this.instance;
      var matrix = circle.Position.helper.getMatrix();
      var radius = circle.Radius;
      var segments = BIMROCKET.IFC.getCircleSegments(radius);
      var angleStep = 2 * Math.PI / segments;
      for (var i = 0; i < segments; i++)
      {
        var angle = i * angleStep;
        var point = new THREE.Vector3();
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
    var points = [];
    var circle = this.instance;
    var matrix = circle.Position.helper.getMatrix();
    var radius = circle.Radius;
    var startAngle = THREE.MathUtils.degToRad(param1);
    var endAngle = THREE.MathUtils.degToRad(param2);
    var segments = BIMROCKET.IFC.getCircleSegments(radius);
    var angleStep = 2 * Math.PI / segments;

    var addPoint = function(angle)
    {
      var point = new THREE.Vector3();
      point.x = Math.cos(angle) * radius;
      point.y = Math.sin(angle) * radius;
      point.z = 0;
      point.applyMatrix4(matrix);
      points.push(point);
    };

    var angle;
    if (sense) // anti-clockwise
    {
      if (endAngle < startAngle) endAngle += 2 * Math.PI;
      angle = startAngle;
      while (angle <= endAngle)
      {
        addPoint(angle);
        angle += angleStep;
      }
    }
    else // clockwise
    {
      if (endAngle > startAngle) startAngle += 2 * Math.PI;
      angle = startAngle;
      while (angle >= endAngle)
      {
        addPoint(angle);
        angle -= angleStep;
      }
    }
    return points;
  }
};

/* Geometry helpers */

BIMROCKET.IFC.helpers.IfcConnectedFaceSetHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.object3D = null;
  }

  getObject3D()
  {
    if (this.object3D === null)
    {
      const faceSet = this.instance;
      const schema = this.schema;

      let faces = faceSet.CfsFaces;

      let numVertices = 0;
      let vertices = [];
      let indices = [];

      let geometry = new BIMROCKET.SolidGeometry();

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

        if (faceVertices && faceVertices.length > 0)
        {
          vertices.push(...faceVertices);
          for (let h = 0; h < holes.length; h++)
          {
            vertices.push(...holes[h]);
          }

          let triangles =
            BIMROCKET.GeometryUtils.triangulateFace(faceVertices, holes);

          geometry.vertices = vertices;

          for (let t = 0; t < triangles.length; t++)
          {
            let triangle = triangles[t];
            let a = numVertices + triangle[0];
            let b = numVertices + triangle[1];
            let c = numVertices + triangle[2];
            geometry.addFace(a, b, c);
          }
          numVertices = vertices.length;
        }
      }
      this.object3D = new BIMROCKET.Solid(geometry);
      this.object3D._ifc = faceSet;
    }
    return this.object3D;
  }
};

BIMROCKET.IFC.helpers.IfcPolyLoopHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcEdgeLoopHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcVertexLoopHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcCartesianPointList2DHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcCartesianPointList3DHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

/* Matrix helpers */

BIMROCKET.IFC.helpers.IfcLocalPlacementHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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
      var placement = this.instance;
      var schema = this.schema;
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

BIMROCKET.IFC.helpers.IfcCartesianTransformationOperatorHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcPlacementHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcAxis1PlacementHelper = class
  extends BIMROCKET.IFC.helpers.IfcPlacementHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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
      var vy = BIMROCKET.GeometryUtils.orthogonalVector(vz);
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

BIMROCKET.IFC.helpers.IfcAxis2Placement2DHelper = class
  extends BIMROCKET.IFC.helpers.IfcPlacementHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcAxis2Placement3DHelper = class
  extends BIMROCKET.IFC.helpers.IfcPlacementHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

/* Relationship helpers */

BIMROCKET.IFC.helpers.IfcRelationshipHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  relate()
  {
  }
};

BIMROCKET.IFC.helpers.IfcRelDefinesByTypeHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  relate()
  {
    const rel = this.instance;
    const schema = this.schema;

    let objects = rel.RelatedObjects;
    let ifcType = rel.RelatingType;
    const typeData = { ifcClassName: ifcType.constructor.ifcClassName };

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

BIMROCKET.IFC.helpers.IfcRelAssociatesClassificationHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  relate()
  {
    var rel = this.instance;
    var schema = this.schema;

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

BIMROCKET.IFC.helpers.IfcRelAssignsToGroupHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  relate()
  {
    var rel = this.instance;
    var schema = this.schema;

    var ifcObjects = rel.RelatedObjects;
    var ifcObjectsType = rel.RelatedObjectsType;
    var ifcGroup = rel.RelatingGroup;
    let groupData = { ifcClassName: ifcGroup.constructor.ifcClassName };

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
    groupName = ifcGroup.constructor.ifcClassName + "_" + groupName;

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

BIMROCKET.IFC.helpers.IfcRelAggregatesHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  relate()
  {
    var rel = this.instance;
    var schema = this.schema;

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

BIMROCKET.IFC.helpers.IfcRelContainedInSpatialStructureHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  relate()
  {
    var rel = this.instance;
    var schema = this.schema;

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

BIMROCKET.IFC.helpers.IfcRelVoidsElementHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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
      if (element.helper.openings)
      {
        element.helper.openings.push(opening);
      }
    }
  }
};

BIMROCKET.IFC.helpers.IfcRelFillsElementHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcRelConnectsPortToElementHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcRelDefinesByPropertiesHelper = class
  extends BIMROCKET.IFC.helpers.IfcRelationshipHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
  }

  relate()
  {
    var rel = this.instance;
    var schema = this.schema;

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

/* Other helpers */

BIMROCKET.IFC.helpers.IfcPointHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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

BIMROCKET.IFC.helpers.IfcCartesianPointHelper = class
  extends BIMROCKET.IFC.helpers.IfcPointHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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


BIMROCKET.IFC.helpers.IfcDirectionHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
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
};

BIMROCKET.IFC.helpers.IfcStyledItemHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.properties = null;
  }

  applyStyle()
  {
    var styledItem = this.instance;
    var schema = this.schema;

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
      var name = style.Name;
      var side = style.Side;
      style = style.Styles[0];
      if (style instanceof schema.IfcSurfaceStyleShading)
      {
        var color = style.SurfaceColour;
        var transparency = style.Transparency;
        var red = color.Red;
        var green = color.Green;
        var blue = color.Blue;

        var material = new THREE.MeshPhongMaterial({
          name : name,
          color: new THREE.Color(red, green, blue),
          flatShading: false,
          opacity: 1 - transparency,
          transparent: transparency > 0,
          side: side === '.BOTH.' ? THREE.DoubleSide : THREE.FrontSide
        });
        if (item.helper)
        {
          item.helper.material = material;
        }
      }
    }
  }
};


BIMROCKET.IFC.helpers.IfcPropertySetHelper = class
  extends BIMROCKET.IFC.helpers.IfcHelper
{
  constructor(instance, schema)
  {
    super(instance, schema);
    this.properties = null;
  }

  getProperties()
  {
    if (this.properties === null)
    {
      var pset = this.instance;
      var schema = this.schema;

      this.properties =  {};
      for (var i = 0; i < pset.HasProperties.length; i++)
      {
        var prop = pset.HasProperties[i];
        if (prop instanceof schema.IfcPropertySingleValue)
        {
          var name = prop.Name;
          if (name && name.Value)
          {
            name = name.Value;
          }
          var value = prop.NominalValue;
          if (value && value.Value)
          {
            value = value.Value;
          }
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