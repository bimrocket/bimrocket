/**
 * base module
 *
 * @author realor
 */

import { AboutTool } from "./tools/AboutTool.js";
import { ActivateCameraTool } from "./tools/ActivateCameraTool.js";
import { AutoOrbitTool } from "./tools/AutoOrbitTool.js";
import { CameraProjectionTool } from "./tools/CameraProjectionTool.js";
import { CameraTool } from "./tools/CameraTool.js";
import { CenterSelectionTool } from "./tools/CenterSelectionTool.js";
import { ChatGPTTool } from "./tools/ChatGPTTool.js";
import { CopyTool } from "./tools/CopyTool.js";
import { CutTool } from "./tools/CutTool.js";
import { ExportSelectionTool } from "./tools/ExportSelectionTool.js";
import { FileExplorerTool } from "./tools/FileExplorerTool.js";
import { FlyTool } from "./tools/FlyTool.js";
import { FullscreenTool } from "./tools/FullscreenTool.js";
import { InspectorTool } from "./tools/InspectorTool.js";
import { LinkTool } from "./tools/LinkTool.js";
import { NewSceneTool } from "./tools/NewSceneTool.js";
import { OpenURLTool } from "./tools/OpenURLTool.js";
import { OpenLocalTool } from "./tools/OpenLocalTool.js";
import { OrbitTool } from "./tools/OrbitTool.js";
import { OutlinerTool } from "./tools/OutlinerTool.js";
import { PasteTool } from "./tools/PasteTool.js";
import { PrintTool } from "./tools/PrintTool.js";
import { RemoveTool } from "./tools/RemoveTool.js";
import { SVGExporterTool } from "./tools/SVGExporterTool.js";
import { SaveLocalTool } from "./tools/SaveLocalTool.js";
import { ScriptTool } from "./tools/ScriptTool.js";
import { SectionTool } from "./tools/SectionTool.js";
import { SelectByBoxTool } from "./tools/SelectByBoxTool.js";
import { SelectByNameTool } from "./tools/SelectByNameTool.js";
import { SelectByPropertyTool } from "./tools/SelectByPropertyTool.js";
import { SelectByQRCodeTool } from "./tools/SelectByQRCodeTool.js";
import { SelectFacesTool } from "./tools/SelectFacesTool.js";
import { SelectParentTool } from "./tools/SelectParentTool.js";
import { SelectTool } from "./tools/SelectTool.js";
import { SetupTool } from "./tools/SetupTool.js";
import { StatisticsTool } from "./tools/StatisticsTool.js";
import { StyleTool } from "./tools/StyleTool.js";
import { ViewTool } from "./tools/ViewTool.js";
import { VisibilityTool } from "./tools/VisibilityTool.js";
import { ZoomAllTool } from "./tools/ZoomAllTool.js";

import { BRFExporter } from "platform/io/brf/BRFExporter.js";
import { BRFLoader } from "platform/io/brf/BRFLoader.js";
import { ColladaExporter } from "platform/io/dae/ColladaExporter.js";
import { ColladaLoader } from "platform/io/dae/ColladaLoader.js";
import { GLTFExporter } from "platform/io/gltf/GLTFExporter.js";
import { GLTFLoader } from "platform/io/gltf/GLTFLoader.js";
import { OBJExporter } from "platform/io/obj/OBJExporter.js";
import { OBJLoader } from "platform/io/obj/OBJLoader.js";
import { PCDLoader } from "platform/io/pcd/PCDLoader.js";
import { STLExporter } from "platform/io/stl/STLExporter.js";
import { STLLoader } from "platform/io/stl/STLLoader.js";
import { IDBFileService } from "platform/io/IDBFileService.js";
import { WebdavService } from "platform/io/WebdavService.js";
import { IOManager } from "platform/io/IOManager.js";

import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { GeometryUtils } from "platform/utils/GeometryUtils.js";

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
import { Controls } from "platform/ui/Controls.js";
import { Environment } from "environment";

import * as THREE from "three";

