/**
 * design module
 *
 * @author realor
 */

import { AddObjectTool } from "./tools/AddObjectTool.js";
import { BooleanOperationTool } from "./tools/BooleanOperationTool.js";
import { CloneTool } from "./tools/CloneTool.js";
import { DecomposeTool } from "./tools/DecomposeTool.js";
import { DrawTool } from "./tools/DrawTool.js";
import { ExtrudeTool } from "./tools/ExtrudeTool.js";
import { InspectGeometryTool } from "./tools/InspectGeometryTool.js";
import { MergeGeometriesTool } from "./tools/MergeGeometriesTool.js";
import { MeshToSolidTool } from "./tools/MeshToSolidTool.js";
import { MoveTool } from "./tools/MoveTool.js";
import { OffsetGeometriesTool } from "./tools/OffsetGeometriesTool.js";
import { PaintTool } from "./tools/PaintTool.js";
import { PlaceTool } from "./tools/PlaceTool.js";
import { RebuildTool } from "./tools/RebuildTool.js";
import { ReduceCoordinatesTool } from "./tools/ReduceCoordinatesTool.js";
import { ResetMatrixTool } from "./tools/ResetMatrixTool.js";
import { RevolveTool } from "./tools/RevolveTool.js";
import { RotateTool } from "./tools/RotateTool.js";
import { ScaleTool } from "./tools/ScaleTool.js";
import { SmoothEdgesTool } from "./tools/SmoothEdgesTool.js";
import { SolidToMeshTool } from "./tools/SolidToMeshTool.js";

import { BooleanOperator } from "platform/builders/BooleanOperator.js";
import { CircleBuilder } from "platform/builders/CircleBuilder.js";
import { CircleHollowBuilder } from "platform/builders/CircleHollowBuilder.js";
import { CircularSectorBuilder } from "platform/builders/CircularSectorBuilder.js";
import { Cloner } from "platform/builders/Cloner.js";
import { EllipseBuilder } from "platform/builders/EllipseBuilder.js";
import { Extruder } from "platform/builders/Extruder.js";
import { GeometryMerger } from "platform/builders/GeometryMerger.js";
import { HelicoidBuilder } from "platform/builders/HelicoidBuilder.js";
import { IProfileBuilder } from "platform/builders/IProfileBuilder.js";
import { LProfileBuilder } from "platform/builders/LProfileBuilder.js";
import { RectangleBuilder } from "platform/builders/RectangleBuilder.js";
import { RectangleHollowBuilder } from "platform/builders/RectangleHollowBuilder.js";
import { Revolver } from "platform/builders/Revolver.js";
import { TProfileBuilder } from "platform/builders/TProfileBuilder.js";
import { TrapeziumBuilder } from "platform/builders/TrapeziumBuilder.js";
import { UProfileBuilder } from "platform/builders/UProfileBuilder.js";
import { ZProfileBuilder } from "platform/builders/ZProfileBuilder.js";

import { BundleManager } from "platform/i18n/BundleManager.js";
import { IconManager } from "platform/ui/IconManager.js";
import { CSSManager } from "platform/ui/CSSManager.js";

