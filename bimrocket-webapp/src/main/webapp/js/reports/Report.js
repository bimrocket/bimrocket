/**
 * Report.js
 *
 * @author realor
 */

class Report
{
  constructor()
  {
    this.title = null;
    this.description = null;
    this.copyright = null;
    this.date = null;
    this.milestone = null;
    this.author = null;
    this.rules = []; // array of Rule
  }
}

class Rule
{
  constructor()
  {
  }

  getCode()
  {
    return null;
  }

  getDescription()
  {
    return null;
  }

  getMinOccurs()
  {
    return 0;
  }

  getMaxOccurs()
  {
    return null; // unbounded
  }

  getSeverity()
  {
    return "info"; // info | warn | error
  }

  selectObject($)
  {
    return false;
  }

  checkObject($)
  {
    return false;
  }

  getMessage(object)
  {
    return null;
  }

  getSummary(objects)
  {
    return "count: " + objects.length;
  }

  highlightObjects(application)
  {
    return false; // false to default action.
  }
}


export { Report, Rule };


