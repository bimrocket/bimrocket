/*
 * Tree.js
 *
 * @author realor
 */

class Tree
{
  constructor(element)
  {
    this.rootsElem = document.createElement("ul");
    element.appendChild(this.rootsElem);
    this.rootsElem.className = "tree";
    this.roots = [];
  }

  addNode(object, action, className)
  {
    const treeNode = new TreeNode(this, null, object, action, className);
    this.roots.push(treeNode);
    this.rootsElem.appendChild(treeNode.itemElem);

    return treeNode;
  }

  getNodeLabel(value)
  {
    return value;
  }

  clear()
  {
    this.rootsElem.innerHTML = "";
    this.roots = [];
  }
};

class TreeNode
{
  constructor(tree, parentTreeNode, value, action, className)
  {
    this.tree = tree;
    this.parent = parentTreeNode;
    this._value = value;
    this.children = [];
    this.itemElem = document.createElement("li");
    this.linkElem = document.createElement("a");
    this.linkElem.href = "#";
    this.itemElem.appendChild(this.linkElem);
    this.updateLabel();

    if (action)
    {
      this.linkElem.addEventListener("click", action);
    }
    this.childrenElem = null;
    this.buttonElem = null;
    if (className) this.itemElem.className = className;
  }

  addNode(value, action, className)
  {
    if (this.childrenElem === null)
    {
      this.itemElem.innerHTML = "";
      this.itemElem.classList.add("collapsed");
      this.buttonElem = document.createElement("button");
      this.buttonElem.addEventListener("click", () => this.toggle());
      this.itemElem.appendChild(this.buttonElem);
      this.itemElem.appendChild(this.linkElem);
      this.childrenElem = document.createElement("ul");
      this.itemElem.appendChild(this.childrenElem);
    }
    else
    {
      this.buttonElem.style.display = "";
    }

    const treeNode = new TreeNode(this.tree, this, value, action, className);
    this.childrenElem.appendChild(treeNode.itemElem);
    this.children.push(treeNode);

    return treeNode;
  }

  remove()
  {
    if (this.parent)
    {
      let index = this.parent.children.indexOf(this);
      if (index > -1)
      {
        this.parent.children.splice(index, 1);
        this.parent.childrenElem.removeChild(this.itemElem);

        if (this.parent.children.length === 0)
        {
          this.parent.buttonElem.style.display = "none";
        }
      }
    }
    else // remove from tree.roots
    {
      let index = this.tree.roots.indexOf(this);
      if (index > -1)
      {
        this.tree.roots.splice(index, 1);
        this.tree.rootsElem.removeChild(this.itemElem);
      }
    }
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
    this.linkElem.innerHTML = this.tree.getNodeLabel(this._value);
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
    if (this.isExpanded())
    {
      this.collapse();
    }
    else
    {
      this.expand();
    }
  }

  expand(levels = 1)
  {
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
      this.linkElem.scrollIntoView({block: "center", inline: "nearest"});
    }
  }

  clear()
  {
    if (this.childrenElem)
    {
      this.childrenElem.innerHTML = "";
      this.buttonElem.style.display = "none";
    }
    this.children = [];
  }
}

export { Tree };

