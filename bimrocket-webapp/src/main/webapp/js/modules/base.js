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
import { SelectTool } from "../tools/SelectTool.js";
import { SelectParentTool } from "../tools/SelectParentTool.js";
import { SelectByNameTool } from "../tools/SelectByNameTool.js";
import { ExportSelectionTool } from "../tools/ExportSelectionTool.js";
import { OrbitTool } from "../tools/OrbitTool.js";
import { FlyTool } from "../tools/FlyTool.js";
import { ViewTool } from "../tools/ViewTool.js";
import { AutoOrbitTool } from "../tools/AutoOrbitTool.js";
import { SectionTool } from "../tools/SectionTool.js";
import { InspectGeometryTool } from "../tools/InspectGeometryTool.js";
import { ResetMatrixTool } from "../tools/ResetMatrixTool.js";
import { MoveTool } from "../tools/MoveTool.js";
import { RotateTool } from "../tools/RotateTool.js";
import { ScaleTool } from "../tools/ScaleTool.js";
import { BooleanOperationTool } from "../tools/BooleanOperationTool.js";
import { ClipTool } from "../tools/ClipTool.js";
import { MakeSolidTool } from "../tools/MakeSolidTool.js";
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
import { CenterSelectionTool } from "../tools/CenterSelectionTool.js";
import { VisibilityTool } from "../tools/VisibilityTool.js";
import { StyleTool } from "../tools/StyleTool.js";
import { OutlinerTool } from "../tools/OutlinerTool.js";
import { InspectorTool } from "../tools/InspectorTool.js";
import { StatisticsTool } from "../tools/StatisticsTool.js";
import { CreateControllerTool } from "../tools/CreateControllerTool.js";
import { StartControllersTool } from "../tools/StartControllersTool.js";
import { StopControllersTool } from "../tools/StopControllersTool.js";
import { LoadControllersTool } from "../tools/LoadControllersTool.js";
import { SaveControllersTool } from "../tools/SaveControllersTool.js";
import { ScriptTool } from "../tools/ScriptTool.js";
import { AboutTool } from "../tools/AboutTool.js";
import { OpenLinkTool } from "../tools/OpenLinkTool.js";

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
import { WFSController } from "../controllers/WFSController.js";

import { BRFLoader } from "../io/BRFLoader.js";
import { BRFExporter } from "../io/BRFExporter.js";
import { ColladaLoader } from "../io/ColladaLoader.js";
import { ColladaExporter } from "../io/ColladaExporter.js";
import { OBJLoader } from "../io/OBJLoader.js";
import { OBJExporter } from "../io/OBJExporter.js";
import { STLLoader } from "../io/STLLoader.js";
import { STLExporter } from "../io/STLExporter.js";

import { IOManager } from "../io/IOManager.js";
import { WebdavService } from "../io/WebdavService.js";
import { BundleManager } from "../i18n/BundleManager.js";

