/**
 * IFCExporter.js
 *
 * @author realor
 */

import { IFC, Constant } from "./IFC.js";
import { IFCFile } from "./IFCFile.js";
import { Solid } from "../../core/Solid.js";
import { Profile } from "../../core/Profile.js";
import { Extruder } from "../../builders/Extruder.js";
import { RectangleBuilder } from "../../builders/RectangleBuilder.js";
import { RectangleHollowBuilder } from "../../builders/RectangleHollowBuilder.js";
import { CircleBuilder } from "../../builders/CircleBuilder.js";
import { CircleHollowBuilder } from "../../builders/CircleHollowBuilder.js";
import { BooleanOperator } from "../../builders/BooleanOperator.js";
import { Cloner } from "../../builders/Cloner.js";
import { IFCVoider } from "../../builders/IFCVoider.js";
import { ObjectUtils } from "../../utils/ObjectUtils.js";
import * as THREE from "three";

class IFCExporter
{
  static options = {
    ifcSchema : IFC.DEFAULT_SCHEMA_NAME
  };

  constructor()
  {
    this.schema = null;
    this.ifcFile = null;
    this.blocks = new Map(); // Object3D => IfcRepresentationMap
    this.materials = new Map(); // Material => IfcSurfaceStyle
    this._matrix = new THREE.Matrix4();
    this._vector = new THREE.Vector3();
  }

  parse(object, options)
  {
    this.options = Object.assign({}, IFCExporter.options, options);

    this.schema = IFC.SCHEMAS[this.options.ifcSchema];
    if (!this.schema) throw "Supported IFC schema: " + this.options.ifcSchema;

    console.info("IFC schema: " + this.options.ifcSchema);

    this.ifcFile = new IFCFile();
    object._ifcFile = this.ifcFile;

    const header = this.ifcFile.header;
    header.filename = object.userData.IFC?.Name || "";
    header.description = [object.userData.IFC?.Description || ""];

    IFC.initIfcObject(object, true);

    this.createIfcRepresentationContexts();

    this.createIfcRoots(object);

    this.createIfcRelationships(object);

    this.ifcFile.updateInverseAttributes();

    return this.exportFile(this.ifcFile);
  }

  exportFile(ifcFile) // abstract, returns text
  {
    throw "Not implemented";
  }

  createIfcRoots(object3D)
  {
    const schema = this.schema;

    const ifcData = object3D.userData.IFC;
    if (ifcData?.ifcClassName)
    {
      const ifcFile = this.ifcFile;
      const ifcClassName = ifcData.ifcClassName;
      const ifcClass = schema[ifcClassName];
      if (!ifcClass)
      {
        console.warn(ifcClassName +
          " entity not supported in the schema " + this.options.ifcSchema);
      }
      else if (ifcClass.prototype instanceof schema.IfcRoot && ifcData.GlobalId)
      {
        const entity = new ifcClass();
        this.setIfcData(ifcData, entity);
        ifcFile.add(entity);

        if (entity instanceof schema.IfcProduct)
        {
          const placement = new schema.IfcLocalPlacement();

          placement.PlacementRelTo =
            this.getParentIfcEntity(object3D)?.ObjectPlacement || null;

          placement.RelativePlacement =
            this.createIfcAxis2Placement3D(object3D.matrix);

          entity.ObjectPlacement = placement;
          entity.Representation = this.createIfcProductDefinitionShape(object3D);
        }
        else if (entity instanceof schema.IfcTypeProduct)
        {
          let reprObject = object3D.children[0];
          if (reprObject)
          {
            const reprMap = this.getIfcRepresentationMap(reprObject);
            entity.RepresentationMaps = [reprMap];
          }
        }
        else if (entity instanceof schema.IfcProject)
        {
          entity.RepresentationContexts = [this.reprContext];

          // export length unit
          // TODO: export other units
          const units = object3D.userData.units || "m";
          let prefix = null;
          let name = null;
          switch (units)
          {
            case "mm" : prefix = "MILLI"; name = "METRE"; break;
            case "cm" : prefix = "CENTI"; name = "METRE"; break;
            case "dm" : prefix = "DECI"; name = "METRE"; break;
            case "m" : prefix = null; name = "METRE"; break;
            case "hm" : prefix = "HECTO"; name = "METRE"; break;
            case "km" : prefix = "KILO"; name = "METRE"; break;
          }
          if (name === "METRE")
          {
            const ifcSIUnit = new schema.IfcSIUnit();
            ifcSIUnit.Dimensions = undefined;
            ifcSIUnit.UnitType = new Constant("LENGTHUNIT");
            ifcSIUnit.Name = new Constant("METRE");
            if (prefix) ifcSIUnit.Prefix = new Constant(prefix);

            entity.UnitsInContext = new schema.IfcUnitAssignment();
            entity.UnitsInContext.Units = [ifcSIUnit];
          }

          // export MapConversion
          const targetCRS = object3D.userData.IFC_target_crs;
          const mapConversion = object3D.userData.IFC_map_conversion;

          if (targetCRS && mapConversion)
          {
            const ifcTargetCRS = new schema[targetCRS.ifcClassName || "IfcProjectedCRS"]();
            this.setIfcData(targetCRS, ifcTargetCRS);

            const ifcMapConversion = new schema.IfcMapConversion();
            this.setIfcData(mapConversion, ifcMapConversion);
            ifcMapConversion.SourceCRS = this.reprContext;
            ifcMapConversion.TargetCRS = ifcTargetCRS;

            ifcFile.add(ifcMapConversion);
          }
        }
      }
    }

    for (let child of object3D.children)
    {
      this.createIfcRoots(child);
    }
  }

