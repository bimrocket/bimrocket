/* 
 * PushPullTool.js
 * 
 * @autor: realor
 */

BIMROCKET.PushPullTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "pushpull";
    this.label = "tool.push.label";
    this.help = "tool.push.help";
    this.className = "pushpull";
    this.setOptions(options);

    this._onMouseUp = this.onMouseUp.bind(this);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");
    
    var helpElem = document.createElement("div");
    helpElem.innerHTML = I18N.get(this.help);
    this.panel.bodyElem.appendChild(helpElem);

    this.posElem = document.createElement("div");
    this.posElem.style.textAlign = "left";
    this.posElem.style.padding = "50px";

    this.panel.bodyElem.appendChild(this.posElem);
  }

  activate()
  {
    this.panel.visible = true;

    var application = this.application;
    var container = application.container;
    
    container.addEventListener('mouseup', this._onMouseUp, false);
    application.repaint();
  }
  
  deactivate()
  {
    this.panel.visible = false;
    
    var application = this.application;
    var container = application.container;

    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onMouseUp(event)
  {
  }
};