/*
 * PushPullTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { I18N } from "platform/i18n/I18N.js";

class PushPullTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "push_pull";
    this.label = "design|tool.push_pull.label";
    this.help = "design|tool.push_pull.help";
    this.className = "push-pull";
    this.iconName = "design|push-pull";

    this.setOptions(options);
    application.addTool(this);

    this._onPointerUp = this.onPointerUp.bind(this);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createToolPanel(this)
      .setClassName("panel_histogram")
      .setDefaultHeight(180)
      .setDefaultMobileHeight(160)
      .setMinimumHeight(100);

    this.panel.onClose = () => this.application.useTool(null);

    const helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(helpElem);

    this.posElem = document.createElement("div");
    this.posElem.style.textAlign = "left";
    this.posElem.style.padding = "50px";

    this.panel.bodyElem.appendChild(this.posElem);
    I18N.set(this.panel.bodyElem, "textContent", this.help);
  }

  activate()
  {
    this.panel.visible = true;

    const application = this.application;
    const container = application.container;

    container.addEventListener('pointerup', this._onPointerUp, false);
    application.repaint();
  }

  deactivate()
  {
    this.panel.visible = false;

    const application = this.application;
    const container = application.container;

    container.removeEventListener('pointerup', this._onPointerUp, false);
  }

  onPointerUp(event)
  {
  }
}

export { PushPullTool };