  createIfcRelationships(object3D)
  {
    const ifcFile = this.ifcFile;
    const schema = this.schema;
    const entity = this.getIfcEntity(object3D);

    if (entity instanceof schema.IfcObjectDefinition)
    {
      for (let name in object3D.userData)
      {
        if (name.startsWith("IFC_rel_"))
        {
          const relData = object3D.userData[name];
          const ifcClassName = relData?.ifcClassName;
          const globalId = relData.GlobalId;
          let rel = ifcFile.entitiesByGlobalId.get(globalId);

          switch (ifcClassName)
          {
            case "IfcRelAggregates":
              if (!rel)
              {
                rel = new schema.IfcRelAggregates();
                rel.GlobalId = globalId;
                rel.RelatingObject = this.getParentIfcEntity(object3D);
                rel.RelatedObjects = [];
                ifcFile.add(rel);
              }
              rel.RelatedObjects.push(entity);
              break;

            case "IfcRelContainedInSpatialStructure":
              if (!rel)
              {
                rel = new schema.IfcRelContainedInSpatialStructure();
                rel.GlobalId = globalId;
                rel.RelatingStructure = this.getSpatialIfcEntity(object3D);
                rel.RelatedElements = [];
                ifcFile.add(rel);
              }
              rel.RelatedElements.push(entity);
              break;

            case "IfcRelVoidsElement":
              if (!rel)
              {
                rel = new schema.IfcRelVoidsElement();
                rel.GlobalId = globalId;
                rel.RelatingBuildingElement = this.getParentIfcEntity(object3D);
                rel.RelatedOpeningElement = entity;
                ifcFile.add(rel);
              }
              break;

            case "IfcRelFillsElement":
              if (!rel)
              {
                rel = new schema.IfcRelFillsElement();
                rel.GlobalId = globalId;
                rel.RelatingOpeningElement = this.getParentIfcEntity(object3D);
                rel.RelatedBuildingElement = entity;
                ifcFile.add(rel);
              }
              break;

            case "IfcRelDefinesByType":
              const type = object3D.userData.IFC_type;
              const typeGlobalId = type?.GlobalId;
              if (!rel)
              {
                rel = new schema.IfcRelDefinesByType();
                rel.GlobalId = globalId;
                rel.RelatingType =
                  ifcFile.entitiesByGlobalId.get(typeGlobalId);
                rel.RelatedObjects = [];
                ifcFile.add(rel);
              }
              rel.RelatedObjects.push(entity);
              break;

            case "IfcRelDefinesByProperties":
              let psetName = name.substring(8);
              let pset = object3D.userData["IFC_" + psetName];
              const psetGlobalId = pset?.GlobalId;
              const ifcPset = this.getIfcPropertySet(psetGlobalId, psetName, pset);
              if (!rel)
              {
                rel = new schema.IfcRelDefinesByProperties();
                rel.GlobalId = globalId;
                rel.RelatingPropertyDefinition = ifcPset;
                  ifcFile.entitiesByGlobalId.get(psetGlobalId);
                rel.RelatedObjects = [];
                ifcFile.add(rel);
              }
              rel.RelatedObjects.push(entity);
              break;
          }
        }
      }
    }

    for (let child of object3D.children)
    {
      this.createIfcRelationships(child);
    }
  }

