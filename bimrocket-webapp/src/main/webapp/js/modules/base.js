/**
 * base.js
 *
 * @author realor
 */

import { NewSceneTool } from "../tools/NewSceneTool.js";
import { CloudExplorerTool } from "../tools/CloudExplorerTool.js";
import { OpenLocalTool } from "../tools/OpenLocalTool.js";
import { SaveLocalTool } from "../tools/SaveLocalTool.js";
import { OptionsTool } from "../tools/OptionsTool.js";
import { PrintTool } from "../tools/PrintTool.js";
import { SVGExporterTool } from "../tools/SVGExporterTool.js";
import { SelectTool } from "../tools/SelectTool.js";
import { SelectParentTool } from "../tools/SelectParentTool.js";
import { SelectByNameTool } from "../tools/SelectByNameTool.js";
import { SelectByPropertyTool } from "../tools/SelectByPropertyTool.js";
import { SelectByQRCodeTool } from "../tools/SelectByQRCodeTool.js";
import { ExportSelectionTool } from "../tools/ExportSelectionTool.js";
import { OrbitTool } from "../tools/OrbitTool.js";
import { FlyTool } from "../tools/FlyTool.js";
import { ViewTool } from "../tools/ViewTool.js";
import { AutoOrbitTool } from "../tools/AutoOrbitTool.js";
import { SectionTool } from "../tools/SectionTool.js";
import { InspectGeometryTool } from "../tools/InspectGeometryTool.js";
import { ResetMatrixTool } from "../tools/ResetMatrixTool.js";
import { SmoothEdgesTool } from "../tools/SmoothEdgesTool.js";
import { RebuildTool } from "../tools/RebuildTool.js";
import { MoveTool } from "../tools/MoveTool.js";
import { RotateTool } from "../tools/RotateTool.js";
import { ScaleTool } from "../tools/ScaleTool.js";
import { BooleanOperationTool } from "../tools/BooleanOperationTool.js";
import { ExtrudeTool } from "../tools/ExtrudeTool.js";
import { MeshToSolidTool } from "../tools/MeshToSolidTool.js";
import { SolidToMeshTool } from "../tools/SolidToMeshTool.js";
import { MergeGeometriesTool } from "../tools/MergeGeometriesTool.js";
import { DrawProfileTool } from "../tools/DrawProfileTool.js";
import { MeasureLengthTool } from "../tools/MeasureLengthTool.js";
import { MeasureSelectionTool } from "../tools/MeasureSelectionTool.js";
import { ActivateCameraTool } from "../tools/ActivateCameraTool.js";
import { CameraProjectionTool } from "../tools/CameraProjectionTool.js";
import { AddObjectTool } from "../tools/AddObjectTool.js";
import { RemoveTool } from "../tools/RemoveTool.js";
import { CloneTool } from "../tools/CloneTool.js";
import { CutTool } from "../tools/CutTool.js";
import { PasteTool } from "../tools/PasteTool.js";
import { ZoomAllTool } from "../tools/ZoomAllTool.js";
import { FullscreenTool } from "../tools/FullscreenTool.js";
import { CenterSelectionTool } from "../tools/CenterSelectionTool.js";
import { VisibilityTool } from "../tools/VisibilityTool.js";
import { StyleTool } from "../tools/StyleTool.js";
import { PaintTool } from "../tools/PaintTool.js";
import { OutlinerTool } from "../tools/OutlinerTool.js";
import { InspectorTool } from "../tools/InspectorTool.js";
import { StatisticsTool } from "../tools/StatisticsTool.js";
import { StartControllersTool } from "../tools/StartControllersTool.js";
import { StopControllersTool } from "../tools/StopControllersTool.js";
import { ScriptTool } from "../tools/ScriptTool.js";
import { AboutTool } from "../tools/AboutTool.js";
import { OpenLinkTool } from "../tools/OpenLinkTool.js";
import { BooleanOperator } from "../builders/BooleanOperator.js";
import { GeometryMerger } from "../builders/GeometryMerger.js";
import { Brain4itPostController } from "../controllers/Brain4itPostController.js";
import { Brain4itWatchController } from "../controllers/Brain4itWatchController.js";
import { ColorController } from "../controllers/ColorController.js";
import { DisplayController } from "../controllers/DisplayController.js";
import { LightController } from "../controllers/LightController.js";
import { LoadController } from "../controllers/LoadController.js";
import { ProximityController } from "../controllers/ProximityController.js";
import { PushButtonController } from "../controllers/PushButtonController.js";
import { RotationController } from "../controllers/RotationController.js";
import { ToggleButtonController } from "../controllers/ToggleButtonController.js";
import { TranslationController } from "../controllers/TranslationController.js";
import { BRFLoader } from "../io/BRFLoader.js";
import { BRFExporter } from "../io/BRFExporter.js";
import { ColladaLoader } from "../io/ColladaLoader.js";
import { ColladaExporter } from "../io/ColladaExporter.js";
import { OBJLoader } from "../io/OBJLoader.js";
import { OBJExporter } from "../io/OBJExporter.js";
import { STLLoader } from "../io/STLLoader.js";
import { STLExporter } from "../io/STLExporter.js";
import { GLTFLoader } from "../io/GLTFLoader.js";
import { GLTFExporter } from "../io/GLTFExporter.js";
import { IOManager } from "../io/IOManager.js";
import { WebdavService } from "../io/WebdavService.js";
import { BundleManager } from "../i18n/BundleManager.js";
import * as THREE from "../lib/three.module.js";