export function activate(application)
{
  BundleManager.setBundle("design", "./i18n/design", import.meta);
  IconManager.setSprite("design", "./assets/icons/misc.svg", import.meta);
  CSSManager.setCSS("design", "./assets/css/design.css", import.meta);

  // create tools
  const inspectGeometryTool = new InspectGeometryTool(application);
  const resetMatrixTool = new ResetMatrixTool(application);
  const smoothEdgesTool = new SmoothEdgesTool(application);
  const rebuildTool = new RebuildTool(application);
  const moveTool = new MoveTool(application);
  const rotateTool = new RotateTool(application);
  const scaleTool = new ScaleTool(application);
  const placeTool = new PlaceTool(application);
  const extrudeTool = new ExtrudeTool(application);
  const revolveTool = new RevolveTool(application);
  const unionTool = new BooleanOperationTool(application,
    { name: "union", label: "design|tool.union.label",
      operation: BooleanOperator.UNION, iconName: "design|union" });
  const intersectionTool = new BooleanOperationTool(application,
    { name: "intersection", label: "design|tool.intersection.label",
      operation: BooleanOperator.INTERSECT, iconName: "design|intersect" });
  const subtractionTool = new BooleanOperationTool(application,
    { name: "subtraction", label: "design|tool.subtraction.label",
      operation: BooleanOperator.SUBTRACT, iconName: "design|subtract" });
  const decomposeTool = new DecomposeTool(application);
  const meshToSolidTool = new MeshToSolidTool(application);
  const solidToMeshTool = new SolidToMeshTool(application);
  const mergeGeometriesTool = new MergeGeometriesTool(application);
  const offsetGeometriesTool = new OffsetGeometriesTool(application);
  const reduceCoordinatesTool = new ReduceCoordinatesTool(application);

  const drawTool = new DrawTool(application);
  const clonerTool = new CloneTool(application,
    { name: "cloner", label: "design|tool.cloner.label", dynamic: true });

  const addBoxTool = new AddObjectTool(application,
    { name: "add_box", label: "design|tool.add_box.label",
      objectType: "Box", iconName: "design|box" });
  const addCylinderTool = new AddObjectTool(application,
    { name: "add_cylinder", label: "design|tool.add_cylinder.label",
      objectType: "Cylinder", iconName: "design|cylinder" });
  const addConeTool = new AddObjectTool(application,
    { name: "add_cone", label: "design|tool.add_cone.label",
      objectType: "Cone", iconName: "design|cone" });
  const addSphereTool = new AddObjectTool(application,
    { name: "add_sphere", label: "design|tool.add_sphere.label",
      objectType: "Sphere", iconName: "design|sphere" });
  const addTorusTool = new AddObjectTool(application,
    { name: "add_torus", label: "design|tool.add_torus.label",
      objectType: "Torus", iconName: "design|torus" });
  const addSpringTool = new AddObjectTool(application,
    { name: "add_spring", label: "design|tool.add_spring.label",
      objectType: "Spring" });
  const addRectangleTool = new AddObjectTool(application,
    { name: "add_rectangle", label: "design|tool.add_rectangle.label",
      objectType: "Profile", builderClass: RectangleBuilder });
  const addCircleTool = new AddObjectTool(application,
    { name: "add_circle", label: "design|tool.add_circle.label",
      objectType: "Profile", builderClass: CircleBuilder });
  const addEllipseTool = new AddObjectTool(application,
    { name: "add_ellipse", label: "design|tool.add_ellipse.label",
      objectType: "Profile", builderClass: EllipseBuilder });
  const addTrapeziumTool = new AddObjectTool(application,
    { name: "add_trapezium", label: "design|tool.add_trapezium.label",
      objectType: "Profile", builderClass: TrapeziumBuilder });
  const addIProfileTool = new AddObjectTool(application,
    { name: "add_iprofile", label: "design|tool.add_iprofile.label",
      objectType: "Profile", builderClass: IProfileBuilder });
  const addLProfileTool = new AddObjectTool(application,
    { name: "add_lprofile", label: "design|tool.add_lprofile.label",
      objectType: "Profile", builderClass: LProfileBuilder });
  const addTProfileTool = new AddObjectTool(application,
    { name: "add_tprofile", label: "design|tool.add_tprofile.label",
      objectType: "Profile", builderClass: TProfileBuilder });
  const addUProfileTool = new AddObjectTool(application,
    { name: "add_uprofile", label: "design|tool.add_uprofile.label",
      objectType: "Profile", builderClass: UProfileBuilder });
  const addZProfileTool = new AddObjectTool(application,
    { name: "add_zprofile", label: "design|tool.add_zprofile.label",
      objectType: "Profile", builderClass: ZProfileBuilder });
  const addHelicoidTool = new AddObjectTool(application,
    { name: "add_helicoid", label: "design|tool.add_helicoid.label",
      objectType: "Cord", builderClass: HelicoidBuilder });
  const addObject3DTool = new AddObjectTool(application,
    { name: "add_object3D", label: "design|tool.add_object3D.label",
      objectType: "Object3D" });
  const addGroupTool = new AddObjectTool(application,
    { name: "add_group", label: "design|tool.add_group.label",
      objectType: "Group", iconName: "design|group" });
  const addText2DTool = new AddObjectTool(application,
    { name: "add_text2D", label: "design|tool.add_text2D.label",
      objectType: "Text2D" });
  const addSpriteTool = new AddObjectTool(application,
    { name: "add_sprite", label: "design|tool.add_sprite.label",
      objectType: "Sprite" });
  const addPerspectiveCameraTool = new AddObjectTool(application,
    { name: "add_perspective_camera", label: "design|tool.add_perspective_camera.label",
      objectType: "PerspectiveCamera" });
  const addOrthographicCameraTool = new AddObjectTool(application,
    { name: "add_orthographic_camera", label: "design|tool.add_orthographic_camera.label",
      objectType: "OrthographicCamera" });
  const addAmbientLightTool = new AddObjectTool(application,
    { name: "add_ambient_light", label: "design|tool.add_ambient_light.label",
      objectType: "AmbientLight" });
  const addHemisphereLightTool = new AddObjectTool(application,
    { name: "add_hemisphere_light", label: "design|tool.add_hemisphere_light.label",
      objectType: "HemisphereLight" });
  const addDirectionalLightTool = new AddObjectTool(application,
    { name: "add_directional_light", label: "design|tool.add_directional_light.label",
      objectType: "DirectionalLight" });
  const addPointLightTool = new AddObjectTool(application,
    { name: "add_point_light", label: "design|tool.add_point_light.label",
      objectType: "PointLight" });
  const addSpotLightTool = new AddObjectTool(application,
    { name: "add_spot_light", label: "design|tool.add_spot_light.label",
      objectType: "SpotLight" });

  const paintTool = new PaintTool(application);

  // create menus
  const menuBar = application.menuBar;

  const panelsMenu = menuBar.getMenu("base|menu.panels");

  const designMenu = menuBar.addMenu("design|menu.design", panelsMenu?.getIndex());
  const addMenu = designMenu.addMenu("design|menu.design.add");
  const addSolidMenu = addMenu.addMenu("design|menu.design.add_solid");
  addSolidMenu.addMenuItem(addBoxTool);
  addSolidMenu.addMenuItem(addCylinderTool);
  addSolidMenu.addMenuItem(addConeTool);
  addSolidMenu.addMenuItem(addSphereTool);
  addSolidMenu.addMenuItem(addTorusTool);
  addSolidMenu.addMenuItem(addSpringTool);
  const addProfileMenu = addMenu.addMenu("design|menu.design.add_profile");
  addProfileMenu.addMenuItem(addRectangleTool);
  addProfileMenu.addMenuItem(addCircleTool);
  addProfileMenu.addMenuItem(addEllipseTool);
  addProfileMenu.addMenuItem(addTrapeziumTool);
  addProfileMenu.addMenuItem(addIProfileTool);
  addProfileMenu.addMenuItem(addLProfileTool);
  addProfileMenu.addMenuItem(addTProfileTool);
  addProfileMenu.addMenuItem(addUProfileTool);
  addProfileMenu.addMenuItem(addZProfileTool);
  const addCordMenu = addMenu.addMenu("design|menu.design.add_cord");
  addCordMenu.addMenuItem(addHelicoidTool);
  const addCameraMenu = addMenu.addMenu("design|menu.design.add_camera");
  addCameraMenu.addMenuItem(addPerspectiveCameraTool);
  addCameraMenu.addMenuItem(addOrthographicCameraTool);
  const addLightMenu = addMenu.addMenu("design|menu.design.add_light");
  addLightMenu.addMenuItem(addAmbientLightTool);
  addLightMenu.addMenuItem(addHemisphereLightTool);
  addLightMenu.addMenuItem(addDirectionalLightTool);
  addLightMenu.addMenuItem(addPointLightTool);
  addLightMenu.addMenuItem(addSpotLightTool);
  addMenu.addMenuItem(addObject3DTool);
  addMenu.addMenuItem(addGroupTool);
  addMenu.addMenuItem(clonerTool);
  addMenu.addMenuItem(addText2DTool);
  addMenu.addMenuItem(addSpriteTool);
  const transformMenu = designMenu.addMenu("design|menu.design.transform");
  transformMenu.addMenuItem(moveTool);
  transformMenu.addMenuItem(rotateTool);
  transformMenu.addMenuItem(scaleTool);
  transformMenu.addMenuItem(placeTool);
  designMenu.addSeparator();
  designMenu.addMenuItem(drawTool);
  designMenu.addMenuItem(extrudeTool);
  designMenu.addMenuItem(revolveTool);
  const booleanOperationMenu = designMenu.addMenu("design|menu.design.boolean_operation");
  booleanOperationMenu.addMenuItem(unionTool);
  booleanOperationMenu.addMenuItem(intersectionTool);
  booleanOperationMenu.addMenuItem(subtractionTool);
  designMenu.addSeparator();
  const geometryMenu = designMenu.addMenu("design|menu.design.geometry");
  geometryMenu.addMenuItem(inspectGeometryTool);
  geometryMenu.addMenuItem(meshToSolidTool);
  geometryMenu.addMenuItem(solidToMeshTool);
  geometryMenu.addMenuItem(mergeGeometriesTool);
  geometryMenu.addMenuItem(offsetGeometriesTool);
  geometryMenu.addMenuItem(resetMatrixTool);
  geometryMenu.addMenuItem(smoothEdgesTool);
  geometryMenu.addMenuItem(reduceCoordinatesTool);
  designMenu.addMenuItem(rebuildTool);
  designMenu.addMenuItem(decomposeTool);
  designMenu.addMenuItem(paintTool);

  // add tools to toolbar
  const toolBar = application.toolBar;

  toolBar.addSeparator("design");
  toolBar.addToolButton(drawTool);
  toolBar.addToolButton(paintTool);
  toolBar.addToolButton(moveTool);
  toolBar.addToolButton(rotateTool);
  toolBar.addToolButton(scaleTool);
  toolBar.addToolButton(placeTool);
  toolBar.addToolButton(rebuildTool);

  const outliner = application.panelManager.getPanel("outliner");
  if (outliner)
  {
    const outlinerMenu = outliner.contextMenu;
    outlinerMenu.addMenuItem(inspectGeometryTool);
    const outlinerAddMenu = outlinerMenu.addMenu("design|menu.design.add");
    outlinerAddMenu.addMenuItem(addGroupTool);
    outlinerAddMenu.addMenuItem(addBoxTool);
    outlinerAddMenu.addMenuItem(addCylinderTool);
    outlinerAddMenu.addMenuItem(addObject3DTool);
    outlinerAddMenu.addMenuItem(addText2DTool);
  }
}