  createIfcRepresentationContexts()
  {
    const schema = this.schema;
    const reprContext = new schema.IfcGeometricRepresentationContext();
    this.reprContext = reprContext;

    reprContext.ContextType = "Model";
    reprContext.CoordinateSpaceDimension = 3;
    reprContext.Precision = 0.00001;
    reprContext.WorldCoordinateSystem =
      this.createIfcAxis2Placement3D(new THREE.Matrix4());

    const reprSubContext = new schema.IfcGeometricRepresentationSubContext();
    this.reprSubContext = reprSubContext;

    reprSubContext.ContextIdentifier = "Body";
    reprSubContext.ContextType = "Model";
    reprSubContext.CoordinateSpaceDimensions = undefined;
    reprSubContext.Precision = undefined;
    reprSubContext.WorldCoordinateSystem = undefined;
    reprSubContext.TrueNorth = undefined;
    reprSubContext.ParentContext = reprContext;
    reprSubContext.TargetView = new Constant("MODEL_VIEW");
  }

  createIfcProductDefinitionShape(object3D)
  {
    let prodDefShape = null;
    const reprObject3D = IFC.getRepresentation(object3D);
    if (reprObject3D)
    {
      const schema = this.schema;
      prodDefShape = new schema.IfcProductDefinitionShape();
      const shapeRepr = this.createIfcShapeRepresentation(
        reprObject3D, "Body", reprObject3D.matrix);
      prodDefShape.Representations = [shapeRepr];
    }
    return prodDefShape;
  }

  createIfcShapeRepresentation(reprObject3D, identifier, matrix)
  {
    const schema = this.schema;
    const shapeRepr = new schema.IfcShapeRepresentation();
    shapeRepr.ContextOfItems = this.reprSubContext;
    shapeRepr.RepresentationIdentifier = identifier;
    const item = this.createIfcRepresentationItem(reprObject3D, matrix);
    let firstItem;
    if (item instanceof Array)
    {
      shapeRepr.Items = item;
      firstItem = item[0];
    }
    else
    {
      shapeRepr.Items = [item];
      firstItem = item;
    }

    if (firstItem instanceof schema.IfcMappedItem)
    {
      shapeRepr.RepresentationType = "MappedRepresentation";
    }
    else if (firstItem instanceof schema.IfcFacetedBrep)
    {
      shapeRepr.RepresentationType = "Brep";
    }
    else if (firstItem instanceof schema.IfcSweptAreaSolid)
    {
      shapeRepr.RepresentationType = "SweptSolid";
    }
    else if (firstItem instanceof schema.IfcBooleanClippingResult)
    {
      shapeRepr.RepresentationType = "Clipping";
    }
    else if (firstItem instanceof schema.IfcBooleanResult)
    {
      shapeRepr.RepresentationType = "CSG";
    }
    return shapeRepr;
  }

