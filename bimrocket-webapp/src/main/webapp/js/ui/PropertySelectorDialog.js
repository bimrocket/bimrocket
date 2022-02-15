/*
 * PropertySelectorDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Controls } from "./Controls.js";
import { Tree } from "./Tree.js";
import { I18N } from "../i18n/I18N.js";

class PropertySelectorDialog extends Dialog
{
  constructor(application, options = {})
  {
    super(options.title || "title.property_selector");
    this.application = application;
    this.setI18N(this.application.i18n);

    this.setSize(700, 600);
    
    this.treeLabel = document.createElement("div");
    this.treeLabel.innerHTML = options.treeLabel || "Selection properties:";
    this.bodyElem.appendChild(this.treeLabel);

    this.treeScrollElem = document.createElement("div");
    this.treeScrollElem.className = "property_selector_scroll";
    this.bodyElem.appendChild(this.treeScrollElem);

    this.propertyTree = new Tree(this.treeScrollElem);
    this.propertyTree.rootsElem.classList.add("property_selector_tree");
    
    this.toolBarElem = document.createElement("div");
    this.toolBarElem.className = "property_selector_toolbar";
    this.bodyElem.appendChild(this.toolBarElem);

    this.editor = Controls.addTextAreaField(this.bodyElem, 
      "property_input_area", options.editorLabel || "Expression:", 
      options.editorValue || "", "property_expression");
    this.editor.setAttribute("spellcheck", "false");

    this.selectValues = options.selectValues === true;

    this.selectedNode = null;

    this.addButton("accept", "button.accept", () =>
    {
      this.onAccept();
    });

    this.addButton("cancel", "button.cancel", () =>
    {
      this.onCancel();
    });
  }

  onShow()
  {
    this.propertyMap = this.findProperties();
    this.propertyTree.clear();
    this.updateTree(this.propertyMap, this.propertyTree);
  }

  onAccept()
  {
    this.hide();
  }

  onCancel()
  {
    this.hide();
  }
  
  addContextButton(name, label, action)
  {
    const buttonElem = Controls.addButton(this.toolBarElem,
      name, label, action);
  }
  
  getSelectedNodePath()
  {
    let path = [];
    let node = this.selectedNode;
    while (node !== null)
    {
      path.push(node.value);
      node = node.parent;
    }
    return path.reverse();
  }
  
  updateTree(value, node)
  {
    if (value instanceof Map)
    {
      for (let key of value.keys())
      {
        let subNode = node.addNode(key, 
          event => this.selectNode(subNode), "property_set");
        let subValue = value.get(key);
        this.updateTree(subValue, subNode);      
      }
    }
    else if (value instanceof Set)
    {
      for (let subValue of value.values())
      {
        let type = typeof subValue;
        if (this.selectValues)
        {
          let valueNode = node.addNode(subValue, 
            event => this.selectNode(valueNode), type);
        }
        else
        {
          node.addNode(subValue, () => {}, type);          
        }          
      }
    }
  }

  findProperties()
  {
    const application = this.application;

    const roots = application.selection.roots;

    const propertyMap = new Map();

    for (let root of roots)
    {
      root.traverse(object =>
      {
        this.addProperties(object.userData, propertyMap);
      });
    }
    return propertyMap;
  }

  addProperties(data, propertyMap)
  {
    for (let key in data)
    {
      let value = data[key];
      let type = typeof value;

      if (type === "string" || type === "number" || type === "boolean")
      {
        let valueSet = propertyMap.get(key);
        if (valueSet === undefined || !(valueSet instanceof Set))
        {
          valueSet = new Set();
          propertyMap.set(key, valueSet);
        }
        valueSet.add(value);
      }
      else if (type === "object")
      {
        let subPropertyMap = propertyMap.get(key);
        if (subPropertyMap === undefined || !(subPropertyMap instanceof Map))
        {
          subPropertyMap = new Map();
          propertyMap.set(key, subPropertyMap);
        }
        this.addProperties(value, subPropertyMap);
      }
    }
  }
  
  selectNode(node)
  {
    console.info(node);

    if (this.selectedNode)
    {
      this.selectedNode.removeClass("selected");
    }
    
    this.selectedNode = node;
    node.addClass("selected");
  }
}

export { PropertySelectorDialog };


