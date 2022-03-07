/**
 * IOManager.js
 *
 * @author realor
 */

import { ObjectUtils } from "../utils/ObjectUtils.js";
import { WebUtils } from "../utils/WebUtils.js";
import * as THREE from "../lib/three.module.js";

class IOManager
{
  static formats = {};

  static getFormat(fileName)
  {
    let extension = null;
    if (typeof fileName === "string")
    {
      let index = fileName.lastIndexOf(".");
      if (index !== -1)
      {
        extension = fileName.substring(index + 1).toLowerCase();
      }
    }
    if (extension === null) return null;
    for (let formatName in this.formats)
    {
      let formatInfo = this.formats[formatName];
      if (formatInfo.extensions.indexOf(extension) !== -1) return formatName;
    }
    return null;
  }

  static getFormatInfo(fileName)
  {
    let formatName = this.getFormat(fileName);
    let formatInfo = formatName ?
      IOManager.formats[formatName] :
      IOManager.formats[fileName];
    return formatInfo || null;
  }

  static createLoader(formatName, manager)
  {
    let loader = null;
    let formatInfo = this.formats[formatName];
    if (formatInfo && formatInfo.loaderClass)
    {
      loader = new formatInfo.loaderClass(manager);
      loader.loadMethod = formatInfo.loadMethod || loader.loadMethod || 0;
    }
    return loader;
  }

  static createExporter(formatName)
  {
    let exporter = null;
    let formatInfo = this.formats[formatName];
    if (formatInfo && formatInfo.exporterClass)
    {
      exporter = new formatInfo.exporterClass();
    }
    return exporter;
  }

  static load(intent)
  {
    let formatName = intent.format;
    let url = intent.url;
    let data = intent.data;
    let onCompleted = intent.onCompleted; // onCompleted(object3D)
    let onProgress = intent.onProgress; // onProgress({progress: 0..100, message: text})
    let onError = intent.onError; // onError(error)
    let manager = intent.manager; // LoadingManager
    let units = intent.units || "m"; // application units
    let options = intent.options;
    let basicAuthCredentials = intent.basicAuthCredentials;

    try
    {
      if (!formatName && url)
      {
        formatName = this.getFormat(url);
      }
      if (!formatName) throw "Can't determinate format";

      let formatInfo = IOManager.formats[formatName];

      let loader = this.createLoader(formatName, manager);

      if (!loader) throw "Unsupported format: " + formatName;

      if (loader.options && options)
      {
        Object.assign(loader.options, options);
      }

      if (data)
      {
        this.parseData(loader, url, data, units,
          onCompleted, onProgress, onError);
      }
      else
      {
        let request = new XMLHttpRequest();
        let length = 0;
        request.onreadystatechange = () =>
        {
          if (request.readyState === 4)
          {
            if (onProgress) onProgress({progress : 100, message : ""});

            if (request.status === 0 ||
              request.status === 200 || request.status === 207)
            {
              if (formatInfo.dataType === "arraybuffer")
              {
                data = request.response.arrayBuffer();
              }
              else
              {
                data = request.responseText;
              }
              try
              {
                this.parseData(loader, url, data, units,
                  onCompleted, onProgress, onError);
              }
              catch (exc)
              {
                if (onError) onError(exc);
              }
            }
            else
            {
              if (onError)
              {
                let message = WebUtils.getHttpStatusMessage(request.status);
                onError(message + " (HTTP " + request.status + ")");
              }
            }
          }
          else if (request.readyState === 3)
          {
            if (onProgress)
            {
              if (length === 0)
              {
                length = request.getResponseHeader("Content-Length");
              }
              else
              {
                let progress = Math.round(
                  100 * request.responseText.length / length);
                let message = "Downloading file...";
                onProgress({progress : progress, message : message});
              }
            }
          }
        };
        request.open("GET", url, true);
        if (basicAuthCredentials)
        {
          WebUtils.setBasicAuthorization(request,
            basicAuthCredentials.username, basicAuthCredentials.password);
        }
        request.send();
      }
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static export(intent)
  {
    let formatName = intent.format;
    let fileName = intent.name;
    let onCompleted = intent.onCompleted;
    let onProgress = intent.onProgress;
    let onError = intent.onError;
    let object = intent.object;
    let options = intent.options;

    try
    {
      if (!formatName && fileName)
      {
        formatName = this.getFormat(fileName);
      }

      if (!formatName) throw "Can't determinate format";

      let exporter = this.createExporter(formatName);

      if (!exporter) throw "Unsupported format: " + formatName;

      if (exporter.options && options)
      {
        Object.assign(exporter.options, options);
      }
      return this.parseObject(exporter, object,
        onCompleted, onProgress, onError);
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static parseData(loader, url, data, units,
    onCompleted, onProgress, onError)
  {
    const loadCompleted = (model) =>
    {
      ObjectUtils.scaleModel(model, units);
      if (onCompleted) onCompleted(model);
    };

    if (loader.loadMethod === 1) // ColladaLoader
    {
      let path = THREE.LoaderUtils.extractUrlBase(url);
      let result = loader.parse(data, path);
      loadCompleted(result.scene);
    }
    else if (loader.loadMethod === 2) // IFCLoader
    {
      loader.parse(data, loadCompleted, onProgress, onError);
    }
    else // general case: BRFLoader, STLLoader, OBJLoader...
    {
      let result = loader.parse(data);
      let object = this.createObject(result);
      loadCompleted(object);
    }
  }

  static parseObject(exporter, object, onCompleted, onProgress, onError)
  {
    let data = "";
    let result = exporter.parse(object);
    if (result)
    {
      if (typeof result === "string")
      {
        data = new Blob([result], {type: 'text/plain'});
      }
      else if (typeof result.data === "string")
      {
        data = new Blob([result.data], {type: 'text/plain'});
      }
    }
    if (onCompleted) onCompleted(data);
    return data;
  }

  static createObject(result)
  {
    if (result instanceof THREE.BufferGeometry)
    {
      let geometry = result;
      let material = new THREE.MeshPhongMaterial(
        {color : 0x008000, side : THREE.DoubleSide});
      let object = new THREE.Mesh(geometry, material);
      object.updateMatrix();
      return object;
    }
    else if (result instanceof THREE.Object3D)
    {
      let object = result;
      object.traverse(obj => obj.updateMatrix());
      return object;
    }
  }

  static getSupportedLoaderExtensions()
  {
    const extensions = [];
    const formats = IOManager.formats;
    for (let formatName in formats)
    {
      let formatInfo = formats[formatName];
      extensions.push(...formatInfo.extensions);
    }
    return extensions;
  }
}

export { IOManager };