  createIfcRepresentationItem(reprObject3D, matrix)
  {
    const schema = this.schema;
    const ifcFile = this.ifcFile;

    if (reprObject3D.builder instanceof Cloner) // export as IfcMappedItem
    {
      const cloner = reprObject3D.builder;
      const objectToClone = cloner.objectToClone;
      const mappedItem = new schema.IfcMappedItem();
      mappedItem.MappingSource = this.getIfcRepresentationMap(objectToClone);
      mappedItem.MappingTarget =
        this.createIfcCartesianTransformationOperator3D(matrix);
      return mappedItem;
    }
    else if (reprObject3D instanceof Solid)
    {
      const ifcClassName = reprObject3D.userData.IFC?.ifcClassName;
      if (ifcClassName === "IfcHalfSpaceSolid")
      {
        const halfSpace = new schema.IfcHalfSpaceSolid();
        halfSpace.BaseSurface = new schema.IfcPlane();
        halfSpace.BaseSurface.Position =
          this.createIfcAxis2Placement3D(reprObject3D.matrix);
        halfSpace.AgreementFlag = false;
        return halfSpace;
      }
      else if (reprObject3D.builder instanceof IFCVoider)
      {
        const childObject = reprObject3D.getComponent(0);
        const compMatrix = new THREE.Matrix4();
        compMatrix.copy(matrix).multiply(childObject.matrix);
        const item = this.createIfcRepresentationItem(childObject, compMatrix);
        ifcFile.add(this.createIfcStyledItem(reprObject3D.material, item));
        return item;
      }
      else if (reprObject3D.builder instanceof BooleanOperator &&
              reprObject3D.getComponentCount() === 2)
      {
        const first = reprObject3D.getComponent(0); // IfcCurve extrusion
        const second = reprObject3D.getComponent(1); // IfcPlane extrusion

        if (ifcClassName === "IfcPolygonalBoundedHalfSpace")
        {
          const halfSpace = new schema.IfcPolygonalBoundedHalfSpace();
          halfSpace.BaseSurface = new schema.IfcPlane();
          halfSpace.BaseSurface.Position =
            this.createIfcAxis2Placement3D(second.matrix);
          halfSpace.AgreementFlag = true;
          halfSpace.Position = this.createIfcAxis2Placement3D(first.matrix);

          let boundaryProfile = first.getComponent(0);
          let profileGeometry = boundaryProfile.geometry;
          let curvePoints =
            profileGeometry.path.getPoints(profileGeometry.divisions);
          halfSpace.PolygonalBoundary =
            this.createIfcPolyline(curvePoints, boundaryProfile.matrix);
          return halfSpace;
        }
        else // IfcBooleanResult
        {
          const builder = reprObject3D.builder;
          const result = builder.operation === "subtract" ?
            new schema.IfcBooleanClippingResult() :
            new schema.IfcBooleanResult();
          let operator;
          switch (builder.operation)
          {
            case "subtract": operator = "DIFFERENCE"; break;
            case "union": operator = "UNION"; break;
            case "intersection": operator = "INTERSECT"; break;
            default: throw "Invalid operator";
          }
          const compMatrix = new THREE.Matrix4();
          result.Operator = new Constant(operator);
          compMatrix.copy(matrix).multiply(first.matrix);
          result.FirstOperand = this.createIfcRepresentationItem(first, compMatrix);
          compMatrix.copy(matrix).multiply(second.matrix);
          result.SecondOperand = this.createIfcRepresentationItem(second, compMatrix);
          ifcFile.add(this.createIfcStyledItem(reprObject3D.material, result));
          return result;
        }
      }
      else if (reprObject3D.builder instanceof Extruder) // export as IfcExtrudedAreaSolid
      {
        const extruder = reprObject3D.builder;
        const extrudedArea = new schema.IfcExtrudedAreaSolid();
        const profileObject = reprObject3D.getComponent(0);
        extrudedArea.SweptArea = this.createIfcProfile(profileObject);
        extrudedArea.Position = this.createIfcAxis2Placement3D(matrix);
        extrudedArea.ExtrudedDirection = this.createIfcDirection(extruder.direction);
        extrudedArea.Depth = extruder.depth;
        ifcFile.add(this.createIfcStyledItem(reprObject3D.material, extrudedArea));
        return extrudedArea;
      }
      else // export as IfcFacetedBrep
      {
        const item = this.createIfcFacetedBrep(reprObject3D, matrix);
        ifcFile.add(this.createIfcStyledItem(reprObject3D.material, item));
        return item;
      }
    }
    else if (reprObject3D instanceof THREE.Group) // export as IfcFacetedBreps
    {
      const items = [];
      const compMatrix = new THREE.Matrix4();
      for (let child of reprObject3D.children)
      {
        compMatrix.copy(matrix).multiply(child.matrix);
        let item = this.createIfcRepresentationItem(child, compMatrix);
        if (item instanceof Array)
        {
          items.push(...item);
        }
        else
        {
          ifcFile.add(this.createIfcStyledItem(child.material, item));
          items.push(item);
        }
      }
      return items;
    }
    return null;
  }

