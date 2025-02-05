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
import { PlaceTool } from "../tools/PlaceTool.js";
import { BooleanOperationTool } from "../tools/BooleanOperationTool.js";
import { DecomposeTool } from "../tools/DecomposeTool.js";
import { ExtrudeTool } from "../tools/ExtrudeTool.js";
import { RevolveTool } from "../tools/RevolveTool.js";
import { MeshToSolidTool } from "../tools/MeshToSolidTool.js";
import { SolidToMeshTool } from "../tools/SolidToMeshTool.js";
import { MergeGeometriesTool } from "../tools/MergeGeometriesTool.js";
import { OffsetGeometriesTool } from "../tools/OffsetGeometriesTool.js";
import { DrawTool } from "../tools/DrawTool.js";
import { ReportTool } from "../tools/ReportTool.js";
import { HistogramTool } from "../tools/HistogramTool.js";
import { SearchTool } from "../tools/SearchTool.js";
import { MeasureLengthTool } from "../tools/MeasureLengthTool.js";
import { MeasureAreaTool } from "../tools/MeasureAreaTool.js";
import { MeasureAngleTool } from "../tools/MeasureAngleTool.js";
import { MeasureSelectionTool } from "../tools/MeasureSelectionTool.js";
import { ActivateCameraTool } from "../tools/ActivateCameraTool.js";
import { CameraProjectionTool } from "../tools/CameraProjectionTool.js";
import { AddObjectTool } from "../tools/AddObjectTool.js";
import { RemoveTool } from "../tools/RemoveTool.js";
import { CloneTool } from "../tools/CloneTool.js";
import { CopyTool } from "../tools/CopyTool.js";
import { CutTool } from "../tools/CutTool.js";
import { PasteTool } from "../tools/PasteTool.js";
import { LinkTool } from "../tools/LinkTool.js";
import { ZoomAllTool } from "../tools/ZoomAllTool.js";
import { ReduceCoordinatesTool } from "../tools/ReduceCoordinatesTool.js";
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
import { SolarSimulatorTool } from "../tools/SolarSimulatorTool.js";
import { ScriptTool } from "../tools/ScriptTool.js";
import { AboutTool } from "../tools/AboutTool.js";
import { OpenLinkTool } from "../tools/OpenLinkTool.js";
import { ChatGPTTool } from "../tools/ChatGPTTool.js";
import { BooleanOperator } from "../builders/BooleanOperator.js";
import { GeometryMerger } from "../builders/GeometryMerger.js";
import { RectangleBuilder } from "../builders/RectangleBuilder.js";
import { CircleBuilder } from "../builders/CircleBuilder.js";
import { EllipseBuilder } from "../builders/EllipseBuilder.js";
import { IProfileBuilder } from "../builders/IProfileBuilder.js";
import { LProfileBuilder } from "../builders/LProfileBuilder.js";
import { TProfileBuilder } from "../builders/TProfileBuilder.js";
import { UProfileBuilder } from "../builders/UProfileBuilder.js";
import { ZProfileBuilder } from "../builders/ZProfileBuilder.js";
import { TrapeziumBuilder } from "../builders/TrapeziumBuilder.js";
import { HelicoidBuilder } from "../builders/HelicoidBuilder.js";
import { Brain4itPostController } from "../controllers/Brain4itPostController.js";
import { Brain4itWatchController } from "../controllers/Brain4itWatchController.js";
import { ColorController } from "../controllers/ColorController.js";
import { DisplayController } from "../controllers/DisplayController.js";
import { LightController } from "../controllers/LightController.js";
import { LoadController } from "../controllers/LoadController.js";
import { ProximityController } from "../controllers/ProximityController.js";
import { PushButtonController } from "../controllers/PushButtonController.js";
import { RotationController } from "../controllers/RotationController.js";
import { ScriptController } from "../controllers/ScriptController.js";
import { ToggleButtonController } from "../controllers/ToggleButtonController.js";
import { TranslationController } from "../controllers/TranslationController.js";
import { RestPollController } from "../controllers/RestPollController.js";
import { BRFLoader } from "../io/BRFLoader.js";
import { BRFExporter } from "../io/BRFExporter.js";
import { ColladaLoader } from "../io/ColladaLoader.js";
import { ColladaExporter } from "../io/ColladaExporter.js";
import { OBJLoader } from "../io/OBJLoader.js";
import { OBJExporter } from "../io/OBJExporter.js";
import { PCDLoader } from "../io/PCDLoader.js";
import { STLLoader } from "../io/STLLoader.js";
import { STLExporter } from "../io/STLExporter.js";
import { GLTFLoader } from "../io/GLTFLoader.js";
import { GLTFExporter } from "../io/GLTFExporter.js";
import { IOManager } from "../io/IOManager.js";
import { WebdavService } from "../io/WebdavService.js";
import { IDBFileService } from "../io/IDBFileService.js";
import { BundleManager } from "../i18n/BundleManager.js";
import { Controls } from "../ui/Controls.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { ModuleLoader } from "../utils/ModuleLoader.js";
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { Cord } from "../core/Cord.js";
import { CordGeometry } from "../core/CordGeometry.js";
import { Profile } from "../core/Profile.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { Text2D } from "../core/Text2D.js";
import { Dialog } from "../ui/Dialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { Toast } from "../ui/Toast.js";
import { Tree } from "../ui/Tree.js";
import { TabbedPane } from "../ui/TabbedPane.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { Controller } from "../controllers/Controller.js";
import { Formula } from "../formula/Formula.js";
import { BRSReportType } from "../reports/BRSReportType.js";
import { Environment } from "../Environment.js";
import * as THREE from "three";

