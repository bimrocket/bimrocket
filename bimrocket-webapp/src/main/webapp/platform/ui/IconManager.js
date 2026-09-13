/*
 * IconManager.js
 *
 * @author realor
 */

class IconManager
{
  static _sprites = new Map();

  static setSprite(name, path, importMeta)
  {
    const url = importMeta ? new URL(path, importMeta.url).href : path;

    let sprite = this._sprites.get(name);
    if (sprite)
    {
      sprite.setURL(url);
    }
    else
    {
      sprite = new Sprite(name).setURL(url);
      this._sprites.set(name, sprite);
    }
    return sprite;
  }

  static getSprite(name)
  {
    return this._sprites.get(name);
  }

  static removeSprite(name)
  {
    const sprite = this._sprites.get(name);
    if (sprite)
    {
      sprite.remove();
      this._sprites.delete(name);
    }
  }

  static getSprites()
  {
    return Array.from(this._sprites.values());
  }

  static getIconUrl(iconRef)
  {
    let spriteName;
    let iconName;

    let index = iconRef.indexOf("|");
    if (index === -1)
    {
      spriteName = "platform";
      iconName = iconRef;
    }
    else
    {
      spriteName = iconRef.substring(0, index);
      iconName = iconRef.substring(index + 1);
    }

    const sprite = this._sprites.get(spriteName);
    if (sprite?.hasIcon(iconName))
    {
      return "#icon-" + spriteName + "-" + iconName;
    }
    return null;
  }

  static async updateTree(element = document.body)
  {
    const sprites = this._sprites.values();

    const promises = Array.from(sprites, sprite => sprite.load());

    await Promise.all(promises);

    const svgElems = element.querySelectorAll("svg[data-icon]");
    for (let svgElem of svgElems)
    {
      this.update(svgElem);
    }
  }

  static update(svgElem)
  {
    let iconRef = svgElem.dataset.icon;
    const url = this.getIconUrl(iconRef);
    if (url)
    {
      const SVG_NS = "http://www.w3.org/2000/svg";
      const useElem = document.createElementNS(SVG_NS, "use");
      useElem.setAttribute("href", url);
      svgElem.replaceChildren(useElem);
    }
  }
}

class Sprite
{
  constructor(name)
  {
    this.name = name;
    this._url = null;
    this._loaded = false;
  }

  setURL(url)
  {
    if (url !== this._url)
    {
      this._url = url;
      this._loaded = false;
    }
    return this;
  }

  getURL()
  {
    return this._url;
  }

  hasIcon(iconName)
  {
    const iconId = "icon-" + this.name + "-" + iconName;
    return document.getElementById(iconId) !== null;
  }

  async load()
  {
    const url = this._url;

    if (!url || this._loaded) return;

    this._loaded = true;

    const response = await fetch(url);

    if (!response.ok)
    {
      throw new Error(`Error loading sprite '${url}': ${response.status}`);
    }

    const template = document.createElement('template');
    template.innerHTML = (await response.text()).trim();

    const svg = template.content.querySelector("svg");

    if (!svg)
    {
      throw new Error(`Resource '${url}' is not a svg sprite`);
    }

    svg.querySelectorAll("symbol[id]").forEach(symbol =>
    {
      symbol.id = `icon-${this.name}-${symbol.id}`;
    });

    let spritesElem = document.getElementById("sprites");
    if (!spritesElem)
    {
      spritesElem = document.createElement("div");
      spritesElem.id = "sprites";
      spritesElem.style.display = "none";
      document.body.prepend(spritesElem);
    }

    const spriteId = "sprite-" + this.name;
    document.getElementById(spriteId)?.remove();
    svg.id = spriteId;
    spritesElem.append(svg);
  }

  remove()
  {
    const spriteId = "sprite-" + this.name;

    document.getElementById(spriteId)?.remove();
  }
}

export { IconManager, Sprite };


