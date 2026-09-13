/*
 * CSSManager.js
 *
 * @author realor
 */

class CSSManager
{
  static CSS_PREFIX = "css_";
  static THEME_LINK_ID = "_theme_";

  static _css = new Map();
  static _themes = new Map();
  static _currentTheme = null;

  static setCSS(name, path, importMeta)
  {
    const url = importMeta ? new URL(path, importMeta.url).href : path;

    this._css.set(name, url);
  }

  static getCSS(name)
  {
    return this._css.get(name);
  }

  static removeCSS(name)
  {
    this._css.delete(name);
  }

  static listCSS()
  {
    return Array.from(this._css.keys());
  }

  static setTheme(name, path, importMeta)
  {
    const url = importMeta ? new URL(path, importMeta.url).href : path;

    this._themes.set(name, url);
  }

  static getTheme(name)
  {
    return this._themes.get(name);
  }

  static removeTheme(name)
  {
    this._themes.delete(name);
  }

  static listThemes()
  {
    return Array.from(this._themes.keys());
  }

  static setCurrentTheme(name)
  {
    this._currentTheme = name;
  }

  static getCurrentTheme()
  {
    return this._currentTheme;
  }

  static update()
  {
    const prefix = this.CSS_PREFIX;
    const themeLinkId = this.THEME_LINK_ID;

    const existingLinks = document.querySelectorAll(`link[id^="${prefix}"]`);

    existingLinks.forEach(link =>
    {
      const name = link.id.replace(prefix, "");

      if (!this._css.has(name))
      {
        link.remove();
      }
    });

    const themeLink = document.getElementById(themeLinkId);
    if (themeLink)
    {
      themeLink.remove();
    }

    const updateLink = (name, link, url) =>
    {
      return new Promise((resolve) =>
      {
        link.onload = () =>
        {
          console.info(`CSS ${name} updated.`);
          resolve({ name, status: "updated" });
        };

        link.onerror = () =>
        {
          console.error(`CSS ${name} not updated.`);
          resolve({ name, status: "error_update" });
        };

        link.setAttribute("href", url);
      });
    };

    const createLink = (name, linkId, url) =>
    {
      return new Promise((resolve) =>
      {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";

        link.onload = () =>
        {
          console.info(`CSS ${name} loaded.`);
          resolve({ name, status: "loaded" });
        };

        link.onerror = () =>
        {
          console.error(`CSS ${name} not loaded.`);
          resolve({ name, status: "error" });
        };

        link.setAttribute("href", url);
        document.head.appendChild(link);
      });
    };

    const promises = [];

    for (const [name, url] of this._css.entries())
    {
      const linkId = prefix + name;

      let link = document.getElementById(linkId);

      if (link)
      {
        if (link.getAttribute("href") !== url)
        {
          promises.push(updateLink(name, link, url));
        }
      }
      else
      {
        promises.push(createLink(name, linkId, url));
      }
    }

    if (this._currentTheme)
    {
      const url = this._themes.get(this._currentTheme);
      if (url)
      {
        let name = "theme " + this._currentTheme;
        promises.push(createLink(name, themeLinkId, url));
      }
    }
    return Promise.all(promises);
  }
}

window.CSSManager = CSSManager;

export { CSSManager };