  createIfcFacetedBrep(solid, matrix)
  {
    const geometry = solid.geometry;
    const schema = this.schema;
    const brep = new schema.IfcFacetedBrep();
    const shell = new schema.IfcClosedShell();
    brep.Outer = shell;
    shell.CfsFaces = [];
    const cartesianPoints = [];
    const vector = this._vector;

    // create + transform IfcCartesianPoints
    for (let vertex of geometry.vertices)
    {
      vector.copy(vertex);
      if (matrix) vector.applyMatrix4(matrix);
      cartesianPoints.push(this.createIfcCartesianPoint(vector));
    }

    // create IfcFace
    for (let face of geometry.faces)
    {
      let ifcFace = new schema.IfcFace();
      shell.CfsFaces.push(ifcFace);

      let outerBound = new schema.IfcFaceOuterBound();
      ifcFace.Bounds = [outerBound];
      outerBound.Bound = this.createIfcPolyLoop(face.outerLoop, cartesianPoints);
      outerBound.Orientation = true;

      for (let hole of face.holes)
      {
        let innerBound = new schema.IfcFaceBound();
        ifcFace.Bounds.push(innerBound);
        innerBound.Bound = this.createIfcPolyLoop(hole, cartesianPoints);
        innerBound.Orientation = true;
      }
    }
    return brep;
  }

  createIfcPolyLoop(loop, cartesianPoints)
  {
    const schema = this.schema;
    let poly  = new schema.IfcPolyLoop();
    poly.Polygon = [];
    for (let i of loop.indices)
    {
      poly.Polygon.push(cartesianPoints[i]);
    }
    return poly;
  }

  createIfcProfile(profileObject3D)
  {
    if (!(profileObject3D instanceof Profile))
      throw "Invalid profile";

    let profile = null;
    const schema = this.schema;
    const builder = profileObject3D.builder;
    const profileName = profileObject3D.userData.IFC?.Name || "";

    if (builder instanceof RectangleHollowBuilder) // IfcRectangleHollowProfileDef
    {
      profile = new schema.IfcRectangleHollowProfileDef();
      profile.ProfileType = new Constant("AREA");
      profile.ProfileName = profileName;
      profile.Position = this.createIfcAxis2Placement2D(profileObject3D.matrix);
      profile.XDim = builder.width;
      profile.YDim = builder.height;
      profile.WallThickness = builder.wallThickness;
    }
    else if (builder instanceof RectangleBuilder) // IfcRectangleProfileDef
    {
      profile = new schema.IfcRectangleProfileDef();
      profile.ProfileType = new Constant("AREA");
      profile.ProfileName = profileName;
      profile.Position = this.createIfcAxis2Placement2D(profileObject3D.matrix);
      profile.XDim = builder.width;
      profile.YDim = builder.height;
    }
    else if (builder instanceof CircleHollowBuilder) // IfcCircleHollowProfileDef
    {
      profile = new schema.IfcCircleHollowProfileDef();
      profile.ProfileType = new Constant("AREA");
      profile.ProfileName = profileName;
      profile.Position = this.createIfcAxis2Placement2D(profileObject3D.matrix);
      profile.Radius = builder.radius;
      profile.WallThickness = builder.wallThickness;
    }
    else if (builder instanceof CircleBuilder) // IfcCircleProfileDef
    {
      profile = new schema.IfcCircleProfileDef();
      profile.ProfileType = new Constant("AREA");
      profile.ProfileName = profileName;
      profile.Position = this.createIfcAxis2Placement2D(profileObject3D.matrix);
      profile.Radius = builder.radius;
    }
    else // IfcArbitraryCloseProfileDef
    {
      let profileGeometry = profileObject3D.geometry;
      const path = profileGeometry.path;
      const pointsHoles = path.getPointsHoles(profileGeometry.divisions);
      if (pointsHoles.length === 0)
      {
        profile = new schema.IfcArbitraryClosedProfileDef();
      }
      else
      {
        profile = new schema.IfcArbitraryProfileDefWithVoids();
      }
      profile.ProfileType = new Constant("AREA");
      profile.ProfileName = profileName;
      let points = path.getPoints(profileGeometry.divisions);
      profile.OuterCurve = this.createIfcPolyline(points, profileObject3D.matrix);
      profile.InnerCurves = [];
      for (let pointsHole of pointsHoles)
      {
        profile.InnerCurves.push(this.createIfcPolyline(pointsHole, profileObject3D.matrix));
      }
    }
    return profile;
  }