export function load(application)
{
  // register formats
  IOManager.formats["brf"] =
  {
    description : "BIMROCKET (*.brf)",
    extensions: ["brf"],
    mimeType : "application/json",
    loader :
    {
      class : BRFLoader,
      loadMethod : 0,
      dataType : "text"
    },
    exporter :
    {
      class : BRFExporter,
      exportMethod : 0
    }
  };

  IOManager.formats["dae"] =
  {
    description: "Collada (*.dae)",
    extensions: ["dae"],
    mimeType : "model/vnd.collada+xml",
    loader :
    {
      class : ColladaLoader,
      loadMethod : 1,
      dataType : "text"
    },
    exporter :
    {
      class : ColladaExporter,
      exportMethod : 0
    }
  };

  IOManager.formats["obj"] =
  {
    description: "Wavefront object (*.obj)",
    extensions: ["obj"],
    mimeType : "model/obj",
    loader :
    {
      class : OBJLoader,
      loadMethod : 0,
      dataType : "text"
    },
    exporter :
    {
      class : OBJExporter,
      exportMethod : 0
    }
  };

  IOManager.formats["stl"] =
  {
    description : "Stereolithography (*.stl)",
    extensions: ["stl"],
    mimeType : "model/stl",
    loader :
    {
      class : STLLoader,
      loadMethod : 0,
      dataType : "arraybuffer"
    },
    exporter :
    {
      class : STLExporter,
      exportMethod : 0
    }
  };

  IOManager.formats["gltf"] =
  {
    description : "GL Transmission Format (*.gltf)",
    extensions: ["gltf"],
    mimeType : "model/gltf-json",
    loader :
    {
      class : GLTFLoader,
      loadMethod : 3,
      dataType : "arraybuffer"
    },
    exporter :
    {
      class : GLTFExporter,
      exportMethod : 1,
      options : { binary : false }
    }
  };

  IOManager.formats["glb"] =
  {
    description : "GL Transmission Format (*.glb)",
    extensions: ["glb"],
    mimeType : "model/gltf-binary",
    loader :
    {
      class : GLTFLoader,
      loadMethod : 3,
      dataType : "arraybuffer"
    },
    exporter :
    {
      class : GLTFExporter,
      exportMethod : 1,
      options : { binary : true }
    }
  };

  // create tools
  const newSceneTool = new NewSceneTool(application);
  const cloudExplorerTool = new CloudExplorerTool(application);
  const openLocalTool = new OpenLocalTool(application);
  const saveLocalTool = new SaveLocalTool(application);
  const optionsTool = new OptionsTool(application);
  const printTool = new PrintTool(application);
  const svgExporterTool = new SVGExporterTool(application);
  const selectTool = new SelectTool(application);
  const selectParentTool = new SelectParentTool(application);
  const selectByPropertyTool = new SelectByPropertyTool(application);
  const selectByQRCodeTool = new SelectByQRCodeTool(application);
  const selectReprTool = new SelectByNameTool(application,
  { name : "IfcRepresentation", label: "IfcRepresentation",
    propertyName : "IfcRepresentation" });
  const exportSelectionTool = new ExportSelectionTool(application);
  const orbitTool = new OrbitTool(application);
  const flyTool = new FlyTool(application);
  const topViewTool = new ViewTool(application,
    { name : "top", label : "tool.view.top", x : 0, y : 0, z : 0,
      keyShortcut : "Shift+T"
    });
  const frontViewTool = new ViewTool(application,
    { name : "front", label : "tool.view.front", x : 90, y : 0, z : 0,
      keyShortcut : "Shift+F"
    });
  const backViewTool = new ViewTool(application,
    { name : "back", label : "tool.view.back", x : -90, y : 0, z : 180,
      keyShortcut : "Shift+B"
    });
  const leftViewTool = new ViewTool(application,
    { name : "left", label : "tool.view.left", x : 90, y : 90, z : 0,
      keyShortcut : "Shift+L"
    });
  const rightViewTool = new ViewTool(application,
    { name : "right", label : "tool.view.right", x : -90, y : -90, z : 180,
      keyShortcut : "Shift+R"
    });
  const autoOrbitTool = new AutoOrbitTool(application);
  const sectionTool = new SectionTool(application);
  const inspectGeometryTool = new InspectGeometryTool(application);
  const resetMatrixTool = new ResetMatrixTool(application);
  const smoothEdgesTool = new SmoothEdgesTool(application);
  const scriptTool = new ScriptTool(application);
  const rebuildTool = new RebuildTool(application);
  const moveTool = new MoveTool(application);
  const rotateTool = new RotateTool(application);
  const scaleTool = new ScaleTool(application);
  const extrudeTool = new ExtrudeTool(application);
  const unionTool = new BooleanOperationTool(application,
    { name : "union", label : "tool.union.label",
      operation : BooleanOperator.UNION });
  const intersectionTool = new BooleanOperationTool(application,
    { name : "intersection", label : "tool.intersection.label",
      operation : BooleanOperator.INTERSECT });
  const subtractionTool = new BooleanOperationTool(application,
    { name : "subtraction", label : "tool.subtraction.label",
      operation : BooleanOperator.SUBTRACT });
  const meshToSolidTool = new MeshToSolidTool(application);
  const solidToMeshTool = new SolidToMeshTool(application);
  const mergeGeometriesTool = new MergeGeometriesTool(application);
  const drawProfileTool = new DrawProfileTool(application);
  const measureLengthTool = new MeasureLengthTool(application);
  const measureSelectionTool = new MeasureSelectionTool(application);
  const activateCameraTool = new ActivateCameraTool(application);
  const perspectiveTool = new CameraProjectionTool(application,
    { name : "perspective", label : "tool.perspective.label",
      type : "perspective", keyShortcut : "Shift+P" });
  const orthographicTool = new CameraProjectionTool(application,
    { name : "orthographic", label : "tool.orthographic.label",
      type : "orthographic", keyShortcut : "Shift+O" });
  const addBoxTool = new AddObjectTool(application,
    { name : "add_box", label : "tool.add_box.label",
      objectType : "Box" });
  const addCylinderTool = new AddObjectTool(application,
    { name : "add_cylinder", label : "tool.add_cylinder.label",
      objectType : "Cylinder" });
  const addSphereTool = new AddObjectTool(application,
    { name : "add_sphere", label : "tool.add_sphere.label",
      objectType : "Sphere" });
  const addSpringTool = new AddObjectTool(application,
    { name : "add_spring", label : "tool.add_spring.label",
      objectType : "Spring" });
  const addRectangleTool = new AddObjectTool(application,
    { name : "add_rectangle", label : "tool.add_rectangle.label",
      objectType : "Rectangle" });
  const addCircleTool = new AddObjectTool(application,
    { name : "add_circle", label : "tool.add_circle.label",
      objectType : "Circle" });
  const addEllipseTool = new AddObjectTool(application,
    { name : "add_ellipse", label : "tool.add_ellipse.label",
      objectType : "Ellipse" });
  const addTrapeziumTool = new AddObjectTool(application,
    { name : "add_trapezium", label : "tool.add_trapezium.label",
      objectType : "Trapezium" });
  const addIProfileTool = new AddObjectTool(application,
    { name : "add_iprofile", label : "tool.add_iprofile.label",
      objectType : "IProfile" });
  const addLProfileTool = new AddObjectTool(application,
    { name : "add_lprofile", label : "tool.add_lprofile.label",
      objectType : "LProfile" });
  const addTProfileTool = new AddObjectTool(application,
    { name : "add_tprofile", label : "tool.add_tprofile.label",
      objectType : "TProfile" });
  const addUProfileTool = new AddObjectTool(application,
    { name : "add_uprofile", label : "tool.add_uprofile.label",
      objectType : "UProfile" });
  const addZProfileTool = new AddObjectTool(application,
    { name : "add_zprofile", label : "tool.add_zprofile.label",
      objectType : "ZProfile" });
  const addHelicoidTool = new AddObjectTool(application,
    { name : "add_helicoid", label : "tool.add_helicoid.label",
      objectType : "Helicoid" });
  const addGroupTool = new AddObjectTool(application,
    { name : "add_group", label : "tool.add_group.label",
      objectType : "Group" });
  const addSpriteTool = new AddObjectTool(application,
    { name : "add_sprite", label : "tool.add_sprite.label",
      objectType : "Sprite" });

  const removeTool = new RemoveTool(application, { keyShortcut : "Delete" });
  const cloneTool = new CloneTool(application);
  const clonerTool = new CloneTool(application,
    { name : "cloner", label : "tool.cloner.label", dynamic : true });
  const cutTool = new CutTool(application, { keyShortcut : "Control+X" });
  const pasteTool = new PasteTool(application, { keyShortcut : "Control+V" });
  const zoomAllTool = new ZoomAllTool(application, { keyShortcut : "Shift+Z" });
  const fullscreenTool = new FullscreenTool(application);
  const centerSelectionTool = new CenterSelectionTool(application);
  const focusSelectionTool = new CenterSelectionTool(application,
    { name : "focus_selection", label : "tool.focus_selection.label",
      focusOnSelection : true, className : "focus_selection" });

  const showTool = new VisibilityTool(application,
    { name : "show", label : "tool.show.label", className : "show",
      visible : true });
  const hideTool = new VisibilityTool(application,
    { name : "hide", label : "tool.hide.label", className : "hide",
      visible : false });
  const facesStyleTool = new StyleTool(application,
    { name : "faces_style", label : "tool.faces_style.label",
      edgesVisible : false, facesVisible : true });
  const edgesStyleTool = new StyleTool(application,
    { name : "edges_style", label : "tool.edges_style.label",
      edgesVisible : true, facesVisible : false });
  const facesEdgesStyleTool = new StyleTool(application,
    { name : "faces_edges_style", label : "tool.faces_edges_style.label",
     edgesVisible : true, facesVisible : true });
  const hiddenStyleTool = new StyleTool(application,
    { name : "hidden_style", label : "tool.hidden_style.label",
      edgesVisible : false, facesVisible : false });
  const paintTool = new PaintTool(application);

  const outlinerTool = new OutlinerTool(application);
  const inspectorTool = new InspectorTool(application);
  const statisticsTool = new StatisticsTool(application);
  const startControllersTool = new StartControllersTool(application);
  const stopControllersTool = new StopControllersTool(application);
  const aboutTool = new AboutTool(application);
  const githubTool = new OpenLinkTool(application,
  { name : "gihub", label: "GitHub", url: "https://github.com/bimrocket/bimrocket",
    target : "_blank"});

  application.addTool(newSceneTool);
  application.addTool(cloudExplorerTool);
  application.addTool(openLocalTool);
  application.addTool(saveLocalTool);
  application.addTool(optionsTool);
  application.addTool(printTool);
  application.addTool(svgExporterTool);
  application.addTool(selectTool);
  application.addTool(selectParentTool);
  application.addTool(selectReprTool);
  application.addTool(selectByPropertyTool);
  application.addTool(selectByQRCodeTool);
  application.addTool(exportSelectionTool);
  application.addTool(topViewTool);
  application.addTool(frontViewTool);
  application.addTool(backViewTool);
  application.addTool(leftViewTool);
  application.addTool(rightViewTool);
  application.addTool(orbitTool);
  application.addTool(flyTool);
  application.addTool(autoOrbitTool);
  application.addTool(rebuildTool);
  application.addTool(moveTool);
  application.addTool(rotateTool);
  application.addTool(scaleTool);
  application.addTool(extrudeTool);
  application.addTool(unionTool);
  application.addTool(intersectionTool);
  application.addTool(subtractionTool);
  application.addTool(meshToSolidTool);
  application.addTool(mergeGeometriesTool);
  application.addTool(solidToMeshTool);
  application.addTool(sectionTool);
  application.addTool(measureLengthTool);
  application.addTool(measureSelectionTool);
  application.addTool(activateCameraTool);
  application.addTool(perspectiveTool);
  application.addTool(orthographicTool);
  application.addTool(inspectGeometryTool);
  application.addTool(resetMatrixTool);
  application.addTool(smoothEdgesTool);
  application.addTool(addGroupTool);
  application.addTool(addBoxTool);
  application.addTool(addCylinderTool);
  application.addTool(addSphereTool);
  application.addTool(addSpringTool);
  application.addTool(addRectangleTool);
  application.addTool(addCircleTool);
  application.addTool(addEllipseTool);
  application.addTool(addTrapeziumTool);
  application.addTool(addIProfileTool);
  application.addTool(addLProfileTool);
  application.addTool(addTProfileTool);
  application.addTool(addUProfileTool);
  application.addTool(addZProfileTool);
  application.addTool(addHelicoidTool);
  application.addTool(addSpriteTool);
  application.addTool(scriptTool);
  application.addTool(removeTool);
  application.addTool(cloneTool);
  application.addTool(clonerTool);
  application.addTool(cutTool);
  application.addTool(pasteTool);
  application.addTool(zoomAllTool);
  application.addTool(fullscreenTool);
  application.addTool(centerSelectionTool);
  application.addTool(focusSelectionTool);
  application.addTool(showTool);
  application.addTool(hideTool);
  application.addTool(paintTool);
  application.addTool(edgesStyleTool);
  application.addTool(facesStyleTool);
  application.addTool(facesEdgesStyleTool);
  application.addTool(hiddenStyleTool);
  application.addTool(outlinerTool);
  application.addTool(inspectorTool);
  application.addTool(statisticsTool);
  application.addTool(startControllersTool);
  application.addTool(stopControllersTool);
  application.addTool(aboutTool);
  application.addTool(githubTool);

  // create menus
  const menuBar = application.menuBar;

  const fileMenu = menuBar.addMenu("menu.file");
  fileMenu.addMenuItem(newSceneTool);
  fileMenu.addMenuItem(cloudExplorerTool);
  fileMenu.addMenuItem(openLocalTool);
  fileMenu.addMenuItem(saveLocalTool);
  fileMenu.addMenuItem(printTool);
  fileMenu.addMenuItem(svgExporterTool);

  const editMenu = menuBar.addMenu("menu.edit");
  editMenu.addMenuItem(cutTool);
  editMenu.addMenuItem(pasteTool);
  editMenu.addMenuItem(removeTool);
  editMenu.addMenuItem(cloneTool);
  editMenu.addMenuItem(optionsTool);

  const viewMenu = menuBar.addMenu("menu.view");
  viewMenu.addMenuItem(orbitTool);
  viewMenu.addMenuItem(flyTool);
  viewMenu.addMenuItem(zoomAllTool);
  const standardViewMenu = viewMenu.addMenu("menu.view.standard_view");
  standardViewMenu.addMenuItem(topViewTool);
  standardViewMenu.addMenuItem(frontViewTool);
  standardViewMenu.addMenuItem(backViewTool);
  standardViewMenu.addMenuItem(leftViewTool);
  standardViewMenu.addMenuItem(rightViewTool);
  viewMenu.addMenuItem(showTool);
  viewMenu.addMenuItem(hideTool);
  const styleMenu = viewMenu.addMenu("menu.view.style");
  styleMenu.addMenuItem(edgesStyleTool);
  styleMenu.addMenuItem(facesStyleTool);
  styleMenu.addMenuItem(facesEdgesStyleTool);
  styleMenu.addMenuItem(hiddenStyleTool);
  viewMenu.addMenuItem(centerSelectionTool);
  viewMenu.addMenuItem(focusSelectionTool);
  const projectionMenu = viewMenu.addMenu("menu.view.projection");
  projectionMenu.addMenuItem(perspectiveTool);
  projectionMenu.addMenuItem(orthographicTool);
  viewMenu.addMenuItem(activateCameraTool);
  viewMenu.addMenuItem(sectionTool);
  viewMenu.addMenuItem(fullscreenTool);

  const selectMenu = menuBar.addMenu("menu.select");
  selectMenu.addMenuItem(selectTool);
  selectMenu.addMenuItem(selectParentTool);
  selectMenu.addMenuItem(selectReprTool);
  selectMenu.addMenuItem(selectByPropertyTool);
  selectMenu.addMenuItem(selectByQRCodeTool);
  selectMenu.addMenuItem(exportSelectionTool);

  const designMenu = menuBar.addMenu("menu.design");
  const addMenu = designMenu.addMenu("menu.design.add");
  const addSolidMenu = addMenu.addMenu("menu.design.add_solid");
  addSolidMenu.addMenuItem(addBoxTool);
  addSolidMenu.addMenuItem(addCylinderTool);
  addSolidMenu.addMenuItem(addSphereTool);
  addSolidMenu.addMenuItem(addSpringTool);
  const addProfileMenu = addMenu.addMenu("menu.design.add_profile");
  addProfileMenu.addMenuItem(addRectangleTool);
  addProfileMenu.addMenuItem(addCircleTool);
  addProfileMenu.addMenuItem(addEllipseTool);
  addProfileMenu.addMenuItem(addTrapeziumTool);
  addProfileMenu.addMenuItem(addIProfileTool);
  addProfileMenu.addMenuItem(addLProfileTool);
  addProfileMenu.addMenuItem(addTProfileTool);
  addProfileMenu.addMenuItem(addUProfileTool);
  addProfileMenu.addMenuItem(addZProfileTool);
  const addCordMenu = addMenu.addMenu("menu.design.add_cord");
  addCordMenu.addMenuItem(addHelicoidTool);
  addMenu.addMenuItem(addGroupTool);
  addMenu.addMenuItem(clonerTool);
  addMenu.addMenuItem(addSpriteTool);
  const transformMenu = designMenu.addMenu("menu.design.transform");
  transformMenu.addMenuItem(moveTool);
  transformMenu.addMenuItem(rotateTool);
  transformMenu.addMenuItem(scaleTool);
  const booleanOperationMenu = designMenu.addMenu("menu.design.boolean_operation");
  booleanOperationMenu.addMenuItem(unionTool);
  booleanOperationMenu.addMenuItem(intersectionTool);
  booleanOperationMenu.addMenuItem(subtractionTool);
  designMenu.addMenuItem(drawProfileTool);
  designMenu.addMenuItem(extrudeTool);
  const geometryMenu = designMenu.addMenu("menu.design.geometry");
  geometryMenu.addMenuItem(inspectGeometryTool);
  geometryMenu.addMenuItem(meshToSolidTool);
  geometryMenu.addMenuItem(solidToMeshTool);
  geometryMenu.addMenuItem(mergeGeometriesTool);
  geometryMenu.addMenuItem(resetMatrixTool);
  geometryMenu.addMenuItem(smoothEdgesTool);
  designMenu.addMenuItem(paintTool);
  designMenu.addMenuItem(rebuildTool);
  designMenu.addMenuItem(scriptTool);

  const measureMenu = menuBar.addMenu("menu.measure");
  measureMenu.addMenuItem(measureLengthTool);
  measureMenu.addMenuItem(measureSelectionTool);

  const controlMenu = menuBar.addMenu("menu.control");
  controlMenu.addMenuItem(startControllersTool);
  controlMenu.addMenuItem(stopControllersTool);

  const panelsMenu = menuBar.addMenu("menu.panels");
  panelsMenu.addMenuItem(outlinerTool);
  panelsMenu.addMenuItem(inspectorTool);
  panelsMenu.addMenuItem(statisticsTool);

  const helpMenu = menuBar.addMenu("menu.help");
  helpMenu.addMenuItem(aboutTool);
  helpMenu.addMenuItem(githubTool);

  // add tools to toolbar
  const toolBar = application.toolBar;

  toolBar.addToolButton(newSceneTool);
  toolBar.addToolButton(cloudExplorerTool);
  toolBar.addToolButton(openLocalTool);
  toolBar.addToolButton(saveLocalTool);
  toolBar.addToolButton(optionsTool);
  toolBar.addToolButton(printTool);
  toolBar.addToolButton(selectTool);
  toolBar.addToolButton(orbitTool);
  toolBar.addToolButton(flyTool);
  toolBar.addToolButton(zoomAllTool);
  toolBar.addToolButton(showTool);
  toolBar.addToolButton(hideTool);
  toolBar.addToolButton(centerSelectionTool);
  toolBar.addToolButton(focusSelectionTool);
  toolBar.addToolButton(sectionTool);
  toolBar.addToolButton(scriptTool);
  toolBar.addToolButton(measureLengthTool);
  toolBar.addToolButton(paintTool);
  toolBar.addToolButton(rebuildTool);
  toolBar.addToolButton(moveTool);
  toolBar.addToolButton(rotateTool);
  toolBar.addToolButton(scaleTool);
  toolBar.addToolButton(selectByQRCodeTool);

  // restore services
  application.restoreServices("model");
  application.restoreServices("script");

  // create default services
  if (application.services.model === undefined)
  {
    const cloudfs = new WebdavService("models",
      "Repository", "/bimrocket-server/api/cloudfs/models");
    application.addService(cloudfs, "model", false);
  }

  if (application.services.script === undefined)
  {
    const cloudfs = new WebdavService("scripts",
      "Scripts", "/bimrocket-server/api/cloudfs/scripts");
    application.addService(cloudfs, "script", false);
  }

  // register bundles and locales
  BundleManager.setBundle("base", "i18n/base");
  application.i18n.defaultBundle = BundleManager.getBundle("base");
  application.i18n.addSupportedLanguages("en", "es", "ca");
  application.i18n.updateTree(application.element);

  // select baseObject
  application.selection.set(application.baseObject);

  // globals
  window.THREE = THREE;
}