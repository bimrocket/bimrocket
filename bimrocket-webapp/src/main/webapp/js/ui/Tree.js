/*
 * Tree.js
 *
 * @author realor
 */

import { I18N } from "../i18n/I18N.js";

class Tree
{
  constructor(element)
  {
    this.parentElem = element;
    this.rootsElem = document.createElement("ul");
    element.appendChild(this.rootsElem);
    this.rootsElem.className = "tree";
    this.roots = [];
    this.translateLabels = false;
    this.listeners =
    {
      "click" : [],
      "dblclick" : [],
      "contextmenu" : [],
      "expand" : [],
      "collapse" : [],
      "add" : [],
      "remove": []
    };

    for (let type of ["click", "dblclick", "contextmenu"])
    {
      this.rootsElem.addEventListener(type, event =>
      {
        const node = this.getNodeForElement(event.target);
        if (node && this.hasEventListenersFor(type))
        {
          this.notifyEventListeners(type,
          {
            "type" : type,
            "node" : node,
            "originalEvent" : event
          });
        }
      });
    }
  }

  addNode(object, action, className, hasChildren)
  {
    const treeNode = new TreeNode(this, null, object, action, className, hasChildren);
    this.roots.push(treeNode);
    this.rootsElem.appendChild(treeNode.itemElem);

    return treeNode;
  }

  getNodeLabel(value)
  {
    return String(value);
  }

  clear()
  {
    this.rootsElem.innerHTML = "";
    this.roots = [];
  }

  addEventListener(type, listener)
  {
    const listeners = this.listeners;
    let typeListeners = listeners[type];
    if (typeListeners instanceof Array)
    {
      typeListeners.push(listener);
    }
  }

  removeEventListener(type, listener)
  {
    const listeners = this.listeners;
    let typeListeners = listeners[type];
    if (typeListeners instanceof Array)
    {
      let index = typeListeners.indexOf(listener);
      if (index !== 1)
      {
        typeListeners.splice(index, 1);
      }
    }
  }

  hasEventListenersFor(type)
  {
    return this.listeners[type]?.length > 0;
  }

  notifyEventListeners(type, event)
  {
    let typeListeners = this.listeners[type];
    if (typeListeners)
    {
      for (let listener of typeListeners)
      {
        listener(event);
      }
    }
  }

  getNodeForElement(element)
  {
    while (element)
    {
      let nodeName = element.nodeName.toLowerCase();
      if (nodeName === "a")
      {
        return element.parentElement?._treeNode || null;
      }
      else if (nodeName === "li")
      {
        return null;
      }
      element = element.parentElement;
    }
    return null;
  }
}

class TreeNode
{
  constructor(tree, parentTreeNode, value, action, className, hasChildren)
  {
    this.tree = tree;
    this.parent = parentTreeNode;
    this.children = [];
    this._value = value;

    // list item
    this.itemElem = document.createElement("li");
    this.itemElem._treeNode = this;

    // link item
    this.linkElem = document.createElement("a");
    this.linkElem.href = "#";
    this.itemElem.appendChild(this.linkElem);

    // expand button
    this.buttonElem = null;

    // children list
    this.childrenElem = null;

    this.updateLabel();

    if (action)
    {
      this.addEventListener("click", action);
    }
    if (className)
    {
      this.itemElem.className = className;
    }
    if (hasChildren)
    {
      this.addExpandButton();
    }
  }

  hasChildren()
  {
    return this.children.length > 0;
  }

  addNode(value, action = null, className = null, hasChildren  = false)
  {
    this.addExpandButton();
    this.addChildrenList();

    const tree = this.tree;
    const treeNode = new TreeNode(tree, this, value, action,
      className, hasChildren);
    this.childrenElem.appendChild(treeNode.itemElem);
    this.children.push(treeNode);

    if (tree.hasEventListenersFor("add"))
    {
      tree.notifyEventListeners("add", { type : "add", node : this });
    }

    return treeNode;
  }

