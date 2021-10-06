/*
 * PushPullTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";

class PushPullTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "pushpull";
    this.label = "tool.push.label";
    this.help = "tool.push.help";
    this.className = "pushpull";
    this.setOptions(options);

    this._onPointerUp = this.onPointerUp.bind(this);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");

    const helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(helpElem);

    this.posElem = document.createElement("div");
    this.posElem.style.textAlign = "left";
    this.posElem.style.padding = "50px";

    this.panel.bodyElem.appendChild(this.posElem);
    I18N.set(this.panel.bodyElem, "innerHTML", this.help);
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