export function load(application)
{
  // register formats
  IOManager.formats["brf"] =
  {
    description : "BIMROCKET (*.brf)",
    extension: "brf",
    loaderClass : BRFLoader,
    exporterClass : BRFExporter,
    options : {}
  };

  IOManager.formats["dae"] =
  {
    description: "Collada (*.dae)",
    extension: "dae",
    loaderClass : ColladaLoader,
    exporterClass : ColladaExporter,
    loadMethod : 1,
    options : {}
  };

  IOManager.formats["obj"] =
  {
    description: "Wavefront object (*.obj)",
    extension: "obj",
    loaderClass : OBJLoader,
    exporterClass : OBJExporter,
    options : {}
  };

  IOManager.formats["stl"] =
  {
    description : "Stereolithography (*.stl)",
    extension: "stl",
    loaderClass : STLLoader,
    exporterClass : STLExporter,
    options : {}
  };

  // create tools
  const newSceneTool = new NewSceneTool(application);
  const cloudExplorerTool = new CloudExplorerTool(application);
  const openLocalTool = new OpenLocalTool(application);
  const saveLocalTool = new SaveLocalTool(application);
  const optionsTool = new OptionsTool(application);
  const printTool = new PrintTool(application);
  const selectTool = new SelectTool(application);
  const selectParentTool = new SelectParentTool(application);
  const selectReprTool = new SelectByNameTool(application,
  { name : "IfcRepresentation", label: "IfcRepresentation",
    propertyName : "IfcRepresentation" });
  const exportSelectionTool = new ExportSelectionTool(application);
  const orbitTool = new OrbitTool(application);
  const flyTool = new FlyTool(application);
  const topViewTool = new ViewTool(application,
    { name : "top", label : "tool.view.top", x : 0, y : 0, z : 0 });
  const frontViewTool = new ViewTool(application,
    { name : "front", label : "tool.view.front", x : 90, y : 0, z : 0 });
  const backViewTool = new ViewTool(application,
    { name : "back", label : "tool.view.back", x : -90, y : 0, z : 180 });
  const leftViewTool = new ViewTool(application,
    { name : "left", label : "tool.view.left", x : 90, y : 90, z : 0 });
  const rightViewTool = new ViewTool(application,
    { name : "right", label : "tool.view.right", x : -90, y : -90, z : 180 });
  const autoOrbitTool = new AutoOrbitTool(application);
  const sectionTool = new SectionTool(application);
  const inspectGeometryTool = new InspectGeometryTool(application);
  const resetMatrixTool = new ResetMatrixTool(application);
  const scriptTool = new ScriptTool(application);
  const moveTool = new MoveTool(application);
  const rotateTool = new RotateTool(application);
  const scaleTool = new ScaleTool(application);
  const unionTool = new BooleanOperationTool(application,
    { name : "union", label : "tool.union.label", operation : "union" });
  const intersectionTool = new BooleanOperationTool(application,
    { name : "intersection", label : "tool.intersection.label",
      operation : "intersect" });
  const subtractionTool = new BooleanOperationTool(application,
    { name : "subtraction", label : "tool.subtraction.label",
      operation : "subtract" });
  const clipTool = new ClipTool(application);
  const makeSolidTool = new MakeSolidTool(application);
  const measureLengthTool = new MeasureLengthTool(application);
  const measureSelectionTool = new MeasureSelectionTool(application);
  const activateCameraTool = new ActivateCameraTool(application);
  const perspectiveTool = new CameraProjectionTool(application,
    { name : "perspective", label : "tool.perspective.label",
      type : "perspective" });
  const orthographicTool = new CameraProjectionTool(application,
    { name : "orthographic", label : "tool.orthographic.label",
      type : "orthographic" });
  const addBoxTool = new AddObjectTool(application,
    { name : "add_box", label : "tool.add_box.label",
      objectType : "box" });
  const addCylinderTool = new AddObjectTool(application,
    { name : "add_cylinder", label : "tool.add_cylinder.label",
      objectType : "cylinder" });
  const addSphereTool = new AddObjectTool(application,
    { name : "add_sphere", label : "tool.add_sphere.label",
      objectType : "sphere" });
  const addGroupTool = new AddObjectTool(application,
    { name : "add_group", label : "tool.add_group.label",
      objectType : "group" });
  const removeTool = new RemoveTool(application);
  const cloneTool = new CloneTool(application);
  const cutTool = new CutTool(application);
  const pasteTool = new PasteTool(application);
  const zoomAllTool = new ZoomAllTool(application);
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

  const outlinerTool = new OutlinerTool(application);
  const inspectorTool = new InspectorTool(application);
  const statisticsTool = new StatisticsTool(application);
  const createControllerTool = new CreateControllerTool(application);
  const startControllersTool = new StartControllersTool(application);
  const stopControllersTool = new StopControllersTool(application);
  const loadControllersTool = new LoadControllersTool(application);
  const saveControllersTool = new SaveControllersTool(application);
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
  application.addTool(selectTool);
  application.addTool(selectParentTool);
  application.addTool(selectReprTool);
  application.addTool(exportSelectionTool);
  application.addTool(orbitTool);
  application.addTool(flyTool);
  application.addTool(autoOrbitTool);
  application.addTool(moveTool);
  application.addTool(rotateTool);
  application.addTool(scaleTool);
  application.addTool(unionTool);
  application.addTool(intersectionTool);
  application.addTool(subtractionTool);
  application.addTool(clipTool);
  application.addTool(makeSolidTool);
  application.addTool(sectionTool);
  application.addTool(measureLengthTool);
  application.addTool(measureSelectionTool);
  application.addTool(activateCameraTool);
  application.addTool(perspectiveTool);
  application.addTool(orthographicTool);
  application.addTool(inspectGeometryTool);
  application.addTool(resetMatrixTool);
  application.addTool(addGroupTool);
  application.addTool(addBoxTool);
  application.addTool(addCylinderTool);
  application.addTool(addSphereTool);
  application.addTool(scriptTool);
  application.addTool(removeTool);
  application.addTool(cloneTool);
  application.addTool(cutTool);
  application.addTool(pasteTool);
  application.addTool(zoomAllTool);
  application.addTool(centerSelectionTool);
  application.addTool(focusSelectionTool);
  application.addTool(showTool);
  application.addTool(hideTool);
  application.addTool(edgesStyleTool);
  application.addTool(facesStyleTool);
  application.addTool(facesEdgesStyleTool);
  application.addTool(hiddenStyleTool);
  application.addTool(outlinerTool);
  application.addTool(inspectorTool);
  application.addTool(statisticsTool);
  application.addTool(startControllersTool);
  application.addTool(stopControllersTool);
  application.addTool(createControllerTool);
  application.addTool(loadControllersTool);
  application.addTool(saveControllersTool);
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

  const selectMenu = menuBar.addMenu("menu.select");
  selectMenu.addMenuItem(selectTool);
  selectMenu.addMenuItem(selectParentTool);
  selectMenu.addMenuItem(selectReprTool);
//    selectMenu.addMenuItem(exportSelectionTool);

  const designMenu = menuBar.addMenu("menu.design");
  const addMenu = designMenu.addMenu("menu.design.add");
  addMenu.addMenuItem(addBoxTool);
  addMenu.addMenuItem(addCylinderTool);
  addMenu.addMenuItem(addSphereTool);
  addMenu.addMenuItem(addGroupTool);
  const booleanOperationMenu = designMenu.addMenu("menu.design.boolean_operation");
  booleanOperationMenu.addMenuItem(unionTool);
  booleanOperationMenu.addMenuItem(intersectionTool);
  booleanOperationMenu.addMenuItem(subtractionTool);
  const transformMenu = designMenu.addMenu("menu.design.transform");
  transformMenu.addMenuItem(moveTool);
  transformMenu.addMenuItem(rotateTool);
  transformMenu.addMenuItem(scaleTool);
  designMenu.addMenuItem(clipTool);
  designMenu.addMenuItem(makeSolidTool);
  designMenu.addMenuItem(inspectGeometryTool);
  designMenu.addMenuItem(resetMatrixTool);
  designMenu.addMenuItem(scriptTool);

  const measureMenu = menuBar.addMenu("menu.measure");
  measureMenu.addMenuItem(measureLengthTool);
  measureMenu.addMenuItem(measureSelectionTool);

  const controlMenu = menuBar.addMenu("menu.control");
  controlMenu.addMenuItem(createControllerTool);
  controlMenu.addMenuItem(loadControllersTool);
  controlMenu.addMenuItem(saveControllersTool);
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
  toolBar.addToolButton(moveTool);
  toolBar.addToolButton(rotateTool);
  toolBar.addToolButton(scaleTool);

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
}