  remove()
  {
    const tree = this.tree;
    const parent = this.parent;

    if (parent)
    {
      let index = this.parent.children.indexOf(this);
      if (index > -1)
      {
        parent.children.splice(index, 1);
        parent.childrenElem.removeChild(this.itemElem);

        if (parent.children.length === 0)
        {
          parent.removeExpandButton();
          parent.removeChildrenList();
        }
      }
    }
    else // remove from tree.roots
    {
      let index = this.tree.roots.indexOf(this);
      if (index > -1)
      {
        tree.roots.splice(index, 1);
        tree.rootsElem.removeChild(this.itemElem);
      }
    }

    if (tree.hasEventListenersFor("remove"))
    {
      tree.notifyEventListeners("remove",
        { type : "remove", node : this, parent : parent });
    }
  }

  addEventListener(type, listener)
  {
    this.linkElem.addEventListener(type, listener);
  }

  removeEventListener(type, listener)
  {
    this.linkElem.removeEventListener(type, listener);
  }

  set value(value)
  {
    this._value = value;
    this.updateLabel();
  }

  get value()
  {
    return this._value;
  }

  addClass(className)
  {
    this.linkElem.classList.add(className);
  }

  removeClass(className)
  {
    this.linkElem.classList.remove(className);
  }

  updateLabel()
  {
    let label = this.tree.getNodeLabel(this._value);

    if (label instanceof HTMLElement)
    {
      this.linkElem.innerHTML = "";
      this.linkElem.appendChild(label);
    }
    else
    {
      if (typeof label !== "string")
      {
        label = String(label);
      }

      if (this.tree.translateLabels)
      {
        I18N.set(this.linkElem, "textContent", label);
      }
      else
      {
        this.linkElem.textContent = label;
      }
    }
  }

  isExpanded()
  {
    return this.itemElem.classList.contains("expanded");
  }

  isCollapsed()
  {
    return this.itemElem.classList.contains("collapsed");
  }

  toggle()
  {
    const tree = this.tree;
    if (this.isExpanded())
    {
      if (tree.hasEventListenersFor("collapse"))
      {
        tree.notifyEventListeners("collapse", { type : "collapse", node : this });
      }
      this.collapse();
    }
    else
    {
      if (tree.hasEventListenersFor("expand"))
      {
        tree.notifyEventListeners("expand", { type : "expand", node : this });
      }
      this.expand();
    }
  }

  expand(levels = 1)
  {
    const tree = this.tree;
    if (levels > 0)
    {
      this.itemElem.classList.remove("collapsed");
      this.itemElem.classList.add("expanded");
      levels--;
      if (levels > 0)
      {
        for (let i = 0; i < this.children.length; i++)
        {
          this.children[i].expand(levels);
        }
      }
    }
  }

  collapse(levels = 1)
  {
    if (levels > 0)
    {
      this.itemElem.classList.remove("expanded");
      this.itemElem.classList.add("collapsed");
      levels--;
      if (levels > 0)
      {
        for (let i = 0; i < this.children.length; i++)
        {
          this.children[i].collapse(levels);
        }
      }
    }
  }

  expandAncestors(makeVisible = false)
  {
    let curr = this.parent;
    while (curr)
    {
      curr.expand();
      curr = curr.parent;
    }
    if (makeVisible)
    {
      this.linkElem.scrollIntoView({ block: "center", inline: "nearest"});
    }
  }

  clear()
  {
    if (this.childrenElem)
    {
      this.removeExpandButton();
      this.removeChildrenList();
    }
    this.children = [];
  }

  addExpandButton()
  {
    if (this.buttonElem === null)
    {
      this.buttonElem = document.createElement("button");
      this.buttonElem.addEventListener("click", () => this.toggle());
      this.itemElem.insertBefore(this.buttonElem, this.linkElem);
      this.itemElem.classList.add("collapsed");
    }
  }

  removeExpandButton()
  {
    this.itemElem.removeChild(this.buttonElem);
    this.buttonElem = null;
    this.itemElem.classList.remove("collapsed");
    this.itemElem.classList.remove("expanded");
  }

  addChildrenList()
  {
    if (this.childrenElem === null)
    {
      this.childrenElem = document.createElement("ul");
      this.itemElem.appendChild(this.childrenElem);
    }
  }

  removeChildrenList()
  {
    this.itemElem.removeChild(this.childrenElem);
    this.childrenElem = null;
  }
}

export { Tree };

