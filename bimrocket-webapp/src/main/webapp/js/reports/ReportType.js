/**
 * ReportType.js
 *
 * @author realor
 */

import { Report } from "./Report.js";

class ReportType
{
  static types = {};

  constructor()
  {
  }

  getDescription()
  {
    return "?";
  }

  getSourceLanguage()
  {
    return "?"; // the source language: json, xml, javascript
  }

  parse(source)
  {
    return new Report(); // Report object
  }

  stringify(report)
  {
    throw "Not supported";
  }

  getDefaultSource()
  {
    return "";
  }

  validate(source)
  {
    try
    {
      this.parse(source);
      return true;
    }
    catch (ex)
    {
      return false;
    }
  }

  static getReportType(reportType)
  {
    return this.types[reportType];
  }

  static setReportType(reportType, type)
  {
    this.types[reportType] = type;
  }

  static getDefaultReportTypeName()
  {
    const reportTypeNames = Object.keys(this.types);
    return reportTypeNames[0];
  }
}

export { ReportType };

