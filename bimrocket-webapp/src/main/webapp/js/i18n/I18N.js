/**
 * @author realor
 */

class I18N
{
  static defaultLanguage = null;
  static userLanguage = null;
  static translations = {};

  static init(path, names, languages)
  {
    I18N.defaultLanguage = languages[0];
    I18N.userLanguage = navigator.language.substring(0, 2);
    if (languages.indexOf(I18N.userLanguage) === -1) // not supported
    {
      I18N.userLanguage = I18N.defaultLanguage;
    };
    
    for (let i = 0; i < names.length; i++)
    {
      let name = names[i];
      
      /* load default language translations */
      let linkElem = document.createElement('script');
      linkElem.setAttribute("type", "text/javascript");
      linkElem.setAttribute("src", path + "/" + name + "_" + 
        I18N.defaultLanguage + ".js");
      document.getElementsByTagName("head")[0].appendChild(linkElem);

      /* load user language translations */
      if (I18N.userLanguage !== I18N.defaultLanguage)
      {
        linkElem = document.createElement('script');
        linkElem.setAttribute("type", "text/javascript");
        linkElem.setAttribute("src", path + "/" + name + "_" + 
          I18N.userLanguage + ".js");
        document.getElementsByTagName("head")[0].appendChild(linkElem);
      }
    }
  }

  static get(key)
  {
    let value = I18N.getForLanguage(key, I18N.userLanguage);
    if (value === undefined && I18N.userLanguage !== I18N.defaultLanguage)
    {
      value = I18N.getForLanguage(key, I18N.defaultLanguage);
    }
    return value ? value : key;
  }
  
  static getForLanguage(key, language)
  {
    let langTable = I18N.translations[language];
    if (langTable) return langTable[key];
    return undefined;
  }

  static add(name, language, table)
  {
    let langTable = I18N.translations[language];
    if (langTable === undefined)
    {
      langTable = {};
      I18N.translations[language] = langTable;
    }
    for (let key in table)
    {
      langTable[key] = table[key];
    }
    console.info("I18N: " + name + "_" + language + " bundle loaded.");
  }
}

I18N.init('js/i18n', ['bimrocket'], ['en', 'es', 'ca']);