  createIfcPolyline(points, matrix)
  {
    const schema = this.schema;
    const polyline = new schema.IfcPolyline();
    polyline.Points = [];
    const vector = this._vector;
    for (let point of points)
    {
      vector.set(point.x, point.y, 0);
      if (matrix) vector.applyMatrix4(matrix);
      polyline.Points.push(this.createIfcCartesianPoint(vector, 2));
    }
    return polyline;
  }

  createIfcCartesianTransformationOperator3D(matrix)
  {
    const schema = this.schema;
    const operator = new schema.IfcCartesianTransformationOperator3D();
    const origin = new THREE.Vector3();
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();

    origin.setFromMatrixPosition(matrix);
    xAxis.setFromMatrixColumn(matrix, 0).normalize();
    yAxis.setFromMatrixColumn(matrix, 1).normalize();

    operator.LocalOrigin = this.createIfcCartesianPoint(origin);
    operator.Axis1 = (xAxis.x === 1 && xAxis.y === 0 && xAxis.z === 0) ?
      null : this.createIfcDirection(xAxis);
    operator.Axis2 = (yAxis.x === 0 && yAxis.y === 1 && yAxis.z === 0) ?
      null : this.createIfcDirection(yAxis);

    operator.Scale = null; // TODO: get scale from matrix
    return operator;
  }

  createIfcStyledItem(material, item)
  {
    const schema = this.schema;
    let ifcSurfaceStyle = this.getIfcSurfaceStyle(material);
    let ifcPresentationStyleAssignment = new schema.IfcPresentationStyleAssignment();

    let ifcStyledItem = new schema.IfcStyledItem();
    ifcStyledItem.Item = item;
    ifcStyledItem.Styles = [ifcPresentationStyleAssignment];
    ifcPresentationStyleAssignment.Styles = [ifcSurfaceStyle];
    return ifcStyledItem;
  }

  createIfcAxis2Placement2D(matrix)
  {
    const schema = this.schema;
    const placement = new schema.IfcAxis2Placement2D();

    const position = new THREE.Vector3();
    const xAxis = new THREE.Vector3();
    position.setFromMatrixPosition(matrix);
    xAxis.setFromMatrixColumn(matrix, 0);

    placement.Location = this.createIfcCartesianPoint(position, 2);
    placement.RefDirection = this.createIfcDirection(xAxis, 2);

    return placement;
  }

  createIfcAxis2Placement3D(matrix)
  {
    const schema = this.schema;
    const placement = new schema.IfcAxis2Placement3D();

    const position = new THREE.Vector3();
    const xAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    position.setFromMatrixPosition(matrix);
    xAxis.setFromMatrixColumn(matrix, 0);
    zAxis.setFromMatrixColumn(matrix, 2);

    placement.Location = this.createIfcCartesianPoint(position);
    placement.Axis = this.createIfcDirection(zAxis);
    placement.RefDirection = this.createIfcDirection(xAxis);

    return placement;
  }

  createIfcCartesianPoint(vector, dim = 3)
  {
    const point = new this.schema.IfcCartesianPoint();
    point.Coordinates = [vector.x, vector.y];
    if (dim === 3)
    {
      point.Coordinates.push(vector.z || 0);
    }
    return point;
  }

  createIfcDirection(vector, dim = 3)
  {
    const direction = new this.schema.IfcDirection();
    direction.DirectionRatios = [vector.x, vector.y];
    if (dim === 3)
    {
      direction.DirectionRatios.push(vector.z || 0);
    }
    return direction;
  }

