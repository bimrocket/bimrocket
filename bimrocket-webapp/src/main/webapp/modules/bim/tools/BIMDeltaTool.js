/*
 * BIMDeltaTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Tree } from "platform/ui/tree/Tree.js";
import { Panel } from "platform/ui/panel/Panel.js";
import { TabbedPane } from "platform/ui/tabbedpane/TabbedPane.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { ModelSnapshot } from "platform/utils/ModelSnapshot.js";
import { CompareSnapshotAction } from "../ui/file/CompareSnapshotAction.js";
import { SaveSnapshotAction } from "../ui/file/SaveSnapshotAction.js";
import { I18N } from "platform/i18n/I18N.js";

class BIMDeltaTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_delta";
    this.label = "bim|tool.bim_delta.label";
    this.className = "bim-delta";
    this.iconName = "bim|delta";

    this.decimals = 6;
    this.setOptions(options);
    this.immediate = true;

    ModelSnapshot.decimals = this.decimals;

    application.addTool(this);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;
    const panelManager = application.panelManager;
    let fileExplorer = panelManager.getPanel("file_explorer");
    if (!fileExplorer)
    {
      fileExplorer = new FileExplorer(application);
      panelManager.addPanel(fileExplorer);
    }

    const contextMenu = fileExplorer.contextMenu;
    const action = fileExplorer.createContextAction;

    contextMenu.addMenuItem(action(CompareSnapshotAction), "default:top");
    contextMenu.addMenuItem(action(SaveSnapshotAction), "save");

    this.panel = fileExplorer;
  }

  execute()
  {
    const panel = this.panel;
    panel.visible = false;
    panel.title = this.label;
    panel.iconName = "bim|delta";
    panel.tool = this;
    panel.activateGroup("ifc_snapshhots");
    panel.visible = true;
  }
}

export { BIMDeltaTool };