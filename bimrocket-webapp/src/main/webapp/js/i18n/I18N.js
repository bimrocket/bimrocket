/**
 * @author realor
 */

I18N = {

  defaultLanguage : null,
  userLanguage : null,
  translations : {},

  init : function(path, names, languages)
  {
    this.defaultLanguage = languages[0];
    this.userLanguage = navigator.language.substring(0, 2);
    if (languages.indexOf(this.userLanguage) === -1) // not supported
    {
      this.userLanguage = this.defaultLanguage;
    };
    
    for (var i = 0; i < names.length; i++)
    {
      var name = names[i];
      
      /* load default language translations */
      var linkElem = document.createElement('script');
      linkElem.setAttribute("type", "text/javascript");
      linkElem.setAttribute("src", path + "/" + name + "_" + 
        this.defaultLanguage + ".js");
      document.getElementsByTagName("head")[0].appendChild(linkElem);

      /* load user language translations */
      if (this.userLanguage !== this.defaultLanguage)
      {
        linkElem = document.createElement('script');
        linkElem.setAttribute("type", "text/javascript");
        linkElem.setAttribute("src", path + "/" + name + "_" + 
          this.userLanguage + ".js");
        document.getElementsByTagName("head")[0].appendChild(linkElem);
      }
    }
  },
 
  get : function(key)
  {
    var value = this.getForLanguage(key, this.userLanguage);
    if (value === undefined && this.userLanguage !== this.defaultLanguage)
    {
      value = this.getForLanguage(key, this.defaultLanguage);
      if (value === undefined)
      {
        value = key;
      }
    }
    return value;
  },
  
  getForLanguage : function(key, language)
  {
    var langTable = this.translations[language];
    if (langTable) return langTable[key];
    return undefined;
  },

  add : function(name, language, table)
  {
    var langTable = this.translations[language];
    if (langTable === undefined)
    {
      langTable = {};
      this.translations[language] = langTable;
    }
    for (var key in table)
    {
      langTable[key] = table[key];
    }
    console.info("I18N: " + name + "_" + language + " bundle loaded.");
  }
};


I18N.init('js/i18n', ['bimrocket'], ['en', 'es', 'ca']);
