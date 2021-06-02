/*
 * PushButtonController.js
 *
 * @autor: realor
 */

BIMROCKET.PushButtonController = class extends BIMROCKET.PanelController 
{
  static type = "PushButtonController";
  static description = "Shows a push button.";
  
  constructor(application, object, name)
  {
    super(application, object, name);
  
    this.output = this.createProperty("number", "Output value");
    this.valueUp = this.createProperty("number", "Value up", 0);
    this.valueDown = this.createProperty("number", "Value down", 1);
    this.label = this.createProperty("string", "Label", "PUSH");
    this.buttonClass = this.createProperty("string", "Button class", 
      "rounded_button");

    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseUp = this.onMouseUp.bind(this);
    
    this.createPanel();
  }

  createPanel()
  {
    super.createPanel("left", 150);
    
    let buttonElem = document.createElement("div");
    this.buttonElem = buttonElem;

    buttonElem.addEventListener('mousedown', this._onMouseDown, false);
    buttonElem.addEventListener('mouseup', this._onMouseUp, false);

    this.panel.bodyElem.appendChild(buttonElem);
    
    this.update();
  }
  
  onNodeChanged(event)
  {
    this.panel.visible = this.application.selection.contains(this.object);
    
    if (event.type === "nodeChanged" && event.objects.includes(this.object))
    {
      this.update();
    }
  }

  onMouseDown(event)
  {
    let buttonElem = event.target || event.srcElement;
    this.output.value = this.valueDown.value;
  }

  onMouseUp(event)
  {
    var buttonElem = event.target || event.srcElement;
    this.output.value = this.valueUp.value;
  }
  
  update()
  {
    this.panel.title = this.title.value || "";
    this.buttonElem.innerHTML = this.label.value || 'PUSH';
    this.buttonElem.className = this.buttonClass.value || "rounded_button";
  }
};

BIMROCKET.controllers.push(BIMROCKET.PushButtonController);