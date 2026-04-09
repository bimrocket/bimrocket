/*
 * ModelValidationTool.js
 *
 * Tool to open the Visual Model Validation panel.
 *
 * @author UPC
 */

import { Tool } from "./Tool.js";
import { ModelValidationPanel } from "../ui/ModelValidationPanel.js";

class ModelValidationTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "model_validation";
    this.label = "bim|tool.model_validation.label";
    this.help  = "bim|tool.model_validation.help";
    this.className = "model_validation";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new ModelValidationPanel(application);
    application.panelManager.addPanel(this.panel);

    this.panel.onClose = () =>
    {
      this.panel.visible = false;
    };
  }

  execute()
  {
    if (this.panel.visible)
    {
      this.panel.visible = false;
    }
    else
    {
      this.panel.visible = true;
      this.panel.minimized = false;
    }
  }
}

export { ModelValidationTool };
