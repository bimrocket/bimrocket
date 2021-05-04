/*
 * CreateControllerTool.js
 *
 * @autor: realor
 */

BIMROCKET.CreateControllerTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "create_controller";
    this.label = "tool.create_controller.label";
    this.className = "create_controller";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    let application = this.application;
    let object = application.selection.object;

    let dialog = new BIMROCKET.Dialog("Create controller", 500, 400);
    let bodyElem = dialog.bodyElem;
    let listElem = document.createElement("ul");
    listElem.className = "controller_list";
    bodyElem.appendChild(listElem);
    for (let i = 0; i < BIMROCKET.controllers.length; i++)
    {
      let controller = BIMROCKET.controllers[i];
      let id = "controller_" + i;
      let itemElem = document.createElement("li");
      listElem.appendChild(itemElem);

      let labelElem = document.createElement("label");
      labelElem.htmlFor = id;
      itemElem.appendChild(labelElem);      

      let inputElem = document.createElement("input");
      inputElem.type = "radio";
      inputElem.name = "controllerClass";
      inputElem.value = "" + i;
      inputElem.id = id;
      if (i === 0) inputElem.checked = true;
      labelElem.appendChild(inputElem);

      let nameSpanElem = document.createElement("span");
      nameSpanElem.className = "type";
      nameSpanElem.innerHTML = controller.type + ":";
      labelElem.appendChild(nameSpanElem);

      let descSpanElem = document.createElement("span");
      descSpanElem.innerHTML = controller.description;
      labelElem.appendChild(descSpanElem);
    }

    dialog.addButton("accept", "Accept", function()
    {
      let value = 
        document.querySelector('input[name="controllerClass"]:checked').value;
      let index = parseInt(value);
      dialog.hide();
      application.createController(BIMROCKET.controllers[index], object, 
        "C" + index, true);
    });

    dialog.addButton("cancel", "Cancel", function()
    {
      dialog.hide();
    });

    dialog.show();
  }
};