  getIfcPropertySet(globalId, psetName, properties)
  {
    const schema = this.schema;
    const ifcFile = this.ifcFile;
    let ifcPset = ifcFile.entitiesByGlobalId.get(globalId);
    if (!ifcPset)
    {
      ifcPset = new schema.IfcPropertySet();
      ifcPset.GlobalId = globalId;
      ifcPset.Name = psetName;
      ifcPset.HasProperties = [];
      for (let name in properties)
      {
        if (name === "ifcClassName" ||
            name === "GlobalId" ||
            name === "Name") continue;
        let value = properties[name];
        if (value !== undefined && value !== null)
        {
          let sv = new schema.IfcPropertySingleValue();
          sv.Name = name;
          let boxedValue;
          if (typeof value === "number")
          {
            boxedValue = new schema.IfcReal();
            boxedValue.Value = value;
          }
          else if (typeof value === "boolean")
          {
            boxedValue = new schema.IfcBoolean();
            boxedValue.Value = value;
          }
          else
          {
            boxedValue = new schema.IfcLabel();
            boxedValue.Value = String(value);
          }
          sv.NominalValue = boxedValue;
          ifcPset.HasProperties.push(sv);
        }
      }
    }
    return ifcPset;
  }

  getIfcSurfaceStyle(material)
  {
    const schema = this.schema;
    let ifcSurfaceStyle = this.materials.get(material);
    if (!ifcSurfaceStyle)
    {
      ifcSurfaceStyle = new schema.IfcSurfaceStyle();
      ifcSurfaceStyle.Name = material.name;
      if (material.side === THREE.DoubleSide)
      {
        ifcSurfaceStyle.Side = new Constant("BOTH");
      }
      else if (material.side === THREE.FrontSide)
      {
        ifcSurfaceStyle.Side = new Constant("POSITIVE");
      }
      else
      {
        ifcSurfaceStyle.Side = new Constant("NEGATIVE");
      }
      const style = new schema.IfcSurfaceStyleRendering();
      ifcSurfaceStyle.Styles = [style];
      style.SurfaceColour = new schema.IfcColourRgb();
      style.SurfaceColour.Red = material.color.r;
      style.SurfaceColour.Green = material.color.g;
      style.SurfaceColour.Blue = material.color.b;
      style.Transparency = 1 - material.opacity;
      style.ReflectanceMethod = new Constant("NOTDEFINED");
      this.materials.set(material, ifcSurfaceStyle);
    }
    return ifcSurfaceStyle;
  }

  getIfcRepresentationMap(reprObject3D)
  {
    let reprMap = this.blocks.get(reprObject3D);
    if (!reprMap)
    {
      const schema = this.schema;
      reprMap = new schema.IfcRepresentationMap();
      reprMap.MappingOrigin =
        this.createIfcAxis2Placement3D(reprObject3D.matrix);
      reprMap.MappedRepresentation = this.createIfcShapeRepresentation(
        reprObject3D, "Body", new THREE.Matrix4());
      this.blocks.set(reprObject3D, reprMap);
    }
    return reprMap;
  }

  getIfcEntity(object3D)
  {
    let entity = null;
    const globalId = object3D.userData.IFC?.GlobalId;
    if (globalId)
    {
      entity = this.ifcFile.entitiesByGlobalId.get(globalId);
    }
    return entity;
  }

  getParentIfcEntity(object3D)
  {
    let parent = object3D.parent;
    while (parent && !parent.userData.IFC?.ifcClassName)
    {
      parent = parent.parent;
    }
    return parent ? this.getIfcEntity(parent) : null;
  }

  getSpatialIfcEntity(object3D)
  {
    const schema = this.schema;
    let parent = object3D.parent;
    let ifcClassName = parent.userData.IFC?.ifcClassName;
    let ifcClass = schema[ifcClassName];

    while (parent && !(ifcClass?.prototype instanceof schema.IfcSpatialStructureElement))
    {
      parent = parent.parent;
      ifcClassName = parent.userData.IFC?.ifcClassName;
      ifcClass = schema[ifcClassName];
    }
    return parent ? this.getIfcEntity(parent) : null;
  }

  setIfcData(ifcData, entity)
  {
    const attributes = Object.getOwnPropertyNames(entity)
          .filter(name => !name.startsWith("_"));
    for (let attribute of attributes)
    {
      let value = ifcData[attribute];
      let type = typeof value;
      if (type === "string")
      {
        if (value.startsWith(".") && value.endsWith("."))
        {
          entity[attribute] = new Constant(value.substring(1, value.length - 1));
        }
        else
        {
          entity[attribute] = value;
        }
      }
      else if (type === "number" || type === "boolean")
      {
        entity[attribute] = value;
      }
      else if (ObjectUtils.isBasicArray(value))
      {
        entity[attribute] = value;
      }
    }
  }
}

export { IFCExporter };