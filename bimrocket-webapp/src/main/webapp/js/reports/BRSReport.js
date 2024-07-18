/**
 * BRSReport.js
 *
 * @author realor
 */

import { Report, Rule } from "./Report.js";

export class BRSReport extends Report
{
  constructor()
  {
    super();
    this.code = null;
    this.description = null;
    this.severity = "info"; // info | warn | error
  }
}

export class BRSRule extends Rule
{
  constructor(ruleDefinition)
  {
    super();
    this.code = ruleDefinition.code || null;
    this.description = ruleDefinition.description || null;
    this.severity = ruleDefinition.severity || "info";
    this.selectExpression = ruleDefinition.selectExpression;
    this.checkExpression = ruleDefinition.checkExpression;
    this.message = ruleDefinition.message || null;
    this.summary = ruleDefinition.summary || null;
    this.highlight = ruleDefinition.highlight || null;
  }

  getCode()
  {
    return this.code;
  }

  getDescription()
  {
    return this.description;
  }

  getSeverity()
  {
    return this.severity;
  }

  selectObject($)
  {
    return this.selectExpression($);
  }

  checkObject($)
  {
    return this.checkExpression($);
  }

  getMessage(object)
  {
    return typeof this.message === "function" ?
      this.message(object) : null;
  }

  getSummary(objects)
  {
    return typeof this.summary === "function" ?
      this.summary(objects) : "count: " + objects.length;
  }

  highlightObjects(application) // selected objects
  {
    if (this.highlight)
    {
      this.highlight(application);
      return true;
    }
    return false;
  }
}
