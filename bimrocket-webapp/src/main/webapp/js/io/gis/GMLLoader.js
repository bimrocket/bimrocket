/**
 * GMLLoader.js
 *
 * @author realor
 */

import { GISLoader } from "./GISLoader.js";
import * as THREE from "three";

class GMLLoader extends GISLoader
{
  constructor(manager)
  {
    super(manager, "text/xml");
  }

  parse(xml)
  {
    let xmlDoc;
    if (typeof xml === "string")
    {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(xml, "text/xml");
    }
    else if (xml instanceof XMLDocument)
    {
      xmlDoc = xml;
    }
    else
    {
      throw "Unsupported data";
    }

    let featureGroup = new THREE.Group();
    featureGroup.name = this.options.name || "layer";
    let featureColElem = xmlDoc.querySelector("*|FeatureCollection");
    if (featureColElem)
    {
      let element = featureColElem.firstElementChild;

      while (element)
      {
        if (element.localName === "member" ||
            element.localName === "featureMember")
        {
          this.processMember(element.firstElementChild, featureGroup);
        }
        else if (element.localName === "featureMembers")
        {
          element = element.firstElementChild;
          while (element)
          {
            this.processMember(element, featureGroup);
            element = element.nextSibling;
          }
          break;
        }
        element = element.nextSibling;
      }
    }

    featureGroup.position.copy(this.getOrigin());
    featureGroup.updateMatrix();

    return featureGroup;
  }

  processMember(featureElem, featureGroup)
  {
    const properties = {};

    let id = this.getAttribute(featureElem, "id");
    if (!id) id = this.getAttribute(featureElem, "fid");

    let geomType = null;
    let coordinates = null;
    let propElem = featureElem.firstElementChild;
    while (propElem)
    {
      if (propElem.firstElementChild) // has children, it is geometry
      {
        let geomElem = propElem.firstElementChild;
        geomType = geomElem.localName;
        coordinates = this.extractCoordinates(geomElem);
      }
      else
      {
        let propName = propElem.localName;
        let propValue = propElem.textContent;
        properties[propName] = propValue;
      }
      propElem = propElem.nextElementSibling;
    }

    if (coordinates)
    {
      this.createObject(geomType, id, coordinates, properties, featureGroup);
    }
    else
    {
      this.createNonVisibleObject(id, properties, featureGroup);
    }
  }

  extractCoordinates(geomElem, dimension = 0)
  {
    if (dimension === 0)
    {
      dimension = parseInt(this.getAttribute(geomElem, "srsDimension", "2"));
    }
    const geomType = geomElem.localName;
    switch (geomType)
    {
      case "Point":
        return this.extractPointCoordinates(geomElem);
      case "LineString":
        return this.extractLineStringCoordinates(geomElem, dimension);
      case "Polygon":
        return this.extractPolygonCoordinates(geomElem, dimension);
      case "MultiPoint":
      case "MultiLineString":
      case "MultiCurve":
      case "MultiPolygon":
      case "MultiSurface":
        return this.extractMultiGeometryCoordinates(geomElem, dimension);
    }
  }

  extractPointCoordinates(geomElem)
  {
    let coordElem = geomElem.firstElementChild;
    if (coordElem.localName === "coordinates")
    {
      return this.parseCoordinates(coordElem)[0];
    }
    else if (coordElem.localName === "pos")
    {
      return coordElem.textContent.split(" ").map(v => parseFloat(v));
    }
    return null;
  }

  extractLineStringCoordinates(geomElem, dimension)
  {
    let coordElem = geomElem.firstElementChild;
    if (coordElem?.localName === "coordinates")
    {
      return this.parseCoordinates(coordElem);
    }
    else if (coordElem?.localName === "posList")
    {
      return this.parsePosList(coordElem, dimension);
    }
    return null;
  }

  extractPolygonCoordinates(geomElem, dimension)
  {
    let coords = [];
    let ringElem = geomElem.firstElementChild;
    while (ringElem)
    {
      let coordElem = ringElem.firstElementChild?.firstElementChild;

      if (coordElem?.localName === "coordinates")
      {
        coords.push(this.parseCoordinates(coordElem));
      }
      else if (coordElem?.localName === "posList")
      {
        coords.push(this.parsePosList(coordElem, dimension));
      }
      ringElem = ringElem.nextElementSibling;
    }
    return coords;
  }

  extractMultiGeometryCoordinates(geomElem, dimension)
  {
    const coords = [];
    let memberElem = geomElem.firstElementChild;
    while (memberElem)
    {
      let memberGeomElem = memberElem.firstElementChild;
      if (memberGeomElem)
      {
        let memberCoords = this.extractCoordinates(memberGeomElem, dimension);
        if (memberCoords)
        {
          coords.push(memberCoords);
        }
      }
      memberElem = memberElem.nextElementSibling;
    }
    return coords;
  }

  parseCoordinates(coordElem)
  {
    const decimalSymbol = this.getAttribute(coordElem, "decimal", ".");
    const cs = this.getAttribute(coordElem, "cs", ",");
    const ts = this.getAttribute(coordElem, "ts", " ");

    return coordElem.textContent.split(ts)
      .map(coord => coord.split(cs)
        .map(value => parseFloat(value.replaceAll(decimalSymbol, '.'))));
  }

  parsePosList(posListElem, dimension)
  {
    const posListText = posListElem.textContent;

    const posList = [];
    let pos = null;
    let index = 0;

    while (index < posListText.length)
    {
      let nextIndex = posListText.indexOf(" ", index);
      if (nextIndex === -1) nextIndex = posListText.length;
      let coordText = posListText.substring(index, nextIndex);
      index = nextIndex + 1;

      if (coordText.length === 0) continue;

      let coord = parseFloat(coordText);

      if (isNaN(coord)) continue;

      if (!pos || pos.length === dimension)
      {
        pos = [coord];
        posList.push(pos);
      }
      else
      {
        pos.push(coord);
      }
    }
    return posList;
  }

  getAttribute(element, localName, defaultValue = null)
  {
    for (const attr of element.attributes)
    {
      if (attr.localName === localName)
      {
        return attr.value;
      }
    }
    return defaultValue;
  }
}

export { GMLLoader };
