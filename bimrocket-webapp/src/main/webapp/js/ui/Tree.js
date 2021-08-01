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

  addNode(label, action, className)
  {
    const treeNode = new TreeNode(null, label, action, className);
    this.roots.push(treeNode);
    this.rootsElem.appendChild(treeNode.itemElem);

    return treeNode;
  }

  clear()
  {
    this.rootsElem.innerHTML = "";
    this.roots = [];
  }
};

class TreeNode
{
  constructor(parentTreeNode, label, action, className)
  {
    this.parentTreeNode = parentTreeNode;
    this.children = [];
    this.itemElem = document.createElement("li");
    if (className) this.itemElem.className = className;
    this.linkElem = document.createElement("a");
    this.linkElem.href = "#";
    this.linkElem.innerHTML = label;
    if (action) this.linkElem.addEventListener("click", action);
    this.itemElem.appendChild(this.linkElem);
    this.childrenElem = null;
    this.buttonElem = null;
  }

  addNode(label, action, className)
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

    const treeNode = new TreeNode(this, label, action, className);
    this.childrenElem.appendChild(treeNode.itemElem);
    this.children.push(treeNode);

    return treeNode;
  }

  set label(label)
  {
    this.linkElem.innerHTML = label;
  }

  get label()
  {
    return this.linkElem.innerHTML;
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

  clear()
  {
    this.childrenElem.innerHTML = "";
    this.children = [];
  }
}

export { Tree };