export function load(application)
{
  // register formats
  IOManager.formats["brf"] =
  {
    description : "BIMROCKET (*.brf)",
    extensions : ["brf"],
    mimeType : "application/json",
    dataType : "text",
    loader :
    {
      class : BRFLoader,
      loadMethod : 0
    },
    exporter :
    {
      class : BRFExporter,
      exportMethod : 0
    }
  };

  IOManager.formats["dae"] =
  {
    description : "Collada (*.dae)",
    extensions : ["dae"],
    mimeType : "model/vnd.collada+xml",
    dataType : "text",
    loader :
    {
      class : ColladaLoader,
      loadMethod : 1
    },
    exporter :
    {
      class : ColladaExporter,
      exportMethod : 0
    }
  };

  IOManager.formats["obj"] =
  {
    description : "Wavefront object (*.obj)",
    extensions : ["obj"],
    mimeType : "model/obj",
    dataType : "text",
    loader :
    {
      class : OBJLoader,
      loadMethod : 0
    },
    exporter :
    {
      class : OBJExporter,
      exportMethod : 0
    }
  };

  IOManager.formats["pcd"] =
  {
    description : "Point cloud data (*.pcd)",
    extensions : ["pcd"],
    mimeType : "application/octet-stream",
    dataType : "arraybuffer",
    loader :
    {
      class : PCDLoader,
      loadMethod : 0
    }
  };

  IOManager.formats["stl"] =
  {
    description : "Stereolithography (*.stl)",
    extensions : ["stl"],
    mimeType : "model/stl",
    dataType : "arraybuffer",
    loader :
    {
      class : STLLoader,
      loadMethod : 0
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
    extensions : ["gltf"],
    mimeType : "model/gltf+json",
    dataType : "arraybuffer",
    loader :
    {
      class : GLTFLoader,
      loadMethod : 3
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
    extensions : ["glb"],
    mimeType : "model/gltf-binary",
    dataType : "arraybuffer",
    loader :
    {
      class : GLTFLoader,
      loadMethod : 3
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
  const placeTool = new PlaceTool(application);
  const extrudeTool = new ExtrudeTool(application);
  const revolveTool = new RevolveTool(application);
  const unionTool = new BooleanOperationTool(application,
    { name : "union", label : "tool.union.label",
      operation : BooleanOperator.UNION });
  const intersectionTool = new BooleanOperationTool(application,
    { name : "intersection", label : "tool.intersection.label",
      operation : BooleanOperator.INTERSECT });
  const subtractionTool = new BooleanOperationTool(application,
    { name : "subtraction", label : "tool.subtraction.label",
      operation : BooleanOperator.SUBTRACT });
  const decomposeTool = new DecomposeTool(application);
  const meshToSolidTool = new MeshToSolidTool(application);
  const solidToMeshTool = new SolidToMeshTool(application);
  const mergeGeometriesTool = new MergeGeometriesTool(application);
  const offsetGeometriesTool = new OffsetGeometriesTool(application);
  const drawTool = new DrawTool(application);
  const reportTool = new ReportTool(application);
  const histogramTool = new HistogramTool(application);
  const searchTool = new SearchTool(application);
  const measureLengthTool = new MeasureLengthTool(application);
  const measureAreaTool = new MeasureAreaTool(application);
  const measureAngleTool = new MeasureAngleTool(application);
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
  const addConeTool = new AddObjectTool(application,
    { name : "add_cone", label : "tool.add_cone.label",
      objectType : "Cone" });
  const addSphereTool = new AddObjectTool(application,
    { name : "add_sphere", label : "tool.add_sphere.label",
      objectType : "Sphere" });
  const addTorusTool = new AddObjectTool(application,
    { name : "add_torus", label : "tool.add_torus.label",
      objectType : "Torus" });
  const addSpringTool = new AddObjectTool(application,
    { name : "add_spring", label : "tool.add_spring.label",
      objectType : "Spring" });
  const addRectangleTool = new AddObjectTool(application,
    { name : "add_rectangle", label : "tool.add_rectangle.label",
      objectType : "Profile", builderClass : RectangleBuilder });
  const addCircleTool = new AddObjectTool(application,
    { name : "add_circle", label : "tool.add_circle.label",
      objectType : "Profile", builderClass : CircleBuilder });
  const addEllipseTool = new AddObjectTool(application,
    { name : "add_ellipse", label : "tool.add_ellipse.label",
      objectType : "Profile", builderClass : EllipseBuilder });
  const addTrapeziumTool = new AddObjectTool(application,
    { name : "add_trapezium", label : "tool.add_trapezium.label",
      objectType : "Profile", builderClass : TrapeziumBuilder });
  const addIProfileTool = new AddObjectTool(application,
    { name : "add_iprofile", label : "tool.add_iprofile.label",
      objectType : "Profile", builderClass : IProfileBuilder });
  const addLProfileTool = new AddObjectTool(application,
    { name : "add_lprofile", label : "tool.add_lprofile.label",
      objectType : "Profile", builderClass : LProfileBuilder });
  const addTProfileTool = new AddObjectTool(application,
    { name : "add_tprofile", label : "tool.add_tprofile.label",
      objectType : "Profile", builderClass : TProfileBuilder });
  const addUProfileTool = new AddObjectTool(application,
    { name : "add_uprofile", label : "tool.add_uprofile.label",
      objectType : "Profile", builderClass : UProfileBuilder });
  const addZProfileTool = new AddObjectTool(application,
    { name : "add_zprofile", label : "tool.add_zprofile.label",
      objectType : "Profile", builderClass : ZProfileBuilder });
  const addHelicoidTool = new AddObjectTool(application,
    { name : "add_helicoid", label : "tool.add_helicoid.label",
      objectType : "Cord", builderClass : HelicoidBuilder });
  const addObject3DTool = new AddObjectTool(application,
    { name : "add_object3D", label : "tool.add_object3D.label",
      objectType : "Object3D" });
  const addGroupTool = new AddObjectTool(application,
    { name : "add_group", label : "tool.add_group.label",
      objectType : "Group" });
  const addText2DTool = new AddObjectTool(application,
    { name : "add_text2D", label : "tool.add_text2D.label",
      objectType : "Text2D" });
  const addSpriteTool = new AddObjectTool(application,
    { name : "add_sprite", label : "tool.add_sprite.label",
      objectType : "Sprite" });
  const addPerspectiveCameraTool = new AddObjectTool(application,
    { name : "add_perspective_camera", label : "tool.add_perspective_camera.label",
      objectType : "PerspectiveCamera" });
  const addOrthographicCameraTool = new AddObjectTool(application,
    { name : "add_orthographic_camera", label : "tool.add_orthographic_camera.label",
      objectType : "OrthographicCamera" });
  const addAmbientLightTool = new AddObjectTool(application,
    { name : "add_ambient_light", label : "tool.add_ambient_light.label",
      objectType : "AmbientLight" });
  const addHemisphereLightTool = new AddObjectTool(application,
    { name : "add_hemisphere_light", label : "tool.add_hemisphere_light.label",
      objectType : "HemisphereLight" });
  const addDirectionalLightTool = new AddObjectTool(application,
    { name : "add_directional_light", label : "tool.add_directional_light.label",
      objectType : "DirectionalLight" });
  const addPointLightTool = new AddObjectTool(application,
    { name : "add_point_light", label : "tool.add_point_light.label",
      objectType : "PointLight" });
  const addSpotLightTool = new AddObjectTool(application,
    { name : "add_spot_light", label : "tool.add_spot_light.label",
      objectType : "SpotLight" });

  const removeTool = new RemoveTool(application, { keyShortcut : "Delete" });
  const clonerTool = new CloneTool(application,
    { name : "cloner", label : "tool.cloner.label", dynamic : true });
  const copyTool = new CopyTool(application, { keyShortcut : "Control+C" });
  const cutTool = new CutTool(application, { keyShortcut : "Control+X" });
  const pasteTool = new PasteTool(application, { keyShortcut : "Control+V" });
  const linkTool = new LinkTool(application);

  const zoomAllTool = new ZoomAllTool(application, { keyShortcut : "Shift+Z" });
  const fullscreenTool = new FullscreenTool(application);
  const centerSelectionTool = new CenterSelectionTool(application);
  const focusSelectionTool = new CenterSelectionTool(application,
    { name : "focus_selection", label : "tool.focus_selection.label",
      focusOnSelection : true, className : "focus_selection" });

  const reduceCoordinatesTool = new ReduceCoordinatesTool(application);

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
  const chatGPTTool = new ChatGPTTool(application);
  const solarSimulatorTool = new SolarSimulatorTool(application);

  const outlinerTool = new OutlinerTool(application);
  const inspectorTool = new InspectorTool(application);
  const statisticsTool = new StatisticsTool(application);
  const startControllersTool = new StartControllersTool(application);
  const stopControllersTool = new StopControllersTool(application);
  const aboutTool = new AboutTool(application);
  const githubTool = new OpenLinkTool(application,
  { name : "github", label: "GitHub", url: "https://github.com/bimrocket/bimrocket",
    target : "_blank"});

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
  editMenu.addMenuItem(copyTool);
  editMenu.addMenuItem(cutTool);
  editMenu.addMenuItem(pasteTool);
  editMenu.addMenuItem(removeTool);
  editMenu.addMenuItem(linkTool);
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
  addSolidMenu.addMenuItem(addConeTool);
  addSolidMenu.addMenuItem(addSphereTool);
  addSolidMenu.addMenuItem(addTorusTool);
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
  const addCameraMenu = addMenu.addMenu("menu.design.add_camera");
  addCameraMenu.addMenuItem(addPerspectiveCameraTool);
  addCameraMenu.addMenuItem(addOrthographicCameraTool);
  const addLightMenu = addMenu.addMenu("menu.design.add_light");
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
  const transformMenu = designMenu.addMenu("menu.design.transform");
  transformMenu.addMenuItem(moveTool);
  transformMenu.addMenuItem(rotateTool);
  transformMenu.addMenuItem(scaleTool);
  transformMenu.addMenuItem(placeTool);
  const booleanOperationMenu = designMenu.addMenu("menu.design.boolean_operation");
  booleanOperationMenu.addMenuItem(unionTool);
  booleanOperationMenu.addMenuItem(intersectionTool);
  booleanOperationMenu.addMenuItem(subtractionTool);
  designMenu.addMenuItem(drawTool);
  designMenu.addMenuItem(extrudeTool);
  designMenu.addMenuItem(revolveTool);
  designMenu.addMenuItem(decomposeTool);
  const geometryMenu = designMenu.addMenu("menu.design.geometry");
  geometryMenu.addMenuItem(inspectGeometryTool);
  geometryMenu.addMenuItem(meshToSolidTool);
  geometryMenu.addMenuItem(solidToMeshTool);
  geometryMenu.addMenuItem(mergeGeometriesTool);
  geometryMenu.addMenuItem(offsetGeometriesTool);
  geometryMenu.addMenuItem(resetMatrixTool);
  geometryMenu.addMenuItem(smoothEdgesTool);
  geometryMenu.addMenuItem(reduceCoordinatesTool);
  designMenu.addMenuItem(paintTool);
  designMenu.addMenuItem(rebuildTool);
  designMenu.addMenuItem(scriptTool);

  const analysisMenu = menuBar.addMenu("menu.analysis");

  const measureMenu = analysisMenu.addMenu("menu.measure");
  measureMenu.addMenuItem(measureLengthTool);
  measureMenu.addMenuItem(measureAreaTool);
  measureMenu.addMenuItem(measureAngleTool);
  measureMenu.addMenuItem(measureSelectionTool);

  analysisMenu.addMenuItem(reportTool);
  analysisMenu.addMenuItem(histogramTool);
  analysisMenu.addMenuItem(searchTool);
  analysisMenu.addMenuItem(solarSimulatorTool);

  const controlMenu = menuBar.addMenu("menu.control");
  controlMenu.addMenuItem(startControllersTool);
  controlMenu.addMenuItem(stopControllersTool);

  const panelsMenu = menuBar.addMenu("menu.panels");
  panelsMenu.addMenuItem(outlinerTool);
  panelsMenu.addMenuItem(inspectorTool);
  panelsMenu.addMenuItem(statisticsTool);
  panelsMenu.addMenuItem(chatGPTTool);

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
  toolBar.addToolButton(reportTool);
  toolBar.addToolButton(measureLengthTool);
  toolBar.addToolButton(drawTool);
  toolBar.addToolButton(paintTool);
  toolBar.addToolButton(moveTool);
  toolBar.addToolButton(rotateTool);
  toolBar.addToolButton(scaleTool);
  toolBar.addToolButton(placeTool);
  toolBar.addToolButton(rebuildTool);
  toolBar.addToolButton(selectByQRCodeTool);
  toolBar.addToolButton(chatGPTTool);

  // restore services
  application.restoreServices("model");
  application.restoreServices("script");
  application.restoreServices("report");

  // create default services
  if (application.services.model === undefined)
  {
    const webdav = new WebdavService({
      name: "models",
      description : "Remote",
      url : (Environment.SERVER_URL || "/bimrocket-server") + "/api/cloudfs/models",
      credentialsAlias : Environment.SERVER_ALIAS || "bimrocket"
    });
    application.addService(webdav, "model", false);

    const idbfs = new IDBFileService({
      name: "idb_models",
      description : "Local",
      url : "idb_models"
    });
    application.addService(idbfs, "model", false);
  }

  if (application.services.script === undefined)
  {
    const webdav = new WebdavService({
      name : "scripts",
      description : "Remote",
      url : (Environment.SERVER_URL || "/bimrocket-server") + "/api/cloudfs/scripts",
      credentialsAlias : Environment.SERVER_ALIAS || "bimrocket"
    });
    application.addService(webdav, "script", false);

    const idbfs = new IDBFileService({
      name : "idb_scripts",
      description : "Local",
      url : "idb_scripts"
    });
    application.addService(idbfs, "script", false);
  }

  if (application.services.report === undefined)
  {
    const webdav = new WebdavService({
      name : "reports",
      description : "Remote",
      url : (Environment.SERVER_URL || "/bimrocket-server") + "/api/cloudfs/reports",
      credentialsAlias : Environment.SERVER_ALIAS || "bimrocket"
    });
    application.addService(webdav, "report", false);

    const idbfs = new IDBFileService({
      name : "idb_reports",
      description : "Local",
      url : "idb_reports"
    });
    application.addService(idbfs, "report", false);
  }

  // register bundles and locales
  BundleManager.setBundle("base", "i18n/base");
  application.i18n.defaultBundle = BundleManager.getBundle("base");
  application.i18n.addSupportedLanguages("en", "es", "ca");
  application.i18n.updateTree(application.element);

  // select baseObject
  application.selection.set(application.baseObject);

  // globals
  const GLOBALS =
  {
    THREE,
    ObjectUtils,
    GeometryUtils,
    ModuleLoader,
    Solid,
    SolidGeometry,
    Cord,
    CordGeometry,
    Profile,
    ProfileGeometry,
    Text2D,
    Dialog,
    MessageDialog,
    ConfirmDialog,
    Controls,
    Toast,
    Tree,
    TabbedPane,
    ObjectBuilder,
    Controller,
    Formula
  };

  for (let name in GLOBALS)
  {
    window[name] = GLOBALS[name];
  }
}