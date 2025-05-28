/*
 * SelectListController.js
 *
 * @author realor
 */

import { PanelController } from "./PanelController.js";
import { Controller } from "./Controller.js";

class SelectListController extends PanelController
{
  constructor(object, name)
  {
    super(object, name);

    this.input = "";
    this.output = "";
    this.label = "Value";
    this.values = ["0", "OFF", "1", "ON"];
    this.selectClass = "select_list";
    this.height = 150;
    this.controllerToExecute = ""; // name of controller to execute

    this._onValueChange = this.onValueChange.bind(this);
    this._input = null;
  }

  createPanel()
  {
    super.createPanel("left");

    let id = this.object.id + "_" + this.name + "_select";
    let divElem = document.createElement("div");

    let labelElem = document.createElement("label");
    this.labelElem = labelElem;
    this.labelElem.style.display = "block";
    this.labelElem.style.padding = "4px";
    labelElem.textContent = this.label;
    labelElem.htmlFor = id;

    let selectElem = document.createElement("select");
    this.selectElem = selectElem;
    this.selectElem.style.display = "block";
    this.selectElem.style.width = "100%";

    selectElem.id = id;

    divElem.appendChild(labelElem);
    divElem.appendChild(selectElem);    
    this.panel.bodyElem.appendChild(divElem);

    selectElem.addEventListener('change', this._onValueChange, false);

    this.update();
  }

  onValueChange(event)
  {
    this.output = this.selectElem.value;
    this.application.notifyObjectsChanged(this.object, this);
    this.executeController(this.controllerToExecute);
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      this.update();
    }
  }
  
  onStart()
  {
    super.onStart();
    this.updateOptions();
  }

  update()
  {
    this.panel.title = this.title || "";
    this.labelElem.textContent = this.label;
    this.selectElem.className = this.selectClass || "select_list";

    if (this._input !== this.input)
    {
      this.selectElem.value = this.input;
      this.output = this.input;
      this._input = this.input;
      this.application.notifyObjectsChanged(this.object, this);
    }
    else
    {
      let value = this.selectElem.value;
      if (value !== this.output)
      {
        this.output = value;
        this.application.notifyObjectsChanged(this.object, this);
      }
    }
  }
  
  updateOptions()
  {
    const selectElem = this.selectElem;
    selectElem.innerHTML = "";
    for (let i = 0; i < this.values.length; i += 2)
    {
      let optionElem = document.createElement("option");
      optionElem.value = this.values[i];
      optionElem.textContent = this.values[i + 1];
      selectElem.appendChild(optionElem);
    }    
  }
}

Controller.addClass(SelectListController);

export { SelectListController };