export function activate(application)
{
  BundleManager.setBundle("base", "./i18n/base", import.meta);
  IconManager.setSprite("base", "./assets/icons/misc.svg", import.meta);
  CSSManager.setCSS("base", "./assets/css/base.css", import.meta);

  // register formats
  IOManager.formats["brf"] =
  {
    description : "BIMROCKET (*.brf)",
    extensions : ["brf"],
    mimeType : "application/json",
    dataType : "text",
    icon : "brf",
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
    icon : "model3d",
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
    icon : "model3d",
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
    icon : "model3d",
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
    icon : "model3d",
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
    icon : "model3d",
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

  IOManager.formats["js"] =
  {
    description : "Javascript file (*.js)",
    extensions : ["js"],
    mimeType : "text/javascript",
    dataType : "text",
    icon : "script"
  };

  IOManager.formats["jpg"] =
  {
    description : "Joint Photographic Experts Group (*.jpg, *.jpeg)",
    extensions : ["jpg", "jpeg"],
    mimeType : "image/jpeg",
    dataType : "arraybuffer",
    icon : "image"
  };

  IOManager.formats["png"] =
  {
    description : "Portable Network Graphics (*.png)",
    extensions : ["png"],
    mimeType : "image/png",
    dataType : "arraybuffer",
    icon : "image"
  };

  IOManager.formats["svg"] =
  {
    description : "Scalable Vector Graphics (*.svg)",
    extensions : ["svg"],
    mimeType : "image/svg+xml",
    dataType : "text",
    icon : "image"
  };

  IOManager.formats["pdf"] =
  {
    description : "Portable Document Format (*.pdf)",
    extensions : ["pdf"],
    mimeType : "application/pdf",
    dataType : "arraybuffer",
    icon : "pdf"
  };

  IOManager.formats["json"] =
  {
    description : "JavaScript Object Notation (*.json)",
    extensions : ["json"],
    mimeType : "application/json",
    dataType : "text"
  };

  IOManager.formats["xml"] =
  {
    description : "XML (*.xml)",
    extensions : ["xml"],
    mimeType : "application/xml",
    dataType : "text"
  };

  IOManager.formats["yaml"] =
  {
    description : "YAML (*.yaml, *.yml)",
    extensions : ["yaml", "yml"],
    mimeType : "text/x-yaml",
    dataType : "text"
  };

  IOManager.formats["html"] =
  {
    description : "HTML Document (*.html, *.htm)",
    extensions : ["html", "htm"],
    mimeType : "text/html",
    dataType : "text"
  };

  IOManager.formats["markdown"] =
  {
    description : "Markdown (*.md)",
    extensions : ["md"],
    mimeType : "text/markdown",
    dataType : "text"
  };

  IOManager.formats["css"] =
  {
    description : "Cascade Style Sheet (*.css)",
    extensions : ["css"],
    mimeType : "text/css",
    dataType : "text"
  };

  // create tools
  const newSceneTool = new NewSceneTool(application);
  const fileExplorerTool = new FileExplorerTool(application);
  const openLocalTool = new OpenLocalTool(application);
  const saveLocalTool = new SaveLocalTool(application);
  const setupTool = new SetupTool(application);
  const printTool = new PrintTool(application);
  const svgExporterTool = new SVGExporterTool(application);

  const selectTool = new SelectTool(application);
  const selectFacesTool = new SelectFacesTool(application);
  const selectParentTool = new SelectParentTool(application);
  const selectByBoxTool = new SelectByBoxTool(application);
  const selectByPropertyTool = new SelectByPropertyTool(application);
  const selectByQRCodeTool = new SelectByQRCodeTool(application);
  const selectReprTool = new SelectByNameTool(application,
  { name : "IfcRepresentation", label: "IfcRepresentation",
    propertyName : "IfcRepresentation" });
  const exportSelectionTool = new ExportSelectionTool(application);

  const orbitTool = new OrbitTool(application);
  const flyTool = new FlyTool(application);
  const topViewTool = new ViewTool(application,
    { name : "top", label : "base|tool.view.top", x : 0, y : 0, z : 0,
      keyShortcut : "Shift+T"
    });
  const frontViewTool = new ViewTool(application,
    { name : "front", label : "base|tool.view.front", x : 90, y : 0, z : 0,
      keyShortcut : "Shift+F"
    });
  const backViewTool = new ViewTool(application,
    { name : "back", label : "base|tool.view.back", x : -90, y : 0, z : 180,
      keyShortcut : "Shift+B"
    });
  const leftViewTool = new ViewTool(application,
    { name : "left", label : "base|tool.view.left", x : 90, y : 90, z : 0,
      keyShortcut : "Shift+L"
    });
  const rightViewTool = new ViewTool(application,
    { name : "right", label : "base|tool.view.right", x : -90, y : -90, z : 180,
      keyShortcut : "Shift+R"
    });
  const autoOrbitTool = new AutoOrbitTool(application);
  const sectionTool = new SectionTool(application);
  const scriptTool = new ScriptTool(application);

  const activateCameraTool = new ActivateCameraTool(application);
  const perspectiveTool = new CameraProjectionTool(application,
    { name : "perspective", label : "base|tool.perspective.label",
      type : "perspective", keyShortcut : "Shift+P" });
  const orthographicTool = new CameraProjectionTool(application,
    { name : "orthographic", label : "base|tool.orthographic.label",
      type : "orthographic", keyShortcut : "Shift+O" });

  const removeTool = new RemoveTool(application, { keyShortcut : "Delete" });
  const copyTool = new CopyTool(application, { keyShortcut : "Control+C" });
  const cutTool = new CutTool(application, { keyShortcut : "Control+X" });
  const pasteTool = new PasteTool(application, { keyShortcut : "Control+V" });
  const linkTool = new LinkTool(application);

  const zoomAllTool = new ZoomAllTool(application, { keyShortcut : "Shift+Z" });
  const fullscreenTool = new FullscreenTool(application);
  const centerSelectionTool = new CenterSelectionTool(application);
  const focusSelectionTool = new CenterSelectionTool(application,
    { name : "focus_selection", label : "base|tool.focus_selection.label",
      focusOnSelection : true, iconName : "base|focus-selection" });

  const showTool = new VisibilityTool(application,
    { name : "show", label : "base|tool.show.label", iconName : "show",
      visible : true });
  const hideTool = new VisibilityTool(application,
    { name : "hide", label : "base|tool.hide.label", iconName : "hide",
      visible : false });
  const facesStyleTool = new StyleTool(application,
    { name : "faces_style", label : "base|tool.faces_style.label",
      edgesVisible : false, facesVisible : true });
  const edgesStyleTool = new StyleTool(application,
    { name : "edges_style", label : "base|tool.edges_style.label",
      edgesVisible : true, facesVisible : false });
  const facesEdgesStyleTool = new StyleTool(application,
    { name : "faces_edges_style", label : "base|tool.faces_edges_style.label",
     edgesVisible : true, facesVisible : true });
  const hiddenStyleTool = new StyleTool(application,
    { name : "hidden_style", label : "base|tool.hidden_style.label",
      edgesVisible : false, facesVisible : false });
  const chatGPTTool = new ChatGPTTool(application);

  const outlinerTool = new OutlinerTool(application);
  const inspectorTool = new InspectorTool(application);
  const statisticsTool = new StatisticsTool(application);

  const aboutTool = new AboutTool(application);
  const websiteTool = new OpenURLTool(application,
  { name : "website", label: "base|tool.website.label", url: "https://bimrocket.github.io",
    target : "_blank", iconName : "base|world"});
  const githubTool = new OpenURLTool(application,
  { name : "github", label: "GitHub", url: "https://github.com/bimrocket/bimrocket",
    target : "_blank", iconName : "base|brand-github"});

  // create menus
  const menuBar = application.menuBar;

  const fileMenu = menuBar.addMenu("base|menu.file");
  fileMenu.addMenuItem(newSceneTool);
  fileMenu.addSeparator();
  fileMenu.addMenuItem(fileExplorerTool);
  fileMenu.addMenuItem(openLocalTool);
  fileMenu.addMenuItem(saveLocalTool);
  fileMenu.addSeparator();
  fileMenu.addMenuItem(printTool);
  fileMenu.addMenuItem(svgExporterTool);

  const editMenu = menuBar.addMenu("base|menu.edit");
  editMenu.addMenuItem(copyTool);
  editMenu.addMenuItem(cutTool);
  editMenu.addMenuItem(pasteTool);
  editMenu.addMenuItem(removeTool);
  editMenu.addMenuItem(linkTool);
  editMenu.addSeparator("scripts");
  editMenu.addMenuItem(scriptTool);
  editMenu.addSeparator("setup");
  editMenu.addMenuItem(setupTool);

  const viewMenu = menuBar.addMenu("base|menu.view");
  viewMenu.addMenuItem(orbitTool);
  viewMenu.addMenuItem(flyTool);
  viewMenu.addMenuItem(zoomAllTool);
  viewMenu.addMenuItem(centerSelectionTool);
  viewMenu.addMenuItem(focusSelectionTool);
  const standardViewMenu = viewMenu.addMenu("base|menu.view.standard_view");
  standardViewMenu.addMenuItem(topViewTool);
  standardViewMenu.addMenuItem(frontViewTool);
  standardViewMenu.addMenuItem(backViewTool);
  standardViewMenu.addMenuItem(leftViewTool);
  standardViewMenu.addMenuItem(rightViewTool);
  const projectionMenu = viewMenu.addMenu("base|menu.view.projection");
  projectionMenu.addMenuItem(perspectiveTool);
  projectionMenu.addMenuItem(orthographicTool);
  viewMenu.addSeparator("style");
  const styleMenu = viewMenu.addMenu("base|menu.view.style");
  styleMenu.addMenuItem(edgesStyleTool);
  styleMenu.addMenuItem(facesStyleTool);
  styleMenu.addMenuItem(facesEdgesStyleTool);
  styleMenu.addMenuItem(hiddenStyleTool);
  viewMenu.addMenuItem(showTool);
  viewMenu.addMenuItem(hideTool);
  viewMenu.addSeparator();
  viewMenu.addMenuItem(activateCameraTool);
  viewMenu.addMenuItem(sectionTool);
  viewMenu.addMenuItem(fullscreenTool);

  const selectMenu = menuBar.addMenu("base|menu.select");
  selectMenu.addMenuItem(selectTool);
  selectMenu.addMenuItem(selectByBoxTool);
  selectMenu.addMenuItem(selectByPropertyTool);
  selectMenu.addMenuItem(selectByQRCodeTool);
  const selectContextMenu = selectMenu.addMenu("base|menu.select_context");
  selectContextMenu.addMenuItem(selectParentTool);
  selectContextMenu.addMenuItem(selectReprTool);
  selectMenu.addSeparator();
  selectMenu.addMenuItem(exportSelectionTool);
  selectMenu.addSeparator();
  selectMenu.addMenuItem(selectFacesTool);

  const panelsMenu = menuBar.addMenu("base|menu.panels");
  panelsMenu.addMenuItem(outlinerTool);
  panelsMenu.addMenuItem(inspectorTool);
  panelsMenu.addMenuItem(statisticsTool);
  panelsMenu.addMenuItem(chatGPTTool);

  const helpMenu = menuBar.addMenu("base|menu.help");
  helpMenu.addMenuItem(aboutTool);
  helpMenu.addMenuItem(websiteTool);
  helpMenu.addMenuItem(githubTool);

  // add tools to toolbar
  const toolBar = application.toolBar;

  toolBar.addSeparator("basic");
  toolBar.addToolButton(newSceneTool);
  toolBar.addToolButton(fileExplorerTool);
  toolBar.addToolButton(openLocalTool);
  toolBar.addToolButton(saveLocalTool);
  toolBar.addToolButton(setupTool);
  toolBar.addToolButton(printTool);
  toolBar.addToolButton(selectTool);
  toolBar.addSeparator("view");
  toolBar.addToolButton(orbitTool);
  toolBar.addToolButton(flyTool);
  toolBar.addToolButton(zoomAllTool);
  toolBar.addToolButton(centerSelectionTool);
  toolBar.addToolButton(focusSelectionTool);
  toolBar.addToolButton(showTool);
  toolBar.addToolButton(hideTool);
  toolBar.addToolButton(sectionTool);
  toolBar.addToolButton(scriptTool);
  toolBar.addToolButton(outlinerTool);
  toolBar.addToolButton(inspectorTool);
  toolBar.addToolButton(chatGPTTool);

  const outliner = application.panelManager.getPanel("outliner");
  if (outliner)
  {
    const outlinerMenu = outliner.contextMenu;
    outlinerMenu.addMenuItem(showTool);
    outlinerMenu.addMenuItem(hideTool);
    outlinerMenu.addSeparator();
    outlinerMenu.addMenuItem(centerSelectionTool);
    outlinerMenu.addMenuItem(focusSelectionTool);
    outlinerMenu.addSeparator();
    outlinerMenu.addMenuItem(copyTool);
    outlinerMenu.addMenuItem(cutTool);
    outlinerMenu.addMenuItem(pasteTool);
    outlinerMenu.addSeparator();
    outlinerMenu.addMenuItem(removeTool);
    outlinerMenu.addSeparator();
  }

  // restore services
  application.restoreServices("model");
  application.restoreServices("script");

  // create default services
  if (application.services.model === undefined)
  {
    if (typeof Environment.SERVER_URL === "string")
    {
      const webdav = new WebdavService({
        name: "models",
        description : "Remote",
        url : Environment.SERVER_URL + "/api/cloudfs/models"
      });
      application.addService(webdav, "model", false);
    }

    const idbfs = new IDBFileService({
      name: "idb_models",
      description : "Local",
      url : "idb_models"
    });
    application.addService(idbfs, "model", false);
  }

  if (application.services.script === undefined)
  {
    if (typeof Environment.SERVER_URL === "string")
    {
      const webdav = new WebdavService({
        name : "scripts",
        description : "Remote",
        url : Environment.SERVER_URL + "/api/cloudfs/scripts"
      });
      application.addService(webdav, "script", false);
    }

    const idbfs = new IDBFileService({
      name : "idb_scripts",
      description : "Local",
      url : "idb_scripts"
    });
    application.addService(idbfs, "script", false);
  }

  // select baseObject
  application.selection.set(application.baseObject);

  // init camera tools
  CameraTool.init(application,
  {
    defaultCameraToolName : "orbit",
    activateOnStartUp : false,
    activateOnAltKey : true,
    activateOnClear : true
  });
}
